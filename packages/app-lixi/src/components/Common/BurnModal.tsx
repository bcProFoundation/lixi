import { CopyOutlined } from '@ant-design/icons';
import UpDownSvg from '@assets/icons/upDownIcon.svg';
import { Burn } from '@bcpros/lixi-models';
import { TRANSLATION_REQUIRE_AMOUNT } from '@bcpros/lixi-models/constants/translation';
import { BurnForType } from '@bcpros/lixi-models/lib/burn';
import { coinInfo, COIN } from '@bcpros/lixi-models/constants';
import { CURRENCIES, WalletItem, decimalFormatBalance } from '@components/Wallet/ListWallet';
import {
  AccountQueryItem,
  BurnForItem,
  CommentQueryItem,
  PageQueryItem,
  PostQueryItem,
  TokenQueryItem
} from '@generated/index';
import { getSelectedAccount } from '@store/account/selectors';
import { prepareBurnCommand } from '@store/burn';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { closeModal } from '@store/modal/actions';
import { showToast } from '@store/toast/actions';
import { Button, Form, Modal, Radio } from 'antd';
import _ from 'lodash';
import router from 'next/router';
import { useContext, useState } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { Controller, useForm } from 'react-hook-form';
import intl from 'react-intl-universal';
import { ReactSVG } from 'react-svg';
import styled from 'styled-components';
import { QRCodeModal } from './QRCodeModal';
import { AuthenticationContext } from '@context/index';

const UpDownButton = styled(Button)`
  background: rgb(158, 42, 156);
  color: white;
  display: flex;
  align-items: center;
  text-align: center;
  font-weight: 400;
  font-size: 14px;
  width: 49%;
  height: 40px;
  border-radius: var(--border-radius-primary) !important;
  justify-content: center;

  &.upVote {
    background: #00abe7;
    &:hover {
      color: #fff;
    }
  }
  &.downVote {
    background: #ba1a1a;
    &:hover {
      color: #fff;
    }

    .btn-text {
      display: flex;
      align-items: flex-start;
    }
  }
`;

const RadioStyle = styled(Radio.Group)`
  flex-flow: wrap !important;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-flow: row;
  justify-content: start;
  gap: 10px;

  .ant-radio-button-wrapper {
    width: 48px;
    height: 48px;
    border-radius: var(--border-radius-primary) !important;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border-color);
    color: #1e1a1d;
    font-weight: 500;
    font-size: 16px;
    letter-spacing: 0.15px;
    &:before {
      content: none;
    }
    &:hover {
      background: #ffd7f6;
      color: #1e1a1d;
    }
    &.ant-radio-button-wrapper-checked {
      color: #1e1a1d;
      background: #ffd7f6;
      &:hover {
        color: #1e1a1d;
        background: #ffd7f6;
      }
    }
  }
`;

const DefaultXpiBurnValues = [1, 10, 50, 100, 200, 500, 1000];

interface BurnModalProps {
  burnForItem: BurnForItem;
  burnForType: BurnForType;
  classStyle?: string;
}

export const BurnModal = ({ burnForItem, burnForType, classStyle }: BurnModalProps) => {
  const {
    formState: { errors },
    control
  } = useForm<Burn>();
  const dispatch = useAppDispatch();
  const selectedAccount = useAppSelector(getSelectedAccount);
  const [selectedAmount, setSelectedAmount] = useState(1);
  const [openSelectCurrencies, setOpenSelectCurrencies] = useState(false);
  const [selectCurrencies, setSelectCurrencies] = useState(null);
  const defaultSelected = {
    name: 'Lotus',
    symbol: 'xpi',
    icon: '/images/currencies/xpi.svg',
    bg: '/images/currencies/bg-xpi.svg',
    balance: selectedAccount?.balance,
    address: selectedAccount?.address
  };
  const authentication = useContext(AuthenticationContext);

  const handleBurn = async (isUpVote: boolean) => {
    try {
      if (authentication && authentication.isAuthenticationRequired && !authentication.isSignedIn) {
        await authentication.signIn();
      }
      const burnValue = _.isNil(control._formValues.burnedValue)
        ? DefaultXpiBurnValues[0]
        : control._formValues.burnedValue;

      dispatch(
        prepareBurnCommand({
          isUpVote,
          burnForItem,
          burnForType,
          burnValue
        })
      );
      dispatch(closeModal());
    } catch (e) {
      const errorMessage = intl.get('post.unableToBurn');
      dispatch(
        showToast('error', {
          message: intl.get(`toast.error`),
          description: errorMessage,
          duration: 3
        })
      );
    }
  };

  const handleOnCancel = () => {
    dispatch(closeModal());
  };

  const getDanaBurnUp = (burnForType: BurnForType) => {
    switch (burnForType) {
      case BurnForType.Token:
        const token = burnForItem as TokenQueryItem;
        return token?.dana?.danaBurnUp || 0;
      case BurnForType.Comment:
        const comment = burnForItem as CommentQueryItem;
        return comment?.danaBurnUp || 0;
      case BurnForType.Post:
        const post = burnForItem as PostQueryItem;
        return post?.dana?.danaBurnUp || 0;
      case BurnForType.Account:
        const account = burnForItem as AccountQueryItem;
        return account?.accountDana?.danaBurnUp || 0;
      case BurnForType.Page:
        const page = burnForItem as PageQueryItem;
        return page?.dana?.danaBurnUp || 0;
      default:
        return 0;
    }
  };

  const getDanaBurnDown = (burnForType: BurnForType) => {
    switch (burnForType) {
      case BurnForType.Token:
        const token = burnForItem as TokenQueryItem;
        return token?.dana?.danaBurnDown || 0;
      case BurnForType.Comment:
        const comment = burnForItem as CommentQueryItem;
        return comment?.danaBurnDown || 0;
      case BurnForType.Post:
        const post = burnForItem as PostQueryItem;
        return post?.dana?.danaBurnDown || 0;
      case BurnForType.Account:
        const account = burnForItem as AccountQueryItem;
        return account?.accountDana?.danaBurnDown || 0;
      case BurnForType.Page:
        const page = burnForItem as PageQueryItem;
        return page?.dana?.danaBurnDown || 0;
      default:
        return 0;
    }
  };

  const handleOnCopy = (id: string) => {
    dispatch(
      showToast('info', {
        message: intl.get('token.copyId'),
        description: id
      })
    );
  };

  const modalSelectWallet = () => {
    return (
      <Modal
        transitionName=""
        width={'auto'}
        className={`${classStyle} custom-select-currencies-burn-modal`}
        open={openSelectCurrencies}
        onCancel={handleOnCancel}
        title={<h3>Select Wallet To Burn</h3>}
        footer={
          <Button type="primary" onClick={() => setOpenSelectCurrencies(!openSelectCurrencies)}>
            Finish
          </Button>
        }
        style={{ top: '0 !important' }}
      >
        {selectCurrencies && (
          <div className="current-selected">
            <WalletItem className="wallet-item" style={{ backgroundImage: `url(${selectCurrencies.bg})` }}>
              <div className="wallet-card-header">
                <div className="wallet-info" onClick={() => router.push(`/wallet/${selectCurrencies.symbol}`)}>
                  <img className="ico-currency" src={selectCurrencies.icon} alt="" />
                  <span className="wallet-name">{selectCurrencies.name}</span>
                </div>
                <div className="address-code">
                  <QRCodeModal logoImage={selectCurrencies.icon} address={selectCurrencies.address} type={'address'} />
                </div>
              </div>
              <div className="wallet-card-content">
                <span className="balance">
                  {decimalFormatBalance(selectCurrencies.balance, selectCurrencies?.symbol)}{' '}
                  <span className="wallet-symbol">{selectCurrencies?.symbol}</span>
                </span>
              </div>
              <div className="wallet-card-footer">
                <CopyToClipboard text={selectCurrencies.address} onCopy={() => handleOnCopy(selectCurrencies.address)}>
                  <Button type="primary" className="no-border-btn" icon={<CopyOutlined />}>
                    {selectCurrencies.address.slice(-10) + ' '}
                  </Button>
                </CopyToClipboard>
              </div>
            </WalletItem>
            <div className="selected-status" onClick={() => setSelectCurrencies(null)}>
              <ReactSVG src="/images/ico-trash.svg" />
            </div>
          </div>
        )}
        {!selectCurrencies && (
          <div className="current-selected default-selected">
            <WalletItem className="wallet-item" style={{ backgroundImage: `url(${defaultSelected.bg})` }}>
              <div className="wallet-card-header">
                <div className="wallet-info" onClick={() => router.push(`/wallet/${defaultSelected?.symbol}`)}>
                  <img className="ico-currency" src={defaultSelected.icon} alt="" />
                  <span className="wallet-name">{defaultSelected.name}</span>
                </div>
                <div className="address-code">
                  <QRCodeModal logoImage={defaultSelected.icon} address={defaultSelected.address} type={'address'} />
                </div>
              </div>
              <div className="wallet-card-content">
                <span className="balance">
                  {decimalFormatBalance(defaultSelected.balance, defaultSelected?.symbol)}{' '}
                  <span className="wallet-symbol">{defaultSelected.symbol}</span>
                </span>
              </div>
              <div className="wallet-card-footer">
                <CopyToClipboard text={defaultSelected.address} onCopy={() => handleOnCopy(defaultSelected.address)}>
                  <Button type="primary" className="no-border-btn" icon={<CopyOutlined />}>
                    {defaultSelected.address.slice(-10) + ' '}
                  </Button>
                </CopyToClipboard>
              </div>
            </WalletItem>
          </div>
        )}
        <div className="switch-coin-to-burn">
          {CURRENCIES.map(coin => {
            if (coin.symbol === 'xpi') {
              coin = defaultSelected;
            }
            return (
              <WalletItem style={{ backgroundImage: `url(${coin.bg})` }} onClick={() => setSelectCurrencies(coin)}>
                <div className="wallet-card-header">
                  <div className="wallet-info" onClick={() => router.push(`/wallet/${coin.symbol}`)}>
                    <img className="ico-currency" src={coin.icon} alt="" />
                    <span className="wallet-name">{coin.name}</span>
                  </div>
                  <div className="address-code">
                    <QRCodeModal logoImage={coin.icon} address={coin.address} type={'address'} />
                  </div>
                </div>
                <div className="wallet-card-content">
                  <span className="balance">
                    {decimalFormatBalance(coin.balance, coin?.symbol)}{' '}
                    <span className="wallet-symbol">{coin.symbol}</span>
                  </span>
                </div>
                <div className="wallet-card-footer">
                  <CopyToClipboard text={coin.address} onCopy={() => handleOnCopy(coin.address)}>
                    <Button type="primary" className="no-border-btn" icon={<CopyOutlined />}>
                      {coin.address.slice(-10) + ' '}
                    </Button>
                  </CopyToClipboard>
                </div>
              </WalletItem>
            );
          })}
        </div>
      </Modal>
    );
  };

  const upDownArrow = (isUp: boolean, width: number, color: string) => (
    <img src={`/images/${isUp ? 'up' : 'down'}-arrow.svg`} width={`${width}px`} style={{ filter: `${color}` }} />
  );

  return (
    <Modal
      transitionName=""
      width={450}
      className={`${classStyle} custom-burn-modal`}
      open={true}
      onCancel={handleOnCancel}
      title={
        <div className="custom-burn-header">
          <UpDownSvg />
          <h3>{intl.get('general.goodOrNot')}</h3>
          <div className="banner-count-burn">
            <div className="banner-item">
              {upDownArrow(false, 20, 'var(--filter-svg-red-color)')}
              <div className="count-bar">
                <p className="title">{getDanaBurnDown(burnForType) + intl.get('general.dana')}</p>
              </div>
            </div>
            <div className="banner-item">
              {upDownArrow(true, 20, 'var(--filter-svg-blue-color)')}
              <div className="count-bar">
                <p className="title">{getDanaBurnUp(burnForType) + intl.get('general.dana')}</p>
              </div>
            </div>
          </div>
          {/* TODO: Burn multi coin */}
          {/* {selectCurrencies && (
            <>
              <WalletItem className="current-wallet-burn" style={{ backgroundImage: `url(${selectCurrencies.bg})` }}>
                <div className="wallet-card-header">
                  <div className="wallet-info" onClick={() => router.push(`/wallet/${selectCurrencies.symbol}`)}>
                    <img className="ico-currency" src={selectCurrencies.icon} alt="" />
                    <span className="wallet-name">{selectCurrencies.name}</span>
                  </div>
                  <div className="address-code">
                    <QRCodeModal
                      logoImage={selectCurrencies.icon}
                      address={selectCurrencies.address}
                      type={'address'}
                    />
                  </div>
                </div>
                <div className="wallet-card-content">
                  <span className="balance">
                    {decimalFormatBalance(selectCurrencies.balance, selectCurrencies?.symbol)}{' '}
                    <span className="wallet-symbol">{selectCurrencies.symbol}</span>
                  </span>
                </div>
                <div className="wallet-card-footer">
                  <CopyToClipboard
                    text={selectCurrencies.address}
                    onCopy={() => handleOnCopy(selectCurrencies.address)}
                  >
                    <Button type="primary" className="no-border-btn" icon={<CopyOutlined />}>
                      {selectCurrencies.address.slice(-10) + ' '}
                    </Button>
                  </CopyToClipboard>
                </div>
              </WalletItem>
            </>
          )}
          {!selectCurrencies && (
            <>
              <WalletItem className="current-wallet-burn" style={{ backgroundImage: `url(${defaultSelected.bg})` }}>
                <div className="wallet-card-header">
                  <div className="wallet-info" onClick={() => router.push(`/wallet/${defaultSelected.symbol}`)}>
                    <img className="ico-currency" src={defaultSelected.icon} alt="" />
                    <span className="wallet-name">{defaultSelected.name}</span>
                  </div>
                  <div className="address-code">
                    <QRCodeModal logoImage={defaultSelected.icon} address={defaultSelected.address} type={'address'} />
                  </div>
                </div>
                <div className="wallet-card-content">
                  <span className="balance">
                    {decimalFormatBalance(defaultSelected.balance, defaultSelected?.symbol)}{' '}
                    <span className="wallet-symbol">{defaultSelected.symbol}</span>
                  </span>
                </div>
                <div className="wallet-card-footer">
                  <CopyToClipboard text={defaultSelected.address} onCopy={() => handleOnCopy(defaultSelected.address)}>
                    <Button type="primary" className="no-border-btn" icon={<CopyOutlined />}>
                      {defaultSelected.address.slice(-10) + ' '}
                    </Button>
                  </CopyToClipboard>
                </div>
              </WalletItem>
            </>
          )} */}
        </div>
      }
      footer={
        <Button.Group style={{ width: '100%' }}>
          <UpDownButton className="downVote" onClick={() => handleBurn(false)}>
            <div className="btn-text">
              {upDownArrow(false, 20, 'var(--filter-svg-white-color)')} &nbsp; {intl.get('general.demote')}
            </div>
          </UpDownButton>
          <UpDownButton className="upVote" onClick={() => handleBurn(true)}>
            <div className="btn-text">
              {upDownArrow(true, 20, 'var(--filter-svg-white-color)')} &nbsp; {intl.get('general.promote')}
            </div>
          </UpDownButton>
        </Button.Group>
      }
      style={{ top: '0 !important' }}
    >
      <Form>
        <p className="question-txt">
          {intl.get('text.selectXpi')} {/* TODO: Burn multi coin */}
          {/* <Button type="primary" onClick={() => setOpenSelectCurrencies(!openSelectCurrencies)}>
            Select Currencies
          </Button> */}
        </p>

        <Controller
          name="burnedValue"
          control={control}
          rules={{
            required: {
              value: true,
              message: intl.get('burn.selectXpi')
            }
          }}
          render={({ field: { value, onChange, ...fieldProps } }) => (
            <RadioStyle
              {...fieldProps}
              value={value}
              defaultValue={DefaultXpiBurnValues[0]}
              options={DefaultXpiBurnValues.map(xpi => xpi)}
              optionType="button"
              buttonStyle="solid"
              onChange={value => {
                setSelectedAmount(value?.target?.value);
                onChange(value);
              }}
            />
          )}
        />
        <p style={{ color: 'red', margin: '10px', fontSize: '12px' }}>
          {errors.burnedValue && errors.burnedValue.message}
        </p>
      </Form>
      <p className="amount-burn">{intl.get('burn.youOffering') + selectedAmount + intl.get('general.dana')}.</p>

      <p className="fee-burn">
        {intl.get('burn.sendDana', {
          cost: coinInfo[selectedAccount?.coin ?? COIN.XPI].burnFee * selectedAmount + selectedAmount,
          coin: 'XPI'
        })}
      </p>
      <p className="trans-amount">
        {intl.get('burn.trans', {
          amount: TRANSLATION_REQUIRE_AMOUNT
        })}
      </p>
      {/* TODO: Burn multi coin */}
      {/* <>{modalSelectWallet()}</>/ */}
    </Modal>
  );
};
