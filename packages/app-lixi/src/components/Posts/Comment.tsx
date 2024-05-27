import React, { useContext, useEffect, useRef, useState } from 'react';
import { AutoComplete, Button, Input, Modal, Skeleton } from 'antd';
import styled from 'styled-components';
import InfiniteScroll from 'react-infinite-scroll-component';
import CommentListItem from './CommentListItem';
import AvatarUser from '@components/Common/AvatarUser';
import { Controller, useForm } from 'react-hook-form';
import { useInfiniteCommentsToCommentableIdQuery } from '@store/comment/useInfiniteCommentsToCommentableIdQuery';
import {
  Coin,
  CommentOrderField,
  CommentQueryItem,
  CreateCommentInput,
  OrderDirection,
  PostQueryItem
} from '@generated/index';
import { useRouter } from 'next/router';
import { useSliceDispatch, useSliceSelector } from '@store/index';
import {
  getAccountInfoTemp,
  getCommentUpload,
  getSelectedAccount,
  removeUpload,
  removeUploadFromCache
} from '@store/account';
import intl from 'react-intl-universal';
import { CloseOutlined, SendOutlined } from '@ant-design/icons';
import _ from 'lodash';
import { sendCoinFailure, sendCoinSuccess } from '@store/send/actions';
import { fromSmallestDenomination, getUtxoWif } from '@utils/cashMethods';
import { coinInfo, COIN } from '@bcpros/lixi-models/constants';
import { WalletContext } from '@context/index';
import useXPI from '@hooks/useXPI';
import useXEC from '@hooks/useXEC';
import { getAllWalletPaths, getSlpBalancesAndUtxos, getWalletStatus } from '@store/wallet';
import { useCreateCommentMutation, useCreateReplyCommentMutation } from '@store/comment/comments.api';
import { showToast } from '@store/toast/actions';
import { MultiUploader } from '@components/Common/Uploader/MultiUploader';
import { UPLOAD_TYPES } from '@bcpros/lixi-models/constants';
import { createCommentSuccess } from '@store/comment';
import { AuthorizationContext } from '@context/index';
import useAuthorization from '@components/Common/Authorization/use-authorization.hooks';
import { getScrollToCommentId, setScrollToCommentId } from '@store/account';
import { Utxo } from 'chronik-client';

const { Search, TextArea } = Input;
type CommentProps = {
  post: PostQueryItem;
};

const CommentsContainer = styled.div`
  .infiniteScroll-comment:last-child {
    margin-bottom: 1rem;
  }
  padding: 0 1rem;
  .comment-item {
    text-align: left;
    border: 0 !important;
    .ant-comment-inner {
      padding: 10px 0 8px 0;
      .ant-comment-avatar {
        .ant-avatar {
          width: 37px !important;
          height: 37px !important;
          font-size: 14px;
        }
      }
      .ant-comment-content-detail .reply-comment-jump {
        cursor: pointer;
        padding: 5px;
        border-left: 4px solid var(--color-primary);
        background-color: #faf0fa;
        border-radius: 5px;
        .reply-comment-jump-name {
          font-weight: 600;
        }
        .reply-comment-jump-content {
        }
      }
    }

    .ant-comment-actions {
      margin-top: 4px;
    }
    .ant-comment-content-author-name {
      text-transform: capitalize;
    }
  }
`;

const CommentInputContainer = styled.div`
  position: sticky;
  z-index: 999;
  bottom: -1px;
  display: flex;
  flex-direction: column;
  padding: 0 1rem 1rem;
  background-color: #fff;
  .ava-ico-cmt {
    padding-top: 1px;
    .ant-avatar {
      width: 40px !important;
      height: 40px !important;
    }
  }
  .ant-input-affix-wrapper {
    border-top-left-radius: 6px !important;
    border-bottom-left-radius: 6px !important;
    input {
      font-size: 13px;
    }
  }
  .ant-input-group-addon {
    button {
      border-top-right-radius: 6px !important;
      border-bottom-right-radius: 6px !important;
    }
  }

  .comment-input {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: flex-start;
    gap: 1rem;
  }

  .reply-comment-box {
    border-top: 1px solid #d6d6d6;
    padding: 7px 5px 12px;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 3px;

    .close-reply-comment {
      position: absolute;
      top: 5px;
      right: 15px;
    }

    .reply-to-name {
      font-size: 1rem;
      font-weight: 600;
    }

    .reply-content {
      color: #65676b;
    }
  }
`;

const StyledTextArea = styled(TextArea)`
  border: none;
`;

const StyledCommentContainer = styled.div`
  border: 1px solid var(--border-color-dark-base);
  border-radius: var(--border-radius-primary);
  width: 100%;
  padding: 5px 0px;
  display: flex;
  align-items: center;
`;

const StyledIconContainer = styled.div`
  display: flex;
  flex-direction: row-reverse;
  margin-right: 5px;
`;

const StyledCommentImageContainer = styled.div`
  max-width: 100%;
  margin-bottom: 2rem;
  .images-post-mobile {
    display: flex;
    overflow-x: auto;
    gap: 5px;
    -ms-overflow-style: none; // Internet Explorer 10+
    scrollbar-width: none; // Firefox
    ::-webkit-scrollbar {
      display: none; // Safari and Chrome
    }
    img {
      width: auto;
      height: auto;
      max-width: 100% !important;
      max-height: 30vh !important;
      object-fit: cover;
      border-radius: var(--border-radius-item);
      border: 1px solid var(--lt-color-gray-100);
    }
    &.only-one-image {
      img {
        width: 100%;
        max-width: 100%;
      }
    }
  }
  .item-image-upload {
    position: relative;
    margin-left: 30px;
    button {
      position: absolute;
      z-index: 9;
      right: 0;
      background: #303031;
      margin: 4px;
      .anticon {
        color: #fff;
      }
    }
  }
  .react-photo-gallery--gallery > div {
    gap: 5px;
  }
`;

const ModalResend = styled(Modal)`
  .ant-modal-header {
    padding: 16px 32px;
    .ant-modal-title {
      font-size: 20px;
    }
  }
  .ant-modal-body {
    padding: 0 24px;
  }

  .ant-modal-footer {
    .ant-btn:hover {
      color: var(--color-primary);
      -webkit-transition: color 0.3s;
      transition: color 0.3s;
      background-color: #fff;
      border-color: var(--color-primary);
    }
  }
`;

const commentCommand = [
  {
    label: '/xpi',
    value: '/xpi'
  },
  {
    label: '/xec',
    value: '/xec'
  }
];

const Comment = ({ post }: CommentProps) => {
  const router = useRouter();
  const dispatch = useSliceDispatch();
  const Wallet = React.useContext(WalletContext);
  const { XPI, chronik, getUtxosByCoin } = Wallet;
  const { sendXpi } = useXPI();
  const { sendXec } = useXEC();
  const [open, setOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const walletStatus = useSliceSelector(getWalletStatus);
  const slpBalancesAndUtxos = useSliceSelector(getSlpBalancesAndUtxos);
  const slpBalancesAndUtxosRef = useRef(slpBalancesAndUtxos);
  const walletPaths = useSliceSelector(getAllWalletPaths);
  const { control, getValues, setValue, setFocus, resetField } = useForm();
  const accountInfoTemp = useSliceSelector(getAccountInfoTemp);
  const selectedAccount = useSliceSelector(getSelectedAccount);
  const [isSendingCoin, setIsSendingCoin] = useState<boolean>(false);
  const commentUpload = useSliceSelector(getCommentUpload);
  const inputText = useRef(null);
  const multiUploader = useRef(null);
  const txFee = Math.ceil(Wallet.XPI.BitcoinCash.getByteCount({ P2PKH: 1 }, { P2PKH: 1 }) * 2.01); //satoshi
  const authorization = useContext(AuthorizationContext);
  const askAuthorization = useAuthorization();
  const [openModalResend, setOpenModalResend] = useState(false);
  const [isReplyComment, setIsReplyComment] = useState(false);
  const [replyCommentData, setReplyCommentData] = useState<CommentQueryItem>(null);
  const previousComment = useRef({ text: '', commentId: '', commentAddress: '', commentHash160: '' });
  const refsComment = useRef({});
  const currentPathName = router.pathname ?? '';

  const [
    createCommentTrigger,
    { isLoading: isLoadingCreateComment, isSuccess: isSuccessCreateComment, isError: isErrorCreateComment }
  ] = useCreateCommentMutation();

  const [
    createReplyCommentTrigger,
    { isLoading: isLoadingCreateReplyComment, isSuccess: isSuccessCreateReplyComment }
  ] = useCreateReplyCommentMutation();

  const { data, totalCount, fetchNext, hasNext, isFetching } = useInfiniteCommentsToCommentableIdQuery(
    {
      first: 20,
      orderBy: {
        direction: OrderDirection.Asc,
        field: CommentOrderField.UpdatedAt
      },
      id: post.commentableId
    },
    false
  );

  useEffect(() => {
    inputText.current?.addEventListener('paste', handlePasteImage);
    return () => {
      inputText.current?.removeEventListener('paste', handlePasteImage);
    };
  }, []);
  const scrollToCommentId = useSliceSelector(getScrollToCommentId);

  useEffect(() => {
    if (scrollToCommentId) {
      const elementJumped = refsComment.current[scrollToCommentId];
      if (elementJumped) {
        setTimeout(() => {
          elementJumped.firstChild.classList.add('active-comment');
          elementJumped.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);

        dispatch(setScrollToCommentId(null));
      }
    }
  });

  const showTextComment = () => {
    if (post.page) {
      return post.page.createCommentFee != '0'
        ? intl.get('comment.writeCommentXpi', {
            commentFee: `${post.page.createCommentFee} ${coinInfo[COIN.XPI].ticker}`
          })
        : intl.get('comment.writeCommentFree');
    } else if (post.account.createCommentFee && _.isNil(post.page)) {
      return post.account.createCommentFee != '0'
        ? intl.get('comment.writeCommentXpi', {
            commentFee: `${post.account.createCommentFee} ${coinInfo[COIN.XPI].ticker}`
          })
        : intl.get('comment.writeCommentFree');
    } else {
      return intl.get('comment.writeComment');
    }
  };

  const loadMoreComments = () => {
    if (hasNext && !isFetching) {
      fetchNext();
    } else if (hasNext) {
      fetchNext();
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent the default behavior of adding a new line
      //don't allow create comment when previous comment not loading yet
      if (isReplyComment) {
        if (isLoadingCreateReplyComment || isSendingCoin || isUploadingImage) return;
        await processComment(
          e.currentTarget.value,
          true,
          replyCommentData.id,
          replyCommentData.commentAccount.address,
          replyCommentData.commentAccount.hash160
        ); // Call your function to post the comment
      } else {
        if (isLoadingCreateComment || isSendingCoin || isUploadingImage) return;
        await processComment(e.currentTarget.value); // Call your function to post the comment
      }
    }
  };

  const setUploadingImage = (value: boolean) => {
    setIsUploadingImage(value);
  };

  useEffect(() => {
    if (slpBalancesAndUtxos === slpBalancesAndUtxosRef.current) return;
    setIsSendingCoin(false);
  }, [slpBalancesAndUtxos.nonSlpUtxos]);

  const handleRemoveCommentUpload = imgId => {
    if (imgId) {
      dispatch(removeUpload({ uploadType: UPLOAD_TYPES.COMMENT, id: imgId }));
    }
  };

  const processComment = async (
    comment: string,
    isReplyComment = false,
    replyToCommentId: string = '',
    replyCommentAdress: string = '',
    commentHash160: string = ''
  ) => {
    previousComment.current = {
      text: comment,
      commentId: replyToCommentId,
      commentAddress: replyCommentAdress,
      commentHash160: commentHash160
    };
    resetField('comment');

    //Check if the message is not empty
    if (comment && comment !== '') {
      const trimComment = comment.trim();

      if (_.isNil(trimComment) || trimComment === '') {
        return;
      }

      //Check if comment is tip
      const arrayStringComment = trimComment.toUpperCase().split(' ');
      const indexOfGiveString = arrayStringComment.findIndex(
        item => item.startsWith('/') && Object.values(COIN).includes(item.substring(1, item.length) as COIN)
      );
      //find and it't not last element
      if (indexOfGiveString !== -1 && indexOfGiveString !== arrayStringComment.length - 1) {
        const amount: string = arrayStringComment[indexOfGiveString + 1];
        const textGive = arrayStringComment[indexOfGiveString];
        const coinGive = textGive.substring(1, textGive.length) as COIN;

        const { nonSlpUtxos } = await getUtxosByCoin(coinGive);
        const utxos = selectedAccount?.currentCoin === coinGive ? slpBalancesAndUtxos.nonSlpUtxos : nonSlpUtxos;
        const balances = utxos.reduce((accu, currentValue) => accu + parseFloat(currentValue.value), 0);

        //check if amount is valid
        if (validateCoinAmount(amount, balances, coinGive)) {
          let tipHex = undefined;
          tipHex = await giveCoinAsTip(
            trimComment,
            amount,
            isReplyComment,
            replyCommentAdress,
            commentHash160,
            coinGive,
            utxos
          ).then(result => {
            return result;
          });

          if (tipHex) {
            const createCommentInput: CreateCommentInput = {
              commentText: trimComment,
              commentableId: post.commentableId,
              tipHex: tipHex,
              uploadId: commentUpload?.id || undefined,
              replyToCommentId: isReplyComment ? replyToCommentId : '',
              coinGive: coinGive as unknown as Coin
            };

            await createComment(createCommentInput, isReplyComment);
            dispatch(sendCoinSuccess({ amount: parseFloat(amount), coin: coinGive }));
          }
        } else {
          dispatch(sendCoinFailure(intl.get('send.notEnoughtFund')));
        }
      } else if (
        //Check if post owner self comment
        (post.page &&
          post?.page?.createCommentFee !== '0' &&
          selectedAccount.address !== post?.page?.pageAccount.address) ||
        (post?.account?.createCommentFee !== '0' && selectedAccount.address !== post?.account?.address)
      ) {
        try {
          let createFeeHex = undefined;
          createFeeHex = await giveXPIAsFee(post);

          if (createFeeHex) {
            const createCommentInput: CreateCommentInput = {
              commentText: trimComment,
              commentableId: post.commentableId,
              createFeeHex: createFeeHex,
              uploadId: commentUpload?.id || undefined,
              replyToCommentId: isReplyComment ? replyToCommentId : ''
            };

            await createComment(createCommentInput, isReplyComment);
          } else {
            throw new Error(intl.get('account.insufficientFunds'));
          }
        } catch (e: any) {
          dispatch(sendCoinFailure(e.message));
        }
      } else {
        const createCommentInput: CreateCommentInput = {
          commentText: trimComment,
          commentableId: post.commentableId,
          uploadId: commentUpload?.id || undefined,
          replyToCommentId: isReplyComment ? replyToCommentId : ''
        };

        await createComment(createCommentInput, isReplyComment);
      }
    } else if (commentUpload) {
      if (
        //Check if post owner self comment
        (post.page &&
          post?.page?.createCommentFee !== '0' &&
          selectedAccount.address !== post?.page?.pageAccount.address) ||
        (post?.account?.createCommentFee !== '0' && selectedAccount.address !== post?.account?.address)
      ) {
        try {
          let createFeeHex = undefined;
          createFeeHex = await giveXPIAsFee(post);

          if (createFeeHex) {
            const createCommentInput: CreateCommentInput = {
              commentText: '',
              commentableId: post.commentableId,
              createFeeHex: createFeeHex,
              uploadId: commentUpload?.id || undefined,
              replyToCommentId: isReplyComment ? replyToCommentId : ''
            };

            await createComment(createCommentInput, isReplyComment);
          } else {
            throw new Error(intl.get('account.insufficientFunds'));
          }
        } catch (e: any) {
          dispatch(sendCoinFailure(e.message));
        }
      } else {
        const createCommentInput: CreateCommentInput = {
          commentText: '',
          commentableId: post.commentableId,
          uploadId: commentUpload?.id || undefined,
          replyToCommentId: isReplyComment ? replyToCommentId : ''
        };

        await createComment(createCommentInput, isReplyComment);
      }
    }
  };

  const validateCoinAmount = (value: string, balances: number, coin: COIN): boolean => {
    if (!value) return false;

    //check if value is number;
    if (isNaN(parseFloat(value))) return false;

    //check if value is positive number
    if (parseFloat(value) <= 0) return false;

    //check if balance is smaller than value
    if (fromSmallestDenomination(balances, coin) <= parseFloat(value)) return false;

    return true;
  };

  const giveCoinAsTip = async (
    text: string,
    amount: string,
    isReplyComment: boolean,
    replyCommentAdress: string,
    recipientHash160: string,
    coin = COIN.XPI,
    nonSlpUtxos: (Utxo & { address: string })[]
  ): Promise<string> => {
    setIsSendingCoin(true);
    try {
      let tipHex;
      const fundingWif = getUtxoWif(nonSlpUtxos[0], walletPaths, coin);

      switch (coin) {
        case COIN.XPI:
          const recipientAddress = isReplyComment ? replyCommentAdress : post.account.address;
          tipHex = await sendXpi(
            XPI,
            chronik,
            walletPaths,
            nonSlpUtxos,
            coinInfo[COIN.XPI].defaultFee,
            '',
            false, // indicate send mode is one to one
            null,
            recipientAddress,
            amount,
            true,
            fundingWif,
            true
          ).catch(error => {
            throw error;
          });
          break;
        case COIN.XEC:
          const recipientHash = isReplyComment ? recipientHash160 : post.account.hash160;
          tipHex = await sendXec(
            chronik,
            fundingWif,
            nonSlpUtxos,
            coinInfo[COIN.XEC].defaultFee,
            undefined,
            false, //indicate send mode is one to one
            null,
            recipientHash,
            Number.parseFloat(amount),
            coinInfo[COIN.XEC].etokenSats,
            true // return hex
          ).catch(error => {
            throw error;
          });
          break;
      }
      return tipHex;
    } catch (e) {
      const message = e.message || e.error || JSON.stringify(e);
      setIsSendingCoin(false);

      dispatch(sendCoinFailure(message));
    }
  };

  const giveXPIAsFee = async (post: PostQueryItem): Promise<string> => {
    setIsSendingCoin(true);
    try {
      let createFeeHex = undefined;
      const fundingWif = getUtxoWif(slpBalancesAndUtxos.nonSlpUtxos[0], walletPaths);
      if (post.page && post.page.createCommentFee !== '0') {
        createFeeHex = await sendXpi(
          XPI,
          chronik,
          walletPaths,
          slpBalancesAndUtxos.nonSlpUtxos,
          coinInfo[COIN.XPI].defaultFee,
          '',
          false, // indicate send mode is one to one
          null,
          post.page.pageAccount.address,
          post.page.createCommentFee,
          true,
          fundingWif,
          true
        );
      } else if (post.account.createCommentFee !== '0') {
        createFeeHex = await sendXpi(
          XPI,
          chronik,
          walletPaths,
          slpBalancesAndUtxos.nonSlpUtxos,
          coinInfo[COIN.XPI].defaultFee,
          '',
          false, // indicate send mode is one to one
          null,
          post.account.address,
          post.account.createCommentFee,
          true,
          fundingWif,
          true
        );
      }

      return createFeeHex;
    } catch (e) {
      setIsSendingCoin(false);
    }
  };

  const createComment = async (input: CreateCommentInput, isReplyComment = false) => {
    try {
      let newCommentId;
      if (isReplyComment) {
        const result = await createReplyCommentTrigger({ input: input }).unwrap();
        newCommentId = result.createReplyComment.id;
        dispatch(createCommentSuccess({ dataCreateReplyComment: result, isReplyComment }));
      } else {
        const result = await createCommentTrigger({ input: input }).unwrap();
        newCommentId = result.createComment.id;
        dispatch(createCommentSuccess({ dataCreateComment: result, isReplyComment }));
      }

      // scroll to new-comment
      setTimeout(() => {
        const elementJumped = refsComment.current[newCommentId];
        if (elementJumped) {
          elementJumped.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 10);

      if (commentUpload) {
        dispatch(removeUploadFromCache({ uploadType: UPLOAD_TYPES.COMMENT }));
      }
      //reset reply comment
      setIsReplyComment(false);
      setReplyCommentData(null);
      setIsSendingCoin(false);
    } catch (error) {
      const message = intl.get('comment.unableCreateComment');
      dispatch(
        showToast('error', {
          message: 'Error',
          description: message,
          duration: 3
        })
      );
      setIsSendingCoin(false);
      setOpenModalResend(true);
    }
  };

  const handlePasteImage = evt => {
    const clipboardItems = evt.clipboardData.items;
    const items: DataTransferItem[] | unknown[] = Array.from(clipboardItems).filter(function (item: DataTransferItem) {
      // Filter the image items only
      return /^image\//.test(item.type);
    });
    if (items.length === 0) {
      return;
    }

    const item = items[0] as DataTransferItem;
    const blob = item.getAsFile();
    const blobName = blob.name ?? 'image.png';
    const blobType = blob.type ?? 'image/png';
    const blobLastModified = blob.lastModified ?? Date.now();

    let file = new File([blob], blobName, { type: blobType, lastModified: blobLastModified });

    multiUploader.current?.uploadImageFromClipboard({ file: file });
  };

  const onClickAccountAvatar = () => {
    if (authorization.authorized) {
      router.push(`/profile/${selectedAccount?.address}`);
    } else {
      askAuthorization();
    }
  };

  const replyCommentUI = () => {
    return isReplyComment ? (
      <div className="reply-comment-box">
        <Button
          type="text"
          className="no-border-btn close-reply-comment"
          icon={<CloseOutlined />}
          onClick={() => setIsReplyComment(false)}
        />
        <div className="reply-to-name">
          {intl.get('comment.replyTo', { name: replyCommentData.commentAccount.name })}
        </div>
        <div className="reply-content hide-content">{replyCommentData.commentText}</div>
      </div>
    ) : undefined;
  };

  const mainInputComment = (
    <>
      <CommentInputContainer className="comment-input-container">
        {replyCommentUI()}
        <div className="comment-input">
          <div className="ava-ico-cmt" onClick={() => onClickAccountAvatar()}>
            <AvatarUser icon={accountInfoTemp?.avatar} name={selectedAccount?.name} isMarginRight={false} />
          </div>
          <StyledCommentContainer
            className="comment-container"
            ref={inputText}
            onClick={() => {
              if (!authorization.authorized) {
                askAuthorization();
              }
            }}
          >
            <Controller
              name="comment"
              key="comment"
              control={control}
              render={({ field: { onChange, onBlur, value, ref } }) => (
                <AutoComplete
                  onSelect={() => {
                    setOpen(false);
                  }}
                  options={commentCommand}
                  open={open}
                  onChange={onChange}
                  onBlur={onBlur}
                  value={value}
                  onSearch={value => {
                    //TODO: This is not the best way to implement. Will come back later
                    if (/\d+$/.test(value) || value === '') {
                      setOpen(false);
                    } else if (value.startsWith('/')) {
                      setOpen(true);
                    }
                  }}
                  defaultActiveFirstOption
                  getPopupContainer={trigger => trigger.parentElement}
                  disabled={!authorization.authorized}
                  style={{ width: '-webkit-fill-available', textAlign: 'left' }}
                >
                  <StyledTextArea
                    style={{ fontSize: '12px' }}
                    ref={ref}
                    onChange={onChange}
                    onBlur={onBlur}
                    value={value}
                    placeholder={showTextComment()}
                    size="large"
                    autoSize
                    onKeyDown={handleKeyDown}
                    className={'test-focus'}
                  />
                </AutoComplete>
              )}
            />
            <StyledIconContainer>
              <Button
                type="text"
                disabled={isLoadingCreateComment || isSendingCoin || isUploadingImage || !authorization.authorized}
                style={{ borderColor: 'transparent !important' }}
                onClick={async () => {
                  isReplyComment
                    ? await processComment(
                        getValues('comment'),
                        true,
                        replyCommentData.id,
                        replyCommentData.commentAccount.address,
                        replyCommentData.commentAccount.hash160
                      )
                    : await processComment(getValues('comment'));
                }}
                icon={
                  <SendOutlined
                    style={{ fontSize: '20px' }}
                    disabled={isLoadingCreateComment || isSendingCoin || isUploadingImage || !authorization.authorized}
                  />
                }
              />
              <MultiUploader
                type={UPLOAD_TYPES.COMMENT}
                isIcon={true}
                ref={multiUploader}
                icon={'/images/ico-picture.svg'}
                buttonName=" "
                buttonType="text"
                showUploadList={false}
                loading={isUploadingImage}
                setUploadingImage={setUploadingImage}
                multiple={false}
                disabled={isLoadingCreateComment || isSendingCoin || isUploadingImage || !authorization.authorized}
              />
            </StyledIconContainer>
          </StyledCommentContainer>
        </div>
      </CommentInputContainer>
      {commentUpload && !commentUpload?.commentId && (
        <StyledCommentImageContainer>
          <div className="images-post images-post-mobile only-one-image">
            <div className="item-image-upload">
              <picture>
                <img
                  src={`${process.env.NEXT_PUBLIC_CF_IMAGES_DELIVERY_URL}/${process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH}/${commentUpload.cfImageId}/public`}
                  alt={commentUpload?.originalFilename}
                  width={commentUpload?.width}
                  height={commentUpload?.height}
                />
              </picture>
              <Button
                type="text"
                className="no-border-btn"
                icon={<CloseOutlined />}
                onClick={() => handleRemoveCommentUpload(commentUpload?.id)}
              />
            </div>
          </div>
        </StyledCommentImageContainer>
      )}
    </>
  );

  const setReplyCommentCustom = (display: boolean, item: CommentQueryItem) => {
    setIsReplyComment(display);
    setReplyCommentData(item);
  };

  const setFocusComment = () => {
    setFocus('comment');
  };

  return (
    <React.Fragment>
      <CommentsContainer>
        <InfiniteScroll
          key={data.length}
          dataLength={data.length}
          next={loadMoreComments}
          hasMore={hasNext}
          loader={<Skeleton style={{ marginTop: '1rem' }} avatar active />}
          scrollableTarget={currentPathName == '/' ? 'scrollableComment' : 'scrollableDiv'}
          className="infiniteScroll-comment"
        >
          {data.map(item => {
            return (
              <div
                ref={element => {
                  refsComment.current[item.id] = element;
                }}
              >
                <CommentListItem
                  key={`item-${item.id}`}
                  item={item}
                  post={post}
                  setReplyCommentCustom={setReplyCommentCustom}
                  setFocusComment={setFocusComment}
                  refsComment={refsComment.current}
                />
              </div>
            );
          })}
        </InfiniteScroll>
      </CommentsContainer>
      {mainInputComment}

      <ModalResend
        title={<div>{intl.get('comment.failAndResend')}</div>}
        open={openModalResend}
        onCancel={() => setOpenModalResend(false)}
        onOk={async () => {
          setOpenModalResend(false);
          const { text, commentId, commentAddress, commentHash160 } = previousComment.current;
          await processComment(text, isReplyComment, commentId, commentAddress, commentHash160);
        }}
        okText={<span>{intl.get('comment.resend')}</span>}
      >
        <p>
          {intl.get('label.comment')}: {previousComment.current.text}
        </p>
      </ModalResend>
    </React.Fragment>
  );
};

export default Comment;
