import { CloseOutlined, LeftOutlined, SendOutlined } from '@ant-design/icons';
import ActionPostBar from '@components/Common/ActionPostBar';
import AvatarUser from '@components/Common/AvatarUser';
import InfoCardUser from '@components/Common/InfoCardUser';
import { currency } from '@components/Common/Ticker';
import { LoadingIcon, NavBarHeader } from '@components/Layout/MainLayout';
import { WalletContext } from '@context/walletProvider';
import { PostQueryItem } from '@generated/index';
import { CommentOrderField, CreateCommentInput, OrderDirection } from '@generated/types.generated';
import useXPI from '@hooks/useXPI';
import useDetectMobileView from '@local-hooks/useDetectMobileView';
import { PatchCollection } from '@reduxjs/toolkit/dist/query/core/buildThunks';
import { getAccountInfoTemp, getSelectedAccount } from '@store/account/selectors';
import { api as commentsApi, useCreateCommentMutation } from '@store/comment/comments.api';
import { useInfiniteCommentsToPostIdQuery } from '@store/comment/useInfiniteCommentsToPostIdQuery';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { closeModal, openModal } from '@store/modal/actions';
import { usePostQuery, useRepostMutation } from '@store/post/posts.generated';
import { sendXPIFailure, sendXPISuccess } from '@store/send/actions';
import { showToast } from '@store/toast/actions';
import { getAllWalletPaths, getSlpBalancesAndUtxos, getWalletStatus } from '@store/wallet';
import { fromSmallestDenomination, getUtxoWif } from '@utils/cashMethods';
import { AutoComplete, Button, Image, Input, Modal, Skeleton, Spin } from 'antd';
import parse from 'html-react-parser';
import _ from 'lodash';
import moment from 'moment';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDomServer from 'react-dom/server';
import { Controller, useForm } from 'react-hook-form';
import ReactHtmlParser from 'react-html-parser';
import InfiniteScroll from 'react-infinite-scroll-component';
import intl from 'react-intl-universal';
import Gallery from 'react-photo-gallery';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import { useSwipeable } from 'react-swipeable';
import styled from 'styled-components';
import CommentListItem from './CommentListItem';
import { EditPostModalProps } from './EditPostModalPopup';
import PostTranslate from './PostTranslate';

type PostDetailProps = {
  initialPost: PostQueryItem;
  classStyle?: string;
};

const { Search, TextArea } = Input;

const CommentContainer = styled.div`
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
  background: #fff;
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

const PostContentDetail = styled.div`
  padding: 0 1rem;
  text-align: left;
  .description-post {
    font-size: 17px;
    line-height: 24px;
    margin: 1rem 0;
    text-align: left;
    word-break: break-word;
    a {
      cursor: pointer;
    }
    div {
      max-width: 100%;
    }
    div[data-lexical-decorator] {
      display: flex;
      justify-content: center;
    }
    iframe {
      max-width: 100%;
      @media (max-width: 960px) {
        height: 35vh;
      }
    }
    .hashtag-link {
      color: var(--color-primary);
    }
  }
  .description-translate {
    line-height: 20px;
    text-align: left;
    word-break: break-word;
    border-left: var(--color-primary) 1px solid;
    padding: 3px 3px 3px 6px;
    margin-bottom: 1rem;
    p {
      font-size: 17px;
      line-height: 24px;
    }
    .read-more-more-module_btn__33IaH {
      font-size: 14px;
    }
  }
  .images-post {
    cursor: pointer;
    width: 100%;
    margin: 1rem 0;
    box-sizing: border-box;
    box-shadow: 0 3px 12px rgb(0 0 0 / 4%);
    background: var(--bg-color-light-theme);
    transition: 0.5s ease;
    img {
      max-width: 100%;
      max-height: 100vh;
      object-fit: contain;
      border-radius: var(--border-radius-primary);
    }
    &.images-post-mobile {
      display: flex;
      overflow-x: auto;
      gap: 5px;
      -ms-overflow-style: none; // Internet Explorer 10+
      scrollbar-width: none; // Firefox
      ::-webkit-scrollbar {
        display: none; // Safari and Chrome
      }
      .ant-image {
        width: auto !important;
        height: auto !important;
      }
      img {
        width: auto;
        height: auto !important;
        max-width: 50vw;
        max-height: 60vh;
        object-fit: cover !important;
        border-radius: var(--border-radius-primary);
        border: 1px solid var(--lt-color-gray-100);
        @media (max-width: 468px) {
          max-width: 75vw;
          max-height: 50vh;
        }
      }
      &.only-one-image {
        justify-content: center;
        img {
          width: 100%;
          max-width: 100%;
        }
      }
    }
    &.images-post-desktop {
      img {
        object-fit: cover;
      }
    }
    .react-photo-gallery--gallery > div {
      gap: 4px;
      background: #fff;
    }
  }
`;

const StyledContainerPostDetail = styled.div`
  margin: 0;
  width: 100%;
  border-radius: var(--border-radius-primary);
  background: white;
  height: fit-content;
  max-height: 92vh;
  overflow: auto;
  ::-webkit-scrollbar {
    -webkit-appearance: none;
    width: 7px;
  }

  ::-webkit-scrollbar-thumb {
    border-radius: 4px;
    background-color: rgba(0, 0, 0, 0.5);
    box-shadow: 0 0 1px rgba(255, 255, 255, 0.5);
  }

  @media (max-width: 968px) {
    max-height: 90vh;
  }

  @media (max-width: 520px) {
    border-radius: 0;
    height: 100vh;
    max-height: 100vh;
    -ms-overflow-style: none; // Internet Explorer 10+
    scrollbar-width: none; // Firefox
    ::-webkit-scrollbar {
      display: none; // Safari and Chrome
    }
  }

  header {
    position: sticky;
    height: fit-content;
    top: -1px;
    z-index: 999;
    padding: 0 !important;
    margin-bottom: 1rem;
    border-color: var(--border-color-base);
    background: #fff !important;
  }
  .comment-item-meta {
    margin-bottom: 0.5rem;
    .ant-list-item-meta-avatar {
      margin-top: 3%;
    }
    .ant-list-item-meta-title {
      margin-bottom: 0.5rem;
    }
  }
  .title-post-detail {
    width: 100%;
    text-align: center;
    padding: 1rem 8px;
    h2 {
      margin: 0;
      font-size: 26px;
      line-height: normal;
    }
  }
  .info-card-user {
    padding: 0 1rem !important;
    height: 72px;
    margin-left: 2rem;
    .anticon {
      font-size: 10px;
    }
  }
`;

const StyledTranslate = styled.div`
  cursor: pointer;
  color: var(--color-primary);
  text-align: left;
  margin-bottom: 5px;
  font-size: 12px;
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

export const PostDetailModal: React.FC<PostDetailProps> = ({ initialPost, classStyle }: PostDetailProps) => {
  const [post, setPost] = useState(initialPost);

  const dispatch = useAppDispatch();
  const { control, getValues, setValue, setFocus, resetField } = useForm();
  const router = useRouter();
  const Wallet = React.useContext(WalletContext);
  const { XPI, chronik } = Wallet;
  const { sendXpi } = useXPI();
  const walletStatus = useAppSelector(getWalletStatus);
  const slpBalancesAndUtxos = useAppSelector(getSlpBalancesAndUtxos);
  const slpBalancesAndUtxosRef = useRef(slpBalancesAndUtxos);
  const walletPaths = useAppSelector(getAllWalletPaths);
  const selectedAccount = useAppSelector(getSelectedAccount);
  const [isEncryptedOptionalOpReturnMsg, setIsEncryptedOptionalOpReturnMsg] = useState(true);
  const [open, setOpen] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [openPost, setOpenPost] = useState(true);
  const isMobile = useDetectMobileView();
  const [borderColorHeader, setBorderColorHeader] = useState(false);
  const accountInfoTemp = useAppSelector(getAccountInfoTemp);
  const [isSendingXPI, setIsSendingXPI] = useState<boolean>(false);
  const txFee = Math.ceil(Wallet.XPI.BitcoinCash.getByteCount({ P2PKH: 1 }, { P2PKH: 1 }) * 2.01); //satoshi

  const [repostTrigger, { isLoading: isLoadingRepost, isSuccess: isSuccessRepost, isError: isErrorRepost }] =
    useRepostMutation();

  const { isLoading, currentData, isError } = usePostQuery({ id: post.id });

  const dataSource = [
    {
      label: '/give',
      value: '/give'
    }
  ];

  const { data, totalCount, fetchNext, hasNext, isFetching } = useInfiniteCommentsToPostIdQuery(
    {
      first: 20,
      orderBy: {
        direction: OrderDirection.Asc,
        field: CommentOrderField.UpdatedAt
      },
      id: post.id
    },
    false
  );

  const imagesList = useMemo(() => {
    let result = post?.postImageUploadable?.uploads.map(img => {
      const imgUrl = `${process.env.NEXT_PUBLIC_CF_IMAGES_DELIVERY_URL}/${process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH}/${img?.cfImageId}/public`;
      let newImageObj = {
        src: imgUrl,
        width: img?.width || 4,
        height: img?.height || 3
      };
      return newImageObj;
    });
    return result || [];
  }, [post?.postImageUploadable?.uploads]);

  const [
    createCommentTrigger,
    { isLoading: isLoadingCreateComment, isSuccess: isSuccessCreateComment, isError: isErrorCreateComment }
  ] = useCreateCommentMutation();

  useEffect(() => {
    if (!isError && currentData) {
      setPost(currentData.post);
    }
  }, [currentData]);

  useEffect(() => {
    if (slpBalancesAndUtxos === slpBalancesAndUtxosRef.current) return;
    setIsSendingXPI(false);
  }, [slpBalancesAndUtxos.nonSlpUtxos]);

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

  const processComment = async (comment: string) => {
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
              commentToId: post.id,
              tipHex: tipHex
            };

            await createComment(createCommentInput);
          } else {
            dispatch(sendXPIFailure(intl.get('send.syntaxError')));
          }
        } else {
          dispatch(sendXPIFailure(intl.get('send.syntaxError')));
        }
      } else if (
        //Check if post owner self comment
        (post.page &&
          post?.page?.createCommentFee !== '0' &&
          selectedAccount.address !== post?.page?.pageAccount.address) ||
        (post?.postAccount?.createCommentFee !== '0' && selectedAccount.address !== post?.postAccount?.address)
      ) {
        try {
          let createFeeHex = undefined;
          createFeeHex = await giveXPIAsFee(post);

          if (createFeeHex) {
            const createCommentInput: CreateCommentInput = {
              commentText: trimComment,
              commentToId: post.id,
              createFeeHex: createFeeHex
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
          commentToId: post.id
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
        post.postAccount.address,
        amount,
        isEncryptedOptionalOpReturnMsg,
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
          isEncryptedOptionalOpReturnMsg,
          fundingWif,
          true
        );
      } else if (post.postAccount.createCommentFee !== '0') {
        createFeeHex = await sendXpi(
          XPI,
          chronik,
          walletPaths,
          slpBalancesAndUtxos.nonSlpUtxos,
          currency.defaultFee,
          '',
          false, // indicate send mode is one to one
          null,
          post.postAccount.address,
          post.postAccount.createCommentFee,
          isEncryptedOptionalOpReturnMsg,
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
    const params = {
      orderBy: {
        direction: OrderDirection.Asc,
        field: CommentOrderField.UpdatedAt
      }
    };

    let patches: PatchCollection;
    try {
      const result = await createCommentTrigger({ input: input }).unwrap();
      patches = dispatch(
        commentsApi.util.updateQueryData('CommentsToPostId', { id: input.commentToId, ...params }, draft => {
          draft.allCommentsToPostId.edges.unshift({
            cursor: result.createComment.id,
            node: {
              ...result.createComment
            }
          });
          draft.allCommentsToPostId.totalCount = draft.allCommentsToPostId.totalCount + 1;
        })
      );
    } catch (error) {
      const message = intl.get('comment.unableCreateComment');
      if (patches) {
        dispatch(commentsApi.util.patchQueryData('CommentsToPostId', params, patches.inversePatches));
      }
      dispatch(
        showToast('error', {
          message: 'Error',
          description: message,
          duration: 3
        })
      );
      setIsSendingXPI(false);
    }

    resetField('comment');
  };

  const editPost = () => {
    const editPostProps: EditPostModalProps = {
      postAccountAddress: post.postAccount.address,
      content: post.content,
      postId: post.id
    };
    dispatch(openModal('EditPostModalPopup', editPostProps));
  };

  const imageRenderer = useCallback(
    ({ photo }) => <Image src={photo?.src} width={photo?.width} height={photo?.height} />,
    []
  );

  const showTextComment = () => {
    if (post.page) {
      return post.page.createCommentFee != '0'
        ? intl.get('comment.writeCommentXpi', { commentFee: `${post.page.createCommentFee} ${currency.ticker}` })
        : intl.get('comment.writeCommentFree');
    } else if (post.postAccount.createCommentFee && _.isNil(post.page)) {
      return post.postAccount.createCommentFee != '0'
        ? intl.get('comment.writeCommentXpi', { commentFee: `${post.postAccount.createCommentFee} ${currency.ticker}` })
        : intl.get('comment.writeCommentFree');
    } else {
      return intl.get('comment.writeComment');
    }
  };

  const handleHashtagClick = e => {
    if (e.target.className === 'hashtag-link') {
      if (post.page) {
        router.push(`/page/${post.page.id}?q=&hashtags=%23${e.target.id.substring(1)}`);
      } else if (post.token) {
        router.push(`/token/${post.token.tokenId}?q=&hashtags=%23${e.target.id.substring(1)}`);
      } else {
        router.push(`/hashtag/${e.target.id.substring(1)}`);
      }
    }
  };

  const postContent: any = useMemo(() => {
    return parse(post?.content, {
      replace: (domNode: any) => {
        if (domNode?.attribs && domNode?.attribs?.class === 'EditorLexical_hashtag') {
          const hashtag: string = domNode?.children[0]?.data;
          return (
            <span
              rel="noopener noreferrer"
              className="hashtag-link"
              id={`${hashtag}`}
              style={{ color: 'var(--color-primary) !important', cursor: 'pointer' }}
            >
              {domNode.children.map(child => child.data)}
            </span>
          );
        }
      }
    });
  }, [post?.content]);

  const handleOnCancel = () => {
    setOpenPost(false);
    setTimeout(
      () => {
        dispatch(closeModal());
      },
      isMobile ? 400 : 200
    );
  };

  const translatePost = () => {
    setShowTranslation(!showTranslation);
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent the default behavior of adding a new line
      await processComment(e.currentTarget.value); // Call your function to post the comment
    }
  };

  const handleSrcolling = e => {
    const currentScrollPos = e?.currentTarget?.scrollTop;
    if (currentScrollPos > 5) {
      setBorderColorHeader(true);
    } else {
      setBorderColorHeader(false);
    }
  };

  const handlersSwipe = useSwipeable({
    onSwipedRight: eventData => handleOnCancel()
  });

  return (
    <React.Fragment>
      <Modal
        transitionName={isMobile ? '' : 'none'}
        width={'50vw'}
        className={`${classStyle} post-detail-custom-modal ${
          isMobile
            ? openPost
              ? 'animate__animated animate__faster animate__slideInRight'
              : 'animate__animated animate__faster animate__slideOutRight'
            : openPost
            ? 'animate__animated animate__faster animate__zoomIn'
            : 'animate__animated animate__faster animate__zoomOut'
        }`}
        style={{ top: 30 }}
        open={true}
        onCancel={handleOnCancel}
        closeIcon={isMobile ? <LeftOutlined /> : <CloseOutlined />}
        footer={null}
      >
        <StyledContainerPostDetail
          {...handlersSwipe}
          className={`${!borderColorHeader ? 'no-border-color' : ''} post-detail-modal`}
          onScroll={e => handleSrcolling(e)}
        >
          <NavBarHeader onClick={handleOnCancel}>
            <InfoCardUser
              imgUrl={post.postAccount.avatar ? post.postAccount.avatar : ''}
              name={post.postAccount.name}
              title={moment(post.createdAt).fromNow().toString()}
              postAccountAddress={post.postAccount ? post.postAccount.address : undefined}
              page={post.page ? post.page : undefined}
              token={post.token ? post.token : undefined}
              activatePostLocation={true}
              onEditPostClick={editPost}
              postEdited={post.createdAt !== post.updatedAt}
            ></InfoCardUser>
          </NavBarHeader>
          <PostContentDetail>
            <div className="description-post" onClick={e => handleHashtagClick(e)}>
              {ReactHtmlParser(ReactDomServer.renderToStaticMarkup(postContent))}
            </div>
            {post.translations &&
              post.translations.length > 0 &&
              (showTranslation ? (
                <StyledTranslate onClick={translatePost} className="post-translation">
                  {intl.get('post.hideTranslate')}
                </StyledTranslate>
              ) : (
                <StyledTranslate onClick={translatePost} className="post-translation">
                  {intl.get('post.showTranslate')}
                </StyledTranslate>
              ))}
            {showTranslation && post.translations && post.translations.length > 0 && (
              <div className="description-translate">
                <PostTranslate postTranslate={post.translations[0].translateContent} />
              </div>
            )}
            {post.postImageUploadable?.uploads.length != 0 && isMobile && (
              <>
                {post.postImageUploadable?.uploads.length > 1 && (
                  <div className="images-post images-post-mobile">
                    <PhotoProvider loop={true} loadingElement={<Spin indicator={LoadingIcon} />}>
                      {imagesList.map((img, index) => (
                        <PhotoView key={index} src={img.src}>
                          <img src={img.src} alt="" />
                        </PhotoView>
                      ))}
                    </PhotoProvider>
                  </div>
                )}
                {post.postImageUploadable?.uploads.length === 1 && (
                  <>
                    <div className="images-post images-post-mobile only-one-image">
                      <PhotoProvider loop={true} loadingElement={<Spin indicator={LoadingIcon} />}>
                        {imagesList.map((img, index) => (
                          <PhotoView key={index} src={img.src}>
                            <img src={img.src} alt="" />
                          </PhotoView>
                        ))}
                      </PhotoProvider>
                    </div>
                  </>
                )}
              </>
            )}
            {post.postImageUploadable?.uploads.length != 0 && !isMobile && (
              <div className={`images-post ${imagesList.length > 1 ? 'images-post-desktop' : ''}`}>
                <Image.PreviewGroup>
                  <Gallery margin={4} photos={imagesList} renderImage={imageRenderer} />
                </Image.PreviewGroup>
              </div>
            )}
            <ActionPostBar
              post={post}
              onClickIconComment={e => setFocus('comment', { shouldSelect: true })}
              isSetBorderBottom={true}
            />
          </PostContentDetail>

          <CommentContainer>
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
          </CommentContainer>
          <CommentInputContainer className="comment-input-container">
            <div className="ava-ico-cmt" onClick={() => router.push(`/profile/${selectedAccount?.address}`)}>
              <AvatarUser icon={accountInfoTemp?.avatar} name={selectedAccount?.name} isMarginRight={false} />
            </div>
            <StyledCommentContainer className="comment-container">
              <Controller
                name="comment"
                key="comment"
                control={control}
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <AutoComplete
                    onSelect={() => {
                      setOpen(false);
                    }}
                    options={dataSource}
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
                    disabled={isLoadingCreateComment || isSendingXPI}
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
                  disabled={isLoadingCreateComment || isSendingXPI}
                  style={{ borderColor: 'transparent !important' }}
                  onClick={async () => {
                    await processComment(getValues('comment'));
                  }}
                  icon={<SendOutlined style={{ fontSize: '20px' }} />}
                />
              </StyledIconContainer>
            </StyledCommentContainer>
          </CommentInputContainer>
        </StyledContainerPostDetail>
      </Modal>
    </React.Fragment>
  );
};
