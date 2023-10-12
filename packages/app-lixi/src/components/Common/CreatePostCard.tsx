import { PlusCircleOutlined } from '@ant-design/icons';
import { AuthorizationContext } from '@context/index';
import { PageQueryItem } from '@generated/index';
import { getAccountInfoTemp, getSelectedAccount } from '@store/account/selectors';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { getShowCreatePost } from '@store/post/selectors';
import { Input, Space } from 'antd';
import React, { useContext, useEffect } from 'react';
import styled from 'styled-components';
import { openModal } from '@store/modal';
import useAuthorization from './Authorization/use-authorization.hooks';
import AvatarUser from './AvatarUser';
import { SocialsEnum } from './Embed';

type ErrorType = 'unsupported' | 'invalid';

const regex = {
  [SocialsEnum.TWITTER]: /^https?:\/\/twitter\.com\/(?:#!\/)?(\w+)\/status(es)?\/(\d+)/,
  [SocialsEnum.FACEBOOK]:
    /^(?:https?:\/\/)?(?:www\.|m\.|mobile\.|touch\.|mbasic\.)?(?:facebook\.com|fb(?:\.me|\.com))\/(?!$)(?:(?:\w)*#!\/)?(?:pages\/)?(?:photo\.php\?fbid=)?(?:[\w\-]*\/)*?(?:\/)?(?:profile\.php\?id=)?([^\/?&\s]*)(?:\/|&|\?)?.*$/s,
  [SocialsEnum.REDDIT]: /(?:^.+?)(?:reddit.com)(\/r|\/user)(?:\/[\w\d]+){2}(?:\/)([\w\d]*)/
};

const MobileCreatePost = styled.div`
  display: none;
  @media (max-width: 968px) {
    z-index: 9;
    display: block;
    position: fixed;
    right: 15px;
    bottom: 5rem;
    background: transparent !important;
    .fab-btn {
      padding: 16px;
      background: #ffdbd1;
      border-radius: 50%;
    }
  }
`;

const WrapEditor = styled.div`
  position: relative;
  z-index: -2;
`;

const DesktopCreatePost = styled.div`
  padding: 1.5rem 1rem;
  background: #fff;
  border-radius: var(--border-radius-primary);
  margin: 1rem 0;
  border: 1px solid var(--border-item-light);
  box-shadow: 1rem 1rem 2.5rem 0 rgb(0 0 0 / 5%);
  cursor: pointer;
  .box-create-post {
    display: flex;
    justify-content: space-between;
    align-items: center;
    .avatar {
      flex: 2 auto;
      display: flex;
      align-items: center;
      input {
        font-size: 11px;
        line-height: 24px;
        letter-spacing: 0.3px;
      }
      .ant-avatar {
        min-width: 46px;
      }
    }
    .btn-create {
      .anticon {
        font-size: 18px;
        color: var(--color-primary);
      }
    }
  }
  .functional-images-bar {
    display: flex;
    margin-top: 1rem;
    border-top: 1px solid var(--border-color-base);
    padding-top: 1rem;
    gap: 8px;
  }
  @media (max-width: 968px) {
    display: none;
  }
`;

const SpaceIconNoneHover = styled(Space)`
  gap: 8px;
  padding: 6px;
  background: #faf0fa;
  color: var(--color-primary);
  border-radius: var(--border-radius-primary);
  img {
    width: 25px;
  }
  span {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.3px;
  }
`;

type CreatePostCardProp = {
  page?: PageQueryItem;
  tokenPrimaryId?: string;
  userId?: number;
  refetch?: () => void;
  hashtags?: string[]; //Multiple hashtag for search function
  hashtagId?: string; // hashtagId here for the url /hashtag/{hashtag}
  query?: string;
  autoEnable?: boolean;
};

const IconWImage = ({
  value,
  imgUrl,
  onClickIcon
}: {
  value?: string;
  imgUrl?: string;
  onClickIcon: (e: any) => void;
}) => (
  <SpaceIconNoneHover onClick={onClickIcon} size={5}>
    {imgUrl && (
      <picture>
        <img alt="icon" src={imgUrl} />
      </picture>
    )}
    <span>{value}</span>
  </SpaceIconNoneHover>
);

const CreatePostCard = (props: CreatePostCardProp) => {
  const dispatch = useAppDispatch();
  const { page, tokenPrimaryId, hashtagId, hashtags, query, autoEnable } = props;
  const selectedAccount = useAppSelector(getSelectedAccount);
  const authorization = useContext(AuthorizationContext);
  const askAuthorization = useAuthorization();
  const showCreatePostMobile = useAppSelector(getShowCreatePost);
  const accountInfoTemp = useAppSelector(getAccountInfoTemp);

  const handleNewPostClick = () => {
    if (authorization.authorized) {
      dispatch(openModal('CreatePostModal', { page, hashtags, hashtagId, tokenPrimaryId, query, autoEnable }));
    } else {
      askAuthorization();
    }
  };

  useEffect(() => {
    if (autoEnable && authorization.authorized) {
      dispatch(openModal('CreatePostModal', { page, hashtags, hashtagId, tokenPrimaryId, query, autoEnable }));
    }
  }, []);

  return (
    <React.Fragment>
      <DesktopCreatePost className="create-post-card-container" onClick={handleNewPostClick}>
        <div className="box-create-post">
          <div className="avatar">
            <AvatarUser icon={accountInfoTemp?.avatar} name={selectedAccount?.name} isMarginRight={false} />
            <Input
              bordered={false}
              placeholder={
                hashtags && hashtags.length > 0
                  ? `Write about ${hashtags
                      .map(hashtag => {
                        return `${hashtag}`;
                      })
                      .join(' ')}`
                  : `What's on your mind?`
              }
              value=""
            />
          </div>
          <div className="btn-create">
            <PlusCircleOutlined />
          </div>
        </div>
        <div className="functional-images-bar">
          <IconWImage imgUrl={'/images/ico-images-color.png'} value={'Photo'} onClickIcon={() => console.log('Null')} />
          <IconWImage
            imgUrl={'/images/ico-link-url-color.png'}
            value={'Link Url'}
            onClickIcon={() => console.log('Null')}
          />
          <IconWImage imgUrl={'/images/ico-embed.png'} value={'Embed'} onClickIcon={() => console.log('Null')} />
        </div>
      </DesktopCreatePost>

      <MobileCreatePost
        hidden={!showCreatePostMobile}
        className={`animate__animated ${
          showCreatePostMobile ? 'animate__fadeIn' : 'animate__fadeOut'
        } create-post-card-container`}
        onClick={handleNewPostClick}
      >
        <div className="fab-btn">
          <img src="/images/ico-create-post.svg" alt="" />
        </div>
      </MobileCreatePost>
    </React.Fragment>
  );
};

export default CreatePostCard;
