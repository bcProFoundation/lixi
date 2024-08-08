import { EditOutlined, SendOutlined, SyncOutlined } from '@ant-design/icons';
import BalanceHeader from '@bcpros/lixi-components/components/Common/BalanceHeader';
import { FormattedWalletAddress } from '@bcpros/lixi-components/components/Common/QRCode';
import WalletLabel from '@bcpros/lixi-components/components/Common/WalletLabel';
import { Account, RenameAccountCommand } from '@bcpros/lixi-models';
import { QRCodeModalType } from '@bcpros/lixi-models/constants/QRCodeModal';
import { COIN } from '@bcpros/lixi-models/constants/coins/coin';
import { coinInfo } from '@bcpros/lixi-models/constants/coins/coin-info';
import { QRCodeModal } from '@components/Common/QRCodeModal';
import { RenameAccountModalProps } from '@components/Settings/RenameAccountModal';
import { AuthorizationContext, WalletContext } from '@context/index';
import { renameAccount, setAccountCoin } from '@store/account/actions';
import { getSelectedAccount } from '@store/account/selectors';
import { useSliceDispatch, useSliceSelector } from '@store/index';
import { openModal } from '@store/modal/actions';
import { showToast } from '@store/toast/actions';
import { getSelectedWalletPath, getWalletHasUpdated, getWalletStatus, setWalletHasUpdated } from '@store/wallet';
import { formatBalance, fromSmallestDenomination, getWalletBalanceFromUtxos } from '@utils/cashMethods';
import { Button } from 'antd';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useState } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import intl from 'react-intl-universal';
import styled from 'styled-components';
import { parseCashAddressToPrefix } from '@utils/addressMethods';
import useAuthorization from '@components/Common/Authorization/use-authorization.hooks';

const CardContainer = styled.div<{ $bgCoin: string }>`
  position: relative;
  display: flex;
  background: url(${props => props.$bgCoin}) no-repeat;
  background-size: cover !important;
  background-position: center;
  border-radius: var(--border-radius-primary);
  padding: 2rem 2rem 3rem 2rem;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  margin-bottom: 1rem;
  @media (max-width: 768px) {
    padding: 1.5rem 1rem;
  }

  // .btn-switch {
  //   position: absolute;
  //   right: 10px;
  //   top: 10px;
  //   cursor: pointer;
  // }
`;

const WalletCard = styled.div`
  .wallet-name {
    display: flex;
    align-items: center;
    h4 {
      color: #edeff0;
      font-size: 14px;
      margin: 0 8px;
    }
    .edit-ico {
      font-size: 17px;
      color: rgba(237, 239, 240, 0.6);
    }
  }

  .balance-string {
    font-size: 1.5rem;
    font-weight: bold;
    color: #fff;

    .balance-name {
      color: rgba(237, 239, 240, 0.8);
      font-size: 0.75rem;
    }
  }

  .btn-switch {
    cursor: pointer;
  }
  .btn-show {
    background: none;
  }
`;

const StyledBalanceHeader = styled.div`
  > div {
    min-width: 150px;
    text-align: left;
    font-size: 28px;
    color: #edeff0;
    margin: 8px 0;
    display: flex;
    align-items: center;
    gap: 5px;
    span {
      font-size: 14px;
      line-height: 24px;
      letter-spacing: 0.5px;
      color: rgba(237, 239, 240, 0.6);
    }
  }
  .iso-amount {
    font-size: 14px;
    color: rgba(237, 239, 240, 0.6);
    text-align: left;
  }
`;

const StyledQRCode = styled.div`
  flex: 1 auto;
  text-align: right;
  opacity: 0.7;
  #borderedQRCode {
    border-radius: var(--boder-radius-primay);
    border-radius: 8px;
    @media (max-width: 768px) {
      width: 60px;
      height: 60px;
    }
    @media (min-width: 768px) {
      width: 90px;
      height: 90px;
    }
  }
`;

const AddressWalletBar = styled.div`
  display: flex;
  justify-content: end;
  align-items: center;
  opacity: 0.8;
  width: 100%;
  position: absolute;
  bottom: 0;
  right: 0;
  text-align: right;
  padding: 5px 2rem;
  background: linear-gradient(270deg, rgba(0, 30, 46, 0.24) 2.04%, rgba(0, 30, 46, 0) 100%);
  border-radius: 0px 8px 26px 0px;
  color: #edeff0;
  span {
    color: #edeff0;
    margin-left: 4px;
  }
`;

const ButtonSend = styled.div`
  cursor: pointer;
  margin-right: 1rem;
  font-size: 14px;
  color: #edeff0;
  .anticon {
    margin-right: 4px;
    font-size: 14px;
  }
`;

type WalletInfoComponentProps = {
  coin?: COIN;
  mainWallet?: boolean;
};

const WalletInfoComponent = ({ coin = COIN.XPI, mainWallet = true }: WalletInfoComponentProps) => {
  const isServer = () => typeof window === 'undefined';
  const router = useRouter();
  const Wallet = React.useContext(WalletContext);
  const { XPI, getUtxosByCoin } = Wallet;
  const dispatch = useSliceDispatch();
  const askAuthorization = useAuthorization();
  const authorization = useContext(AuthorizationContext);
  const walletStatus = useSliceSelector(getWalletStatus);
  const selectedAccount = useSliceSelector(getSelectedAccount);
  const selectedWalletPath = useSliceSelector(getSelectedWalletPath);
  const walletHasUpdated = useSliceSelector(getWalletHasUpdated);

  const [currentAddress, setCurrentAddress] = useState<string>(selectedWalletPath?.xAddress);

  const [showBalanceCoin, setShowBalanceCoin] = useState({
    XPI: false,
    XEC: false,
    XRG: false
  });

  const [balanceCoin, setBalanceCoin] = useState({
    XPI: '0',
    XEC: '0',
    XRG: '0'
  });

  useEffect(() => {
    switch (coin) {
      case COIN.XPI:
        setCurrentAddress(selectedWalletPath?.xAddress);
        break;
      case COIN.XEC:
        setCurrentAddress(parseCashAddressToPrefix(COIN.XEC, selectedWalletPath?.cashAddress));
        break;
      case COIN.XRG:
        setCurrentAddress(parseCashAddressToPrefix(COIN.XRG, selectedWalletPath?.cashAddress));
        break;
      default:
        setCurrentAddress(selectedWalletPath?.xAddress);
    }
  }, [coin]);

  const showPopulatedRenameAccountModal = (account: Account) => {
    const command: RenameAccountCommand = {
      id: account.id,
      mnemonic: account.mnemonic,
      name: account.name
    };
    const renameAcountModalProps: RenameAccountModalProps = {
      account: account,
      onOkAction: renameAccount(command)
    };
    dispatch(openModal('RenameAccountModal', renameAcountModalProps));
  };

  const handleOnCopy = () => {
    dispatch(
      showToast('info', {
        message: intl.get('toast.info'),
        description: intl.get('lixi.addressCopied')
      })
    );
  };

  const getBalance = async (coin: COIN) => {
    const utxos = await getUtxosByCoin(coin);
    const balances = getWalletBalanceFromUtxos(utxos.nonSlpUtxos, coin);
    setBalanceCoin(pre => {
      return {
        ...pre,
        [coin]: balances.totalBalance
      };
    });
  };

  const handleShowBalance = (coin: COIN) => {
    if (!authorization.authorized) {
      askAuthorization();
      return;
    }
    setShowBalanceCoin(pre => {
      return {
        ...pre,
        [coin]: !pre[coin]
      };
    });
    // don't call api if hide balance
    if (showBalanceCoin[coin]) return;
    getBalance(coin);
  };

  const handleChangeWallet = value => {
    if (!authorization.authorized) {
      askAuthorization();
      return;
    }
    dispatch(setAccountCoin({ id: selectedAccount.id, accountCoin: value }));
    dispatch(setWalletHasUpdated(false));
  };

  const openBurnHistoryModal = (coin: COIN) => {
    dispatch(openModal('WalletHistoryModal', { coin }));
  };

  const addressForMutipleCoin = () => {
    return (
      <React.Fragment>
        <CopyToClipboard text={currentAddress} onCopy={handleOnCopy}>
          <span>
            <FormattedWalletAddress address={currentAddress} isAccountPage={true}></FormattedWalletAddress>
          </span>
        </CopyToClipboard>
      </React.Fragment>
    );
  };

  return (
    <>
      <CardContainer $bgCoin={`${coinInfo[coin].background}`} className="card-container">
        <WalletCard>
          <div className="wallet-name">
            <img width={40} src={`${coinInfo[coin].logo}`} alt="" />
            <WalletLabel name={selectedAccount?.name ?? ''} />
            {mainWallet ? (
              <EditOutlined
                className="edit-ico"
                onClick={() => showPopulatedRenameAccountModal(selectedAccount as Account)}
              />
            ) : (
              <div onClick={() => handleChangeWallet(coin)} className="btn-switch">
                <img src="/images/switch-coin.svg" />
              </div>
            )}
          </div>
          <StyledBalanceHeader>
            {mainWallet ? (
              walletHasUpdated ? (
                <BalanceHeader
                  balance={fromSmallestDenomination(
                    walletStatus.balances.totalBalanceInSatoshis ?? 0,
                    selectedAccount?.coin === COIN.XRG
                      ? coinInfo[selectedAccount?.coin].microCashDecimals //we use uXRG - cash=2
                      : coinInfo[selectedAccount?.coin ?? COIN.XPI].cashDecimals
                  )}
                  ticker={coinInfo[coin].ticker}
                />
              ) : (
                <React.Fragment>
                  <SyncOutlined spin />
                </React.Fragment>
              )
            ) : (
              <>
                <span className="balance-string">
                  {showBalanceCoin[coin] && (
                    <span>
                      {formatBalance(balanceCoin[coin])}{' '}
                      <span className="balance-name"> {coinInfo[coin ?? COIN.XPI].ticker}</span>
                    </span>
                  )}{' '}
                  {!showBalanceCoin[coin] && '*******'}
                </span>
                <Button className="btn-show" type="text" onClick={() => handleShowBalance(coin as COIN)}>
                  <img src="/images/eye.svg" />
                </Button>
              </>
            )}
          </StyledBalanceHeader>
        </WalletCard>
        {!isServer() && currentAddress && (
          <StyledQRCode>
            <QRCodeModal logoImage={coinInfo[coin].logo} address={currentAddress} type={QRCodeModalType.address} />
          </StyledQRCode>
        )}
        <AddressWalletBar>
          {mainWallet && (
            <ButtonSend onClick={() => router.push('/send')}>
              <SendOutlined />
              {intl.get('general.send')}
            </ButtonSend>
          )}
          <div style={{ cursor: 'pointer' }} onClick={() => openBurnHistoryModal(coin)}>
            <img width={20} src="/images/ico-burn-history.svg" style={{ filter: 'var(--filter-svg-gray-color)' }} />
            <span>History</span>
          </div>
          {addressForMutipleCoin()}
        </AddressWalletBar>
      </CardContainer>
    </>
  );
};

export default WalletInfoComponent;
