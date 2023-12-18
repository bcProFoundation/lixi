import { Account } from '@bcpros/lixi-models/lib/account';
import { GenerateLixiCommand } from '@bcpros/lixi-models/lib/lixi';
import { WalletContext } from '@context/walletProvider';
import { PageQueryItem } from '@generated/index';
import { useAppDispatch } from '@store/hooks';
import { generateLixi } from '@store/lixi/actions';
import { closeModal } from '@store/modal/actions';
import { WalletStatus } from '@store/wallet';
import { fromSmallestDenomination } from '@utils/cashMethods';
import { Descriptions, Input, Modal } from 'antd';
import moment from 'moment';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import styled from 'styled-components';
import type { RadioChangeEvent } from 'antd';
import { Radio } from 'antd';
import { COIN } from '@bcpros/lixi-models/constants';
import { generateAccount } from '@store/account';

const StyledModal = styled(Modal)`
  .ant-descriptions-bordered .ant-descriptions-view {
    border: none;
  }
  .ant-modal-body {
    border-radius: 20px !important;
  }

  .ant-descriptions-row {
    border-bottom: 0 !important;
    .ant-descriptions-item-content {
      input {
        border-color: var(--border-color-dark-base);
      }
    }
  }

  .ant-descriptions-bordered .ant-descriptions-item-label,
  .ant-descriptions-bordered .ant-descriptions-item-content {
    padding: 0px 24px;
    border-right: none;
  }
`;

const CreateAccountModal = () => {
  const dispatch = useAppDispatch();
  const {
    handleSubmit,
    formState: { errors }
  } = useForm();
  const [coin, setCoin] = useState<COIN>(COIN.XPI);

  const onChange = (e: RadioChangeEvent) => {
    setCoin(e.target.value);
  };

  const handleOk = () => {
    dispatch(generateAccount({ coin }));
    dispatch(closeModal());
  };

  const handleCancel = () => {
    dispatch(closeModal());
  };

  return (
    <StyledModal
      // className={`${classStyle}`}
      width={490}
      open={true}
      onOk={handleSubmit(handleOk)}
      onCancel={handleCancel}
      closable={false}
      title={<div className="custom-burn-header">Choose new account</div>}
    >
      <Radio.Group onChange={onChange} value={coin}>
        {Object.values(COIN).map(key => (
          <Radio key={key} value={key}>
            {COIN[key]}
          </Radio>
        ))}
      </Radio.Group>
    </StyledModal>
  );
};

export default CreateAccountModal;
