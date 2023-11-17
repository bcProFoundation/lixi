import { SendOutlined } from '@ant-design/icons';
import ActionPostBar from '@components/Common/ActionPostBar';
import AvatarUser from '@components/Common/AvatarUser';
import Counter from '@components/Common/Counter';
import InfoCardUser from '@components/Common/InfoCardUser';
import { currency } from '@components/Common/Ticker';
import { LoadingIcon, NavBarHeader } from '@components/Layout/MainLayout';
import { WalletContext } from '@context/walletProvider';
import { PostQueryItem } from '@generated/index';
import { CommentOrderField, CreateCommentInput, OrderDirection, RepostInput } from '@generated/types.generated';
import useXPI from '@hooks/useXPI';
import useDetectMobileView from '@local-hooks/useDetectMobileView';
import useDidMountEffectNotification from '@local-hooks/useDidMountEffectNotification';
import { getAccountInfoTemp, getSelectedAccount } from '@store/account/selectors';
import { createCommentFailure, createCommentSuccess } from '@store/comment';
import { useCreateCommentMutation } from '@store/comment/comments.api';
import { useInfiniteCommentsToCommentableIdQuery } from '@store/comment/useInfiniteCommentsToCommentableIdQuery';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { openModal } from '@store/modal/actions';
import { useRepostMutation } from '@store/post/posts.generated';
import { sendXPIFailure } from '@store/send/actions';
import { showToast } from '@store/toast/actions';
import { getAllWalletPaths, getSlpBalancesAndUtxos } from '@store/wallet';
import { getUtxoWif } from '@utils/cashMethods';
import { AutoComplete, Image, Input, Skeleton, Space, Spin } from 'antd';
import parse from 'html-react-parser';
import _ from 'lodash';
import moment from 'moment';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useState } from 'react';
import ReactDomServer from 'react-dom/server';
import { Controller, useForm } from 'react-hook-form';
import ReactHtmlParser from 'react-html-parser';
import InfiniteScroll from 'react-infinite-scroll-component';
import intl from 'react-intl-universal';
import Gallery from 'react-photo-gallery';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import styled from 'styled-components';
import CommentListItem from './CommentListItem';
import { EditPostModalProps } from './EditPostModalPopup';
import PostTranslate from './PostTranslate';

const { Search, TextArea } = Input;

const StyledBurnIcon = styled.img`
  transition: all 0.2s ease-in-out;
  width: 28px;
  height: 28px;
  cursor: pointer;

  &.custom-burn {
    width: 24px;
    height: 24px;
  }

  &:hover {
    transform: scale(1.2);
  }

  &:active {
    animation: jump 0.4s ease-in-out;
  }

  @keyframes jump {
    0% {
      transform: translateY(0);
    }
    30% {
      transform: translateY(-10px);
    }
    70% {
      transform: translateY(-5px);
    }
    100% {
      transform: translateY(0);
    }
  }
`;

export const IconComment = ({
  icon,
  totalComments,
  dataItem,
  imgUrl,
  onClickIcon
}: {
  icon?: React.FC;
  totalComments?: number;
  dataItem: any;
  imgUrl?: string;
  onClickIcon: (e: any) => void;
  isComment?: boolean;
}) => (
  <Space onClick={onClickIcon} size={4} style={{ alignItems: 'end', marginRight: '1rem' }}>
    {icon && React.createElement(icon)}
    <picture>
      <StyledBurnIcon alt="burnIcon" src={imgUrl} />
    </picture>
    &nbsp;
    <Counter num={totalComments ?? 0} />
  </Space>
);

type PostDetailProps = {
  post: PostQueryItem;
  isMobile: boolean;
};

const CommentContainer = styled.div`
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
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: flex-end;
  margin-top: 1rem;
  gap: 1rem;
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
  text-align: left;
  .description-post {
    font-size: 17px;
    line-height: 24px;
    margin: 1rem 0;
    text-align: left;
    word-break: break-word;
    div[data-lexical-decorator] {
      display: flex;
      justify-content: center;
    }
    a {
      cursor: pointer;
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
        height: 100% !important;
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
  margin: 1rem auto;
  width: 100%;
  max-width: 816px;
  border-radius: var(--border-radius-primary);
  background: white;
  padding: 0rem 1rem 1rem 1rem;
  margin-top: 1rem;
  height: max-content;
  border-radius: var(--border-radius-primary);
  header {
    padding: 0 !important;
    margin-bottom: 1rem;
    border-color: var(--border-color-base);
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
  @media (max-width: 520px) {
    margin: 8px 0;
    border-radius: 0;
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

export const IconBurn = ({
  icon,
  burnValue,
  dataItem,
  imgUrl,
  classStyle,
  onClickIcon
}: {
  icon?: React.FC;
  burnValue?: number;
  dataItem: any;
  imgUrl?: string;
  classStyle?: string;
  onClickIcon: (e: any) => void;
}) => (
  <Space onClick={onClickIcon} size={5} style={{ alignItems: 'end', marginRight: '1rem' }}>
    {icon && React.createElement(icon)}
    {imgUrl && (
      <picture>
        <StyledBurnIcon className={classStyle} alt="burnIcon" src={imgUrl} />
      </picture>
    )}
    {burnValue && <Counter num={burnValue ?? 0} />}
  </Space>
);

const PostDetail = ({ post, isMobile }: PostDetailProps) => {
  const dispatch = useAppDispatch();
  const { control, getValues, setValue, setFocus } = useForm();
  const router = useRouter();
  const Wallet = React.useContext(WalletContext);
  const { XPI, chronik } = Wallet;
  const { createBurnTransaction, sendXpi } = useXPI();
  const slpBalancesAndUtxos = useAppSelector(getSlpBalancesAndUtxos);
  const walletPaths = useAppSelector(getAllWalletPaths);
  const selectedAccount = useAppSelector(getSelectedAccount);
  const [imagesList, setImagesList] = useState([]);
  const [isEncryptedOptionalOpReturnMsg, setIsEncryptedOptionalOpReturnMsg] = useState(true);
  const [open, setOpen] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const accountInfoTemp = useAppSelector(getAccountInfoTemp);
  const isMobileView = useDetectMobileView();

  const [repostTrigger, { isLoading: isLoadingRepost, isSuccess: isSuccessRepost, isError: isErrorRepost }] =
    useRepostMutation();

  const dataSource = [
    {
      label: '/give',
      value: '/give'
    }
  ];

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
    const mapImages = post.imageUploadable?.uploads.map(img => {
      const imgUrl = img
        ? `${process.env.NEXT_PUBLIC_CF_IMAGES_DELIVERY_URL}/${process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH}/${img?.cfImageId}/public`
        : '';

      let width = img?.width || 4;
      let height = img?.height || 3;
      let objImg = {
        src: imgUrl,
        width: width,
        height: height
      };
      return objImg;
    });
    setImagesList(mapImages);
  }, []);

  const [
    createCommentTrigger,
    { isLoading: isLoadingCreateComment, isSuccess: isSuccessCreateComment, isError: isErrorCreateComment }
  ] = useCreateCommentMutation();

  const ShareButton = styled.span`
    margin-left: 10px;
  `;

  const loadMoreComments = () => {
    if (hasNext && !isFetching) {
      fetchNext().finally(() => {
        // setFocus('comment', { shouldSelect: true });
      });
    } else if (hasNext) {
      fetchNext().finally(() => {
        // setFocus('comment', { shouldSelect: true });
      });
    }
  };

  const isNumeric = (num: string) => {
    num = num.replace(',', '.');
    return !isNaN(num as unknown as number) && Number(num) > 0;
  };

  const handleCreateNewComment = async (text: string) => {
    if (_.isNil(text) || _.isEmpty(text) || text === '/') {
      return;
    }

    if (open) return;

    if (text !== '' || !_.isNil(text)) {
      let tipHex;
      let createFeeHex;
      if (text.trim().toLowerCase().split(' ')[0] === '/give') {
        try {
          if (!isNumeric(text.trim().split(' ')[1])) {
            const error = new Error(intl.get('send.syntaxError') as string);
            throw error;
          }

          const fundingWif = getUtxoWif(slpBalancesAndUtxos.nonSlpUtxos[0], walletPaths);
          tipHex = await sendXpi(
            XPI,
            chronik,
            walletPaths,
            slpBalancesAndUtxos.nonSlpUtxos,
            currency.defaultFee,
            text,
            false, // indicate send mode is one to one
            null,
            post.postAccount.address,
            text.trim().split(' ')[1],
            isEncryptedOptionalOpReturnMsg,
            fundingWif,
            true
          );
        } catch (e) {
          const message = e.message || e.error || JSON.stringify(e);
          dispatch(sendXPIFailure(message));
        }
      }

      if (post.page) {
        if (selectedAccount.id != post.page.pageAccount.id && post.page.createCommentFee != '0') {
          try {
            const fundingWif = getUtxoWif(slpBalancesAndUtxos.nonSlpUtxos[0], walletPaths);
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
          } catch (e) {
            const message = e.message || e.error || JSON.stringify(e);
            dispatch(sendXPIFailure(message));
          }
        }
      }

      const createCommentInput: CreateCommentInput = {
        commentText: text,
        commentableId: post.commentableId,
        tipHex: tipHex,
        createFeeHex: createFeeHex
      };

      try {
        const result = await createCommentTrigger({ input: createCommentInput }).unwrap();
        dispatch(createCommentSuccess(result));
      } catch (error) {
        const message = intl.get('comment.unableCreateComment');
        dispatch(createCommentFailure(message));
      }

      setFocus('comment', { shouldSelect: true });
      setValue('comment', '');
    }
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

  useDidMountEffectNotification();

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

  const content: any = parse(post.content, {
    replace: (domNode: any) => {
      if (domNode.attribs && domNode.attribs.class === 'EditorLexical_hashtag') {
        const hashtag: string = domNode.children[0].data;
        return (
          <span
            rel="noopener noreferrer"
            className="hashtag-link"
            id={`${hashtag}`}
            style={{ color: 'var(--color-primary)', cursor: 'pointer' }}
          >
            {domNode.children.map(child => child.data)}
          </span>
        );
      }
    }
  });

  const handleRepost = async (post: any) => {
    const repostInput: RepostInput = {
      accountId: selectedAccount.id,
      postId: post.id
    };

    try {
      await repostTrigger({ input: repostInput });
      isSuccessRepost &&
        dispatch(
          showToast('success', {
            message: 'Success',
            description: intl.get('post.repostSuccessful'),
            duration: 5
          })
        );
    } catch (error) {
      dispatch(
        showToast('error', {
          message: 'Error',
          description: intl.get('post.repostFailure'),
          duration: 5
        })
      );
    }
  };

  const translatePost = () => {
    setShowTranslation(!showTranslation);
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent the default behavior of adding a new line
      await handleCreateNewComment(e.currentTarget.value); // Call your function to post the comment
    }
  };

  return (
    <>
      <StyledContainerPostDetail className="post-detail" style={{ paddingBottom: isMobileView ? '3rem' : '1rem' }}>
        <NavBarHeader onClick={() => router.back()}>
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
            {ReactHtmlParser(ReactDomServer.renderToStaticMarkup(content))}
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
          {post.imageUploadable?.uploads?.length != 0 && isMobileView && (
            <>
              {post.imageUploadable?.uploads?.length > 1 && (
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
              {post.imageUploadable?.uploads?.length === 1 && (
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
          {post.imageUploadable?.uploads?.length != 0 && !isMobileView && (
            <div className={`images-post ${imagesList?.length > 1 ? 'images-post-desktop' : ''}`}>
              <Image.PreviewGroup>
                <Gallery margin={4} photos={imagesList} renderImage={imageRenderer} />
              </Image.PreviewGroup>
            </div>
          )}
          <ActionPostBar post={post} onClickIconComment={e => setFocus('comment', { shouldSelect: true })} />
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
        <CommentInputContainer>
          <div className="ava-ico-cmt" onClick={() => router.push(`/profile/${selectedAccount?.address}`)}>
            <AvatarUser icon={accountInfoTemp?.avatar} name={selectedAccount?.name} isMarginRight={false} />
          </div>
          <StyledCommentContainer>
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
                  disabled={isLoadingCreateComment}
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
              <SendOutlined style={{ fontSize: '20px' }} onClick={() => handleCreateNewComment(getValues('comment'))} />
            </StyledIconContainer>
          </StyledCommentContainer>
        </CommentInputContainer>
      </StyledContainerPostDetail>
    </>
  );
};

const Container = styled(PostDetail)`
  .ant-modal,
  .ant-modal-content {
    height: 100vh !important;
    top: 0 !important;
  }
  .ant-modal-body {
    height: calc(100vh - 110px) !important;
  }
`;

export default Container;
