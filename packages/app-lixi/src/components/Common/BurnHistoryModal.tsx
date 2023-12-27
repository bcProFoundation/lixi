import { Modal, Skeleton } from 'antd';
import { useAppDispatch } from '@store/hooks';
import { closeModal } from '@store/modal';
import { useInfiniteBurnTimelineByTime } from '@store/burn';
import InfiniteScroll from 'react-infinite-scroll-component';
import styled from 'styled-components';
import AvatarUser from './AvatarUser';
import { useRouter } from 'next/router';
import { closeActionSheet } from '@store/action-sheet/actions';
import { formatRelativeTime } from '@utils/formatting';
import intl from 'react-intl-universal';

interface BurnHistoryProps {
  postId: string;
  classStyle?: string;
}

const BurnHistoryModalCustom = styled(Modal)`
  .ant-modal-body {
    padding: 0 0 0 24px;
  }
  .wrap-content {
    height: 500px;
    overflow: auto;
    padding-right: 10px;

    ::-webkit-scrollbar {
      -webkit-appearance: none;
      width: 7px;
    }

    ::-webkit-scrollbar-thumb {
      border-radius: 4px;
      background-color: rgba(0, 0, 0, 0.5);
      box-shadow: 0 0 1px rgba(255, 255, 255, 0.5);
    }
  }
`;

const BurnHistoryItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 15px 0;

  .burn-user-infor {
    display: flex;
    align-items: center;
    gap: 10px;

    .username {
      font-weight: 500;
      font-size: 16px;
      cursor: pointer;
    }
    .username:hover {
      text-decoration: underline;
    }
  }

  .burn-value {
    display: flex;
    align-items: center;
    background-color: #e4e6eb;
    border-radius: 10px;
    padding: 5px 0 5px 15px;
    gap: 5px;
    width: 125px;

    .value {
      display: flex;
      flex-direction: column;

      .time-burn-created {
        color: rgba(30, 26, 29, 0.38);
        font-size: 11px;
      }
    }
  }
`;

const BurnHistoryModal = ({ postId, classStyle }: BurnHistoryProps) => {
  const dispatch = useAppDispatch();
  const history = useRouter();

  const {
    data: burnHistory,
    hasNext: hasNextBurnHistory,
    isFetching: isFetchingBurnHistory,
    fetchNext: fetchNextBurnHistory,
    isLoading: isLoadingBurnHistory
  } = useInfiniteBurnTimelineByTime(
    {
      id: postId
    },
    false
  );
  const loadMoreItemsBurnHistory = () => {
    if (hasNextBurnHistory && !isFetchingBurnHistory) {
      fetchNextBurnHistory();
    } else if (hasNextBurnHistory) {
      fetchNextBurnHistory();
    }
  };

  const handleCloseModal = () => {
    dispatch(closeModal());
    dispatch(closeActionSheet());
  };

  const clickUser = address => {
    history.push(`/profile/${address}`);
    handleCloseModal();
  };

  return (
    <BurnHistoryModalCustom
      title={intl.get('post.burnHistory')}
      width={450}
      onCancel={handleCloseModal}
      open={true}
      footer={null}
      className={`${classStyle} custom-burn-history`}
    >
      {isLoadingBurnHistory ? (
        <Skeleton avatar active paragraph={{ rows: 0 }} title={{ width: '90%' }} />
      ) : burnHistory.length === 0 ? (
        <div style={{ paddingBottom: '20px' }}>{intl.get('post.noBurnHistory')}</div>
      ) : (
        <div id="scrollableDiv" className="wrap-content">
          <InfiniteScroll
            dataLength={burnHistory.length}
            next={loadMoreItemsBurnHistory}
            hasMore={hasNextBurnHistory}
            loader={<Skeleton avatar active />}
            scrollableTarget="scrollableDiv"
          >
            {burnHistory.map((item, index) => {
              const { avatar, name, address } = item.burnedBy;
              return (
                <BurnHistoryItem key={item.id}>
                  <div className="burn-user-infor">
                    <div onClick={() => clickUser(address)}>
                      <AvatarUser icon={avatar} name={name} />
                    </div>
                    <div className="username" onClick={() => clickUser(address)}>
                      {name}
                    </div>
                  </div>
                  <div className="burn-value">
                    <img src={item.burnType ? '../../images/like.svg' : '../../images/dislike.svg'} />
                    <span className="value">
                      <span>
                        {item.burnedValue} {intl.get('general.dana')}
                      </span>
                      <span className="time-burn-created">{formatRelativeTime(item.createdAt)}</span>
                    </span>
                  </div>
                </BurnHistoryItem>
              );
            })}
          </InfiniteScroll>
        </div>
      )}
    </BurnHistoryModalCustom>
  );
};

export default BurnHistoryModal;
