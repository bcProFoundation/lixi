import { useAppDispatch } from '@store/hooks';
import { closeModal } from '@store/modal/actions';
import { Modal } from 'antd';
import React from 'react';
import intl from 'react-intl-universal';
import { generateAccount } from '@store/account';

interface CreateAccountModelProps {
  classStyle?: string;
}

export const CreateAccountModel = ({ classStyle }: CreateAccountModelProps) => {
  const dispatch = useAppDispatch();

  const handleOnCancel = () => {
    dispatch(closeModal());
  };

  const handleOnOK = () => {
    dispatch(generateAccount());
    dispatch(closeModal());
  }

  return (
    <Modal
      width={450}
      className={`${classStyle}`}
      open={true}
      onCancel={handleOnCancel}
      onOk={handleOnOK}
      title={`${intl.get('settings.newAccount')}?`}
      style={{ top: '0 !important' }}
    >
      <p>
        {intl.get('claim.dontHaveAccount')}
      </p>
    </Modal>
  );
};
