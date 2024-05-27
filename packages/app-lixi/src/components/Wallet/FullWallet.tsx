import { LockOutlined, SearchOutlined } from '@ant-design/icons';
import ClaimComponent from '@components/Claim';
import { Button, List } from 'antd';
import VirtualList from 'rc-virtual-list';
import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import WalletInfoComponent from './WalletInfo';
import intl from 'react-intl-universal';
import { useSliceDispatch, useSliceSelector } from '@store/index';
import { getSelectedAccount } from '@store/account/selectors';
import { getWalletHasUpdated, getWalletParsedTxHistory, getWalletState } from '@store/wallet';
import { ParsedChronikTx, getTxHistoryChronik } from '@utils/chronik';
import { Tx } from 'chronik-client';
import { formatDate } from '@utils/formatting';
import _ from 'lodash';
import { getCurrentLocale } from '@store/settings/selectors';
import { FormattedTxAddress } from '@components/Common/FormattedWalletAddress';
import Link from 'next/link';
import Reply from '@assets/icons/reply.svg';
import { BurnForType } from '@bcpros/lixi-models/lib/burn';
import { selectTokens } from '@store/token';
import { useCommentQuery } from '@store/comment/comments.api';
import { Skeleton } from 'antd';
import InfiniteScroll from 'react-infinite-scroll-component';
import { WalletContext } from '@context/index';
import { COIN } from '@bcpros/lixi-models/constants';

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
  padding: 0 2rem;
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

  const { XPI, chronik } = Wallet;

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
    const { chronikTxHistory } = await getTxHistoryChronik(chronik, XPI, walletState, pageNumber);
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

  return (
    <>
      <FullWalletWrapper className="full-wallet">
        <WalletInfoComponent />
        <ClaimComponent isClaimFromAccount={true} claimCodeFromURL={claimCode}></ClaimComponent>
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
