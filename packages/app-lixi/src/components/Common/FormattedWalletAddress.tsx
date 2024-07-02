import React from 'react';
import styled from 'styled-components';

const AddressHighlightTrim = styled.span`
  font-weight: bold;

  @media (max-width: 768px) {
    font-size: 12px;
  }
  @media (max-width: 340px) {
    font-size: 10px;
  }
`;
export interface FormattedWalletAddressProps {
  address: string;
}

const FormattedWalletAddress: React.FC<FormattedWalletAddressProps> = ({ address }) => {
  const prefixLength = 11;
  const trimLength = 8;

  return (
    <>
      {address.slice(0, prefixLength)}
      <AddressHighlightTrim>{address.slice(prefixLength, prefixLength + trimLength)}</AddressHighlightTrim>
      {address.slice(prefixLength + trimLength, -trimLength)}
      <AddressHighlightTrim>{address.slice(-trimLength)}</AddressHighlightTrim>
    </>
  );
};

export interface FormattedTxAddressProps {
  address: string;
}

export const FormattedTxAddress: React.FC<FormattedTxAddressProps> = ({ address }) => {
  return (
    <>
      <span style={{ fontWeight: 'normal' }}>{address.slice(0, -4)}</span>
      <span style={{ fontWeight: 'bold' }}>{address.slice(-4)}</span>
    </>
  );
};

export default FormattedWalletAddress;
