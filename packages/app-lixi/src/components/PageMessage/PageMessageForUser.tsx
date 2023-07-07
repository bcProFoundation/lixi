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
import { Account } from '@bcpros/lixi-models';
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

type PageMessageProps = {
  page: PageItem;
  account: Account;
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
const StyledChatbox = styled.div``;

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

const Message = ({ item, index }) => {
  return (
    <React.Fragment>
      <p>{item?.body}</p>
    </React.Fragment>
  );
};

const PageMessageForUser = ({ page, account }: PageMessageProps) => {
  const dispatch = useAppDispatch();
  const { control, getValues, setValue, setFocus } = useForm();
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

  useEffect(() => {
    if (pageMessageSessionData?.userHadMessageToPage?.id) {
      const id = pageMessageSessionData?.userHadMessageToPage?.messageSessions[0].id;
      setMessageSessionId(id);
      dispatch(userSubcribeToMessageSession(id));
    }
  }, [pageMessageSessionData]);

  const sendMessage = async () => {
    const input: CreateMessageInput = {
      authorId: account.id,
      body: getValues('message'),
      messageSessionId: messageSessionId,
      isPageOwner: false,
      pageMessageSessionId: pageMessageSessionData?.userHadMessageToPage?.id
    };

    await createMessageTrigger({ input }).unwrap();
  };

  return (
    <StyledChatContainer>
      <StyledChatbox>
        {_.isNil(pageMessageSessionData) ? (
          <Button onClick={() => createNewPageMessage()}>Create Message</Button>
        ) : (
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
              return <Message index={index} item={item} key={item.id} />;
            })}
          </InfiniteScroll>
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

export default PageMessageForUser;
