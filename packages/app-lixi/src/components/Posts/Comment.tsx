import React, { useContext, useEffect, useRef, useState } from 'react';
import { AutoComplete, Button, Input, Modal, Skeleton } from 'antd';
import styled from 'styled-components';
import InfiniteScroll from 'react-infinite-scroll-component';
import CommentListItem from './CommentListItem';
import AvatarUser from '@components/Common/AvatarUser';
import { Controller, useForm } from 'react-hook-form';
import { useInfiniteCommentsToCommentableIdQuery } from '@store/comment/useInfiniteCommentsToCommentableIdQuery';
import { CommentOrderField, CreateCommentInput, OrderDirection, PostQueryItem } from '@generated/index';
import { useRouter } from 'next/router';
import { useAppDispatch, useAppSelector } from '@store/hooks';
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
import { sendXPIFailure, sendXPISuccess } from '@store/send/actions';
import { fromSmallestDenomination, getUtxoWif } from '@utils/cashMethods';
import { currency } from '@components/Common/Ticker';
import { WalletContext } from '@context/index';
import useXPI from '@hooks/useXPI';
import { getAllWalletPaths, getSlpBalancesAndUtxos, getWalletStatus } from '@store/wallet';
import { useCreateCommentMutation } from '@store/comment/comments.api';
import { showToast } from '@store/toast/actions';
import { MultiUploader } from '@components/Common/Uploader/MultiUploader';
import { UPLOAD_TYPES } from '@bcpros/lixi-models/constants';
import { createCommentSuccess } from '@store/comment';
import { AuthorizationContext } from '@context/index';
import useAuthorization from '@components/Common/Authorization/use-authorization.hooks';

const { Search, TextArea } = Input;
type CommentProps = {
  post: PostQueryItem;
};

const CommentsContainer = styled.div`
  padding: 0 1rem;
  .comment-item {
    text-align: left;
    border: 0 !important;
    .ant-comment-inner {
      padding: 16px 0 8px 0;
      .ant-comment-avatar {
        .ant-avatar {
          width: 37px !important;
          height: 37px !important;
          font-size: 14px;
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
  flex-direction: row;
  justify-content: flex-start;
  align-items: flex-start;
  margin-top: 1rem;
  gap: 1rem;
  padding: 1rem;
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
      max-width: 75vw !important;
      height: 20vh;
      object-fit: cover;
      border-radius: var(--border-radius-primary);
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
    label: '/give',
    value: '/give'
  }
];

const Comment = ({ post }: CommentProps) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const Wallet = React.useContext(WalletContext);
  const { XPI, chronik } = Wallet;
  const { sendXpi } = useXPI();
  const [open, setOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const walletStatus = useAppSelector(getWalletStatus);
  const slpBalancesAndUtxos = useAppSelector(getSlpBalancesAndUtxos);
  const slpBalancesAndUtxosRef = useRef(slpBalancesAndUtxos);
  const walletPaths = useAppSelector(getAllWalletPaths);
  const { control, getValues, setValue, setFocus, resetField } = useForm();
  const accountInfoTemp = useAppSelector(getAccountInfoTemp);
  const selectedAccount = useAppSelector(getSelectedAccount);
  const [isSendingXPI, setIsSendingXPI] = useState<boolean>(false);
  const commentUpload = useAppSelector(getCommentUpload);
  const inputText = useRef(null);
  const multiUploader = useRef(null);
  const txFee = Math.ceil(Wallet.XPI.BitcoinCash.getByteCount({ P2PKH: 1 }, { P2PKH: 1 }) * 2.01); //satoshi
  const authorization = useContext(AuthorizationContext);
  const askAuthorization = useAuthorization();
  const [openModalResend, setOpenModalResend] = useState(false);
  const previoutComment = useRef('');

  const [
    createCommentTrigger,
    { isLoading: isLoadingCreateComment, isSuccess: isSuccessCreateComment, isError: isErrorCreateComment }
  ] = useCreateCommentMutation();

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

  const showTextComment = () => {
    if (post.page) {
      return post.page.createCommentFee != '0'
        ? intl.get('comment.writeCommentXpi', { commentFee: `${post.page.createCommentFee} ${currency.ticker}` })
        : intl.get('comment.writeCommentFree');
    } else if (post.account.createCommentFee && _.isNil(post.page)) {
      return post.account.createCommentFee != '0'
        ? intl.get('comment.writeCommentXpi', { commentFee: `${post.account.createCommentFee} ${currency.ticker}` })
        : intl.get('comment.writeCommentFree');
    } else {
      return intl.get('comment.writeComment');
    }
  };

  const loadMoreComments = () => {
    if (hasNext && !isFetching) {
      fetchNext().finally(() => {
        setFocus('comment', { shouldSelect: true });
      });
    } else if (hasNext) {
      fetchNext().finally(() => {
        setFocus('comment', { shouldSelect: true });
      });
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent the default behavior of adding a new line
      //don't allow create comment when previous comment not loading yet

      if (isLoadingCreateComment || isSendingXPI || isUploadingImage) return;
      await processComment(e.currentTarget.value); // Call your function to post the comment
    }
  };

  const setUploadingImage = (value: boolean) => {
    setIsUploadingImage(value);
  };

  useEffect(() => {
    if (slpBalancesAndUtxos === slpBalancesAndUtxosRef.current) return;
    setIsSendingXPI(false);
  }, [slpBalancesAndUtxos.nonSlpUtxos]);

  const handleRemoveCommentUpload = imgId => {
    if (imgId) {
      dispatch(removeUpload({ uploadType: UPLOAD_TYPES.COMMENT, id: imgId }));
    }
  };

  const processComment = async (comment: string) => {
    previoutComment.current = comment;
    resetField('comment');
    //Check if the message is not empty
    if (comment && comment !== '') {
      const trimComment = comment.trim();

      if (_.isNil(trimComment) || trimComment === '') {
        return;
      }

      //Check if comment is tip
      if (trimComment.toLowerCase().split(' ')[0] === '/give') {
        const amount: string = trimComment.toLowerCase().split(' ')[1];

        //check if amount is valid
        if (validateXPIAmount(amount)) {
          let tipHex = undefined;
          tipHex = await giveXPIAsTip(trimComment, amount).then(result => {
            return result;
          });

          if (tipHex) {
            dispatch(sendXPISuccess(parseFloat(amount).toFixed(2)));

            const createCommentInput: CreateCommentInput = {
              commentText: trimComment,
              commentableId: post.commentableId,
              tipHex: tipHex,
              uploadId: commentUpload?.id || undefined
            };

            await createComment(createCommentInput);
          } else {
            dispatch(sendXPIFailure(intl.get('send.notEnoughtFund')));
          }
        } else {
          dispatch(sendXPIFailure(intl.get('send.notEnoughtFund')));
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
              uploadId: commentUpload?.id || undefined
            };

            await createComment(createCommentInput);
          } else {
            throw new Error(intl.get('account.insufficientFunds'));
          }
        } catch (e: any) {
          dispatch(sendXPIFailure(e.message));
        }
      } else {
        const createCommentInput: CreateCommentInput = {
          commentText: trimComment,
          commentableId: post.commentableId,
          uploadId: commentUpload?.id || undefined
        };

        await createComment(createCommentInput);
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
              uploadId: commentUpload?.id || undefined
            };

            await createComment(createCommentInput);
          } else {
            throw new Error(intl.get('account.insufficientFunds'));
          }
        } catch (e: any) {
          dispatch(sendXPIFailure(e.message));
        }
      } else {
        const createCommentInput: CreateCommentInput = {
          commentText: '',
          commentableId: post.commentableId,
          uploadId: commentUpload?.id || undefined
        };

        await createComment(createCommentInput);
      }
    }
  };

  const validateXPIAmount = (value: string): boolean => {
    if (!value) return false;

    //check if value is number;
    if (isNaN(parseFloat(value))) return false;

    //check if value is positive number
    if (parseFloat(value) <= 0) return false;

    //check if balance is smaller than value + txFee
    if (
      fromSmallestDenomination(walletStatus.balances.totalBalanceInSatoshis) <=
      parseFloat(value) + fromSmallestDenomination(txFee)
    )
      return false;

    return true;
  };

  const giveXPIAsTip = async (text: string, amount: string): Promise<string> => {
    setIsSendingXPI(true);
    try {
      let tipHex;
      const fundingWif = getUtxoWif(slpBalancesAndUtxos.nonSlpUtxos[0], walletPaths);
      tipHex = await sendXpi(
        XPI,
        chronik,
        walletPaths,
        slpBalancesAndUtxos.nonSlpUtxos,
        currency.defaultFee,
        '',
        false, // indicate send mode is one to one
        null,
        post.account.address,
        amount,
        true,
        fundingWif,
        true
      ).catch(error => {
        throw error;
      });

      return tipHex;
    } catch (e) {
      const message = e.message || e.error || JSON.stringify(e);
      setIsSendingXPI(false);

      dispatch(sendXPIFailure(message));
    }
  };

  const giveXPIAsFee = async (post: PostQueryItem): Promise<string> => {
    setIsSendingXPI(true);
    try {
      let createFeeHex = undefined;
      const fundingWif = getUtxoWif(slpBalancesAndUtxos.nonSlpUtxos[0], walletPaths);
      if (post.page && post.page.createCommentFee !== '0') {
        createFeeHex = await sendXpi(
          XPI,
          chronik,
          walletPaths,
          slpBalancesAndUtxos.nonSlpUtxos,
          currency.defaultFee,
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
          currency.defaultFee,
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
      setIsSendingXPI(false);
    }
  };

  const createComment = async (input: CreateCommentInput) => {
    try {
      const result = await createCommentTrigger({ input: input }).unwrap();
      dispatch(createCommentSuccess(result));

      if (commentUpload) {
        dispatch(removeUploadFromCache({ uploadType: UPLOAD_TYPES.COMMENT }));
      }
    } catch (error) {
      const message = intl.get('comment.unableCreateComment');
      dispatch(
        showToast('error', {
          message: 'Error',
          description: message,
          duration: 3
        })
      );
      setIsSendingXPI(false);
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

  return (
    <React.Fragment>
      <CommentsContainer>
        <InfiniteScroll
          dataLength={data.length}
          next={loadMoreComments}
          hasMore={hasNext}
          loader={<Skeleton style={{ marginTop: '1rem' }} avatar active />}
          scrollableTarget="scrollableDiv"
        >
          {data.map((item, index) => {
            return <CommentListItem item={item} post={post} key={item.id} />;
          })}
        </InfiniteScroll>
      </CommentsContainer>
      <CommentInputContainer className="comment-input-container">
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
                />
              </AutoComplete>
            )}
          />
          <StyledIconContainer>
            <Button
              type="text"
              disabled={isLoadingCreateComment || isSendingXPI || isUploadingImage || !authorization.authorized}
              style={{ borderColor: 'transparent !important' }}
              onClick={async () => {
                await processComment(getValues('comment'));
              }}
              icon={
                <SendOutlined
                  style={{ fontSize: '20px' }}
                  disabled={isLoadingCreateComment || isSendingXPI || isUploadingImage || !authorization.authorized}
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
              disabled={isLoadingCreateComment || isSendingXPI || isUploadingImage || !authorization.authorized}
            />
          </StyledIconContainer>
        </StyledCommentContainer>
      </CommentInputContainer>
      {commentUpload && (
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
      <ModalResend
        title={<div>{intl.get('comment.failAndResend')}</div>}
        open={openModalResend}
        onCancel={() => setOpenModalResend(false)}
        onOk={async () => {
          setOpenModalResend(false);
          await processComment(previoutComment.current);
        }}
        okText={<span>{intl.get('comment.resend')}</span>}
      >
        <p>
          {intl.get('label.comment')}: {previoutComment.current}
        </p>
      </ModalResend>
    </React.Fragment>
  );
};

export default Comment;
