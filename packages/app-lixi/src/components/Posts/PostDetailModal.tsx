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
import { getAccountInfoTemp, getSelectedAccount } from '@store/account/selectors';
import { createCommentFailure, createCommentSuccess } from '@store/comment';
import { useCreateCommentMutation } from '@store/comment/comments.api';
import { useInfiniteCommentsToCommentableIdQuery } from '@store/comment/useInfiniteCommentsToCommentableIdQuery';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { closeModal, openModal } from '@store/modal/actions';
import { usePostQuery, useRepostMutation } from '@store/post/posts.generated';
import { sendXPIFailure, sendXPISuccess } from '@store/send/actions';
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
import Comment from './Comment';
import CommentListItem from './CommentListItem';
import { EditPostModalProps } from './EditPostModalPopup';
import PostTranslate from './PostTranslate';

type PostDetailProps = {
  initialPost: PostQueryItem;
  classStyle?: string;
};

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

export const PostDetailModal: React.FC<PostDetailProps> = ({ initialPost, classStyle }: PostDetailProps) => {
  const [post, setPost] = useState(initialPost);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [showTranslation, setShowTranslation] = useState(false);
  const [openPost, setOpenPost] = useState(true);
  const isMobile = useDetectMobileView();
  const [borderColorHeader, setBorderColorHeader] = useState(false);

  const [repostTrigger, { isLoading: isLoadingRepost, isSuccess: isSuccessRepost, isError: isErrorRepost }] =
    useRepostMutation();

  const { isLoading, currentData, isError } = usePostQuery({ id: post.id });

  const imagesList = useMemo(() => {
    let result = post?.imageUploadable?.uploads.map(img => {
      const imgUrl = `${process.env.NEXT_PUBLIC_CF_IMAGES_DELIVERY_URL}/${process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH}/${img?.cfImageId}/public`;
      let newImageObj = {
        src: imgUrl,
        width: img?.width || 4,
        height: img?.height || 3
      };
      return newImageObj;
    });
    return result || [];
  }, [post?.imageUploadable?.uploads]);

  useEffect(() => {
    if (!isError && currentData) {
      setPost(currentData.post);
    }
  }, [currentData]);

  const editPost = () => {
    const editPostProps: EditPostModalProps = {
      accountAddress: post.account.address,
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
    } else if (post.account.createCommentFee && _.isNil(post.page)) {
      return post.account.createCommentFee != '0'
        ? intl.get('comment.writeCommentXpi', { commentFee: `${post.account.createCommentFee} ${currency.ticker}` })
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
              imgUrl={post.account.avatar ? post.account.avatar : ''}
              name={post.account.name}
              title={moment(post.createdAt).fromNow().toString()}
              accountAddress={post.account ? post.account.address : undefined}
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
            {post.imageUploadable?.uploads?.length != 0 && isMobile && (
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
            {post.imageUploadable?.uploads?.length != 0 && !isMobile && (
              <div className={`images-post ${imagesList?.length > 1 ? 'images-post-desktop' : ''}`}>
                <Image.PreviewGroup>
                  <Gallery margin={4} photos={imagesList} renderImage={imageRenderer} />
                </Image.PreviewGroup>
              </div>
            )}
            <ActionPostBar post={post} isSetBorderBottom={true} onClickIconComment={e => {}} />
          </PostContentDetail>

          <Comment post={post} />
        </StyledContainerPostDetail>
      </Modal>
    </React.Fragment>
  );
};
