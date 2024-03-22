import ActionPostBar from '@components/Common/ActionPostBar';
import Counter from '@components/Common/Counter';
import InfoCardUser from '@components/Common/InfoCardUser';
import { LoadingIcon, NavBarHeader } from '@components/Layout/MainLayout';
import { WalletContext } from '@context/walletProvider';
import { PostQueryItem } from '@generated/index';
import { RepostInput } from '@generated/types.generated';
import useXPI from '@hooks/useXPI';
import useDetectMobileView from '@local-hooks/useDetectMobileView';
import useDidMountEffectNotification from '@local-hooks/useDidMountEffectNotification';
import { getAccountInfoTemp, getSelectedAccount } from '@store/account/selectors';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { openModal } from '@store/modal/actions';
import { useRepostMutation } from '@store/post/posts.api';
import { showToast } from '@store/toast/actions';
import { getAllWalletPaths, getSlpBalancesAndUtxos } from '@store/wallet';
import { Image, Input, Space, Spin } from 'antd';
import parse from 'html-react-parser';
import _ from 'lodash';
import moment from 'moment';
import { useRouter } from 'next/router';
import React, { useCallback, useMemo, useState } from 'react';
import ReactDomServer from 'react-dom/server';
import { useForm } from 'react-hook-form';
import ReactHtmlParser from 'react-html-parser';
import intl from 'react-intl-universal';
import Gallery from 'react-photo-gallery';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import styled from 'styled-components';
import { EditPostModalProps } from './EditPostModalPopup';
import PostTranslate from './PostTranslate';
import Comment from './Comment';
import PollContent from './PollContent';

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

const ShareButton = styled.span`
  margin-left: 10px;
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
  const [isEncryptedOptionalOpReturnMsg, setIsEncryptedOptionalOpReturnMsg] = useState(true);
  const [open, setOpen] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const accountInfoTemp = useAppSelector(getAccountInfoTemp);
  const isMobileView = useDetectMobileView();

  const [repostTrigger, { isLoading: isLoadingRepost, isSuccess: isSuccessRepost, isError: isErrorRepost }] =
    useRepostMutation();

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

  return (
    <React.Fragment>
      <StyledContainerPostDetail className="post-detail" style={{ paddingBottom: isMobileView ? '3rem' : '1rem' }}>
        <NavBarHeader>
          <InfoCardUser
            imgUrl={post.account.avatar ? post.account.avatar : ''}
            name={post.account.name}
            title={moment(post.createdAt).fromNow().toString()}
            accountAddress={post.account ? post.account.address : undefined}
            page={post.page ? post.page : undefined}
            token={post.token ? post.token : undefined}
            activatePostLocation={true}
            isDropdown={true}
            onEditPostClick={editPost}
            post={post}
            postEdited={post.createdAt !== post.updatedAt}
          ></InfoCardUser>
        </NavBarHeader>
        <PostContentDetail>
          {post.poll ? (
            <PollContent poll={post.poll} />
          ) : (
            <div>
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
            </div>
          )}

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
          <ActionPostBar post={post} onClickIconComment={e => { }} />
        </PostContentDetail>

        <Comment post={post} />
      </StyledContainerPostDetail>
    </React.Fragment>
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
