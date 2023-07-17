import { Button, Input, Skeleton, Space, Tabs, Dropdown } from 'antd';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { getSelectedAccount, getSelectedAccountId } from '@store/account';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { PageItem } from '@components/Pages/PageDetail';
import { useInfinitePendingPageMessageSessionByPageId } from '@store/message/useInfinitePendingPageMessageSessionByPageId';
import { useInfiniteOpenPageMessageSessionByPageId } from '@store/message/useInfiniteOpenPageMessageSessionByPageId';
import InfiniteScroll from 'react-infinite-scroll-component';
import { userSubcribeToPageMessageSession } from '@store/message/actions';
import { useInfiniteMessageByPageMessageSessionId } from '@store/message/useInfiniteMessageByPageMessageSessionId';
import {
  ClosePageMessageSessionInput,
  CreateMessageInput,
  MessageOrderField,
  OrderDirection,
  PageMessageSessionStatus
} from '@generated/types.generated';
import Message from './Message';
import { Controller, useForm } from 'react-hook-form';
import { useCreateMessageMutation } from '@store/message/message.api';
import { SendOutlined, SettingOutlined } from '@ant-design/icons';
import _ from 'lodash';
import {
  PageMessageSessionQuery,
  useClosePageMessageSessionMutation
} from '@store/message/pageMessageSession.generated';
import type { MenuProps } from 'antd';
import { setPageMessageSession } from '@store/page/action';
import { getCurrentPageMessageSession } from '@store/page/selectors';

const { TextArea } = Input;

type PageMessageProps = {
  page: PageItem;
};

type PageMessageSessionItem = PageMessageSessionQuery['pageMessageSession'];

const StyledChatContainer = styled.div`
  background-color: white;
  height: 600px;
  border-radius: var(--border-radius-primary);
  display: flex;
`;

const StyledChatList = styled.div`
  width: 30%;
  border-right: 1px solid black;
  overflow: auto;
`;

const StyledChatbox = styled.div`
  width: 100%;
  padding: 5px;
  overflow: auto;
  display: flex;
  flex-direction: column-reverse;
  height: 100%;
`;

const InputContainer = styled.div`
  display: flex;
`;

const StyledInfiniteScroll = styled(InfiniteScroll)`
  display: flex;
  flex-direction: column-reverse;
`;

const StyledContainer = styled.div`
  display: flex;
  width: 70%;
  flex-direction: column;
`;

const IconContainer = styled.div`
  display: flex;
  width: 5%;
  border: 1px solid black;
  justify-content: center;
  border-radius: 0px 5px 5px 0px;
`;

const StyledHeader = styled.div`
  border-bottom: 1px solid black;
  display: flex;
`;

const StyledTextHeader = styled.p`
  margin: 0px;
  width: 95%;
`;

const ChatUser = ({ item, index, onClickMessage }) => {
  return (
    <React.Fragment>
      <p onClick={() => onClickMessage(item.id)} style={{ cursor: 'pointer' }}>
        {item.account?.name}
      </p>
    </React.Fragment>
  );
};

const PageMessageForOwner = ({ page }: PageMessageProps) => {
  const dispatch = useAppDispatch();
  const [currentPageMessageSessionId, setCurrentPageMessageSessionId] = useState<string | null>(null);
  const currentPageMessageSession = useAppSelector(getCurrentPageMessageSession);
  const [tab, setCurrentTab] = useState<string | null>(null);
  const { control, getValues, resetField, setFocus } = useForm();

  const [
    createMessageTrigger,
    { isLoading: isLoadingCreateMessage, isSuccess: isSuccessCreateMessage, isError: isErrorCreateMessage }
  ] = useCreateMessageMutation();

  const [
    closePageMessageSessionTrigger,
    {
      isLoading: isLoadingClosePageMessageSession,
      isSuccess: isSuccessClosePageMessageSession,
      isError: isErrorClosePageMessageSession
    }
  ] = useClosePageMessageSessionMutation();

  const items: MenuProps['items'] = [
    {
      key: 'closeSession',
      label: (
        <p style={{ margin: '0px' }} onClick={() => closeSession()}>
          Close session
        </p>
      )
    }
  ];

  const { data, totalCount, fetchNext, hasNext, isFetching, isFetchingNext, refetch } =
    useInfiniteOpenPageMessageSessionByPageId(
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
    data: pendingData,
    totalCount: pendingTotalCount,
    fetchNext: pendingFetchNext,
    hasNext: pendingHasNext,
    isFetching: pendingIsFetching,
    isFetchingNext: pendingIsFetchingNext,
    refetch: pendingRefetch
  } = useInfinitePendingPageMessageSessionByPageId(
    {
      first: 10,
      id: page.id
    },
    false
  );

  const loadMorePendingItems = () => {
    if (pendingHasNext && !pendingIsFetching) {
      pendingFetchNext();
    } else if (pendingHasNext) {
      pendingFetchNext();
    }
  };

  const {
    data: messageData,
    fetchNext: messageFetchNext,
    hasNext: messageHasNext,
    isFetching: messageIsFetching,
    isFetchingNext: messageIsFetchingNext
  } = useInfiniteMessageByPageMessageSessionId({
    id: currentPageMessageSessionId,
    orderBy: {
      direction: OrderDirection.Desc,
      field: MessageOrderField.UpdatedAt
    }
  });

  //Check for data exist then subcribe to every pageMessageSession's latest messageSession
  useEffect(() => {
    if (data) {
      data.map(item => {
        if (item.status === PageMessageSessionStatus.Open) dispatch(userSubcribeToPageMessageSession(item.id));
      });
    }
  }, [data]);

  useEffect(() => {
    resetField('message');
    setFocus('message');
  }, [currentPageMessageSessionId]);

  const onClickMessage = (pageMessageSession: PageMessageSessionItem, pageMessageSessionId: string) => {
    dispatch(setPageMessageSession(pageMessageSession));
    setCurrentPageMessageSessionId(pageMessageSessionId);
  };

  const loadMoreMessages = () => {
    if (messageHasNext && !messageIsFetching) {
      messageFetchNext();
    } else if (messageHasNext) {
      messageFetchNext();
    }
  };

  const sendMessage = async () => {
    if (_.isNil(getValues('message')) || getValues('message') === '' || currentPageMessageSessionId === null) {
      return;
    }
    const input: CreateMessageInput = {
      authorId: parseInt(page.pageAccount.id),
      body: getValues('message'),
      pageMessageSessionId: currentPageMessageSessionId,
      isPageOwner: true
    };

    await createMessageTrigger({ input }).unwrap();
    resetField('message');
    setFocus('message');
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent the default behavior of adding a new line
      await sendMessage(); // Call your function to post the comment
    }
  };

  const acceptMessage = async () => {};

  const closeSession = async () => {
    const input: ClosePageMessageSessionInput = {
      pageMessageSessionId: currentPageMessageSessionId
    };
    await closePageMessageSessionTrigger({ input }).unwrap();
  };

  return (
    <StyledChatContainer>
      <StyledChatList id="scrollableChatlist">
        <Tabs>
          <Tabs.TabPane tab="Open" key="open">
            <InfiniteScroll
              dataLength={data.length}
              next={loadMoreItems}
              hasMore={hasNext}
              loader={<Skeleton avatar active />}
              scrollableTarget="scrollableChatlist"
            >
              {data.map(item => {
                return (
                  <p onClick={() => onClickMessage(item, item.id)} style={{ cursor: 'pointer' }} key={item.id}>
                    {item.account?.name}
                  </p>
                );
              })}
            </InfiniteScroll>
          </Tabs.TabPane>
          <Tabs.TabPane tab="Pending" key="pending">
            <InfiniteScroll
              dataLength={pendingData.length}
              next={loadMorePendingItems}
              hasMore={pendingHasNext}
              loader={<Skeleton avatar active />}
              scrollableTarget="scrollableChatlist"
            >
              {pendingData.map(item => {
                return (
                  <p onClick={() => onClickMessage(item, item.id)} style={{ cursor: 'pointer' }} key={item.id}>
                    {item.account?.name}
                  </p>
                );
              })}
            </InfiniteScroll>
          </Tabs.TabPane>
        </Tabs>
      </StyledChatList>
      <StyledContainer>
        {currentPageMessageSessionId && (
          <StyledHeader>
            <StyledTextHeader>{`Session: ${currentPageMessageSessionId}`}</StyledTextHeader>
            <Dropdown menu={{ items }} trigger={['click']}>
              <SettingOutlined />
            </Dropdown>
          </StyledHeader>
        )}
        <StyledChatbox id="scrollableChatbox">
          {messageData.length > 0 && (
            <StyledInfiniteScroll
              dataLength={messageData.length}
              next={loadMoreMessages}
              hasMore={messageHasNext}
              loader={<Skeleton active />}
              inverse
              scrollableTarget="scrollableChatbox"
            >
              {messageData.map(item => {
                return <Message message={item} key={item.id} authorAddress={page.pageAccount.address} />;
              })}
            </StyledInfiniteScroll>
          )}
        </StyledChatbox>
        {currentPageMessageSessionId && (
          <InputContainer>
            <Controller
              name="message"
              control={control}
              rules={{
                required: true
              }}
              render={({ field: { onChange, onBlur, value, ref } }) => (
                <TextArea
                  ref={ref}
                  style={{ width: '95%' }}
                  onChange={onChange}
                  onBlur={onBlur}
                  value={value}
                  placeholder={
                    currentPageMessageSession.status === PageMessageSessionStatus.Open ? 'Aa' : 'Session is closed'
                  }
                  disabled={
                    isLoadingClosePageMessageSession ||
                    isLoadingCreateMessage ||
                    currentPageMessageSession.status !== PageMessageSessionStatus.Open
                  }
                  autoSize
                  onKeyDown={handleKeyDown}
                />
              )}
            />
            <IconContainer>
              <SendOutlined
                onClick={sendMessage}
                disabled={
                  isLoadingClosePageMessageSession ||
                  isLoadingCreateMessage ||
                  currentPageMessageSession.status !== PageMessageSessionStatus.Open
                }
              />
            </IconContainer>
          </InputContainer>
        )}
      </StyledContainer>
    </StyledChatContainer>
  );
};

export default PageMessageForOwner;
