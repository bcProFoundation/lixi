import React, { useRef, useState } from 'react';
import {
  useInfiniteAccountsQuery,
  useInfiniteTopWeekAccountsQuery,
  useInfiniteTopMonthAccountsQuery
} from '@store/account';
import { Table, Button, Input, Space, InputRef } from 'antd';
import { ColumnType, ColumnsType } from 'antd/es/table';
import intl from 'react-intl-universal';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { useSliceDispatch } from '@store/index';
import { showToast } from '@store/toast';
import { CopyOutlined, FilterOutlined, SearchOutlined, SyncOutlined } from '@ant-design/icons';
import { push } from 'connected-next-router';
import Counter from './Counter';
import { formatBalance } from '@utils/cashMethods';
import { Account, Token } from '@generated/types.generated';
import AvatarUser from './AvatarUser';
import styled from 'styled-components';
import { FilterConfirmProps } from 'antd/es/table/interface';
import moment from 'moment';

const StyledNavBarAccounts = styled.div`
  .navbar-account {
    display: flex;
    justify-content: flex-end;
    gap: 5px;
    margin: 1rem 0;
  }
`;

const TopAccount = styled.div`
  margin: auto;
  margin-top: 1rem;
  max-width: 800px;
  width: 100%;

  .table-accounts {
    display: block;
    @media (max-width: 968px) {
      padding-bottom: 4rem !important;
    }
    @media (max-width: 768px) {
      display: none;

    }
`;

const TopAccountMobile = styled.div`
  display: none;
  @media (max-width: 768px) {
    display: block;
    max-width: 500px;
    width: 100%;
    margin: auto;
    padding-bottom: 4rem;
  }
`;

const ItemTopAccountMobile = styled.div`
  padding: 1rem;
  background: #fff;
  border: 1px solid var(--boder-item-light);
  border-radius: 18px;
  margin-bottom: 0.5rem;

  .ranking-infor {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .ranking-avatar {
    position: relative;
    .ranking-img {
      position: absolute;
      width: 26px;
      top: 0;
      left: 27px;
    }
  }
  .ranking-name {
    font-size: 1rem;
    font-weight: 550;
    .ranking-number {
      color: var(--color-primary);
    }
  }

  .ranking-detail-infor {
    display: flex;
    justify-content: space-between;
    margin-top: 8px;

    .gray-color {
      color: var(--text-color-1);
    }
  }
`;

const AccountHomeFeed = () => {
  const dispatch = useSliceDispatch();
  const [getFullAccount, setGetFullAccount] = useState(true);
  const [getTopAccountWeek, setGetTopAccountWeek] = useState(false);
  const [getTopAccountMonth, setGetTopAccountMonth] = useState(false);

  const now = moment().utc();
  const week = now.week();
  const month = now.month() + 1;
  const year = now.year();
  const monthName = now.format('MMMM');

  const { data, totalCount } = useInfiniteAccountsQuery(
    {
      first: 100 //get top 100 accounts
    },
    false
  );

  const { data: dataAccountTopWeek, totalCount: totalCountAccountTopWeek } = useInfiniteTopWeekAccountsQuery(
    {
      first: 20, //get top 20 accounts week
      week,
      year
    },
    false
  );

  const { data: dataAccountTopMonth, totalCount: totalCountAccountTopMonth } = useInfiniteTopMonthAccountsQuery(
    {
      first: 20, //get top 20 accounts month
      month,
      year
    },
    false
  );

  const handleOnCopy = (id: string) => {
    dispatch(
      showToast('info', {
        message: intl.get('lixi.addressCopied'),
        description: id
      })
    );
  };

  const handleNavigateAccount = account => {
    dispatch(push(`/profile/${account.address}`));
  };

  const handleSearch = (selectedKeys: string[], confirm: (param?: FilterConfirmProps) => void, dataIndex: any) => {
    confirm();
  };

  const handleReset = (clearFilters: () => void) => {
    clearFilters();
  };

  const handleGetTopAccountWeek = () => {
    setGetFullAccount(false);
    setGetTopAccountMonth(false);
    setGetTopAccountWeek(true);
  };

  const handleGetTopAccountMonth = () => {
    setGetFullAccount(false);
    setGetTopAccountMonth(true);
    setGetTopAccountWeek(false);
  };

  const handleResetTopAccount = () => {
    setGetFullAccount(true);
    setGetTopAccountMonth(false);
    setGetTopAccountWeek(false);
  };

  const getColumnSearchProps = (dataIndex: any): ColumnType<any> => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }} onKeyDown={e => e.stopPropagation()}>
        <Input
          placeholder={`Search ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => handleSearch(selectedKeys as string[], confirm, dataIndex)}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            className="outline-btn"
            onClick={() => handleSearch(selectedKeys as string[], confirm, dataIndex)}
            icon={<SearchOutlined />}
            size="small"
          >
            Search
          </Button>
          <Button
            type="primary"
            onClick={() => clearFilters && handleReset(clearFilters)}
            size="small"
            className="outline-btn"
            icon={<SyncOutlined />}
          >
            Reset
          </Button>
          <Button
            type="primary"
            size="small"
            className="outline-btn"
            icon={<FilterOutlined />}
            onClick={() => {
              confirm({ closeDropdown: false });
            }}
          >
            Filter
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
    onFilter: (value: string, token: Token) => {
      return token.name.toString().toLowerCase().includes(value.toLowerCase());
    }
  });

  const columns: ColumnsType<Account> = [
    {
      title: '#',
      dataIndex: 'rank',
      key: 'rank',
      render: (_, account) => account.rankNumber
    },

    {
      key: 'avatar',
      title: intl.get('label.avatar'),
      dataIndex: 'avatar',
      render: (_, account) => (
        <div onClick={() => handleNavigateAccount(account)}>
          <AvatarUser icon={account.avatar} name={account.name} />
        </div>
      )
    },
    {
      key: 'name',
      title: intl.get('label.name'),
      dataIndex: 'name',
      ...getColumnSearchProps('name'),
      render: (_, account) => <a onClick={() => handleNavigateAccount(account)}>{account.name}</a>
    },
    {
      key: 'address',
      title: intl.get('label.address'),
      dataIndex: 'address',
      render: (_, account) => (
        <CopyToClipboard text={account.address} onCopy={() => handleOnCopy(account.address)}>
          <p style={{ marginTop: '0px', marginBottom: '0px' }}>
            {account.address.substring(account.address.length - 8).slice(0, 4)}
            <b>{account.address.substring(account.address.length - 4)}</b>
            &nbsp; <CopyOutlined style={{ fontSize: '14px', color: 'rgba(30, 26, 29, 0.6)' }} />
          </p>
        </CopyToClipboard>
      )
    },

    {
      key: 'danaBurn',
      title: intl.get('general.dana'),
      sorter: (accountA, accountB) =>
        getFullAccount
          ? accountA.accountDana.danaGiven - accountB.accountDana.danaGiven
          : accountA.rankScore - accountB.rankScore,
      defaultSortOrder: 'descend',
      render: (_, account) => (
        <Counter num={formatBalance(getFullAccount ? account.accountDana.danaGiven : account.rankScore)} />
      )
    }
  ];

  const UITopAccount = (data, totalCount, displayPagination = true) => (
    <React.Fragment>
      <TopAccount>
        <Table
          className="table-accounts"
          columns={columns}
          dataSource={data}
          pagination={
            displayPagination
              ? {
                total: totalCount,
                pageSize: 20
              }
              : false
          }
          rowKey={account => {
            return account.id;
          }}
        />
      </TopAccount>
      <TopAccountMobile>
        {data &&
          data.length > 0 &&
          data.map((account, index) => {
            return (
              <ItemTopAccountMobile className="card-item-account" key={`account-home-feed-${account.id}-${index}`}>
                <div className="ranking-infor type-name">
                  <div className="ranking-avatar">
                    <span onClick={() => handleNavigateAccount(account)}>
                      <AvatarUser icon={account.avatar} name={account.name} />
                    </span>
                    {index < 3 && (
                      <img className={'ranking-img'} src={`/images/ico-circled-${index + 1}-ranking.png`} />
                    )}
                  </div>
                  <div className="ranking-name ">
                    <span onClick={() => handleNavigateAccount(account)}>{account.name}</span>{' '}
                    <span className="ranking-number">{index > 2 && `#${index + 1}`}</span>
                  </div>
                </div>
                <div className="ranking-detail-infor type-name">
                  <div className="gray-color type-name">{intl.get('label.address')}:</div>
                  <div>
                    <CopyToClipboard text={account.address} onCopy={() => handleOnCopy(account.address)}>
                      <p style={{ marginTop: '0px', marginBottom: '0px' }}>
                        {account.address.substring(account.address.length - 8).slice(0, 4)}
                        <b>{account.address.substring(account.address.length - 4)}</b>
                        &nbsp; <CopyOutlined style={{ fontSize: '14px', color: 'rgba(30, 26, 29, 0.6)' }} />
                      </p>
                    </CopyToClipboard>
                  </div>
                </div>
                <div className="ranking-detail-infor type-name">
                  <div className="gray-color type-name">{intl.get('general.dana')}:</div>
                  {getFullAccount ? account.accountDana.danaGiven : account.rankScore}
                </div>
              </ItemTopAccountMobile>
            );
          })}
      </TopAccountMobile>
    </React.Fragment>
  );

  return (
    <React.Fragment>
      <div className="container-account-listing">
        <StyledNavBarAccounts>
          <div className="navbar-account">
            <Button type="primary" className="outline-btn" onClick={handleGetTopAccountWeek}>
              {intl.get('general.topWeek')}
            </Button>
            <Button type="primary" className="outline-btn" onClick={handleGetTopAccountMonth}>
              {intl.get('general.topMonth')}
            </Button>
            <Button type="primary" className="outline-btn" onClick={handleResetTopAccount}>
              Reset
            </Button>
          </div>
        </StyledNavBarAccounts>
        {getFullAccount && UITopAccount(data, totalCount)}
        {getTopAccountWeek && (
          <>
            <h1>Top Week {week}</h1> {UITopAccount(dataAccountTopWeek, totalCountAccountTopWeek, false)}
          </>
        )}
        {getTopAccountMonth && (
          <>
            <h1>Top {monthName}</h1> {UITopAccount(dataAccountTopMonth, totalCountAccountTopMonth, false)}
          </>
        )}
      </div>
    </React.Fragment>
  );
};

export default AccountHomeFeed;
