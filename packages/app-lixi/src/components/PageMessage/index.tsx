import { Button } from 'antd';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { getAllAccounts, getSelectedAccount, selectAccount } from '@store/account';
import { Account } from '@bcpros/lixi-models';
import _ from 'lodash';
import { usePagesByUserIdQuery } from '@store/page/pages.api';
import PageMessageForUser from './PageMessageForUser';
import { startChannel, stopChannel } from '@store/message/actions';

const StyledContainer = styled.div`
  display: flex;
  width: 100%;
`;

const StyledSideContainer = styled.div`
  display: flex;
  border-right: 1px solid black;
  flex-direction: column;
  width: 20%;
`;

const StyledAccountContainer = styled.div`
  display: flex;
  flex-direction: column;

  .sub-account {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-item-light);
    padding: 1rem 1rem 0;
    .sub-account-info {
      text-align: left;
      .name {
        font-size: 14px;
        line-height: 24px;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }
      .address {
        font-size: 14px;
        line-height: 20px;
        letter-spacing: 0.25px;
        color: rgba(30, 26, 29, 0.38);
        margin-bottom: 0;
      }
    }
  }
`;

const StyledPageContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const PageMessage = () => {
  const selectedAccount = useAppSelector(getSelectedAccount);
  const [otherAccounts, setOtherAccounts] = useState<Account[]>([]);
  const savedAccounts: Account[] = useAppSelector(getAllAccounts);
  const dispatch = useAppDispatch();
  const currentUserPages = usePagesByUserIdQuery({ id: selectedAccount.id }).currentData;

  useEffect(() => {
    setOtherAccounts(_.filter(savedAccounts, acc => acc && acc.id !== selectedAccount?.id));
  }, [savedAccounts]);

  useEffect(() => {
    dispatch(startChannel());

    return () => {
      stopChannel();
    };
  }, []);

  return (
    <StyledContainer>
      <StyledSideContainer>
        <StyledAccountContainer>
          <h1>Account</h1>
          <div className="sub-account">
            <div className="sub-account-info">
              <p className="name">{selectedAccount?.name}</p>
              <p className="address">{selectedAccount?.address.slice(-10)}</p>
            </div>
            <Button type="primary" className="no-border-btn">
              Activated
            </Button>
          </div>
          {otherAccounts &&
            otherAccounts.map((acc, index) => {
              return (
                <div className="sub-account" key={index}>
                  <div className="sub-account-info">
                    <p className="name">{acc?.name}</p>
                    <p className="address">{acc?.address.slice(-10)}</p>
                  </div>
                  <Button
                    type="primary"
                    className="outline-btn"
                    style={{ color: '#000' }}
                    onClick={() => {
                      dispatch(selectAccount(acc.id));
                    }}
                  >
                    Activate
                  </Button>
                </div>
              );
            })}
        </StyledAccountContainer>
        {currentUserPages && <h1>Page</h1>}

        {currentUserPages &&
          currentUserPages.allPagesByUserId.edges.length > 0 &&
          currentUserPages.allPagesByUserId.edges.map(({ node: page }) => {
            return <p key={page.id}>{page.name}</p>;
          })}
      </StyledSideContainer>

      <div style={{ width: '80%' }}>
        <PageMessageForUser account={selectedAccount} />
      </div>
    </StyledContainer>
  );
};

export default PageMessage;
