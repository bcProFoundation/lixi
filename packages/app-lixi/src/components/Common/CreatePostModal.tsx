import { Button, Modal } from 'antd';
import React from 'react';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import AvatarUser from './AvatarUser';
import router from 'next/router';
import { closeModal } from '@store/modal';
import {
  getCurrentThemes,
  getFilterPostsHome,
  getFilterPostsPage,
  getFilterPostsToken,
  getIsTopPosts,
  getLevelFilter
} from '@store/settings/selectors';
import { DollarOutlined, GlobalOutlined, ShopOutlined } from '@ant-design/icons';
import intl from 'react-intl-universal';
import EditorLexical from './Lexical/EditorLexical';
import { getAccountInfoTemp, getPostCoverUploads, getSelectedAccount } from '@store/account/selectors';
import { CreatePostInput, OrderDirection, PageQueryItem, PostOrderField } from '@generated/index';
import { currency } from './Ticker';
import { PatchCollection } from '@reduxjs/toolkit/dist/query/core/buildThunks';
import { getUtxoWif } from '@utils/cashMethods';
import useXPI from '@hooks/useXPI';
import { WalletContext } from '@context/index';
import { getAllWalletPaths, getSlpBalancesAndUtxos } from '@store/wallet';
import { useCreatePostMutation } from '@store/post/posts.generated';
import { showToast } from '@store/toast/actions';
import { deleteEditorTextFromCache, removeAllUpload } from '@store/account';
import { api as timelineApi } from '@store/timeline/timeline.generated';
import { closeActionSheet } from '@store/action-sheet/actions';

type CreatePostCardProp = {
  page?: PageQueryItem;
  tokenPrimaryId?: string;
  userId?: number;
  refetch?: () => void;
  hashtags?: string[]; //Multiple hashtag for search function
  hashtagId?: string; // hashtagId here for the url /hashtag/{hashtag}
  query?: string;
  autoEnable?: boolean;
};

const UserCreate = styled.div`
  .user-create-post {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 24px;
    img {
      width: 48px;
      height: 48px;
    }
    .user-info {
      .title-user {
        margin: 0;
        font-weight: 500;
        text-transform: capitalize;
        line-height: 24px;
        letter-spacing: 0.15px;
        color: var(--text-color-on-background);
      }
      .location-fee {
        display: flex;
        align-items: baseline;
      }
      .btn-select {
        background: var(--border-color-base);
        border-radius: var(--border-radius-primary);
        padding: 0 8px;
        border: none;
        margin-top: 4px;
        span {
          font-weight: 400;
          font-size: 12px;
          line-height: 20px;
          letter-spacing: 0.25px;
          color: #4e444b;
          &.anticon {
            font-size: 10px;
          }
        }
      }
      .post-fee {
        font-weight: 400;
        font-size: 12px;
        line-height: 20px;
        letter-spacing: 0.25px;
        color: #4e444b;
        padding-left: 5px;
        &.anticon {
          font-size: 10px;
        }
      }
    }
  }
`;

const CreatePostModal = ({ page, hashtags, hashtagId, tokenPrimaryId, query, autoEnable }: CreatePostCardProp) => {
  const Wallet = React.useContext(WalletContext);
  const { XPI, chronik } = Wallet;
  const { sendXpi } = useXPI();
  const currentTheme = useAppSelector(getCurrentThemes);
  const dispatch = useAppDispatch();
  const pathname = router.pathname ?? '';
  const selectedAccount = useAppSelector(getSelectedAccount);
  const accountInfoTemp = useAppSelector(getAccountInfoTemp);
  const filterHome = useAppSelector(getFilterPostsHome);
  const filterPage = useAppSelector(getFilterPostsPage);
  const filterToken = useAppSelector(getFilterPostsToken);
  const slpBalancesAndUtxos = useAppSelector(getSlpBalancesAndUtxos);
  const walletPaths = useAppSelector(getAllWalletPaths);
  const postCoverUploads = useAppSelector(getPostCoverUploads);
  const isTop = useAppSelector(getIsTopPosts);
  const level = useAppSelector(getLevelFilter);

  const [
    createPostTrigger,
    { isLoading: isLoadingCreatePost, isSuccess: isSuccessCreatePost, isError: isErrorCreatePost }
  ] = useCreatePostMutation();

  const handleCreateNewPost = async ({ htmlContent, pureContent }) => {
    let timelinePatches: PatchCollection;

    try {
      let filterValue: number;
      let createFeeHex;
      if (pathname.includes('/token')) {
        filterValue = filterToken;
      } else if (pathname.includes('/page')) {
        filterValue = filterPage;

        try {
          if (selectedAccount.id != page.pageAccountId && parseFloat(page.createPostFee) != 0) {
            const fundingWif = getUtxoWif(slpBalancesAndUtxos.nonSlpUtxos[0], walletPaths);
            createFeeHex = await sendXpi(
              XPI,
              chronik,
              walletPaths,
              slpBalancesAndUtxos.nonSlpUtxos,
              currency.defaultFee,
              '',
              false, // indicate send mode is one to one
              null,
              page.pageAccount.address,
              page.createPostFee,
              true,
              fundingWif,
              true
            );
          }
        } catch (error) {
          throw new Error(intl.get('account.insufficientFunds'));
        }
      } else {
        filterValue = filterHome;
      }

      const createPostInput: CreatePostInput = {
        uploads: postCoverUploads.map(upload => upload.id),
        htmlContent: htmlContent,
        pureContent: pureContent,
        pageId: page?.id,
        tokenPrimaryId: tokenPrimaryId || undefined,
        createFeeHex: createFeeHex,
        extraArguments: {
          hashtagId: hashtagId,
          hashtags: hashtags,
          query: query,
          isTop: String(isTop),
          minBurnFilter: filterValue,
          orderBy: {
            direction: OrderDirection.Desc,
            field: PostOrderField.UpdatedAt
          }
        }
      };

      await createPostTrigger({ input: createPostInput });

      dispatch(
        showToast('success', {
          message: 'Success',
          description: intl.get('post.createPostSuccessful'),
          duration: 5
        })
      );

      dispatch(closeModal());
      dispatch(removeAllUpload());
      dispatch(deleteEditorTextFromCache());
    } catch (error) {
      let message;
      if (error.message === intl.get('account.insufficientFunds')) {
        message = error.message;
      } else {
        message = intl.get('post.unableCreatePostServer');
      }
      if (timelinePatches) {
        dispatch(timelineApi.util.patchQueryData('HomeTimeline', { level: level }, timelinePatches.inversePatches));
      }
      dispatch(
        showToast('error', {
          message: 'Error',
          description: message,
          duration: 5
        })
      );
    }
    if (autoEnable) {
      dispatch(closeActionSheet());
    }
  };

  const handleCancel = () => {
    dispatch(closeModal());
    if (autoEnable) {
      dispatch(closeActionSheet());
    }
  };

  const getCreatePostLocation = () => {
    if (pathname.includes('/token')) {
      return (
        <React.Fragment>
          {intl.get('post.token')} <DollarOutlined />
        </React.Fragment>
      );
    } else if (pathname.includes('/page') || autoEnable) {
      return (
        <React.Fragment>
          {intl.get('post.page')} <ShopOutlined />
        </React.Fragment>
      );
    } else {
      return (
        <React.Fragment>
          {intl.get('post.public')} <GlobalOutlined />
        </React.Fragment>
      );
    }
  };

  return (
    <Modal
      className={`${currentTheme === 'dark' ? 'ant-modal-dark' : ''} custom-modal-editor`}
      transitionName=""
      title="Create Post"
      open={true}
      footer={null}
      maskClosable={false}
      onCancel={handleCancel}
    >
      <UserCreate>
        <div className="user-create-post">
          <AvatarUser icon={accountInfoTemp?.avatar} name={selectedAccount?.name} isMarginRight={false} />
          <div className="user-info">
            <p className="title-user">{selectedAccount?.name}</p>
            <div className="location-fee">
              <Button className="btn-select">{getCreatePostLocation()}</Button>
              {page && page.createPostFee && selectedAccount?.id != page.pageAccountId && (
                <p className="post-fee">{`${intl.get('general.fee')} ${page.createPostFee} ${currency.ticker}`}</p>
              )}
            </div>
          </div>
        </div>
        <EditorLexical
          onSubmit={value => handleCreateNewPost(value)}
          loading={isLoadingCreatePost}
          hashtags={hashtags}
        />
      </UserCreate>
    </Modal>
  );
};

export default CreatePostModal;
