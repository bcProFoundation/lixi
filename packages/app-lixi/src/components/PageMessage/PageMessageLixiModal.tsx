import { COIN } from '@bcpros/lixi-models/constants/coins/coin';
import { coinInfo } from '@bcpros/lixi-models/constants/coins/coin-info';
import { Account } from '@bcpros/lixi-models/lib/account/account.model';
import { GenerateLixiCommand } from '@bcpros/lixi-models/lib/lixi';
import { WalletContext } from '@context/walletProvider';
import { PageQueryItem } from '@generated/types';
import { getSelectedAccount, useSliceDispatch, useSliceSelector } from '@store/index';
import { generateLixi } from '@store/lixi/actions';
import { closeModal } from '@store/modal/actions';
import { WalletStatus } from '@store/wallet';
import { fromSmallestDenomination } from '@utils/cashMethods';
import { Descriptions, Input, Modal } from 'antd';
import moment from 'moment';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import styled from 'styled-components';

type PageMessageLixiModalProps = {
  account?: Account;
  page?: PageQueryItem;
  wallet: WalletStatus;
  classStyle?: String;
};

const StyledModal = styled(Modal)`
  .ant-descriptions-bordered .ant-descriptions-view {
    border: none;
  }
  .ant-modal-body {
    border-radius: 20px !important;
  }

  .ant-descriptions-row {
    border-bottom: 0 !important;
    .ant-descriptions-item {
      padding-bottom: 5px;
    }
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
  .error-message-valid-value {
    color: red;
  }
`;

const PageMessageLixiModal = ({ account, page, wallet, classStyle }: PageMessageLixiModalProps) => {
  const dispatch = useSliceDispatch();
  const selectedAccount = useSliceSelector(getSelectedAccount);
  const {
    control,
    getValues,
    resetField,
    setFocus,
    handleSubmit,
    formState: { errors }
  } = useForm();
  const Wallet = React.useContext(WalletContext);
  const txFee = Math.ceil(Wallet.XPI.BitcoinCash.getByteCount({ P2PKH: 1 }, { P2PKH: 1 }) * 2.01); //satoshi

  const handleOk = data => {
    //pageMessageLixi only need this data so we split the data here for easier management
    const pageMessageLixiData = {
      name: `${page.name.split(' ').slice(0, 2).join(' ')}.${moment.utc().format('DD-MM-YYYY')}`,
      accountId: account?.id,
      mnemonic: account?.mnemonic,
      mnemonicHash: account?.mnemonicHash,
      amount: (parseFloat(data.amount) + fromSmallestDenomination(txFee)).toString(),
      fixedValue: data.amount,
      claimType: 0,
      lixiType: 1,
      networkType: 'single-ip',
      // Remove comment when handle activationAt and expiryAt
      // activationAt: moment.utc().format(),
      // expiryAt: moment.utc().add(3, 'days').format(),
      activationAt: null,
      expiryAt: null,
      pageId: page.id
    };

    const generateLixiCommand: GenerateLixiCommand = {
      ...pageMessageLixiData,
      maxClaim: '',
      minValue: '',
      maxValue: '',
      dividedValue: '',
      minStaking: '',
      country: '',
      isFamilyFriendly: false,
      isNFTEnabled: false,
      numberOfSubLixi: '',
      envelopeId: null,
      envelopeMessage: '',
      shouldGroupToPackage: false,
      numberLixiPerPackage: '',
      upload: null,
      staffAddress: '',
      charityAddress: '',
      joinLotteryProgram: false
    };

    dispatch(generateLixi(generateLixiCommand));
    dispatch(closeModal());
  };

  const handleCancel = () => {
    dispatch(closeModal());
  };

  return (
    <StyledModal
      className={`${classStyle}`}
      width={490}
      open={true}
      onOk={handleSubmit(handleOk)}
      onCancel={handleCancel}
      closable={false}
      title={<div className="custom-burn-header">Create lixi to chat with {page.name}</div>}
    >
      <Descriptions column={1}>
        <Descriptions.Item>
          <Controller
            name="amount"
            control={control}
            rules={{
              required: true,
              pattern: /^[0-9]*$/,
              validate: {
                checkIsXPI: value => {
                  return selectedAccount?.coin === COIN.XPI || 'Must be XPI wallet';
                },
                checkEnoughCoin: value => {
                  return (
                    fromSmallestDenomination(
                      wallet.balances.totalBalanceInSatoshis,
                      selectedAccount?.coin ?? COIN.XPI
                    ) >= parseFloat(value) || `Not enough ${selectedAccount?.coin ?? COIN.XPI}`
                  );
                },
                checkGreaterDust: value => {
                  return (
                    parseFloat(value) >=
                      fromSmallestDenomination(
                        coinInfo[selectedAccount?.coin ?? COIN.XPI].etokenSats,
                        selectedAccount?.coin ?? COIN.XPI
                      ) || `Must greater than dust`
                  );
                }
                // can add more validate below here
              }
            }}
            render={({ field: { onChange, onBlur, value, ref } }) => (
              <Input
                ref={ref}
                style={{ width: '95%' }}
                onChange={onChange}
                onBlur={onBlur}
                value={value}
                type="number"
                placeholder={'Input amount...'}
              />
            )}
          />
        </Descriptions.Item>
        {errors.amount && (
          <Descriptions.Item>
            <p className="error-message-valid-value">{errors?.amount?.message.toString()}</p>
          </Descriptions.Item>
        )}
      </Descriptions>
    </StyledModal>
  );
};

export default PageMessageLixiModal;
