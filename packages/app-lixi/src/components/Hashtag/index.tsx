import CreatePostCard from '@components/Common/CreatePostCard';
import PostListItem from '@components/Posts/PostListItem';
import { OrderDirection, PostOrderField } from '@generated/types.generated';
import useDidMountEffectNotification from '@local-hooks/useDidMountEffectNotification';
import { getSelectedAccount } from '@store/account';
import { getFailQueue } from '@store/burn';
import { HashtagQuery } from '@store/hashtag/hashtag.generated';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { useInfinitePostsByHashtagIdQuery } from '@store/post/useInfinitePostsByHashtagIdQuery';
import { getFilterPostsHome, getLevelFilter } from '@store/settings';
import { getAllWalletPaths, getSlpBalancesAndUtxos, getWalletStatus } from '@store/wallet';
import { Skeleton } from 'antd';
import InfiniteScroll from 'react-infinite-scroll-component';
import styled from 'styled-components';

type HashtagItem = HashtagQuery['hashtag'];

type HashtagProps = {
  hashtag: HashtagItem;
  isMobile: boolean;
};

const StyledHeader = styled.div`
  font-weight: bold;
  text-align: left;
  font-size: 35px;
  margin: 10px 0px 10px 0px;
  font-style: italic;
`;

const StyledContainer = styled.div`
  margin: 1rem auto;
  width: 100%;
  max-width: 816px;
`;

const Hashtag = ({ hashtag, isMobile }: HashtagProps) => {
  const dispatch = useAppDispatch();
  const walletPaths = useAppSelector(getAllWalletPaths);
  const walletStatus = useAppSelector(getWalletStatus);
  const slpBalancesAndUtxos = useAppSelector(getSlpBalancesAndUtxos);
  const failQueue = useAppSelector(getFailQueue);
  const selectedAccount = useAppSelector(getSelectedAccount);
  const filterValue = useAppSelector(getFilterPostsHome);
  const hashtags: string[] = [`#${hashtag.content}`];
  const level = useAppSelector(getLevelFilter);

  const { data, totalCount, fetchNext, hasNext, isFetching, isFetchingNext, refetch } =
    useInfinitePostsByHashtagIdQuery(
      {
        first: 20,
        minBurnFilter: filterValue ?? 1,
        orderBy: {
          direction: OrderDirection.Desc,
          field: PostOrderField.UpdatedAt
        },
        id: hashtag.id
      },
      false
    );

  const loadMoreItems = () => {
    if (hasNext && !isFetching) {
      fetchNext();
    } else if (hasNext) {
      fetchNext();
    }
  };

  useDidMountEffectNotification();


  return (
    <StyledContainer>
      <StyledHeader>{`#${hashtag.content}`}</StyledHeader>
      <CreatePostCard hashtags={hashtags} hashtagId={hashtag.id} />
      <InfiniteScroll
        dataLength={data.length}
        next={loadMoreItems}
        hasMore={hasNext}
        loader={<Skeleton avatar active />}
        endMessage={
          <p style={{ textAlign: 'center' }}>
            <b>{data.length > 0 ? 'end reached' : ''}</b>
          </p>
        }
        scrollableTarget="scrollableDiv"
      >
        {data.map((item, index) => {
          return <PostListItem item={item} key={item.id} />;
        })}
      </InfiniteScroll>
    </StyledContainer>
  );
};

export default Hashtag;
