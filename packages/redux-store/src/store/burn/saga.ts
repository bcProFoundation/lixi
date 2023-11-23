/* eslint-disable no-case-declarations */
import { POST_TYPE, PostListType, PostsQueryTag, WORSHIP_TYPES } from '@bcpros/lixi-models/constants';
import {
  Burn,
  BurnCommand,
  BurnExtraArguments,
  BurnForType,
  BurnQueueCommand,
  BurnType
} from '@bcpros/lixi-models/lib/burn';
import { currency } from '@components/Common/Ticker';
import { callConfig } from '@context/shareContext';
import { BurnForItem } from '@generated/index';
import {
  Account,
  Comment,
  CommentType,
  CreateWorshipInput,
  OrderDirection,
  Page,
  Post,
  WorshipOrderField
} from '@generated/types.generated';
import { all, call, fork, take, takeLatest } from '@redux-saga/core/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { PatchCollection } from '@reduxjs/toolkit/dist/query/core/buildThunks';
import { setTransactionNotReady, setTransactionReady } from '@store/account/actions';
import { getSelectedAccount, getTransactionStatus } from '@store/account/selectors';
import { getFailQueue } from '@store/burn';
import { api as commentsApi } from '@store/comment/comments.api';
import { api as pagesApi } from '@store/page/pages.api';
import { api as postsApi } from '@store/post/posts.api';
import { api as templeApi } from '@store/temple/temple.api';
import { api as timelineApi } from '@store/timeline/timeline.api';
import { showToast } from '@store/toast/actions';
import { api as tokenApi } from '@store/token/tokens.api';
import { getAllWalletPaths, getSlpBalancesAndUtxos, getWalletBalances } from '@store/wallet';
import { api as worshipApi } from '@store/worship/worshipedPerson.api';
import { fromSatoshisToXpi, fromSmallestDenomination, fromXpiToSatoshis } from '@utils/cashMethods';
import BigNumber from 'bignumber.js';
import * as _ from 'lodash';
import intl from 'react-intl-universal';
import { buffers } from 'redux-saga';
import { actionChannel, flush, getContext, put, select } from 'redux-saga/effects';
import { match } from 'ts-pattern';
import { hideLoading } from '../loading/actions';
import { getFilterPostsHome, getLevelFilter } from '../settings';
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

import { RootState } from '../store';
import { PostType } from '@prisma/client';

function* prepareBurnCommandSaga(
  action: PayloadAction<{
    isUpVote: boolean;
    burnForItem: BurnForItem;
    burnForType: BurnForType;
    burnValue: string;
  }>
) {
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

    let tipToAddresses: { address: string; amount: string }[] = [];

    switch (burnForType) {
      case BurnForType.Post:
        const post = burnForItem as Post;
        tipToAddresses.push({
          address: post.page ? post.page.pageAccount.address : post.account.address,
          amount: fromXpiToSatoshis(new BigNumber(burnValue).multipliedBy(currency.burnFee)).valueOf().toString()
        });
        break;
      case BurnForType.Page:
        const page = burnForItem as Page;
        tipToAddresses.push({
          address: page.pageAccount.address,
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
      case BurnForType.Comment:
        const comment = burnForItem as Comment;
        const commentToId = comment.commentable.commentToId;
        if (comment.commentable.type === CommentType.Post) {
          const promise = yield put(postsApi.endpoints.Post.initiate({ id: commentToId }));
          yield promise;
          const { post }: { post: Post } = yield promise.unwrap();
          const page = post?.page;
          const pageAddress = page ? page?.pageAccount?.address : undefined;
          const postAddress = post.account.address;
          tipToAddresses.push({
            address: pageAddress ?? postAddress,
            amount: fromXpiToSatoshis(new BigNumber(burnValue).multipliedBy(currency.burnFee)).valueOf().toString()
          });
        }
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
        const post = burnForItem as Post;
        return {
          postQueryTags: [PostsQueryTag.Post],
          postId: burnForItem.id.toString(),
          minBurnFilter: filterValue,
          level: level,
          pageId: post?.page?.id
        };
      })
      .with(BurnForType.Page, () => {
        return {
          pageId: burnForItem.id.toString()
        };
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
  const burnForId = data.burnForId;
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
        yield updateTokenBurnValue(action);
        break;
      case BurnForType.Post:
        yield updatePostBurnValue(action);
        break;
      case BurnForType.Comment:
        yield updateCommentBurnValue(action);
        break;
      case BurnForType.Page:
        yield updatePageBurnValue(action);
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
    } else if (command.burnForType === BurnForType.Post) {
      message = (err as Error)?.message ?? intl.get('post.unableToBurn');
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

  const account = yield select(getSelectedAccount);

  const rootState: RootState = yield select();

  // Update timeline
  const timelineInvalidatedBy = yield call(timelineApi.util.selectInvalidatedBy, rootState, ['HomeTimeline']);
  for (const invalidatedBy of timelineInvalidatedBy) {
    const { endpointName, originalArgs } = invalidatedBy;
    yield put(
      timelineApi.util.updateQueryData('HomeTimeline', originalArgs, draft => {
        const timelineItemToUpdateIndex = draft.homeTimeline.edges.findIndex(
          item => item.node.id === `${POST_TYPE.POST}:${burnForId}`
        );
        const timelineItemToUpdate = draft.homeTimeline.edges[timelineItemToUpdateIndex];
        if (timelineItemToUpdateIndex >= 0) {
          let danaBurnUp = timelineItemToUpdate?.node?.data?.dana?.danaBurnUp ?? 0;
          let danaBurnDown = timelineItemToUpdate?.node?.data?.dana?.danaBurnDown ?? 0;
          let danaReceivedUp = timelineItemToUpdate?.node?.data?.dana?.danaReceivedUp ?? 0;
          let danaReceivedDown = timelineItemToUpdate?.node?.data?.dana?.danaReceivedDown ?? 0;
          if (burnType == BurnType.Up) {
            danaBurnUp = danaBurnUp + burnValue;
            danaReceivedUp = danaReceivedUp + burnValue;
          } else {
            danaBurnDown = danaBurnDown + burnValue;
            danaReceivedDown = danaReceivedDown + burnValue;
          }
          const danaBurnScore = danaBurnUp - danaBurnDown;
          const danaReceivedScore = danaReceivedUp - danaReceivedDown;
          draft.homeTimeline.edges[timelineItemToUpdateIndex].node.data.dana.danaBurnUp = danaBurnUp;
          draft.homeTimeline.edges[timelineItemToUpdateIndex].node.data.dana.danaBurnDown = danaBurnDown;
          draft.homeTimeline.edges[timelineItemToUpdateIndex].node.data.dana.danaBurnScore = danaBurnScore;
          draft.homeTimeline.edges[timelineItemToUpdateIndex].node.data.dana.danaReceivedUp = danaReceivedUp;
          draft.homeTimeline.edges[timelineItemToUpdateIndex].node.data.dana.danaReceivedDown = danaReceivedDown;
          draft.homeTimeline.edges[timelineItemToUpdateIndex].node.data.dana.danaReceivedScore = danaReceivedScore;
          if (
            danaReceivedScore < 0 &&
            account?.id !== draft.homeTimeline.edges[timelineItemToUpdateIndex]?.node?.data?.account?.id
          ) {
            draft.homeTimeline.edges.splice(timelineItemToUpdateIndex, 1);
            draft.homeTimeline.totalCount = draft.homeTimeline.totalCount - 1;
          }
        }
      })
    );
  }

  // Update posts
  const postsInvalidatedBy = yield call(postsApi.util.selectInvalidatedBy, rootState, ['Posts']);
  for (const invalidatedBy of postsInvalidatedBy) {
    const { endpointName, originalArgs } = invalidatedBy;
    yield put(
      postsApi.util.updateQueryData(endpointName, originalArgs, draft => {
        const fields = Object.keys(draft);
        for (const field of fields) {
          if (!draft[field]) continue;
          const postToUpdateIndex = draft[field].edges.findIndex(item => item.node.id === burnForId);
          const postToUpdate = draft[field].edges[postToUpdateIndex];
          if (postToUpdateIndex >= 0) {
            let danaBurnUp = postToUpdate?.node?.dana?.danaBurnUp ?? 0;
            let danaBurnDown = postToUpdate?.node?.dana?.danaBurnDown ?? 0;
            let danaReceivedUp = postToUpdate?.node?.dana?.danaReceivedUp ?? 0;
            let danaReceivedDown = postToUpdate?.node?.dana?.danaReceivedDown ?? 0;
            if (burnType == BurnType.Up) {
              danaBurnUp = danaBurnUp + burnValue;
              danaReceivedUp = danaReceivedUp + burnValue;
            } else {
              danaBurnDown = danaBurnDown + burnValue;
              danaReceivedDown = danaReceivedDown + burnValue;
            }
            const danaBurnScore = danaBurnUp - danaBurnDown;
            const danaReceivedScore = danaReceivedUp - danaReceivedDown;
            draft[field].edges[postToUpdateIndex].node.dana.danaBurnUp = danaBurnUp;
            draft[field].edges[postToUpdateIndex].node.dana.danaBurnDown = danaBurnDown;
            draft[field].edges[postToUpdateIndex].node.dana.danaBurnScore = danaBurnScore;
            draft[field].edges[postToUpdateIndex].node.dana.danaReceivedUp = danaReceivedUp;
            draft[field].edges[postToUpdateIndex].node.dana.danaReceivedDown = danaReceivedDown;
            draft[field].edges[postToUpdateIndex].node.dana.danaReceivedScore = danaReceivedScore;
            if (danaReceivedScore < 0 && account?.id !== draft[field]?.edges[postToUpdateIndex]?.node?.account?.id) {
              draft[field].edges.splice(postToUpdateIndex, 1);
              draft[field].totalCount = draft[field].totalCount - 1;
            }
          }
        }
      })
    );
  }

  // Update single post
  const postInvalidatedBy = yield call(postsApi.util.selectInvalidatedBy, rootState, ['Post']);
  for (const invalidatedBy of postInvalidatedBy) {
    const { endpointName, originalArgs } = invalidatedBy;
    yield put(
      postsApi.util.updateQueryData('Post', originalArgs, draft => {
        let danaBurnUp = draft?.post?.dana?.danaBurnUp ?? 0;
        let danaBurnDown = draft?.post?.dana?.danaBurnDown ?? 0;
        let danaReceivedUp = draft?.post?.dana?.danaReceivedUp ?? 0;
        let danaReceivedDown = draft?.post?.dana?.danaReceivedDown ?? 0;
        if (burnType == BurnType.Up) {
          danaBurnUp = danaBurnUp + burnValue;
          danaReceivedUp = danaReceivedUp + burnValue;
        } else {
          danaBurnDown = danaBurnDown + burnValue;
          danaReceivedDown = danaReceivedDown + burnValue;
        }
        const danaBurnScore = danaBurnUp - danaBurnDown;
        const danaReceivedScore = danaReceivedUp - danaReceivedDown;
        draft.post.dana.danaBurnUp = danaBurnUp;
        draft.post.dana.danaBurnDown = danaBurnDown;
        draft.post.dana.danaBurnScore = danaBurnScore;
        draft.post.dana.danaReceivedUp = danaReceivedUp;
        draft.post.dana.danaReceivedDown = danaReceivedDown;
        draft.post.dana.danaReceivedScore = danaReceivedScore;
      })
    );
  }

  // Update single page
  const pageInvalidatedBy = yield call(pagesApi.util.selectInvalidatedBy, rootState, [{ type: 'Page', id: pageId }]);
  for (const invalidatedBy of pageInvalidatedBy) {
    const { endpointName, originalArgs } = invalidatedBy;
    yield put(
      pagesApi.util.updateQueryData('Page', originalArgs, draft => {
        const { id } = originalArgs;
        if (id !== pageId) return;

        const pageDana = draft?.page?.dana;
        let danaReceivedUp = pageDana?.danaReceivedUp ?? 0;
        let danaReceivedDown = pageDana?.danaReceivedDown ?? 0;
        if (burnType == BurnType.Up) {
          danaReceivedUp = danaReceivedUp + burnValue;
        } else {
          danaReceivedDown = danaReceivedDown + burnValue;
        }
        const danaReceivedScore = danaReceivedUp - danaReceivedDown;
        draft.page.dana.danaReceivedUp = danaReceivedUp;
        draft.page.dana.danaReceivedDown = danaReceivedDown;
        draft.page.dana.danaReceivedScore = danaReceivedScore;
      })
    );
  }

  // Update page timeline
  const pageTimelineInvalidatedBy = yield call(pagesApi.util.selectInvalidatedBy, rootState, ['Pages']);
  for (const invalidatedBy of pageTimelineInvalidatedBy) {
    const { endpointName, originalArgs } = invalidatedBy;
    yield put(
      pagesApi.util.updateQueryData(endpointName, originalArgs, draft => {
        const fields = Object.keys(draft);
        for (const field of fields) {
          if (!draft[field]) continue;
          const pageToUpdateIndex = draft[field]?.edges.findIndex(item => item.node.id === pageId);
          const pageToUpdate = draft[field]?.edges[pageToUpdateIndex];
          if (pageToUpdateIndex >= 0) {
            let danaReceivedUp = pageToUpdate?.node?.dana.danaReceivedUp ?? 0;
            let danaReceivedDown = pageToUpdate?.node?.dana.danaReceivedDown ?? 0;
            if (burnType == BurnType.Up) {
              danaReceivedUp = danaReceivedUp + burnValue;
            } else {
              danaReceivedDown = danaReceivedDown + burnValue;
            }
            const danaReceivedScore = danaReceivedUp - danaReceivedDown;
            draft[field].edges[pageToUpdateIndex].node.dana.danaReceivedUp = danaReceivedUp;
            draft[field].edges[pageToUpdateIndex].node.dana.danaReceivedDown = danaReceivedDown;
            draft[field].edges[pageToUpdateIndex].node.dana.danaReceivedScore = danaReceivedScore;
          }
        }
      })
    );
  }
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

function* updatePageBurnValue(action: PayloadAction<BurnQueueCommand>) {
  const { burnValue: burnValueAsString, burnType, burnForId } = action.payload;
  const burnValue = _.toNumber(burnValueAsString);

  const account = yield select(getSelectedAccount);

  const rootState: RootState = yield select();
  const pagesInvalidatedBy = yield call(pagesApi.util.selectInvalidatedBy, rootState, ['Pages']);

  for (const invalidatedBy of pagesInvalidatedBy) {
    const { endpointName, originalArgs } = invalidatedBy;
    yield put(
      pagesApi.util.updateQueryData(endpointName, originalArgs, draft => {
        const fields = Object.keys(draft);
        for (const field of fields) {
          if (!draft[field]) continue;
          const pageToUpdateIndex = draft[field].edges.findIndex(item => item.node.id === burnForId);
          const commentToUpdate = draft[field].edges[pageToUpdateIndex];
          if (pageToUpdateIndex >= 0) {
            let danaBurnUp = commentToUpdate?.node?.danaBurnUp ?? 0;
            let danaBurnDown = commentToUpdate?.node?.danaBurnDown ?? 0;
            if (burnType == BurnType.Up) {
              danaBurnUp = danaBurnUp + burnValue;
            } else {
              danaBurnDown = danaBurnDown + burnValue;
            }
            const danaBurnScore = danaBurnUp - danaBurnDown;
            draft[field].edges[pageToUpdateIndex].node.danaBurnUp = danaBurnUp;
            draft[field].edges[pageToUpdateIndex].node.danaBurnDown = danaBurnDown;
            draft[field].edges[pageToUpdateIndex].node.danaBurnScore = danaBurnScore;
            if (danaBurnScore < 0 && account?.id !== draft[field].edges[pageToUpdateIndex]?.node?.commentAccount.id) {
              // Hide the comment with dana < 0
              draft[field].edges.splice(pageToUpdateIndex, 1);
              draft[field].totalCount = draft[field].totalCount - 1;
            }
          }
        }
      })
    );
  }
}

function* updateCommentBurnValue(action: PayloadAction<BurnQueueCommand>) {
  const { burnValue: burnValueAsString, burnType, burnForId } = action.payload;
  const burnValue = _.toNumber(burnValueAsString);

  const account = yield select(getSelectedAccount);

  const rootState: RootState = yield select();
  const commentsInvalidatedBy = yield call(commentsApi.util.selectInvalidatedBy, rootState, ['Comments']);

  for (const invalidatedBy of commentsInvalidatedBy) {
    const { endpointName, originalArgs } = invalidatedBy;
    yield put(
      commentsApi.util.updateQueryData(endpointName, originalArgs, draft => {
        const fields = Object.keys(draft);
        for (const field of fields) {
          if (!draft[field]) continue;
          const commentToUpdateIndex = draft[field].edges.findIndex(item => item.node.id === burnForId);
          const commentToUpdate = draft[field].edges[commentToUpdateIndex];
          if (commentToUpdateIndex >= 0) {
            let danaBurnUp = commentToUpdate?.node?.danaBurnUp ?? 0;
            let danaBurnDown = commentToUpdate?.node?.danaBurnDown ?? 0;
            if (burnType == BurnType.Up) {
              danaBurnUp = danaBurnUp + burnValue;
            } else {
              danaBurnDown = danaBurnDown + burnValue;
            }
            const danaBurnScore = danaBurnUp - danaBurnDown;
            draft[field].edges[commentToUpdateIndex].node.danaBurnUp = danaBurnUp;
            draft[field].edges[commentToUpdateIndex].node.danaBurnDown = danaBurnDown;
            draft[field].edges[commentToUpdateIndex].node.danaBurnScore = danaBurnScore;
            if (
              danaBurnScore < 0 &&
              account?.id !== draft[field].edges[commentToUpdateIndex]?.node?.commentAccount.id
            ) {
              // Hide the comment with dana < 0
              draft[field].edges.splice(commentToUpdateIndex, 1);
              draft[field].totalCount = draft[field].totalCount - 1;
            }
          }
        }
      })
    );
  }
}

function* updateTokenBurnValue(action: PayloadAction<BurnQueueCommand>) {
  const { burnValue: burnValueAsString, burnType, burnForId } = action.payload;
  const id = burnForId;
  let burnValue = _.toNumber(burnValueAsString);

  const rootState: RootState = yield select();
  const tokensInvalidatedBy = yield call(tokenApi.util.selectInvalidatedBy, rootState, ['Tokens']);
  for (const invalidatedBy of tokensInvalidatedBy) {
    const { originalArgs } = invalidatedBy;
    yield put(
      tokenApi.util.updateQueryData('Tokens', originalArgs, draft => {
        const fields = Object.keys(draft);
        for (const field of fields) {
          if (!draft[field]) continue;
          const tokenBurnValueIndex = draft[field]?.edges?.findIndex(item => item?.node?.id === id);
          const tokenBurnValue = draft[field]?.edges[tokenBurnValueIndex];
          let danaBurnUp = tokenBurnValue?.node?.dana?.danaBurnUp ?? 0;
          let danaBurnDown = tokenBurnValue?.node?.dana?.danaBurnDown ?? 0;
          if (burnType == BurnType.Up) {
            danaBurnUp = danaBurnUp + burnValue;
          } else {
            danaBurnDown = danaBurnDown + burnValue;
          }
          const danaBurnScore = danaBurnUp - danaBurnDown;
          draft[field].edges[tokenBurnValueIndex].node.dana.danaBurnUp = danaBurnUp;
          draft[field].edges[tokenBurnValueIndex].node.dana.danaBurnDown = danaBurnDown;
          draft[field].edges[tokenBurnValueIndex].node.dana.danaBurnScore = danaBurnScore;
        }
      })
    );
  }
  const tokenInvalidatedBy = yield call(tokenApi.util.selectInvalidatedBy, rootState, [{ type: 'Token', id: id }]);
  for (const invalidatedBy of tokenInvalidatedBy) {
    const { endpointName, originalArgs } = invalidatedBy;
    yield put(
      tokenApi.util.updateQueryData(endpointName, originalArgs, draft => {
        const fields = Object.keys(draft);
        for (const field of fields) {
          if (!draft[field]) continue;
          let danaBurnUp = draft[field].danaBurnUp ?? 0;
          let danaBurnDown = draft[field].danaBurnDown ?? 0;
          if (burnType == BurnType.Up) {
            danaBurnUp = danaBurnUp + burnValue;
          } else {
            danaBurnDown = danaBurnDown + burnValue;
          }
          const danaBurnScore = danaBurnUp - danaBurnDown;
          draft[field].danaBurnUp = danaBurnUp;
          draft[field].danaBurnDown = danaBurnDown;
          draft[field].danaBurnScore = danaBurnScore;
        }
      })
    );
  }
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
