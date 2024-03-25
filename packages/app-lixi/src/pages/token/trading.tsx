import React from 'react';
import PageDetailLayout from '@components/Layout/PageDetailLayout';
import TokensTrading from '@components/Token/TokensTrading';

const TokensListingPage = () => {
  return (
    <TokensTrading />
  );
};

TokensListingPage.getLayout = ({ children }) => <PageDetailLayout>{children}</PageDetailLayout>;

export default TokensListingPage;
