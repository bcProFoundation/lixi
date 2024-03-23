import { useInfiniteFollowersByFollowingQuery } from '@store/account/useInfiniteFollowersByFollowingQuery';
import { useInfiniteFollowingsByFollowerQuery } from '@store/account/useInfiniteFollowingsByFollowerQuery';
import { useAppDispatch } from '@store/hooks';
import { closeModal } from '@store/modal/actions';
import { useInfinitePagesByFollowerIdQuery } from '@store/page/useInfinitePagesByFollowerIdQuery';
import { Modal, Skeleton, Space, Tabs } from 'antd';
import Link from 'next/link';
import React from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import intl from 'react-intl-universal';
import styled from 'styled-components';
import AvatarUser from './AvatarUser';
import { useInfiniteFollowersByPageQuery } from '@store/account';

const { TabPane } = Tabs;

const ShortcutItemAccess = ({
  icon,
  name,
  href,
  onClickItem
}: {
  icon: string;
  name: string;
  burnValue?: number;
  href?: string;
  onClickItem?: () => void;
}) => (
  (<Link href={href} onClick={onClickItem}>

    <Space className={'item-access'}>
      <AvatarUser icon={icon} name={name} isMarginRight={false} />
      <div> {name} </div>
    </Space>

  </Link>)
);

export type FollowModalProps = {
  accountId?: number;
  pageId?: string;
  type: string;
  classStyle?: string;
};

export const FollowModal: React.FC<FollowModalProps> = (props: FollowModalProps) => {
  const dispatch = useAppDispatch();
  const StyledModel = styled(Modal)`
    .ant-descriptions-bordered .ant-descriptions-view {
      border: none;
    }
    .ant-modal-body {
      border-radius: 20px !important;
    }

    .ant-descriptions-bordered .ant-descriptions-item-label,
    .ant-descriptions-bordered .ant-descriptions-item-content {
      padding: 0px 24px;
      border-right: none;
    }
  `;

  const StyledInfiniteScroll = styled(InfiniteScroll)`
    display: grid;

    a {
      &:hover {
        border-radius: 5px;
        background: rgba(0, 0, 0, 0.25);
      }

      .item-access {
        display: flex;
        padding: 10px;
      }
    }
  `;

  // Followers
  const {
    data: followers,
    fetchNext: followersFetchNext,
    hasNext: followersHasNext,
    isFetching: followersIsFetching
  } = useInfiniteFollowersByFollowingQuery(
    {
      first: 20,
      followingAccountId: props?.accountId
    },
    false
  );
  const loadMoreFollowers = () => {
    if (followersHasNext && !followersIsFetching) {
      followersFetchNext();
    } else if (followersHasNext) {
      followersFetchNext();
    }
  };

  // Following accounts
  const {
    data: followings,
    fetchNext: followingsFetchNext,
    hasNext: followingsHasNext,
    isFetching: followingsIsFetching
  } = useInfiniteFollowingsByFollowerQuery(
    {
      first: 20,
      followerAccountId: props?.accountId
    },
    false
  );
  const loadMoreFollowings = () => {
    if (followingsHasNext && !followingsIsFetching) {
      followingsFetchNext();
    } else if (followingsHasNext) {
      followingsFetchNext();
    }
  };

  // Following pages
  const {
    data: followingPages,
    fetchNext: followingPagesFetchNext,
    hasNext: followingPagesHasNext,
    isFetching: followingPagesIsFetching
  } = useInfinitePagesByFollowerIdQuery(
    {
      first: 20,
      id: props?.accountId
    },
    false
  );
  const loadMoreFollowingPages = () => {
    if (followingPagesHasNext && !followingPagesIsFetching) {
      followingPagesFetchNext();
    } else if (followingPagesHasNext) {
      followingPagesFetchNext();
    }
  };

  const {
    data: followersByPage,
    fetchNext: followersByPageFetchNext,
    hasNext: followersByPageHasNext,
    isFetching: followersByPageIsFetching
  } = useInfiniteFollowersByPageQuery(
    {
      id: props?.pageId,
      first: 20
    },
    false
  );
  const loadMoreFollowersByPage = () => {
    if (followersByPageHasNext && !followersByPageIsFetching) {
      followersByPageFetchNext();
    } else if (followersByPageHasNext) {
      followersByPageFetchNext();
    }
  };

  const handleCloseModal = () => {
    dispatch(closeModal());
  };

  return (
    <>
      <StyledModel
        className={`${props.classStyle}`}
        width={490}
        open={true}
        onOk={null}
        onCancel={handleCloseModal}
        closable={false}
        footer={null}
      >
        {props?.accountId ? (
          <Tabs type="card" defaultActiveKey={props.type}>
            {/* Followers of account*/}
            <Tabs.TabPane tab={intl.get('general.followers')} key="followers">
              <React.Fragment>
                <StyledInfiniteScroll
                  dataLength={followers.length}
                  next={loadMoreFollowers}
                  hasMore={followersHasNext}
                  loader={<Skeleton avatar active />}
                  scrollableTarget="scrollableDiv"
                >
                  {followers.length == 0 ? (
                    <p>{intl.get('follow.noFollowers')}</p>
                  ) : (
                    followers.map((item, index) => {
                      return (
                        <React.Fragment key={index}>
                          <ShortcutItemAccess
                            icon={item?.avatar ? item.avatar : ''}
                            name={item.name}
                            href={`/profile/${item.address}`}
                            onClickItem={handleCloseModal}
                          />
                        </React.Fragment>
                      );
                    })
                  )}
                </StyledInfiniteScroll>
              </React.Fragment>
            </Tabs.TabPane>

            {/* Following accounts */}
            <Tabs.TabPane tab={intl.get('general.youFollow')} key="youFollow">
              <React.Fragment>
                <StyledInfiniteScroll
                  dataLength={followings.length}
                  next={loadMoreFollowings}
                  hasMore={followingsHasNext}
                  loader={<Skeleton avatar active />}
                  scrollableTarget="scrollableDiv"
                >
                  {followings.length == 0 ? (
                    <p>{intl.get('follow.noFollowings')}</p>
                  ) : (
                    followings.map((item, index) => {
                      return (
                        <React.Fragment key={index}>
                          <ShortcutItemAccess
                            icon={item?.avatar ? item.avatar : ''}
                            name={item.name}
                            href={`/profile/${item.address}`}
                            onClickItem={handleCloseModal}
                          />
                        </React.Fragment>
                      );
                    })
                  )}
                </StyledInfiniteScroll>
              </React.Fragment>
            </Tabs.TabPane>

            {/* Following page */}
            <Tabs.TabPane tab={intl.get('general.followingPages')} key="followingPages">
              <React.Fragment>
                <StyledInfiniteScroll
                  dataLength={followingPages.length}
                  next={loadMoreFollowingPages}
                  hasMore={followingPagesHasNext}
                  loader={<Skeleton avatar active />}
                  scrollableTarget="scrollableDiv"
                >
                  {followingPages.length == 0 ? (
                    <p>{intl.get('follow.noFollowingPages')}</p>
                  ) : (
                    followingPages.map((page, index) => {
                      return (
                        <React.Fragment key={index}>
                          <ShortcutItemAccess
                            icon={page?.avatar ? page.avatar : '/images/default-avatar.jpg'}
                            name={page ? page.name : 'default'}
                            href={page ? `/page/${page.id}` : `/`}
                            onClickItem={handleCloseModal}
                          />
                        </React.Fragment>
                      );
                    })
                  )}
                </StyledInfiniteScroll>
              </React.Fragment>
            </Tabs.TabPane>
          </Tabs>
        ) : (
          <Tabs type="card" defaultActiveKey={props.type}>
            {/* Followers of page*/}
            <Tabs.TabPane tab={intl.get('general.followers')} key="followers">
              <React.Fragment>
                <StyledInfiniteScroll
                  dataLength={followersByPage.length}
                  next={loadMoreFollowersByPage}
                  hasMore={followersByPageHasNext}
                  loader={<Skeleton avatar active />}
                  scrollableTarget="scrollableDiv"
                >
                  {followersByPage.length == 0 ? (
                    <p>{intl.get('follow.noFollowers')}</p>
                  ) : (
                    followersByPage.map((item, index) => {
                      return (
                        <React.Fragment key={index}>
                          <ShortcutItemAccess
                            icon={item?.avatar ? item.avatar : ''}
                            name={item.name}
                            href={`/profile/${item.address}`}
                            onClickItem={handleCloseModal}
                          />
                        </React.Fragment>
                      );
                    })
                  )}
                </StyledInfiniteScroll>
              </React.Fragment>
            </Tabs.TabPane>
          </Tabs>
        )}
      </StyledModel>
    </>
  );
};
