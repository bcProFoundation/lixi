import { RemoveBookmarkInput } from '@bcpros/lixi-models';
import React from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { useInfiniteBookmarkTimelineQuery } from '@store/bookmark';
import { getSelectedAccountId } from '@store/account';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { Avatar, Button, List, Skeleton } from 'antd';
import styled from 'styled-components';
import AvatarUser from '@components/Common/AvatarUser';
import router from 'next/router';
import intl from 'react-intl-universal';
import { useRemoveBookmarkMutation } from '@store/bookmark/bookmark.api';
import { showToast } from '@store/toast';

const Container = styled.div`
  @media (max-width: 968px) {
    padding-bottom: 1rem;
  }

  .ant-list-item {
    position: relative;
  }

  .ant-avatar {
    border-radius: 10px !important;
    width: 100px;
    height: 100px;
    > img {
      border-radius: 10px;
    }

    .ant-avatar-string {
      font-size: 40px;
    }
  }

  .ant-list-item-meta-title {
    text-align: left;
    font-size: 20px !important;
    max-height: 60px;
    overflow: hidden;
    margin: 0 !important;
    cursor: pointer;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
  }

  .ant-list-item-meta-description {
    text-align: left;
    color: rgb(176, 179, 184) !important;
    font-weight: 500;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
  }

  .ant-list-item-extra {
    position: absolute;
    left: 90px;
    top: 70px;

    .button-unsaved {
      background: var(--color-primary);
      color: #fff;
      font-weight: 500;
      font-size: 14px;
    }
  }
`;

function BookmarkContainer() {
  const selectedAccountId = useAppSelector(getSelectedAccountId);
  const dispatch = useAppDispatch();

  const [removeBookmarkTrigger] = useRemoveBookmarkMutation();

  const { data, fetchNext, hasNext, isFetching } = useInfiniteBookmarkTimelineQuery(
    {
      id: selectedAccountId,
      first: 20
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

  const parseHtmlContent = htmlContent => {
    const document = new DOMParser().parseFromString(htmlContent, 'text/html');
    const paragraphElement = document.querySelector('.EditorLexical_paragraph');
    const paragraphText = paragraphElement?.textContent;
    return paragraphText;
  };

  const postImage = post => {
    //get image of post, if post don't have image, get avatar image
    if (post?.imageUploadable) {
      const cfImageId = post.imageUploadable.uploads[0].cfImageId;
      return `${process.env.NEXT_PUBLIC_CF_IMAGES_DELIVERY_URL}/${process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH}/${cfImageId}/public`;
    } else {
      return post.account.avatar;
    }
  };

  const savedFromContent = post => {
    const savePostContent =
      intl.get('post.bookmarkFrom', {
        postType: intl.get(`post.type${post.__typename}`),
        postName: post.account.name,
        postTypeLower: intl.get(`post.type${post.__typename}`).toLowerCase()
      }) + (post?.page ? intl.get('post.bookmarkInPage', { pageName: post.page?.name }) : '');
    return savePostContent;
  };

  const unBookmark = async post => {
    const removeBookmarkInput: RemoveBookmarkInput = {
      accountId: selectedAccountId,
      bookmarkForId: post.id
    };

    await removeBookmarkTrigger({ input: removeBookmarkInput });

    dispatch(
      showToast('success', {
        message: intl.get('toast.success'),
        description: intl.get('post.unbookmarkSuccess')
      })
    );
  };

  return (
    <React.Fragment>
      <Container>
        {data.length === 0 ? (
          <>{intl.get('general.noBookmark')}</>
        ) : (
          <InfiniteScroll
            dataLength={data.length}
            next={loadMoreItems}
            hasMore={hasNext}
            loader={null}
            scrollableTarget="scrollableDiv"
          >
            <List
              itemLayout="vertical"
              dataSource={data}
              renderItem={item => (
                <List.Item
                  key={item.id}
                  extra={
                    <Button onClick={() => unBookmark(item.data)} className="button-unsaved">
                      {intl.get('post.unSave')}
                    </Button>
                  }
                >
                  <List.Item.Meta
                    key={item.id}
                    avatar={
                      <div onClick={() => router.push(`post/${item.data.id}`)}>
                        <AvatarUser icon={postImage(item.data)} isMarginRight={false} name={item.data.account.name} />
                      </div>
                    }
                    title={
                      <div onClick={() => router.push(`post/${item.data.id}`)}>
                        {parseHtmlContent(item.data.content)}
                      </div>
                    }
                    description={<p>{savedFromContent(item.data)}</p>}
                  />
                </List.Item>
              )}
            ></List>
          </InfiniteScroll>
        )}
      </Container>
    </React.Fragment>
  );
}

export default BookmarkContainer;
