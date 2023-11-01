import CreatePostCard from '@components/Common/CreatePostCard';
import { OrderDirection, PostOrderField } from '@generated/types.generated';
import useDidMountEffectNotification from '@local-hooks/useDidMountEffectNotification';
import { addRecentHashtagAtHome, setGraphqlRequestDone } from '@store/account/actions';
import {
  getGraphqlRequestStatus,
  getRecentHashtagAtHome,
  getSelectedAccount,
  getSelectedAccountId
} from '@store/account/selectors';
import { getFailQueue } from '@store/burn';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { setNewPostAvailable, setSelectedPost } from '@store/post/actions';
import { api as postApi } from '@store/post/posts.api';
import { getNewPostAvailable, getSelectedPostId } from '@store/post/selectors';
import { useInfinitePostsBySearchQueryWithHashtag } from '@store/post/useInfinitePostsBySearchQueryWithHashtag';
import { getFilterPostsHome, getIsTopPosts, getLevelFilter } from '@store/settings/selectors';
import { useInfiniteHomeTimelineQuery } from '@store/timeline/useInfiniteHomeTimelineQuery';
import { getAllWalletPaths, getSlpBalancesAndUtxos, getWalletStatus } from '@store/wallet';
import { Skeleton } from 'antd';
import { useRouter } from 'next/router';
import React, { useEffect, useRef, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import intl from 'react-intl-universal';
import styled from 'styled-components';
import SearchBox from '../Common/SearchBox';
import PostListItem from '../Posts/PostListItem';

type TimelineListingProps = {
  className?: string;
};

const StyledTimelineListing = styled.div`
  margin: 1rem auto;
  width: 100%;
  max-width: 700px;
  &::-webkit-scrollbar {
    width: 5px;
  }
  &::-webkit-scrollbar-thumb {
    background: transparent;
  }
  &.show-scroll {
    &::-webkit-scrollbar {
      width: 5px;
    }
    &::-webkit-scrollbar-thumb {
      background-image: linear-gradient(180deg, #d0368a 0%, #708ad4 99%) !important;
      box-shadow: inset 2px 2px 5px 0 rgba(#fff, 0.5);
      border-radius: 100px;
    }
  }

  .custom-query-list {
    &::-webkit-scrollbar {
      width: 5px;
    }
    &::-webkit-scrollbar-thumb {
      background: transparent;
    }
    &.show-scroll {
      &::-webkit-scrollbar {
        width: 5px;
      }
      &::-webkit-scrollbar-thumb {
        background-image: linear-gradient(180deg, #d0368a 0%, #708ad4 99%) !important;
        box-shadow: inset 2px 2px 5px 0 rgba(#fff, 0.5);
        border-radius: 100px;
      }
    }
    animation: fadeInAnimation 0.75s;
  }

  @keyframes fadeInAnimation {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @media (min-width: 960px) {
    .search-container {
      display: none !important;
    }
  }
`;

const StyledHeader = styled.div`
  .menu-post-listing {
    .ant-menu-item {
      .ant-menu-title-content {
        font-size: 14px;
        color: rgba(30, 26, 29, 0.6);
      }
      &.ant-menu-item-selected {
        .ant-menu-title-content {
          color: #1e1a1d;
          font-weight: 500;
        }
        &::after {
          border-bottom: none;
        }
      }
    }
  }
  .filter-bar {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1rem;
    text-wrap: nowrap;
  }
`;

const StyledInfiniteScroll = styled(InfiniteScroll)`
  overflow: inherit !important;
`;

const TimelineListing: React.FC<TimelineListingProps> = ({ className }: TimelineListingProps) => {
  const [count, setCount] = useState(0);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const selectedAccountId = useAppSelector(getSelectedAccountId);
  const refPostsListing = useRef<HTMLDivElement | null>(null);
  const [tab, setTab] = useState<any>('all');
  const [showNewPost, setShowNewPost] = useState<boolean>(false);
  const selectedAccount = useAppSelector(getSelectedAccount);
  const slpBalancesAndUtxos = useAppSelector(getSlpBalancesAndUtxos);
  const walletPaths = useAppSelector(getAllWalletPaths);
  const walletStatus = useAppSelector(getWalletStatus);
  const failQueue = useAppSelector(getFailQueue);
  const filterValue = useAppSelector(getFilterPostsHome);
  const graphqlRequestLoading = useAppSelector(getGraphqlRequestStatus);
  const recentTagAtHome = useAppSelector(getRecentHashtagAtHome);
  const postIdSelected = useAppSelector(getSelectedPostId);
  const [suggestedHashtag, setSuggestedTags] = useState([]);
  const newPostAvailable = useAppSelector(getNewPostAvailable);
  let isTop = useAppSelector(getIsTopPosts);
  const [query, setQuery] = useState<string | null>(null);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const level = useAppSelector(getLevelFilter);

  useEffect(() => {
    if (router.query.hashtags) {
      setHashtags((router.query.hashtags as string).split(' '));
    } else {
      setHashtags([]);
    }
  }, [router.query.hashtags]);

  useEffect(() => {
    if (router.query.q) {
      setQuery(router.query.q as string);
    } else {
      setQuery(null);
    }
  }, [router.query.q]);

  const refs = useRef([]);
  useEffect(() => {
    // when refresh page , or first time go in => no show new post for account
    if (!!newPostAvailable) {
      dispatch(setNewPostAvailable(false));
    }
  }, []);
  const { data, totalCount, fetchNext, hasNext, isLoading, isFetching, isFetchingNext, refetch } =
    useInfiniteHomeTimelineQuery(
      {
        first: 5,
        level: level ?? 3,
        isHome: true
      },
      false
    );

  useEffect(() => {
    if (refs.current[postIdSelected]) {
      const heightPost = refs.current[postIdSelected].clientHeight;
      const listChildNodes = refs.current[postIdSelected].offsetParent.childNodes;
      let headerNode = null;
      listChildNodes.forEach(node => {
        if (node?.localName === 'header') {
          headerNode = node;
        }
      });
      headerNode ? (headerNode.style.display = 'none') : null;
      refs.current[postIdSelected].firstChild.classList.add('active-post');
      refs.current[postIdSelected].scrollIntoView({ behaviour: 'smooth' });
      headerNode ? (headerNode.style.display = 'grid') : null;
      dispatch(setSelectedPost(''));
    }
  }, [data, postIdSelected]);

  //#region QueryVirtuoso
  const { queryData, fetchNextQuery, hasNextQuery, isQueryFetching, isFetchingQueryNext, isQueryLoading } =
    useInfinitePostsBySearchQueryWithHashtag(
      {
        first: 20,
        minBurnFilter: filterValue ?? 1,
        query: query,
        hashtags: hashtags,
        orderBy: {
          direction: OrderDirection.Desc,
          field: PostOrderField.UpdatedAt
        }
      },
      false
    );

  const loadMoreQueryItems = () => {
    if (hasNextQuery && !isQueryFetching) {
      fetchNextQuery();
    } else if (hasNextQuery) {
      fetchNextQuery();
    }
  };

  useEffect(() => {
    setSuggestedTags(recentTagAtHome);
  }, [recentTagAtHome]);

  const QueryFooter = () => {
    if (isQueryLoading) return null;
    return (
      <b
        style={{
          padding: '1rem 2rem 2rem 2rem',
          textAlign: 'center'
        }}
      >
        {isFetchingQueryNext || isQueryLoading ? <Skeleton avatar active /> : "It's so empty here..."}
      </b>
    );
  };
  //#endregion
  useEffect(() => {
    if (!!newPostAvailable) {
      setShowNewPost(true);
      setCount(count + 1);
    }
  }, [newPostAvailable]);

  useEffect(() => {
    if (!showNewPost && count > 0) {
      setShowNewPost(false);
      dispatch(setNewPostAvailable(false));
    }
  }, [showNewPost]);

  //#region Normal Virtuoso
  const loadMoreItems = () => {
    if (hasNext && !isFetching) {
      fetchNext();
    } else if (hasNext) {
      fetchNext();
    }
  };

  const triggerSrollbar = e => {
    const virtuosoNode = refPostsListing.current.querySelector('#list-virtuoso') || null;
    virtuosoNode.classList.add('show-scroll');
    setTimeout(() => {
      virtuosoNode.classList.remove('show-scroll');
    }, 700);
  };

  const handleClickNewPost = () => {
    setShowNewPost(false);
    dispatch(setNewPostAvailable(false));
    dispatch(postApi.util.resetApiState());
    refetch();
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  const Footer = () => {
    return (
      <b
        style={{
          padding: '1rem 2rem 2rem 2rem',
          textAlign: 'center'
        }}
      >
        {isFetchingNext || isLoading ? <Skeleton avatar active /> : "It's so empty here..."}
      </b>
    );
  };
  //#endregion

  useEffect(() => {
    if (data.length > 0) {
      dispatch(setGraphqlRequestDone());
    }
  }, [data]);

  const showPosts = () => {
    return (
      <React.Fragment>
        {!query && hashtags.length === 0 ? (
          <InfiniteScroll
            dataLength={data.length}
            next={loadMoreItems}
            hasMore={hasNext}
            loader={<Skeleton avatar active />}
            endMessage={<Footer />}
            scrollableTarget="scrollableDiv"
            scrollThreshold={'100px'}
          >
            {data.map((item, index) => {
              return (
                <div
                  key={item.id}
                  ref={element => {
                    refs.current[item.id] = element;
                  }}
                >
                  <PostListItem
                    item={item.data}
                    key={item.id}
                    addToRecentHashtags={hashtag => dispatch(addRecentHashtagAtHome(hashtag.substring(1)))}
                  />
                </div>
              );
            })}
          </InfiniteScroll>
        ) : (
          <StyledInfiniteScroll
            dataLength={queryData.length}
            next={loadMoreQueryItems}
            hasMore={hasNextQuery}
            loader={<Skeleton avatar active />}
            endMessage={<QueryFooter />}
            scrollableTarget="scrollableDiv"
          >
            {queryData.map((item, index) => {
              return (
                <PostListItem
                  item={item}
                  key={item.id}
                  addToRecentHashtags={hashtag => dispatch(addRecentHashtagAtHome(hashtag.substring(1)))}
                />
              );
            })}
          </StyledInfiniteScroll>
        )}
      </React.Fragment>
    );
  };

  useDidMountEffectNotification();

  return (
    <StyledTimelineListing>
      <SearchBox />
      <StyledHeader>
        <CreatePostCard hashtags={hashtags} query={query} />
        <h1 style={{ textAlign: 'left', fontSize: '20px', margin: '1rem' }}>
          {query && intl.get('general.searchResults', { text: query })}
        </h1>
      </StyledHeader>
      {graphqlRequestLoading ? <Skeleton avatar active /> : showPosts()}
    </StyledTimelineListing>
  );
};

export default TimelineListing;
