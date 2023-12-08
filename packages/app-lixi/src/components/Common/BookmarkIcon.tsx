import React, { useState } from 'react';
import { useCreateBookmarkMutation, useRemoveBookmarkMutation } from '@store/bookmark/bookmark.api';
import intl from 'react-intl-universal';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { getSelectedAccountId } from '@store/account';
import { showToast } from '@store/toast/actions';
import { RemoveBookmarkInput, CreateBookmarkInput, BookmarkType } from '@generated/types.generated';

type BookmarkProps = {
  post: any;
};

const BookmarkIcon = (props: BookmarkProps) => {
  const { post } = props;
  const dispatch = useAppDispatch();
  const [isBookmarked, setIsBookmarked] = useState<boolean>(post?.isBookmarked);
  const selectedAccountId = useAppSelector(getSelectedAccountId);

  const [createBookmarkTrigger] = useCreateBookmarkMutation();
  const [removeBookmarkTrigger] = useRemoveBookmarkMutation();

  const bookmarkPost = async () => {
    const createBookmarkInput: CreateBookmarkInput = {
      accountId: selectedAccountId,
      bookmarkForId: post.id,
      bookmarkType: BookmarkType.Post
    };
    setIsBookmarked(!isBookmarked);
    await createBookmarkTrigger({ input: createBookmarkInput });

    dispatch(
      showToast('success', {
        message: intl.get('toast.success'),
        description: intl.get('post.bookmarkSuccess')
      })
    );
  };

  const unBookmarkPost = async () => {
    const removeBookmarkInput: RemoveBookmarkInput = {
      accountId: selectedAccountId,
      bookmarkForId: post.id
    };
    setIsBookmarked(!isBookmarked);
    await removeBookmarkTrigger({ input: removeBookmarkInput });

    dispatch(
      showToast('success', {
        message: intl.get('toast.success'),
        description: intl.get('post.unbookmarkSuccess')
      })
    );
  };

  return (
    <>
      <span className="bookmark" onClick={isBookmarked ? unBookmarkPost : bookmarkPost}>
        {isBookmarked ? (
          <img src="/images/ico-bookmark-fill.svg" className="icon-bookmark-fill" />
        ) : (
          <img src="/images/ico-bookmark-stroke-color.svg" className="icon-bookmark" />
        )}
      </span>
    </>
  );
};

export default React.memo(BookmarkIcon);
