import { useSliceDispatch } from '@store/index';
import { closeModal } from '@store/modal/actions';
import { Modal } from 'antd';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import styled from 'styled-components';
import type { RadioChangeEvent } from 'antd';
import { Radio } from 'antd';
import { COIN } from '@bcpros/lixi-models/constants/coins/coin';
import { generateAccount, importAccount } from '@store/account';
import intl from 'react-intl-universal';
import { AccountType, GenerateAccountType, ImportAccountType } from '@bcpros/lixi-models/constants/account';

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

  .account-type {
    margin-top: 1rem;
  }
`;

const ImportAccountModal = ({ mnemonic }) => {
  console.log(mnemonic);
  const dispatch = useSliceDispatch();
  const {
    handleSubmit,
    formState: { errors }
  } = useForm();
  const [coin, setCoin] = useState<COIN>(COIN.XPI);

  const onChangeCoin = (e: RadioChangeEvent) => {
    setCoin(e.target.value);
  };

  const handleOk = () => {
    const dataImportAccount: ImportAccountType = {
      mnemonic: mnemonic,
      coin: coin
    };

    dispatch(importAccount(dataImportAccount));
    dispatch(closeModal());
  };

  const handleCancel = () => {
    dispatch(closeModal());
  };

  return (
    <StyledModal
      width={490}
      open={true}
      onOk={handleSubmit(handleOk)}
      onCancel={handleCancel}
      closable={false}
      title={<div>{intl.get('account.chooseCoinAccountImport')}</div>}
    >
      <div className="account-coin">
        <Radio.Group onChange={onChangeCoin} value={coin}>
          {Object.values(COIN).map(key => (
            <Radio key={key} value={key}>
              {COIN[key]}
            </Radio>
          ))}
        </Radio.Group>
      </div>
    </StyledModal>
  );
};

export default ImportAccountModal;
