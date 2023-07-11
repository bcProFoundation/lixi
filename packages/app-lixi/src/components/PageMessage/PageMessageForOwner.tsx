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
import { SendOutlined, SettingOutlined } from '@ant-design/icons';
import _ from 'lodash';
import { useMessageSessionByPageMessageSessionIdQuery } from '@store/message/messageSession.api';

const { TextArea } = Input;

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
`;

const ChatUser = ({ item, index, onClickMessage }) => {
  return (
    <React.Fragment>
      <p onClick={() => onClickMessage(item.messageSessions[0].id, item.id)} style={{ cursor: 'pointer' }}>
        {item.account?.name}
      </p>
    </React.Fragment>
  );
};

const PageMessageForOwner = ({ page }: PageMessageProps) => {
  const dispatch = useAppDispatch();
  const [currentMessageSessionId, setCurrentMessageSessionId] = useState<string | null>(null);
  const [currentPageMessageSessionId, setCurrentPageMessageSessionId] = useState<string | null>(null);
  const { control, getValues, resetField, setFocus } = useForm();

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

  const { data: messageSessionData } = useMessageSessionByPageMessageSessionIdQuery(
    {
      id: currentPageMessageSessionId
    },
    { skip: !currentPageMessageSessionId }
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
    id: currentMessageSessionId,
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

  useEffect(() => {
    resetField('message');
    setFocus('message');
  }, [currentMessageSessionId]);

  const onClickMessage = (messageSessionId: string, pageMessageSessionId: string) => {
    setCurrentPageMessageSessionId(pageMessageSessionId);
    setCurrentMessageSessionId(messageSessionId);
  };

  const loadMoreMessages = () => {
    if (messageHasNext && !messageIsFetching) {
      messageFetchNext();
    } else if (messageHasNext) {
      messageFetchNext();
    }
  };

  const sendMessage = async () => {
    if (_.isNil(getValues('message')) || getValues('message') === '' || currentMessageSessionId === null) {
      return;
    }
    const input: CreateMessageInput = {
      authorId: parseInt(page.pageAccount.id),
      body: getValues('message'),
      messageSessionId: currentMessageSessionId,
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

  return (
    <StyledChatContainer>
      <StyledChatList id="scrollableChatlist">
        <InfiniteScroll
          dataLength={data.length}
          next={loadMoreItems}
          hasMore={hasNext}
          loader={<Skeleton avatar active />}
          scrollableTarget="scrollableChatlist"
        >
          {data.map((item, index) => {
            return <ChatUser index={index} item={item} key={item.id} onClickMessage={onClickMessage} />;
          })}
        </InfiniteScroll>
      </StyledChatList>
      <StyledContainer>
        <StyledHeader>
          {messageSessionData &&
            `Session: ${messageSessionData.allMessageSessionByPageMessageSessionId.edges[0].node.id}`}
        </StyledHeader>
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
        {currentMessageSessionId && (
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
                  placeholder={'Aa'}
                  disabled={isLoadingCreateMessage}
                  autoSize
                  onKeyDown={handleKeyDown}
                />
              )}
            />
            <IconContainer>
              <SendOutlined onClick={sendMessage} disabled={isLoadingCreateMessage} />
            </IconContainer>
          </InputContainer>
        )}
      </StyledContainer>
    </StyledChatContainer>
  );
};

export default PageMessageForOwner;
