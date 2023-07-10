import { Button, Input, Skeleton, Space } from 'antd';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { getSelectedAccount, getSelectedAccountId } from '@store/account';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { PageItem } from '@components/Pages/PageDetail';
import { useInfinitePageMessageSessionByPageId } from '@store/message/useInfinitePageMessageSessionByPageId';
import InfiniteScroll from 'react-infinite-scroll-component';
import { userSubcribeToMessageSession } from '@store/message/actions';
import { useInfiniteMessageByMessageSessionId } from '@store/message/useInfiniteMessageByMessageSessionId';
import { CreateMessageInput, MessageOrderField, OrderDirection } from '@generated/types.generated';
import Message from './Message';
import { Controller, useForm } from 'react-hook-form';
import { useCreateMessageMutation } from '@store/message/message.api';

type PageMessageProps = {
  page: PageItem;
};

const StyledChatContainer = styled.div`
  background-color: white;
  height: 600px;
  border-radius: var(--border-radius-primary);
  display: flex;
`;

const StyledChatList = styled.div`
  width: 30%;
  border-right: 1px solid black;
`;
const StyledChatbox = styled.div`
  width: 100%;
  padding: 5px;
`;

const InputContainer = styled.div`
  position: absolute;
  bottom: 0px;
  width: inherit;
`;

const StyledMessage = styled(Space)`
  width: 100%;
  gap: 8px !important;
  padding: 8px;
  border: 1px solid var(--border-color-base);
  cursor: pointer;
  margin-bottom: 0.5rem;
  &:hover {
    background: var(--border-color-base);
    .page-name {
      color: var(--color-primary);
    }
  }
  .ant-space-item {
    &:last-child {
      flex: 1;
    }
  }
  .avatar-account {
    border: 1px solid #fbf1fb;
    border-radius: 50%;
    width: fit-content;
    .ant-avatar {
      display: flex;
      align-items: center;
      font-size: 14px !important;
      width: 46px;
      height: 46px;
    }
    img {
      object-fit: cover;
      border-radius: 50%;
      width: 46px;
      height: 46px;
    }
  }
  .content-account {
    display: flex;
    .info-account {
      flex: 1;
      p {
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        line-clamp: 1;
        -webkit-line-clamp: 1;
        box-orient: vertical;
        -webkit-box-orient: vertical;
        margin: 0;
        text-align: left;
        line-height: 16px;
      }
      .page-name {
        font-size: 14px;
        font-weight: 500;
      }
      .account-name {
        font-size: 12px;
      }
      .content {
        font-size: 11px;
        color: gray;
      }
    }
    .time-score {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-end;
      gap: 8px;
      p {
        margin: 0;
        color: gray;
        &.create-date {
          font-size: 10px;
        }
        &.lotus-burn-score {
          font-size: 10px;
          color: #fff;
        }
      }
      .content-score {
        padding: 2px 4px;
        background: #bfbfbf;
        border-radius: 12px;
      }
    }
  }
  &.collapse {
    img {
      width: 30px;
      height: 30px;
    }
    .ant-avatar {
      width: 30px;
      height: 30px;
    }
  }
`;

const StyledInfiniteScroll = styled(InfiniteScroll)`
  display: flex;
  flex-direction: column-reverse;
`;

const ChatUser = ({ item, index, onClickMessage }) => {
  return (
    <React.Fragment>
      <p onClick={() => onClickMessage(item.messageSessions[0].id)}>{item.account?.name}</p>
    </React.Fragment>
  );
};

const PageMessageForOwner = ({ page }: PageMessageProps) => {
  const dispatch = useAppDispatch();
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
  const { control, getValues, setValue, setFocus } = useForm();

  const [
    createMessageTrigger,
    { isLoading: isLoadingCreateMessage, isSuccess: isSuccessCreateMessage, isError: isErrorCreateMessage }
  ] = useCreateMessageMutation();

  const { data, totalCount, fetchNext, hasNext, isFetching, isFetchingNext, refetch } =
    useInfinitePageMessageSessionByPageId(
      {
        first: 10,
        id: page.id
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

  const {
    data: messageData,
    fetchNext: messageFetchNext,
    hasNext: messageHasNext,
    isFetching: messageIsFetching,
    isFetchingNext: messageIsFetchingNext
  } = useInfiniteMessageByMessageSessionId({
    id: currentMessageId,
    orderBy: {
      direction: OrderDirection.Desc,
      field: MessageOrderField.UpdatedAt
    }
  });

  //Check for data exist then subcribe to every pageMessageSession's latest messageSession
  useEffect(() => {
    if (data) {
      data.map(item => {
        if (item.messageSessions) {
          dispatch(userSubcribeToMessageSession(item.messageSessions[0].id));
        }
      });
    }
  }, [data]);

  const onClickMessage = (id: string) => {
    setCurrentMessageId(id);
  };

  const loadMoreMessages = () => {
    if (messageHasNext && !messageIsFetching) {
      messageFetchNext();
    } else if (messageHasNext) {
      messageFetchNext();
    }
  };

  const sendMessage = async () => {
    const input: CreateMessageInput = {
      authorId: parseInt(page.pageAccount.id),
      body: getValues('message'),
      messageSessionId: currentMessageId,
      isPageOwner: true
    };

    await createMessageTrigger({ input }).unwrap();
  };

  return (
    <StyledChatContainer>
      <StyledChatList>
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
            return <ChatUser index={index} item={item} key={item.id} onClickMessage={onClickMessage} />;
          })}
        </InfiniteScroll>
      </StyledChatList>
      <StyledChatbox>
        {messageData.length > 0 && (
          <StyledInfiniteScroll
            dataLength={messageData.length}
            next={loadMoreMessages}
            hasMore={messageHasNext}
            loader={<Skeleton avatar active />}
            endMessage={
              <p style={{ textAlign: 'center' }}>
                <b>{data.length > 0 ? 'end reached' : ''}</b>
              </p>
            }
            scrollableTarget="scrollableDiv"
            inverse
          >
            {messageData.map(item => {
              return <Message message={item} key={item.id} authorAddress={page.pageAccount.address} />;
            })}
          </StyledInfiniteScroll>
        )}
      </StyledChatbox>
      <InputContainer>
        <Controller
          name="message"
          control={control}
          rules={{
            required: true
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input onChange={onChange} onBlur={onBlur} value={value} placeholder={'type me'} />
          )}
        />
        <Button onClick={sendMessage}>Send</Button>
      </InputContainer>
    </StyledChatContainer>
  );
};

export default PageMessageForOwner;
