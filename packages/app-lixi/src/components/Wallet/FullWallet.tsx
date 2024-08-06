import { LockOutlined, SearchOutlined } from '@ant-design/icons';
import Reply from '@assets/icons/reply.svg';
import { BurnForType } from '@bcpros/lixi-models/lib/burn/burn.model';
import ClaimComponent from '@components/Claim';
import { FormattedTxAddress } from '@components/Common/FormattedWalletAddress';
import useAuthorization from '@components/Common/Authorization/use-authorization.hooks';
import { AuthorizationContext } from '@context/index';
import { WalletContext } from '@context/index';
import { getSelectedAccount } from '@store/account/selectors';
import { useSliceSelector } from '@store/index';
import { selectTokens } from '@store/token';
import { getWalletHasUpdated, getWalletParsedTxHistory, getWalletState } from '@store/wallet';
import { ParsedChronikTx, getTxHistoryChronik } from '@utils/chronik';
import { formatDate } from '@utils/formatting';
import { Button, List, Skeleton } from 'antd';
import { Tx } from 'chronik-client';
import _ from 'lodash';
import Link from 'next/link';
import InfiniteScroll from 'react-infinite-scroll-component';
import { COIN } from '@bcpros/lixi-models/constants/coins/coin';
import { coinInfo } from '@bcpros/lixi-models/constants/coins/coin-info';
import styled from 'styled-components';
import React, { useState, useEffect, useContext } from 'react';
import intl from 'react-intl-universal';
import WalletInfoComponent from './WalletInfo';
import VirtualList from 'rc-virtual-list';

const TransactionHistory = styled.div`
  background: #fff;
  padding: 1rem 2rem;
  border-bottom-left-radius: 24px;
  border-bottom-right-radius: 24px;
  .header-transaction {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 400;
    font-size: 22px;
    line-height: 28px;
    color: #1e1a1d;
    span {
      font-size: 17px;
    }
  }
  .content-transaction {
    margin-top: 1rem;
    height: 42vh;
    overflow: scroll;
    .tx-history-header {
      text-align: left;
      text-transform: uppercase;
      margin: 12px 0;
      font-weight: 500;
      font-size: 12px;
      line-height: 16px;
      letter-spacing: 0.5px;
      color: #4e444b;
    }
    .ant-list-item {
      padding: 1rem;
      border: 1px solid rgba(128, 116, 124, 0.12) !important;
      border-radius: 1rem;
      background: #fff;
      margin-bottom: 8px;
      padding: 0.5rem;
      min-height: 80px;
      .ant-list-item-meta-content {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        .ant-list-item-meta-title {
          margin-bottom: 0;
        }
        .amount {
          font-size: 14px;
          &.increase {
            color: #37a372;
          }
          &.decrease {
            color: #ba1b1b;
          }
        }
        .tx-transaction {
          p {
            margin: 0;
            text-align: left;
            font-size: 12px;
          }
          .tx-action {
            letter-spacing: 0.25px;
            color: #001e2e;
            button {
              padding: 0;
            }
          }
          .tx-memo {
            letter-spacing: 0.25px;
            color: rgba(0, 30, 46, 0.6);
            margin-top: 16px;
          }
        }
      }
      .tx-info {
        .tx-status {
          background: linear-gradient(0deg, rgba(0, 101, 141, 0.08), rgba(0, 101, 141, 0.08)), #fafafb;
          border-radius: 4px;
          font-size: 12px;
          color: rgba(0, 30, 46, 0.6);
          letter-spacing: 0.25px;
        }
        .tx-date {
          font-size: 12px;
          color: rgba(0, 30, 46, 0.6);
          letter-spacing: 0.25px;
          margin: 0;
        }
      }
      .icon-reply {
        margin: 0;
      }
    }
  }
  @media (max-width: 968px) {
    padding: 0.5rem;
  }
`;

const FullWalletWrapper = styled.div`
  width: 100%;
  max-width: 816px;
  margin: 1rem auto;
  background: var(--bg-color-light-theme);
  border-radius: var(--border-radius-primary);
  @media (max-width: 968px) {
    border: none;
  }
  @media (max-width: 526px) {
    .redeem-box {
      padding: 0.5rem;
    }
  }
  .text-primary-wallet,
  .text-other-wallet,
  .text-base-wallet {
    font-size: 1.3rem;
    margin-bottom: 0.1rem;
    color: var(--color-primary);
    text-align: left;
    padding-left: 5px;
    font-weight: 550;
  }

  .text-base-wallet {
    margin-top: 0.5rem;
  }

  .claim-component {
    margin-top: 1rem;

    @media (min-width: 960px) {
      display: none;
    }
  }
`;

const SkeletonStyled = styled(Skeleton)`
  .ant-skeleton-title {
    width: 10% !important;
  }
  .ant-skeleton-paragraph li {
    width: 95% !important;
  }
`;

type WalletProps = {
  claimCode?: string;
};

const FullWalletComponent = ({ claimCode }: WalletProps) => {
  const selectedAccount = useSliceSelector(getSelectedAccount);

  return (
    <>
      <FullWalletWrapper className="full-wallet">
        <p className="text-primary-wallet">{intl.get('general.primaryWallet')}</p>
        <WalletInfoComponent coin={selectedAccount?.coin ?? COIN.XPI} />

        <div className="claim-component">
          <ClaimComponent isClaimFromAccount={true} claimCodeFromURL={claimCode}></ClaimComponent>
        </div>

        {(selectedAccount?.coin ?? COIN.XPI) !== COIN.XPI && (
          <div>
            <p className="text-base-wallet">{intl.get('general.baseWallet')}</p>
            <WalletInfoComponent coin={COIN.XPI} mainWallet={false} />
          </div>
        )}

        <p className="text-other-wallet">{intl.get('general.otherWallet')}</p>
        {Object.keys(COIN).map(coin => {
          if (coin === COIN.XPI) return;
          if (coin === (selectedAccount?.coin ?? COIN.XPI)) return '';
          else return <WalletInfoComponent coin={coin as COIN} mainWallet={false} key={coin} />;
        })}
      </FullWalletWrapper>
    </>
  );
};

export default FullWalletComponent;
