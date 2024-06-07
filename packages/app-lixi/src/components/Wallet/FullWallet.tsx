import { LockOutlined, SearchOutlined } from '@ant-design/icons';
import Reply from '@assets/icons/reply.svg';
import { BurnForType } from '@bcpros/lixi-models/lib/burn/burn.model';
import ClaimComponent from '@components/Claim';
import { FormattedTxAddress } from '@components/Common/FormattedWalletAddress';
import { WalletContext } from '@context/index';
import { getSelectedAccount } from '@store/account/selectors';
import { setAccountCoin, useSliceDispatch, useSliceSelector } from '@store/index';
import { getCurrentLocale } from '@store/settings/selectors';
import { selectTokens } from '@store/token';
import { getWalletHasUpdated, getWalletParsedTxHistory, getWalletState, setWalletHasUpdated } from '@store/wallet';
import { ParsedChronikTx, getTxHistoryChronik } from '@utils/chronik';
import { formatDate } from '@utils/formatting';
import { Button, List, Skeleton } from 'antd';
import { Tx } from 'chronik-client';
import _ from 'lodash';
import Link from 'next/link';
import InfiniteScroll from 'react-infinite-scroll-component';
import { COIN } from '@bcpros/lixi-models/constants/coins/coin';
import { coinInfo } from '@bcpros/lixi-models/constants/coins/coin-info';
import { formatBalance, getWalletBalanceFromUtxos } from '@utils/cashMethods';
import styled from 'styled-components';
import React, { useState, useEffect } from 'react';
import intl from 'react-intl-universal';
import WalletInfoComponent from './WalletInfo';
import VirtualList from 'rc-virtual-list';

interface UserItem {
  email: string;
  gender: string;
  name: {
    first: string;
    last: string;
    title: string;
  };
  nat: string;
  picture: {
    large: string;
    medium: string;
    thumbnail: string;
  };
}

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

  .text-other-wallet,
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

const OtherWalletStyled = styled.div<{ $coin: COIN }>`
  height: 65px;
  background: url(${props => coinInfo[props.$coin].background}) no-repeat;
  background-position: center;
  background-size: cover;
  border-radius: var(--border-radius-primary);
  margin-bottom: 1rem;
  padding: 10px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;

  .balance-info {
    display: flex;
    align-items: flex-end;
    gap: 10px;

    .balance-string {
      font-size: 1rem;
      color: #fff;

      .balance-name {
        color: rgba(237, 239, 240, 0.8);
        font-size: 0.75rem;
      }
    }

    .btn-show {
      padding: 0;
      top: 3px;
      background: none;
    }
  }

  .btn-switch {
    cursor: pointer;
  }
`;

type WalletProps = {
  claimCode?: string;
};

const FullWalletComponent = ({ claimCode }: WalletProps) => {
  const trimLength = 8;
  const dispatch = useSliceDispatch();

  const selectedAccount = useSliceSelector(getSelectedAccount);
  const currentLocale = useSliceSelector(getCurrentLocale);
  const currentCoin = selectedAccount?.currentCoin ?? COIN.XPI;
  const allTokens = useSliceSelector(selectTokens);

  const walletHasUpdated = useSliceSelector(getWalletHasUpdated);
  const walletParsedHistory = useSliceSelector(getWalletParsedTxHistory);
  const walletState = useSliceSelector(getWalletState);
  const Wallet = React.useContext(WalletContext);

  const { XPI, chronik, getUtxosByCoin } = Wallet;

  const [showBalanceCoin, setShowBalanceCoin] = useState({
    XPI: false,
    XEC: false
  });

  const [balanceCoin, setBalanceCoin] = useState({
    XPI: '0',
    XEC: '0'
  });

  const [pageNumber, setPageNumber] = useState<number>(1); //start pagination at page 1 (already have data at page 0)
  const [hasMoreTxHistory, setHasMoreTxHistory] = useState<boolean>(true);

  const [dataWalletParsedHistory, setDataWalletParsedHistory] = useState<Tx[]>(walletParsedHistory || []);

  const orderedWalletParsedHistory = _.orderBy(dataWalletParsedHistory, x => x.timeFirstSeen, 'desc');
  const walletParsedHistoryGroupByDate = _.groupBy(orderedWalletParsedHistory, item => {
    const currentMonth = new Date().getMonth();
    const dateTime = new Date(formatDate(item.timeFirstSeen));
    if (currentMonth == dateTime.getMonth()) return intl.get('account.recent');
    const month = dateTime.toLocaleString('en', { month: 'long' });
    return month + ' ' + dateTime.getFullYear();
  });

  const getBurnForType = (burnForType: BurnForType) => {
    const typeValuesArr = Object.values(BurnForType);
    const burnForTypeString = Object.keys(BurnForType)[typeValuesArr.indexOf(burnForType as unknown as BurnForType)];
    return burnForTypeString;
  };

  const getUrl = (burnForType: BurnForType, burnForId: string) => {
    let burnForTypeString = getBurnForType(burnForType);
    let idComment = burnForId;

    if (burnForType == BurnForType.Token && burnForId.length !== 64) {
      const searchTokenID = allTokens.find(token => token.id === burnForId);
      if (searchTokenID) {
        burnForId = searchTokenID.tokenId;
      } else {
        return '/404';
      }
    }
    // if (burnForType == BurnForType.Comment) {
    //   burnForTypeString = getBurnForType(BurnForType.Comment);
    //   // eslint-disable-next-line react-hooks/rules-of-hooks
    //   const { currentData, isSuccess } = useCommentQuery({ id: burnForId });
    //   if (isSuccess) {
    //     burnForId = currentData.comment.id;
    //   }
    // }

    return `/${burnForTypeString.toLowerCase()}/${burnForId}`;
  };

  const showAmount = (item: Tx & { parsed: ParsedChronikTx }) => {
    const xpiBurnAndGiftAmount = Number(item.parsed.xpiBurnAmount) + Number(item.parsed.xpiAmount);
    if (item.parsed.isBurn) {
      if (item.parsed.incoming) {
        return '+ ' + item.parsed.xpiAmount + ` ${currentCoin}`;
      } else {
        return '- ' + xpiBurnAndGiftAmount + ` ${currentCoin}`;
      }
    } else {
      if (item.parsed.incoming) {
        return '+ ' + item.parsed.xpiAmount + ` ${currentCoin}`;
      } else {
        return '- ' + item.parsed.xpiAmount + ` ${currentCoin}`;
      }
    }
  };

  const fetchNextDataWalletHistory = async (pageNumber = 0) => {
    const { chronikTxHistory } = await getTxHistoryChronik(
      chronik,
      XPI,
      walletState,
      pageNumber,
      selectedAccount?.currentCoin ?? COIN.XPI
    );
    if (chronikTxHistory.length === 0) {
      setHasMoreTxHistory(pre => !pre);
    }
    setDataWalletParsedHistory(pre => pre.concat(chronikTxHistory));
    setPageNumber(pre => pre + 1);
  };

  const loadMoreItems = () => {
    fetchNextDataWalletHistory(pageNumber);
  };

  //set state when switch account
  useEffect(() => {
    setDataWalletParsedHistory(walletParsedHistory);
  }, [walletParsedHistory]);

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
    dispatch(setAccountCoin({ id: selectedAccount.id, accountCoin: value }));
    dispatch(setWalletHasUpdated(false));
  };

  const UIWallet = coin => {
    return (
      <OtherWalletStyled $coin={coin as COIN}>
        <div className="balance-info">
          <img width={40} src={coinInfo[coin ?? COIN.XPI].logo} />
          <span className="balance-string">
            {showBalanceCoin[coin] && (
              <span>
                {formatBalance(balanceCoin[coin])} <span className="balance-name"> {coin}</span>
              </span>
            )}{' '}
            {!showBalanceCoin[coin] && '*******'}
          </span>
          <Button className="btn-show" type="text" onClick={() => handleShowBalance(coin as COIN)}>
            <img src="/images/eye.svg" />
          </Button>
        </div>
        <div onClick={() => handleChangeWallet(coin)} className="btn-switch">
          <img src="/images/switch-coin.svg" />
        </div>
      </OtherWalletStyled>
    );
  };

  return (
    <>
      <FullWalletWrapper className="full-wallet">
        <p className="text-primary-wallet">{intl.get('general.primaryWallet')}</p>
        <WalletInfoComponent />

        <div className="claim-component">
          <ClaimComponent isClaimFromAccount={true} claimCodeFromURL={claimCode}></ClaimComponent>
        </div>

        {selectedAccount?.currentCoin !== COIN.XPI && (
          <div>
            <p className="text-base-wallet">{intl.get('general.baseWallet')}</p>
            {UIWallet(COIN.XPI)}
          </div>
        )}

        <p className="text-other-wallet">{intl.get('general.otherWallet')}</p>
        {Object.keys(COIN).map(coin => {
          if (coin === selectedAccount?.currentCoin) return '';
          else return UIWallet(coin);
        })}

        <TransactionHistory className="transaction-history">
          <div className="header-transaction">
            {intl.get('account.transactionHistory')}
            <SearchOutlined />
          </div>
          <div className="content-transaction" id="scrollableDivTxHistory">
            {walletHasUpdated ? (
              dataWalletParsedHistory.length > 0 ? (
                <InfiniteScroll
                  dataLength={dataWalletParsedHistory.length}
                  next={loadMoreItems}
                  hasMore={hasMoreTxHistory}
                  loader={<SkeletonStyled active paragraph={{ rows: 2 }} title={false} />}
                  scrollableTarget="scrollableDivTxHistory"
                >
                  {Object.keys(walletParsedHistoryGroupByDate).map(index => {
                    return (
                      <React.Fragment key={index}>
                        <h3 className="tx-history-header">{index}</h3>
                        <List>
                          <VirtualList data={walletParsedHistoryGroupByDate[index]} itemHeight={47} itemKey="email">
                            {(item: Tx & { parsed: ParsedChronikTx }) => {
                              let memo = '';

                              if (item.parsed.isLotusMessage) {
                                if (item.parsed.isEncryptedMessage && item.parsed.decryptionSuccess) {
                                  memo = item.parsed.opReturnMessage ?? '';
                                } else {
                                  memo = item.parsed.opReturnMessage ?? '';
                                }
                              }
                              return (
                                <List.Item key={item.txid}>
                                  <List.Item.Meta
                                    title={
                                      <a className={item.parsed.incoming ? 'amount increase' : 'amount decrease'}>
                                        {showAmount(item)}
                                      </a>
                                    }
                                    description={
                                      <div className="tx-transaction">
                                        <div className="tx-action">
                                          {item.parsed.isBurn ? (
                                            <p>
                                              {intl.get('general.burnForType')}:{' '}
                                              {item.parsed.burnInfo && (
                                                <Link
                                                  href={{
                                                    pathname: getUrl(
                                                      item.parsed.burnInfo.burnForType,
                                                      item.parsed.burnInfo.burnForId
                                                    ),
                                                    query: item.parsed.burnInfo.burnForType == BurnForType.Comment && {
                                                      comment: item.parsed.burnInfo.burnForId
                                                    }
                                                  }}
                                                >
                                                  <Button size="small" type="text">
                                                    <p style={{ fontWeight: 'bold' }}>
                                                      {getBurnForType(item.parsed.burnInfo.burnForType)}
                                                    </p>
                                                  </Button>
                                                </Link>
                                              )}
                                            </p>
                                          ) : item.parsed.incoming ? (
                                            <p>
                                              {intl.get('account.from')}:{' '}
                                              {item.parsed.replyAddress && (
                                                <FormattedTxAddress
                                                  address={item.parsed.replyAddress.slice(-trimLength)}
                                                />
                                              )}
                                            </p>
                                          ) : (
                                            <p>
                                              {intl.get('account.to')}:{' '}
                                              {item.parsed.destinationAddress && (
                                                <FormattedTxAddress
                                                  address={item.parsed.destinationAddress.slice(-trimLength)}
                                                />
                                              )}
                                            </p>
                                          )}
                                        </div>
                                        {!_.isEmpty(memo) && (
                                          <p className="tx-memo">
                                            <LockOutlined /> {memo}
                                          </p>
                                        )}
                                      </div>
                                    }
                                  />
                                  <div className="tx-info">
                                    <div className="tx-status"></div>
                                    <p className="tx-date">{formatDate(item.timeFirstSeen)}</p>

                                    {item.parsed.incoming && (
                                      <Link
                                        href={{
                                          pathname: '/send',
                                          query: { replyAddress: item.parsed.replyAddress, isReply: true }
                                        }}
                                      >
                                        <Button size="small" type="text">
                                          <p className="icon-reply">
                                            <Reply /> {intl.get('account.reply')}
                                          </p>
                                        </Button>
                                      </Link>
                                    )}
                                  </div>
                                </List.Item>
                              );
                            }}
                          </VirtualList>
                        </List>
                      </React.Fragment>
                    );
                  })}
                </InfiniteScroll>
              ) : (
                <>{intl.get('account.noTransaction')}</>
              )
            ) : (
              <>{<SkeletonStyled active paragraph={{ rows: 2 }} />}</>
            )}
          </div>
        </TransactionHistory>
      </FullWalletWrapper>
    </>
  );
};

export default FullWalletComponent;
