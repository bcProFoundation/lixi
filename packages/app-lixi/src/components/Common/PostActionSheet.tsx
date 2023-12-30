import { Drawer } from 'antd';
import React, { useState, useEffect } from 'react';
import intl from 'react-intl-universal';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { closeActionSheet } from '@store/action-sheet/actions';
import { EditPostModalProps } from '@components/Posts/EditPostModalPopup';
import { openModal } from '@store/modal/actions';
import {
  CreateFollowPageInput,
  CreateFollowTokenInput,
  DeleteFollowPageInput,
  DeleteFollowTokenInput,
  ExtraArgumentsPostFollow,
  ParamPostFollowCommand
} from '@bcpros/lixi-models';
import { getSelectedAccount, getSelectedAccountId } from '@store/account';
import { usePageQuery } from '@store/page/pages.generated';
import {
  useCreateFollowAccountMutation,
  useCreateFollowPageMutation,
  useCreateFollowTokenMutation,
  useDeleteFollowAccountMutation,
  useDeleteFollowPageMutation,
  useDeleteFollowTokenMutation
} from '@store/follow/follows.api';
import {
  BookmarkType,
  CreateBookmarkInput,
  CreateFollowAccountInput,
  DeleteFollowAccountInput,
  RemoveBookmarkInput
} from '@generated/types.generated';
import { getWalletStatus } from '@store/wallet';
import { useSwipeable } from 'react-swipeable';
import { useUserHadMessageToPageQuery } from '@store/message/pageMessageSession.generated';
import CreatePostCard from './CreatePostCard';
import {
  getFilterPostsHome,
  getFilterPostsPage,
  getFilterPostsProfile,
  getFilterPostsToken,
  getLevelFilter
} from '@store/settings';
import { changeFollowActionSheetPost } from '@store/post/actions';
import { FollowForType } from '@bcpros/lixi-models/lib/follow/follow.model';
import { useRouter } from 'next/router';
import { useCreateBookmarkMutation, useRemoveBookmarkMutation } from '@store/bookmark/bookmark.api';
import { showToast } from '@store/toast';

interface PostActionSheetProps {
  id?: string;
  classStyle?: string;
  isEditPost?: boolean;
  post?: any;
  page?: any;
  token?: any;
  followPostOwner?: boolean;
  followedPage?: boolean;
  followedToken?: boolean;
}

export const ItemActionSheetBottom = ({
  icon,
  type,
  text,
  className,
  onClickItem
}: {
  icon?: string;
  type?: string;
  text?: string;
  className?: string;
  onClickItem?: () => void;
}) => {
  return (
    <ItemActionSheet className="item-action-sheet" onClick={onClickItem}>
      <span style={{ color: type === 'danger' ? 'var(--color-danger)' : '' }} className="text-action-sheet">
        {text}
      </span>
      {icon && <img className={`img-action-sheet-item ${className}`} src={icon} />}
    </ItemActionSheet>
  );
};

export const ContainerActionSheet = styled.div`
  padding: 0.5rem 1rem 2rem 1rem;
  .bar-close {
    padding: 2px;
    width: 50px;
    height: 1px;
    border-radius: 8px;
    margin: auto;
    margin-bottom: 1rem;
    cursor: pointer;
  }
`;

export const ItemActionSheet = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--bg-color-light-theme);
  cursor: pointer;
  border-radius: var(--border-radius-item);
  margin-bottom: 1rem;
  @media (max-height: 960px) {
    padding: 1rem;
  }
  .text-action-sheet {
    font-weight: 600;
  }
  .img-action-sheet-item {
    width: 17px;
    height: 17px;
    filter: var(--filter-svg-gray-color);

    &.isFollowed,
    &.isBookmarked {
      filter: var(--filter-color-primary) !important;
    }
  }
`;

export const PostActionSheet: React.FC<PostActionSheetProps> = ({
  classStyle,
  isEditPost,
  post,
  page,
  token,
  followedPage,
  followPostOwner,
  followedToken
}: PostActionSheetProps) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const selectedAccountId = useAppSelector(getSelectedAccountId);
  const [isFollowedPage, setIsFollowedPage] = useState<boolean>(followedPage);
  const [isFollowedToken, setIsFollowedToken] = useState<boolean>(followedToken);
  const [isFollowedAccount, setIsFollowedAccount] = useState<boolean>(followPostOwner);
  const [openCreatePost, setOpenCreatePost] = useState<boolean>(false);
  const selectedAccount = useAppSelector(getSelectedAccount);
  const walletStatus = useAppSelector(getWalletStatus);

  //bookmark
  const [isBookmarked, setIsBookmarked] = useState<boolean>(post?.isBookmarked);

  const extraArgumentsPostFollow: ExtraArgumentsPostFollow = {
    pageId: post?.page?.id,
    tokenId: post?.token?.tokenId,
    accountId: post.account.id
  };

  const payloadFollowPage: ParamPostFollowCommand = {
    changeFollow: isFollowedPage,
    followForType: FollowForType.Page,
    extraArgumentsPostFollow
  };

  const payloadFollowToken: ParamPostFollowCommand = {
    changeFollow: isFollowedToken,
    followForType: FollowForType.Token,
    extraArgumentsPostFollow
  };

  const payloadFollowAccount: ParamPostFollowCommand = {
    changeFollow: isFollowedAccount,
    followForType: FollowForType.Account,
    extraArgumentsPostFollow
  };

  const [createBookmarkTrigger] = useCreateBookmarkMutation();
  const [removeBookmarkTrigger] = useRemoveBookmarkMutation();

  const [
    createFollowPageTrigger,
    {
      isLoading: isLoadingCreateFollowPage,
      isSuccess: isSuccessCreateFollowPage,
      isError: isErrorCreateFollowPage,
      error: errorOnCreatePage
    }
  ] = useCreateFollowPageMutation();

  const [
    deleteFollowPageTrigger,
    {
      isLoading: isLoadingDeleteFollowPage,
      isSuccess: isSuccessDeleteFollowPage,
      isError: isErrorDeleteFollowPage,
      error: errorOnDeletePage
    }
  ] = useDeleteFollowPageMutation();

  const [
    createFollowAccountTrigger,
    {
      isLoading: isLoadingCreateFollowAccount,
      isSuccess: isSuccessCreateFollowAccount,
      isError: isErrorCreateFollowAccount,
      error: errorOnCreateAccount
    }
  ] = useCreateFollowAccountMutation();

  const [
    deleteFollowAccountTrigger,
    {
      isLoading: isLoadingDeleteFollowAccount,
      isSuccess: isSuccessDeleteFollowAccount,
      isError: isErrorDeleteFollowAccount,
      error: errorOnDeleteAccount
    }
  ] = useDeleteFollowAccountMutation();

  const [
    createFollowTokenTrigger,
    {
      isLoading: isLoadingCreateFollowToken,
      isSuccess: isSuccessCreateFollowToken,
      isError: isErrorCreateFollowToken,
      error: errorOnCreateToken
    }
  ] = useCreateFollowTokenMutation();

  const [
    deleteFollowTokenTrigger,
    {
      isLoading: isLoadingDeleteFollowToken,
      isSuccess: isSuccessDeleteFollowToken,
      isError: isErrorDeleteFollowToken,
      error: errorOnDeleteToken
    }
  ] = useDeleteFollowTokenMutation();

  const { data: pageMessageSessionData, refetch: pageMessageSessionRefetch } = useUserHadMessageToPageQuery(
    {
      accountId: selectedAccount?.id,
      pageId: page?.id
    },
    { skip: selectedAccount?.id === page?.pageAccountId || !selectedAccount?.id }
  );

  const { currentData: currentDataPageQuery, isSuccess: isSuccessPageQuery } = usePageQuery({ id: post?.page?.id });

  const onClose = () => {
    setOpen(false);
    setTimeout(() => {
      dispatch(closeActionSheet());
    }, 500);
  };

  const editPost = () => {
    const editPostProps: EditPostModalProps = {
      accountAddress: post.account.address,
      content: post.content,
      postId: post.id
    };
    dispatch(openModal('EditPostModalPopup', editPostProps));
    dispatch(closeActionSheet());
  };

  const handleFollowPage = async () => {
    const createFollowPageInput: CreateFollowPageInput = {
      accountId: selectedAccountId,
      pageId: page?.id
    };
    setIsFollowedPage(!isFollowedPage);
    await createFollowPageTrigger({ input: createFollowPageInput });

    dispatch(changeFollowActionSheetPost(payloadFollowPage));
  };

  const handleUnfollowPage = async () => {
    const deleteFollowPageInput: DeleteFollowPageInput = {
      accountId: selectedAccountId,
      pageId: page?.id
    };
    setIsFollowedPage(!isFollowedPage);
    await deleteFollowPageTrigger({ input: deleteFollowPageInput });

    dispatch(changeFollowActionSheetPost(payloadFollowPage));
  };

  const handleFollowAccount = async () => {
    const createFollowAccountInput: CreateFollowAccountInput = {
      followingAccountId: parseInt(post.account.id),
      followerAccountId: selectedAccountId
    };
    setIsFollowedAccount(!isFollowedAccount);
    await createFollowAccountTrigger({ input: createFollowAccountInput });

    dispatch(changeFollowActionSheetPost(payloadFollowAccount));
  };

  const handleUnfollowAccount = async () => {
    const deleteFollowAccountInput: DeleteFollowAccountInput = {
      followingAccountId: parseInt(post.account.id),
      followerAccountId: selectedAccountId
    };
    setIsFollowedAccount(!isFollowedAccount);
    await deleteFollowAccountTrigger({ input: deleteFollowAccountInput });

    dispatch(changeFollowActionSheetPost(payloadFollowAccount));
  };

  const handleFollowToken = async () => {
    const createFollowTokenInput: CreateFollowTokenInput = {
      accountId: selectedAccountId,
      tokenId: token.tokenId
    };
    setIsFollowedToken(!isFollowedToken);
    await createFollowTokenTrigger({ input: createFollowTokenInput });

    dispatch(changeFollowActionSheetPost(payloadFollowToken));
  };

  const handleUnfollowToken = async () => {
    const deleteFollowTokenInput: DeleteFollowTokenInput = {
      accountId: selectedAccountId,
      tokenId: token.tokenId
    };
    setIsFollowedToken(!isFollowedToken);
    await deleteFollowTokenTrigger({ input: deleteFollowTokenInput });

    dispatch(changeFollowActionSheetPost(payloadFollowToken));
  };

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

  const openPageMessageLixiModal = () => {
    dispatch(openModal('PageMessageLixiModal', { account: selectedAccount, page: page, wallet: walletStatus }));
  };

  const handlersSwipe = useSwipeable({
    onSwipedDown: eventData => onClose()
  });

  const openCreatePostPage = () => {
    setOpenCreatePost(true);
  };

  const openBurnHistoryModal = () => {
    dispatch(openModal('BurnHistoryModal', { postId: post.id }));
  };

  return (
    <>
      <Drawer
        className={`${classStyle} action-sheet-bottom`}
        placement={'bottom'}
        closable={false}
        onClose={onClose}
        open={open}
        height={'auto'}
      >
        <ContainerActionSheet {...handlersSwipe}>
          <div hidden={true}>
            {openCreatePost && <CreatePostCard page={page} hashtags={[]} query={''} autoEnable={true} />}
          </div>
          <div className="bar-close" onClick={onClose}></div>
          {isEditPost && <ItemActionSheetBottom text="Edit post" icon="/images/ico-edit.svg" onClickItem={editPost} />}
          {/* <ItemActionSheetBottom type="danger" text="Remove" /> */}
          {post.page && isSuccessPageQuery && (
            <>
              <ItemActionSheetBottom
                text={`${
                  post.page.createPostFee == 0
                    ? intl.get('page.createFreePostOn', {
                        pageName: currentDataPageQuery?.page?.name
                      })
                    : intl.get('page.createPostOnPage', {
                        pageName: currentDataPageQuery?.page?.name,
                        fee: parseInt(post.page.createPostFee)
                      })
                }`}
                icon="/images/ico-create-post.svg"
                onClickItem={openCreatePostPage}
              />
            </>
          )}

          <ItemActionSheetBottom
            text={intl.get('post.burnHistory')}
            icon="/images/ico-burn-history.svg"
            onClickItem={openBurnHistoryModal}
          />

          <ItemActionSheetBottom
            text={isBookmarked ? intl.get('post.unbookmarkPost') : intl.get('post.bookmarkPost')}
            icon="/images/ico-bookmark.svg"
            className={isBookmarked ? 'isBookmarked' : ''}
            onClickItem={isBookmarked ? unBookmarkPost : bookmarkPost}
          />

          {post.page && post.account.id != selectedAccountId && !pageMessageSessionData && (
            <ItemActionSheetBottom
              text={`${intl.get('messenger.chat')} ${page?.name}`}
              icon="/images/ico-message-heart-circle.svg"
              onClickItem={openPageMessageLixiModal}
            />
          )}

          {post.page && (
            <ItemActionSheetBottom
              text={
                isFollowedPage
                  ? `${intl.get('general.unfollow')} ${page?.name}`
                  : `${intl.get('general.follow')} ${page?.name}`
              }
              icon="/images/follow.svg"
              className={isFollowedPage ? 'isFollowed' : ''}
              onClickItem={isFollowedPage ? handleUnfollowPage : handleFollowPage}
            />
          )}
          {post.account.id != selectedAccountId && (
            <ItemActionSheetBottom
              text={
                isFollowedAccount
                  ? `${intl.get('general.unfollow')} ${post.account?.name}`
                  : `${intl.get('general.follow')} ${post.account?.name}`
              }
              icon="/images/follow.svg"
              className={isFollowedAccount ? 'isFollowed' : ''}
              onClickItem={isFollowedAccount ? handleUnfollowAccount : handleFollowAccount}
            />
          )}

          {post.token && (
            <ItemActionSheetBottom
              text={
                isFollowedToken
                  ? `${intl.get('general.unfollow')} ${token?.name}`
                  : `${intl.get('general.follow')} ${token?.name}`
              }
              icon="/images/follow.svg"
              className={isFollowedToken ? 'isFollowed' : ''}
              onClickItem={isFollowedToken ? handleUnfollowToken : handleFollowToken}
            />
          )}
        </ContainerActionSheet>
      </Drawer>
    </>
  );
};
