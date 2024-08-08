import { Modal, Skeleton } from 'antd';
import { useSliceDispatch } from '@store/index';
import { closeModal } from '@store/modal';
import InfiniteScroll from 'react-infinite-scroll-component';
import styled from 'styled-components';
import intl from 'react-intl-universal';
import { LockOutlined } from '@ant-design/icons';
import Reply from '@assets/icons/reply.svg';
import { BurnForType } from '@bcpros/lixi-models/lib/burn/burn.model';
import { FormattedTxAddress } from '@components/Common/FormattedWalletAddress';
import { WalletContext } from '@context/index';
import { getSelectedAccount } from '@store/account/selectors';
import { useSliceSelector } from '@store/index';
import { selectTokens } from '@store/token';
import { getWalletHasUpdated, getWalletParsedTxHistory, getWalletState } from '@store/wallet';
import { ParsedChronikTx, getTxHistoryChronik } from '@utils/chronik';
import { formatDate } from '@utils/formatting';
import { Button, List } from 'antd';
import { ChronikClient, Tx } from 'chronik-client';
import _ from 'lodash';
import Link from 'next/link';
import { COIN } from '@bcpros/lixi-models/constants/coins/coin';
import { coinInfo } from '@bcpros/lixi-models/constants/coins/coin-info';
import React, { useState, useEffect } from 'react';
import VirtualList from 'rc-virtual-list';

const WalletHistoryCustomModal = styled(Modal)`
  border-bottom-left-radius: 24px;
  border-bottom-right-radius: 24px;

  .ant-modal-body {
    padding: 0 0 0 15px;
  }

  ::-webkit-scrollbar {
    -webkit-appearance: none;
    width: 7px;
  }
  ::-webkit-scrollbar-thumb {
    border-radius: 4px;
    background-color: rgba(0, 0, 0, 0.5);
    box-shadow: 0 0 1px rgba(255, 255, 255, 0.5);
  }

  .content-transaction {
    height: 500px;
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
`;

const SkeletonStyled = styled(Skeleton)`
  .ant-skeleton-title {
    width: 10% !important;
  }
  .ant-skeleton-paragraph li {
    width: 95% !important;
  }
`;

interface WalletHistoryProps {
  coin: COIN;
  classStyle?: string;
}

const WalletHistoryModal = ({ coin = COIN.XPI, classStyle }: WalletHistoryProps) => {
  const dispatch = useSliceDispatch();
  const trimLength = 8;
  const currentCoin = coinInfo[coin].ticker;

  const walletHasUpdated = useSliceSelector(getWalletHasUpdated);
  const selectedAccount = useSliceSelector(getSelectedAccount);
  const selectedCoin = selectedAccount?.coin ?? COIN.XPI;
  const walletParsedHistory = useSliceSelector(getWalletParsedTxHistory);
  const walletState = useSliceSelector(getWalletState);
  const allTokens = useSliceSelector(selectTokens);
  const Wallet = React.useContext(WalletContext);
  const { XPI, chronik } = Wallet;

  const [dataWalletParsedHistory, setDataWalletParsedHistory] = useState<Tx[]>([]);
  const [callHistory, setCallHistory] = useState(dataWalletParsedHistory.length > 0 ? true : false);
  const [pageNumber, setPageNumber] = useState<number>(coin === selectedCoin ? 1 : 0); //start pagination at page 1 (already have data at page 0)
  const [hasMoreTxHistory, setHasMoreTxHistory] = useState<boolean>(true);

  const orderedWalletParsedHistory = _.orderBy(dataWalletParsedHistory, x => x.timeFirstSeen, 'desc');
  const walletParsedHistoryGroupByDate = _.groupBy(orderedWalletParsedHistory, item => {
    const currentMonth = new Date().getMonth();
    const dateTime = new Date(formatDate(item.timeFirstSeen));
    if (currentMonth == dateTime.getMonth()) return intl.get('account.recent');
    const month = dateTime.toLocaleString('en', { month: 'long' });
    return month + ' ' + dateTime.getFullYear();
  });

  const fetchNextDataWalletHistory = async (pageNumber = 0) => {
    const { chronikTxHistory } = await getTxHistoryChronik(
      coin === selectedCoin ? chronik : new ChronikClient(`https://chronik.be.cash/${coin.toLowerCase()}`),
      XPI,
      walletState,
      pageNumber,
      coin
    );
    if (chronikTxHistory.length === 0) {
      setHasMoreTxHistory(pre => !pre);
      return;
    }
    setDataWalletParsedHistory(pre => pre.concat(chronikTxHistory));
    setPageNumber(pre => pre + 1);
  };

  const loadMoreItems = () => {
    fetchNextDataWalletHistory(pageNumber);
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

  //call data in the first time if not have
  useEffect(() => {
    const fetchData = async () => {
      await fetchNextDataWalletHistory(0);
      setCallHistory(true);
    };
    if (coin === selectedCoin) {
      setDataWalletParsedHistory(pre => pre.concat(walletParsedHistory));
      setCallHistory(true);
      return;
    }

    if (dataWalletParsedHistory.length === 0) {
      fetchData();
    }
  }, []);

  //change tx history when change wallet
  useEffect(() => {
    //dont change for other wallet
    if ((walletParsedHistory[0]?.network ?? COIN.XPI) === coin) {
      setDataWalletParsedHistory(walletParsedHistory);
    }
  }, [walletParsedHistory]);

  return (
    <WalletHistoryCustomModal
      title={intl.get('account.transactionHistory')}
      width={450}
      footer={null}
      open={true}
      onCancel={() => dispatch(closeModal())}
      className={`${classStyle}`}
    >
      <div id="scrollableDivTx" className="content-transaction">
        {callHistory && walletHasUpdated ? (
          dataWalletParsedHistory.length > 0 ? (
            <InfiniteScroll
              dataLength={dataWalletParsedHistory.length}
              next={loadMoreItems}
              hasMore={hasMoreTxHistory}
              loader={<SkeletonStyled active paragraph={{ rows: 2 }} title={false} />}
              scrollableTarget="scrollableDivTx"
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
                                            <FormattedTxAddress address={item.parsed.replyAddress.slice(-trimLength)} />
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
    </WalletHistoryCustomModal>
  );
};

export default WalletHistoryModal;
