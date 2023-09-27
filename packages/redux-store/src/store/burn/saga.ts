/* eslint-disable no-case-declarations */
import { PostsQueryTag, WORSHIP_TYPES } from '@bcpros/lixi-models/constants';
import { match } from 'ts-pattern';
import BigNumber from 'bignumber.js';
import { Burn, BurnCommand, BurnExtraArguments, BurnForType, BurnQueueCommand, BurnType } from '@bcpros/lixi-models/lib/burn';
import { currency } from '@components/Common/Ticker';
import { callConfig } from '@context/shareContext';
import {
  Comment,
  CommentOrder,
  CreateWorshipInput,
  OrderDirection,
  Post,
  PostOrderField,
  TokenOrderField,
  WorshipOrderField,
  Account,
  Page,
  Token,
  CommentOrderField
} from '@generated/types.generated';
import { all, call, fork, take, takeLatest } from '@redux-saga/core/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { PatchCollection } from '@reduxjs/toolkit/dist/query/core/buildThunks';
import { setTransactionNotReady, setTransactionReady } from '@store/account/actions';
import { getSelectedAccount, getTransactionStatus } from '@store/account/selectors';
import { getFailQueue } from '@store/burn';
import { api as commentApi } from '@store/comment/comments.api';
import { api as postApi } from '@store/post/posts.api';
import { api as templeApi } from '@store/temple/temple.api';
import { api as timelineApi } from '@store/timeline/timeline.api';
import { showToast } from '@store/toast/actions';
import { burnForTokenFailure, burnForTokenSucceses } from '@store/token';
import { api as tokenApi } from '@store/token/tokens.api';
import { getAllWalletPaths, getSlpBalancesAndUtxos, getWalletBalances } from '@store/wallet';
import { api as worshipApi } from '@store/worship/worshipedPerson.api';
import { fromSatoshisToXpi, fromSmallestDenomination, fromXpiToSatoshis } from '@utils/cashMethods';
import * as _ from 'lodash';
import intl from 'react-intl-universal';
import { buffers } from 'redux-saga';
import { actionChannel, flush, getContext, put, select } from 'redux-saga/effects';
import { BurnForItem } from '../../generated';
import { hideLoading } from '../loading/actions';
import {
  addBurnQueue,
  addBurnTransaction,
  burnForUpDownVote,
  burnForUpDownVoteFailure,
  burnForUpDownVoteSuccess,
  clearBurnQueue,
  clearFailQueue,
  createTxHex,
  moveAllBurnToFailQueue,
  prepareBurnCommand,
  removeBurnQueue,
  returnTxHex
} from './actions';
import burnApi from './api';
import { getFilterPostsHome, getLevelFilter } from '../settings';

import { current } from 'immer';
import { RootState } from '../store';

function* prepareBurnCommandSaga(action: PayloadAction<{
  isUpVote: boolean,
  burnForItem: BurnForItem,
  burnForType: BurnForType,
  burnValue: string
}>) {
  try {
    const { isUpVote, burnForItem, burnForType, burnValue } = action.payload;

    const failQueue = yield select(getFailQueue);
    if (failQueue.length > 0) yield put(clearFailQueue());
    const walletPaths = yield select(getAllWalletPaths);
    const selectedAccount = yield select(getSelectedAccount);
    const slpBalancesAndUtxos = yield select(getSlpBalancesAndUtxos);
    const balances = yield select(getWalletBalances);
    const filterValue = yield select(getFilterPostsHome);
    const level = yield select(getLevelFilter);
    const fundingFirstUtxo = slpBalancesAndUtxos.nonSlpUtxos[0];
    const currentWalletPath = walletPaths.filter(acc => acc.xAddress === fundingFirstUtxo.address).pop();
    const { hash160 } = currentWalletPath;

    const burnType = isUpVote ? BurnType.Up : BurnType.Down;
    const burnedBy = hash160;
    const burnForId = burnForItem.id.toString();

    let queryParams;
    let tipToAddresses: { address: string; amount: string }[] = [];

    switch (burnForType) {
      case BurnForType.Post:
        const post = burnForItem as Post;
        tipToAddresses.push({
          address: post.page ? post.page.pageAccount.address : post.postAccount.address,
          amount: fromXpiToSatoshis(new BigNumber(burnValue).multipliedBy(currency.burnFee)).valueOf().toString()
        });
        break;
      case BurnForType.Page:
        const page = burnForItem as Page;
        tipToAddresses.push({
          address: page.address,
          amount: fromXpiToSatoshis(new BigNumber(burnValue).multipliedBy(currency.burnFee)).valueOf().toString()
        });
        break;
      case BurnForType.Account:
        const account = burnForItem as Account;
        tipToAddresses.push({
          address: account.address,
          amount: fromXpiToSatoshis(new BigNumber(burnValue).multipliedBy(currency.burnFee)).valueOf().toString()
        });
        break;
      case BurnForType.Token:
        const token = burnForItem as Token;
        break;
      case BurnForType.Comment:
        const comment = burnForItem as Comment;
        const pageAddress = comment.commentTo.page ? comment.commentTo.page.pageAccount.address : undefined;
        const postAddress = comment.commentTo.postAccount.address;
        tipToAddresses.push({
          address: pageAddress ?? postAddress,
          amount: fromXpiToSatoshis(new BigNumber(burnValue).multipliedBy(currency.burnFee)).valueOf().toString()
        });

        queryParams = {
          direction: OrderDirection.Asc,
          field: CommentOrderField.UpdatedAt
        };
        break;
    }

    tipToAddresses = tipToAddresses.filter(item => item.address != selectedAccount.address);
    const totalTip = fromSmallestDenomination(
      tipToAddresses.reduce((total, item) => total + parseFloat(item.amount), 0)
    );
    if (
      slpBalancesAndUtxos.nonSlpUtxos.length == 0 ||
      fromSmallestDenomination(balances.totalBalanceInSatoshis) < parseInt(burnValue) + totalTip
    ) {
      throw new Error(intl.get('account.insufficientFunds'));
    }

    const extraArguments: BurnExtraArguments = match(burnForType)
      .with(BurnForType.Post, () => {
        return {
          postQueryTags: [PostsQueryTag.Post],
          postId: burnForItem.id.toString(),
          minBurnFilter: filterValue,
          level: level
        }
      })
      .with(BurnForType.Page, () => {
        return {
          pageId: burnForItem.id.toString()
        }
      })
      .otherwise(() => null);

    const burnCommand: BurnQueueCommand = {
      defaultFee: currency.defaultFee,
      burnType,
      burnForType: burnForType,
      burnedBy,
      burnForId: _.toString(burnForId),
      burnValue,
      tipToAddresses: tipToAddresses,
      extraArguments
    };

    yield put(addBurnQueue(burnCommand));
    yield put(addBurnTransaction(burnCommand));
  } catch (err) {
    const errorMessage = err.message ?? intl.get('post.unableToBurn');
    yield put(
      showToast('error', {
        message: intl.get('toast.error'),
        description: errorMessage
      })
    );
  }
}

function* createTxHexSaga(action: PayloadAction<BurnQueueCommand>) {
  const data = action.payload;
  const { XPI } = callConfig.call.walletContext;
  const xpiContext = yield getContext('useXPI');
  const walletPaths = yield select(getAllWalletPaths);
  const slpBalancesAndUtxos = yield select(getSlpBalancesAndUtxos);
  const { createBurnTransaction } = xpiContext();
  const burnForId = data.burnForType === BurnForType.Token ? data.extraArguments.tokenId : data.burnForId;
  const tipToAddresses = data.tipToAddresses ? data.tipToAddresses : null;

  try {
    const { rawTxHex, minerFee } = createBurnTransaction(
      XPI,
      walletPaths,
      slpBalancesAndUtxos.nonSlpUtxos,
      data.defaultFee,
      data.burnType,
      data.burnForType,
      data.burnedBy,
      burnForId,
      data.burnValue,
      tipToAddresses
    );

    const payload = {
      rawTxHex: rawTxHex,
      minerFee: _.toString(fromSatoshisToXpi(minerFee))
    };

    yield put({ type: returnTxHex.type, payload });
  } catch (e) {
    yield put(moveAllBurnToFailQueue());
    yield put(clearBurnQueue());
  }
}

function* burnForUpDownVoteSaga(action: PayloadAction<BurnQueueCommand>) {
  let patches, patch: PatchCollection;
  const command = action.payload;

  const { burnForId: postId, extraArguments } = command;
  let burnValue = _.toNumber(command.burnValue);
  yield put(createTxHex(command));
  const { payload } = yield take(returnTxHex.type);
  const { rawTxHex: latestTxHex, minerFee } = payload;

  try {
    const dataApi: BurnCommand = {
      txHex: latestTxHex,
      ...command
    };

    const data: Burn = yield call(burnApi.post, dataApi);
    switch (command.burnForType) {
      case BurnForType.Token:
        patches = yield updateTokenBurnValue(action);
        break;
      case BurnForType.Post:
        patches = yield updatePostBurnValue(action);
        break;
      case BurnForType.Comment:
        patches = yield updateCommentBurnValue(action);
        break;
      case BurnForType.Worship:
        let promise;
        let createWorshipInput: CreateWorshipInput;
        let data;
        switch (command.worshipType) {
          case WORSHIP_TYPES.PERSON:
            createWorshipInput = {
              worshipedPersonId: command.burnForId,
              worshipedAmount: burnValue
            };
            promise = yield put(
              worshipApi.endpoints.createWorship.initiate({
                input: createWorshipInput
              })
            );
            yield promise;
            data = yield promise.unwrap();
            patches = yield updateWorshipBurnValue(data.createWorship);
            break;
          case WORSHIP_TYPES.TEMPLE:
            createWorshipInput = {
              templeId: command.burnForId,
              worshipedAmount: burnValue
            };
            promise = yield put(
              worshipApi.endpoints.CreateWorshipTemple.initiate({
                input: createWorshipInput
              })
            );
            yield promise;
            data = yield promise.unwrap();
            patches = yield updateWorshipBurnValue(data.createWorshipTemple);
            break;
        }
        break;
    }

    if (command.burnForType === BurnForType.Token) {
      yield put(burnForTokenSucceses());
    }

    if (_.isNil(data) || _.isNil(data.id)) {
      throw new Error(intl.get('post.unableToBurnForPost'));
    }

    yield put(removeBurnQueue());
    yield put(
      burnForUpDownVoteSuccess(data) &&
      showToast('success', {
        message: intl.get(`toast.success`),
        description: intl.get('burn.totalBurn', {
          burnValue: burnValue,
          totalAmount: burnValue + burnValue * currency.burnFee + Number(minerFee),
          coin: 'XPI'
        })
      })
    );
  } catch (err) {
    console.log(err);
    let message;
    yield put(removeBurnQueue());
    yield put(setTransactionReady());
    if (command.burnForType === BurnForType.Token) {
      message = (err as Error)?.message ?? intl.get('token.unableToBurn');
      yield put(
        burnForTokenFailure({
          id: command.burnForId,
          burnType: command.burnType,
          burnValue: burnValue
        })
      );
    } else if (command.burnForType === BurnForType.Post) {
      message = (err as Error)?.message ?? intl.get('post.unableToBurn');
      const params = {
        orderBy: {
          direction: OrderDirection.Desc,
          field: PostOrderField.UpdatedAt
        }
      };
      if (patch) {
        yield put(postApi.util.patchQueryData('Post', { id: postId }, patch.inversePatches));
      }
    } else if (command.burnForType === BurnForType.Comment) {
      message = (err as Error)?.message ?? intl.get('comment.unableToBurn');
    } else if (command.burnForType === BurnForType.Worship) {
      message = (err as Error)?.message ?? intl.get('comment.unableToBurn');
      if (patches) {
        yield put(
          worshipApi.util.patchQueryData('allWorshipedByPersonId', { id: command.burnForId }, patches.inversePatches)
        );
      }
    }
    yield put(burnForUpDownVoteFailure(message));
  }
}

function* burnForUpDownVoteSuccessSaga(action: PayloadAction<Burn>) {
  yield put(hideLoading(burnForUpDownVote.type));
}

function* burnForUpDownVoteFailureSaga(action: PayloadAction<string>) {
  yield put(
    showToast('error', {
      message: intl.get('toast.error'),
      description: action.payload,
      duration: 3
    })
  );
  yield put(hideLoading(burnForUpDownVote.type));
}

function* updatePostBurnValue(action: PayloadAction<BurnQueueCommand>) {
  const { extraArguments, burnValue: burnValueAsString, burnType, burnForId } = action.payload;
  const { isTop, hashtagId, hashtags, minBurnFilter, pageId, query, tokenId, userId, postQueryTags, level } =
    extraArguments;

  let burnValue = _.toNumber(burnValueAsString);

  const rootState: RootState = yield select();

  const result = yield call(timelineApi.util.selectInvalidatedBy, rootState, ['TimelineItem']);

  //BUG: All token and page post show up on home page will not optimistic update becuz of PostQueryTag
  // The algo will check for PostQueryTag then updateQueryData according to it. It only update normal post not page's post and token's post at homepage.
  // That's why we need to update the all Posts here first then updateQueryData later. Not the best way to handle. Maybe come back later.

  yield put(
    //THis is hardcoded, it wont work if isTop other than false, need to find better way to handle this
    timelineApi.util.updateQueryData('HomeTimeline', { level: level, first: 10 }, draft => {
      const timelineItemToUpdateIndex = draft.homeTimeline.edges.findIndex(item => item.node.id === burnForId);
      const timelineItemToUpdate = draft.homeTimeline.edges[timelineItemToUpdateIndex];
      if (timelineItemToUpdateIndex >= 0) {
        let danaBurnUp = timelineItemToUpdate?.node?.data?.danaBurnUp ?? 0;
        let danaBurnDown = timelineItemToUpdate?.node?.data?.danaBurnDown ?? 0;
        if (burnType == BurnType.Up) {
          danaBurnUp = danaBurnUp + burnValue;
        } else {
          danaBurnDown = danaBurnDown + burnValue;
        }
        const danaBurnScore = danaBurnUp - danaBurnDown;
        draft.homeTimeline.edges[timelineItemToUpdateIndex].node.data.danaBurnUp = danaBurnUp;
        draft.homeTimeline.edges[timelineItemToUpdateIndex].node.data.danaBurnDown = danaBurnDown;
        draft.homeTimeline.edges[timelineItemToUpdateIndex].node.data.danaBurnScore = danaBurnScore;
        if (danaBurnScore < 0) {
          draft.homeTimeline.edges.splice(timelineItemToUpdateIndex, 1);
          draft.homeTimeline.totalCount = draft.homeTimeline.totalCount - 1;
        }
      }
    })
  );

  yield put(
    postApi.util.updateQueryData(
      'PostsBySearchWithHashtag',
      {
        minBurnFilter: minBurnFilter,
        query: query,
        hashtags: hashtags
      },
      draft => {
        const postToUpdateIndex = draft.allPostsBySearchWithHashtag.edges.findIndex(item => item.node.id === burnForId);
        const postToUpdate = draft.allPostsBySearchWithHashtag.edges[postToUpdateIndex];
        if (postToUpdateIndex >= 0) {
          let danaBurnUp = postToUpdate?.node?.danaBurnUp ?? 0;
          let danaBurnDown = postToUpdate?.node?.danaBurnDown ?? 0;
          if (burnType == BurnType.Up) {
            danaBurnUp = danaBurnUp + burnValue;
          } else {
            danaBurnDown = danaBurnDown + burnValue;
          }
          const danaBurnScore = danaBurnUp - danaBurnDown;
          draft.allPostsBySearchWithHashtag.edges[postToUpdateIndex].node.danaBurnUp = danaBurnUp;
          draft.allPostsBySearchWithHashtag.edges[postToUpdateIndex].node.danaBurnDown = danaBurnDown;
          draft.allPostsBySearchWithHashtag.edges[postToUpdateIndex].node.danaBurnScore = danaBurnScore;
          if (danaBurnScore < 0) {
            draft.allPostsBySearchWithHashtag.edges.splice(postToUpdateIndex, 1);
          }
        }
      }
    )
  );

  yield put(
    postApi.util.updateQueryData('Post', { id: burnForId }, draft => {
      let danaBurnUp = draft?.post?.danaBurnUp ?? 0;
      let danaBurnDown = draft?.post?.danaBurnDown ?? 0;
      if (burnType == BurnType.Up) {
        danaBurnUp = danaBurnUp + burnValue;
      } else {
        danaBurnDown = danaBurnDown + burnValue;
      }
      const danaBurnScore = danaBurnUp - danaBurnDown;
      draft.post.danaBurnUp = danaBurnUp;
      draft.post.danaBurnDown = danaBurnDown;
      draft.post.danaBurnScore = danaBurnScore;
    })
  );

  if (hashtagId) {
    yield put(
      postApi.util.updateQueryData('PostsByHashtagId', { id: hashtagId }, draft => {
        const postToUpdateIndex = draft.allPostsByHashtagId.edges.findIndex(item => item.node.id === burnForId);
        const postToUpdate = draft.allPostsByHashtagId.edges[postToUpdateIndex];
        if (postToUpdateIndex >= 0) {
          let danaBurnUp = postToUpdate?.node?.danaBurnUp ?? 0;
          let danaBurnDown = postToUpdate?.node?.danaBurnDown ?? 0;
          if (burnType == BurnType.Up) {
            danaBurnUp = danaBurnUp + burnValue;
          } else {
            danaBurnDown = danaBurnDown + burnValue;
          }
          const danaBurnScore = danaBurnUp - danaBurnDown;
          draft.allPostsByHashtagId.edges[postToUpdateIndex].node.danaBurnUp = danaBurnUp;
          draft.allPostsByHashtagId.edges[postToUpdateIndex].node.danaBurnDown = danaBurnDown;
          draft.allPostsByHashtagId.edges[postToUpdateIndex].node.danaBurnScore = danaBurnScore;
          if (danaBurnScore < 0) {
            draft.allPostsByHashtagId.edges.splice(postToUpdateIndex, 1);
            draft.allPostsByHashtagId.totalCount = draft.allPostsByHashtagId.totalCount - 1;
          }
        }
      })
    );
  }

  //TODO: There are no optimistic burn update for query post by hashtag, We need to pass query and hashtags
  // in order to update. Need better way to handle rather than passing arg
  yield put(
    postApi.util.updateQueryData(
      'PostsBySearchWithHashtagAtPage',
      {
        pageId: pageId,
        minBurnFilter: minBurnFilter,
        query: query,
        hashtags: hashtags
      },
      draft => {
        console.log('draft', draft);
        const postToUpdateIndex = draft.allPostsBySearchWithHashtagAtPage.edges.findIndex(
          item => item.node.id === burnForId
        );
        const postToUpdate = draft.allPostsBySearchWithHashtagAtPage.edges[postToUpdateIndex];
        if (postToUpdateIndex >= 0) {
          let danaBurnUp = postToUpdate?.node?.danaBurnUp ?? 0;
          let danaBurnDown = postToUpdate?.node?.danaBurnDown ?? 0;
          if (burnType == BurnType.Up) {
            danaBurnUp = danaBurnUp + burnValue;
          } else {
            danaBurnDown = danaBurnDown + burnValue;
          }
          const danaBurnScore = danaBurnUp - danaBurnDown;
          draft.allPostsBySearchWithHashtagAtPage.edges[postToUpdateIndex].node.danaBurnUp = danaBurnUp;
          draft.allPostsBySearchWithHashtagAtPage.edges[postToUpdateIndex].node.danaBurnDown = danaBurnDown;
          draft.allPostsBySearchWithHashtagAtPage.edges[postToUpdateIndex].node.danaBurnScore = danaBurnScore;
          if (danaBurnScore < 0) {
            draft.allPostsBySearchWithHashtagAtPage.edges.splice(postToUpdateIndex, 1);
          }
        }
      }
    )
  );
  yield put(
    postApi.util.updateQueryData('PostsByPageId', { id: pageId, minBurnFilter: minBurnFilter }, draft => {
      const postToUpdateIndex = draft.allPostsByPageId.edges.findIndex(item => item.node.id === burnForId);
      const postToUpdate = draft.allPostsByPageId.edges[postToUpdateIndex];
      if (postToUpdateIndex >= 0) {
        let danaBurnUp = postToUpdate?.node?.danaBurnUp ?? 0;
        let danaBurnDown = postToUpdate?.node?.danaBurnDown ?? 0;
        if (burnType == BurnType.Up) {
          danaBurnUp = danaBurnUp + burnValue;
        } else {
          danaBurnDown = danaBurnDown + burnValue;
        }
        const danaBurnScore = danaBurnUp - danaBurnDown;
        draft.allPostsByPageId.edges[postToUpdateIndex].node.danaBurnUp = danaBurnUp;
        draft.allPostsByPageId.edges[postToUpdateIndex].node.danaBurnDown = danaBurnDown;
        draft.allPostsByPageId.edges[postToUpdateIndex].node.danaBurnScore = danaBurnScore;
        if (danaBurnScore < 0) {
          draft.allPostsByPageId.edges.splice(postToUpdateIndex, 1);
          draft.allPostsByPageId.totalCount = draft.allPostsByPageId.totalCount - 1;
        }
      }
    })
  );
  yield put(
    postApi.util.updateQueryData(
      'PostsBySearchWithHashtagAtToken',
      {
        tokenId: tokenId,
        minBurnFilter: minBurnFilter,
        query: query,
        hashtags: hashtags
      },
      draft => {
        const postToUpdateIndex = draft.allPostsBySearchWithHashtagAtToken.edges.findIndex(
          item => item.node.id === burnForId
        );
        const postToUpdate = draft.allPostsBySearchWithHashtagAtToken.edges[postToUpdateIndex];
        if (postToUpdateIndex >= 0) {
          let danaBurnUp = postToUpdate?.node?.danaBurnUp ?? 0;
          let danaBurnDown = postToUpdate?.node?.danaBurnDown ?? 0;
          if (burnType == BurnType.Up) {
            danaBurnUp = danaBurnUp + burnValue;
          } else {
            danaBurnDown = danaBurnDown + burnValue;
          }
          const danaBurnScore = danaBurnUp - danaBurnDown;
          draft.allPostsBySearchWithHashtagAtToken.edges[postToUpdateIndex].node.danaBurnUp = danaBurnUp;
          draft.allPostsBySearchWithHashtagAtToken.edges[postToUpdateIndex].node.danaBurnDown = danaBurnDown;
          draft.allPostsBySearchWithHashtagAtToken.edges[postToUpdateIndex].node.danaBurnScore = danaBurnScore;
          if (danaBurnScore < 0) {
            draft.allPostsBySearchWithHashtagAtToken.edges.splice(postToUpdateIndex, 1);
          }
        }
      }
    )
  );
  yield put(
    postApi.util.updateQueryData('PostsByTokenId', { id: tokenId, minBurnFilter: minBurnFilter }, draft => {
      const postToUpdateIndex = draft.allPostsByTokenId.edges.findIndex(item => item.node.id === burnForId);
      const postToUpdate = draft.allPostsByTokenId.edges[postToUpdateIndex];
      if (postToUpdateIndex >= 0) {
        let danaBurnUp = postToUpdate?.node?.danaBurnUp ?? 0;
        let danaBurnDown = postToUpdate?.node?.danaBurnDown ?? 0;
        if (burnType == BurnType.Up) {
          danaBurnUp = danaBurnUp + burnValue;
        } else {
          danaBurnDown = danaBurnDown + burnValue;
        }
        const danaBurnScore = danaBurnUp - danaBurnDown;
        draft.allPostsByTokenId.edges[postToUpdateIndex].node.danaBurnUp = danaBurnUp;
        draft.allPostsByTokenId.edges[postToUpdateIndex].node.danaBurnDown = danaBurnDown;
        draft.allPostsByTokenId.edges[postToUpdateIndex].node.danaBurnScore = danaBurnScore;
        if (danaBurnScore < 0) {
          draft.allPostsByTokenId.edges.splice(postToUpdateIndex, 1);
          draft.allPostsByTokenId.totalCount = draft.allPostsByTokenId.totalCount - 1;
        }
      }
    })
  );
  yield put(
    postApi.util.updateQueryData(
      'PostsByUserId',
      {
        id: userId,
        minBurnFilter: minBurnFilter
      },
      draft => {
        const postToUpdateIndex = draft.allPostsByUserId.edges.findIndex(item => item.node.id === burnForId);
        const postToUpdate = draft.allPostsByUserId.edges[postToUpdateIndex];
        console.log(postToUpdateIndex);
        console.log(postToUpdate);
        if (postToUpdateIndex >= 0) {
          let danaBurnUp = postToUpdate?.node?.danaBurnUp ?? 0;
          let danaBurnDown = postToUpdate?.node?.danaBurnDown ?? 0;
          if (burnType == BurnType.Up) {
            danaBurnUp = danaBurnUp + burnValue;
          } else {
            danaBurnDown = danaBurnDown + burnValue;
          }
          const danaBurnScore = danaBurnUp - danaBurnDown;
          draft.allPostsByUserId.edges[postToUpdateIndex].node.danaBurnUp = danaBurnUp;
          draft.allPostsByUserId.edges[postToUpdateIndex].node.danaBurnDown = danaBurnDown;
          draft.allPostsByUserId.edges[postToUpdateIndex].node.danaBurnScore = danaBurnScore;
          if (danaBurnScore < 0) {
            draft.allPostsByUserId.edges.splice(postToUpdateIndex, 1);
            draft.allPostsByUserId.totalCount = draft.allPostsByUserId.totalCount - 1;
          }
        }
      }
    )
  );

}

function* updateWorshipBurnValue(data) {
  const { worshipedPerson, temple, id, worshipedAmount } = data;
  const params = {
    orderBy: {
      direction: OrderDirection.Desc,
      field: WorshipOrderField.UpdatedAt
    }
  };
  //At the time being, there are only 2 object to worship, so we use if/else here,
  //In the future, if there is more object to worship, create WorshipType in createWorshipMutation
  if (worshipedPerson) {
    yield put(
      worshipApi.util.updateQueryData('WorshipedPerson', { id: worshipedPerson?.id }, draft => {
        draft.worshipedPerson.totalWorshipAmount = draft.worshipedPerson.totalWorshipAmount + worshipedAmount;
      })
    );
    return yield put(
      worshipApi.util.updateQueryData('allWorshipedByPersonId', { ...params, id: worshipedPerson.id }, draft => {
        draft.allWorshipedByPersonId.edges.unshift({
          cursor: id,
          node: {
            ...data
          }
        });
        draft.allWorshipedByPersonId.totalCount = draft.allWorshipedByPersonId.totalCount + 1;
      })
    );
  } else {
    yield put(
      templeApi.util.updateQueryData('Temple', { id: temple?.id }, draft => {
        draft.temple.totalWorshipAmount = draft.temple.totalWorshipAmount + worshipedAmount;
      })
    );
    return yield put(
      worshipApi.util.updateQueryData('allWorshipedByTempleId', { ...params, id: temple.id }, draft => {
        console.log(draft);
        draft.allWorshipedByTempleId.edges.unshift({
          cursor: id,
          node: {
            ...data
          }
        });
        draft.allWorshipedByTempleId.totalCount = draft.allWorshipedByTempleId.totalCount + 1;
      })
    );
  }
}

function* updateCommentBurnValue(action: PayloadAction<BurnQueueCommand>) {
  const { extraArguments, burnValue: burnValueAsString, burnType, burnForId } = action.payload;
  const orderBy = extraArguments.orderBy as CommentOrder;
  const { postId } = extraArguments;

  const burnValue = _.toNumber(burnValueAsString);

  return yield put(
    commentApi.util.updateQueryData('CommentsToPostId', { id: postId, orderBy: orderBy }, draft => {
      const commentToUpdateIndex = draft.allCommentsToPostId.edges.findIndex(item => item.node.id === burnForId);
      const commentToUpdate = draft.allCommentsToPostId.edges[commentToUpdateIndex];
      if (commentToUpdateIndex >= 0) {
        let danaBurnUp = commentToUpdate?.node?.danaBurnUp ?? 0;
        let danaBurnDown = commentToUpdate?.node?.danaBurnDown ?? 0;
        if (burnType == BurnType.Up) {
          danaBurnUp = danaBurnUp + burnValue;
        } else {
          danaBurnDown = danaBurnDown + burnValue;
        }
        const danaBurnScore = danaBurnUp - danaBurnDown;
        draft.allCommentsToPostId.edges[commentToUpdateIndex].node.danaBurnUp = danaBurnUp;
        draft.allCommentsToPostId.edges[commentToUpdateIndex].node.danaBurnDown = danaBurnDown;
        draft.allCommentsToPostId.edges[commentToUpdateIndex].node.danaBurnScore = danaBurnScore;
        if (danaBurnScore < 0) {
          draft.allCommentsToPostId.edges.splice(commentToUpdateIndex, 1);
          draft.allCommentsToPostId.totalCount = draft.allCommentsToPostId.totalCount - 1;
        }
      }
    })
  );
}

function* updateTokenBurnValue(action: PayloadAction<BurnQueueCommand>) {
  const { extraArguments, burnValue: burnValueAsString, burnType, burnForId } = action.payload;
  const { tokenId } = extraArguments;
  let burnValue = _.toNumber(burnValueAsString);

  const rootState: RootState = yield select();
  const tokensInvalidatedBy = yield call(tokenApi.util.selectInvalidatedBy, rootState, ['Tokens', 'Token']);
  for (const invalidatedBy of tokensInvalidatedBy) {
    const { originalArgs } = invalidatedBy;
    return yield put(
      tokenApi.util.updateQueryData('Tokens', originalArgs, draft => {
        console.log('keys', Object.keys(current(draft)));
        const tokenBurnValueIndex = draft.allTokens.edges.findIndex(item => item.node.tokenId === tokenId);
        const tokenBurnValue = draft.allTokens.edges[tokenBurnValueIndex];
        let danaBurnUp = tokenBurnValue?.node?.danaBurnUp ?? 0;
        let danaBurnDown = tokenBurnValue?.node?.danaBurnDown ?? 0;
        if (burnType == BurnType.Up) {
          danaBurnUp = danaBurnUp + burnValue;
        } else {
          danaBurnDown = danaBurnDown + burnValue;
        }
        const danaBurnScore = danaBurnUp - danaBurnDown;
        draft.allTokens.edges[tokenBurnValueIndex].node.danaBurnUp = danaBurnUp;
        draft.allTokens.edges[tokenBurnValueIndex].node.danaBurnDown = danaBurnDown;
        draft.allTokens.edges[tokenBurnValueIndex].node.danaBurnScore = danaBurnScore;
      })
    );
  }
  const tokenInvalidatedBy = yield call(tokenApi.util.selectInvalidatedBy, rootState, ['Tokens']);

  yield put(
    tokenApi.util.updateQueryData('Token', { tokenId: tokenId }, draft => {
      let danaBurnUp = draft?.token.danaBurnUp ?? 0;
      let danaBurnDown = draft?.token?.danaBurnDown ?? 0;
      if (burnType == BurnType.Up) {
        danaBurnUp = danaBurnUp + burnValue;
      } else {
        danaBurnDown = danaBurnDown + burnValue;
      }
      const danaBurnScore = danaBurnUp - danaBurnDown;
      draft.token.danaBurnUp = danaBurnUp;
      draft.token.danaBurnDown = danaBurnDown;
      draft.token.danaBurnScore = danaBurnScore;
    })
  );
}

function* watchPrepareBurnCommand() {
  yield takeLatest(prepareBurnCommand.type, prepareBurnCommandSaga);
}

function* watchBurnForUpDownVote() {
  yield takeLatest(burnForUpDownVote.type, burnForUpDownVoteSaga);
}

function* watchBurnForUpDownVoteSuccess() {
  yield takeLatest(burnForUpDownVoteSuccess.type, burnForUpDownVoteSuccessSaga);
}

function* watchBurnForUpDownVoteFailure() {
  yield takeLatest(burnForUpDownVoteFailure.type, burnForUpDownVoteFailureSaga);
}

function* watchCreateTxHex() {
  yield takeLatest(createTxHex.type, createTxHexSaga);
}

function* handleRequest(action) {
  try {
    yield put(setTransactionNotReady());
    yield put(burnForUpDownVote(action.payload));
  } catch (err) {
    console.log(err);
    // Dispatch a failure action with the error message
    // yield put({ type: 'USER_FETCH_FAILED', message: err.message });
  }
}

// This saga will create an action channel and use it to dispatch work to one worker saga
function* watchRequests() {
  const requestChan = yield actionChannel(addBurnTransaction, buffers.expanding(10));

  while (true) {
    // Take an action from the channel
    const transactionStatus = yield select(getTransactionStatus);
    const failQueue = yield select(getFailQueue);

    if (failQueue.length > 0) {
      yield flush(requestChan);
    }

    if (transactionStatus) {
      const action = yield take(requestChan);

      yield call(handleRequest, action);
    } else {
      yield take(setTransactionReady.type);
    }
  }
}

export default function* burnSaga() {
  if (typeof window === 'undefined') {
    yield all([
      fork(watchCreateTxHex),
      fork(watchBurnForUpDownVote),
      fork(watchBurnForUpDownVoteSuccess),
      fork(watchBurnForUpDownVoteFailure)
    ]);
  } else {
    yield all([
      fork(watchRequests),
      fork(watchCreateTxHex),
      fork(watchBurnForUpDownVote),
      fork(watchBurnForUpDownVoteSuccess),
      fork(watchBurnForUpDownVoteFailure),
      fork(watchPrepareBurnCommand)
    ]);
  }
}
