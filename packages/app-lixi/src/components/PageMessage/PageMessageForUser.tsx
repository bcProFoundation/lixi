import { Button, Input, Skeleton, Space } from 'antd';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { getSelectedAccount, getSelectedAccountId } from '@store/account';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { PageItem } from '@components/Pages/PageDetail';
import { useInfiniteMessageByMessageSessionId } from '@store/message/useInfiniteMessageByMessageSessionId';
import InfiniteScroll from 'react-infinite-scroll-component';
import {
  useCreatePageMessageSessionMutation,
  useUserHadMessageToPageQuery
} from '@store/message/pageMessageSession.api';
import { Account, CreateMessageSessionInput } from '@bcpros/lixi-models';
import _ from 'lodash';
import {
  CreateMessageInput,
  CreatePageMessageInput,
  MessageOrderField,
  OrderDirection
} from '@generated/types.generated';
import { userSubcribeToMessageSession } from '@store/message/actions';
import { useCreateMessageMutation } from '@store/message/message.api';
import { useForm, Controller } from 'react-hook-form';
import { api as messageApi } from '@store/message/message.api';
import Message from './Message';
import { SendOutlined } from '@ant-design/icons';
import { useCreateMessageSessionMutation } from '@store/message/messageSession.api';

const { TextArea } = Input;

type PageMessageProps = {
  page: PageItem;
  account: Account;
};

const StyledChatContainer = styled.div`
  background-color: white;
  width: 100%;
  height: 600px;
  border-radius: var(--border-radius-primary);
  display: flex;
  flex-direction: column;
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

const IconContainer = styled.div`
  display: flex;
  width: 5%;
  border: 1px solid black;
  justify-content: center;
  border-radius: 0px 5px 5px 0px;
`;

const StyledInfiniteScroll = styled(InfiniteScroll)`
  display: flex;
  flex-direction: column-reverse;
`;

const StyledHeader = styled.div`
  border-bottom: 1px solid black;
`;

const PageMessageForUser = ({ page, account }: PageMessageProps) => {
  const dispatch = useAppDispatch();
  const { control, getValues, resetField, setFocus } = useForm();
  const [messageSessionId, setMessageSessionId] = useState<string | null>(null);

  const { data: pageMessageSessionData, refetch: pageMessageSessionRefetch } = useUserHadMessageToPageQuery({
    accountId: account.id,
    pageId: page.id
  });

  const { data, totalCount, fetchNext, hasNext, isFetching, isFetchingNext, refetch } =
    useInfiniteMessageByMessageSessionId({
      id: messageSessionId,
      orderBy: {
        direction: OrderDirection.Desc,
        field: MessageOrderField.UpdatedAt
      }
    });

  const [
    createPageMessageSessionTrigger,
    {
      isLoading: isLoadingCreatePageMessageSession,
      isSuccess: isSuccessCreatePageMessageSession,
      isError: isErrorCreatePageMessageSession
    }
  ] = useCreatePageMessageSessionMutation();

  const [
    createMessageTrigger,
    { isLoading: isLoadingCreateMessage, isSuccess: isSuccessCreateMessage, isError: isErrorCreateMessage }
  ] = useCreateMessageMutation();

  const [
    createMessageSessionTrigger,
    {
      isLoading: isLoadingCreateMessageSession,
      isSuccess: isSuccessCreateMessageSession,
      isError: isErrorCreateMessageSession
    }
  ] = useCreateMessageSessionMutation();

  const loadMoreItems = () => {
    if (hasNext && !isFetching) {
      fetchNext();
    } else if (hasNext) {
      fetchNext();
    }
  };

  const createNewPageMessage = async () => {
    const input: CreatePageMessageInput = {
      accountId: account.id,
      pageId: page.id
    };
    if (_.isNil(pageMessageSessionData)) {
      const result = await createPageMessageSessionTrigger({ input }).unwrap();

      pageMessageSessionRefetch();
    }
  };

  const createNewMessageSession = async () => {
    const input: CreateMessageSessionInput = {
      pageMessageSessionId: pageMessageSessionData.userHadMessageToPage.id
    };
    console.log('🚀 ~ file: PageMessageForUser.tsx:141 ~ createNewMessageSession ~ input:', input);
    if (!_.isNil(pageMessageSessionData)) {
      const result = await createMessageSessionTrigger({ input }).unwrap();

      pageMessageSessionRefetch();
    }
  };

  useEffect(() => {
    if (pageMessageSessionData?.userHadMessageToPage?.id) {
      const id = pageMessageSessionData?.userHadMessageToPage?.messageSessions[0].id;
      setMessageSessionId(id);
      dispatch(userSubcribeToMessageSession(id));
    }
  }, [pageMessageSessionData]);

  const sendMessage = async () => {
    if (_.isNil(getValues('message')) || getValues('message') === '') {
      return;
    }
    const input: CreateMessageInput = {
      authorId: account.id,
      body: getValues('message'),
      messageSessionId: messageSessionId,
      isPageOwner: false,
      pageMessageSessionId: pageMessageSessionData?.userHadMessageToPage?.id
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
      {!_.isNil(pageMessageSessionData) && (
        <Button onClick={() => createNewMessageSession()}>Create Message Session</Button>
      )}
      <StyledHeader>{messageSessionId && `Session: ${messageSessionId}`}</StyledHeader>
      {_.isNil(pageMessageSessionData) && <Button onClick={() => createNewPageMessage()}>Create Message</Button>}

      <StyledChatbox id="scrollableChatbox">
        {!_.isNil(pageMessageSessionData) && (
          <StyledInfiniteScroll
            dataLength={data.length}
            next={loadMoreItems}
            hasMore={hasNext}
            loader={<Skeleton avatar active />}
            inverse
            scrollableTarget="scrollableChatbox"
          >
            {data.map(item => {
              return <Message message={item} key={item.id} authorAddress={account.address} />;
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
    </StyledChatContainer>
  );
};

export default PageMessageForUser;
