import { GlobalOutlined } from '@ant-design/icons';
import EditorLexical from '@components/Common/Lexical/EditorLexical';
import { UpdatePostInput } from '@generated/types.generated';
import { getSelectedAccount } from '@store/account/selectors';
import { removeAllUploadTempPost } from '@store/post/actions';
import { useSliceDispatch, useSliceSelector } from '@store/index';
import { closeModal } from '@store/modal/actions';
import { useUpdatePostMutation } from '@store/post/posts.api';
import { getFilterPostsHome } from '@store/settings/selectors';
import { showToast } from '@store/toast/actions';
import { Button, Modal } from 'antd';
import _ from 'lodash';
import React from 'react';
import intl from 'react-intl-universal';
import styled from 'styled-components';

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
      .btn-select {
        background: var(--border-color-base);
        border-radius: 8px;
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
    }
  }
`;

export type EditPostModalProps = {
  accountAddress: string;
  content: string;
  postId: string;
  classStyle?: string;
};

export const EditPostModalPopup: React.FC<EditPostModalProps> = props => {
  const dispatch = useSliceDispatch();
  const selectedAccount = useSliceSelector(getSelectedAccount);
  const filterValue = useSliceSelector(getFilterPostsHome);

  const [
    updatePostTrigger,
    { isLoading: isLoadingUpdatePost, isSuccess: isSuccessUpdatePost, isError: isErrorUpdatePost }
  ] = useUpdatePostMutation();

  const handleEditPost = async ({ htmlContent, pureContent }) => {
    if (pureContent === '' || _.isNil(pureContent)) {
      return;
    }

    const editPostInput: UpdatePostInput = {
      htmlContent: htmlContent,
      pureContent: pureContent,
      id: props.postId,
      extraArguments: {
        minBurnFilter: filterValue
      }
    };

    try {
      await updatePostTrigger({ input: editPostInput }).unwrap();

      dispatch(removeAllUploadTempPost());
      dispatch(closeModal());
      dispatch(
        showToast('success', {
          message: 'Success',
          description: intl.get('post.editPostSuccessful'),
          duration: 5
        })
      );
    } catch (err) {
      const message = intl.get('post.unableEditPostServer');
      dispatch(
        showToast('error', {
          message: 'Error',
          description: message,
          duration: 5
        })
      );
    }
  };

  return (
    <Modal
      className={`${props?.classStyle} custom-modal-editor`}
      title={intl.get('post.editPost')}
      transitionName=""
      open={true}
      footer={null}
      onCancel={() => {
        dispatch(closeModal());
        dispatch(removeAllUploadTempPost());
      }}
    >
      <UserCreate>
        <div className="user-create-post">
          <img src="/images/xpi.svg" alt="" />
          <div className="user-info">
            <p className="title-user">{selectedAccount?.name}</p>
            <Button className="btn-select">
              Public <GlobalOutlined />
            </Button>
          </div>
        </div>
        <EditorLexical
          initialContent={props.content}
          isEditMode={true}
          onSubmit={value => handleEditPost(value)}
          loading={isLoadingUpdatePost}
        />
      </UserCreate>
    </Modal>
  );
};
