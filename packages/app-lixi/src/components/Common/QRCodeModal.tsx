import { COIN } from '@bcpros/lixi-models/constants/coins/coin';
import { coinInfo } from '@bcpros/lixi-models/constants/coins/coin-info';
import { useSliceDispatch } from '@store/index';
import { openModal } from '@store/modal/actions';
import RawQRCode from 'qrcode.react';
import React from 'react';
import styled from 'styled-components';
import { QRCodeModalProps } from './QRCodeModalPopup';

type StyledRawQRCodeProps = {
  level?: 'L' | 'M' | 'Q' | 'H' | undefined;
  id: string;
  value: string;
  xpi: number;
  size: number;
  renderAs: string;
  includeMargin: boolean | null;
  imageSettings?: any;
};
const StyledRawQRCode: React.FC<StyledRawQRCodeProps> = styled(RawQRCode)<StyledRawQRCodeProps>`
  cursor: pointer;
  background: ${props => props.theme.qr.background};
  path:first-child {
    fill: ${props => props.theme.qr.background};
  }
  :hover {
    border-color: ${({ xpi = 0, ...props }) => (xpi === 1 ? props.theme.primary : props.theme.qr.token)};
  }
  @media (max-width: 768px) {
    border-radius: 18px;
    width: 170px;
    height: 170px;
  }
`;

type QRCodeProps = {
  address: string;
  size?: number;
  logoImage?: string;
};
export const QRCode = ({ address, size = 210, logoImage, ...otherProps }: QRCodeProps) => {
  return (
    <StyledRawQRCode
      {...otherProps}
      id="borderedQRCode"
      value={address || ''}
      size={size}
      xpi={address ? 1 : 0}
      renderAs={'svg'}
      includeMargin
      level={'H'}
      imageSettings={{
        src: logoImage ?? coinInfo[COIN.XPI].logo,
        x: undefined,
        y: undefined,
        height: 24,
        width: 24,
        excavate: true
      }}
    />
  );
};

export const QRCodeModal = ({ logoImage, address, type, onClick = () => null }: QRCodeModalProps) => {
  const dispatch = useSliceDispatch();

  const showBigModal = () => {
    const qRCodeModalProps: QRCodeModalProps = {
      address: address,
      type: type,
      logoImage
    };
    dispatch(openModal('QRCodeModalPopup', qRCodeModalProps));
  };

  return (
    <>
      <div onClick={showBigModal}>
        <QRCode logoImage={logoImage} address={address} />
      </div>
    </>
  );
};
