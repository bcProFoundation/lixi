import React from 'react';

import { text, number } from '@storybook/addon-knobs';

import ButtonQR from './ButtonQR';
import Text from '../Text';

const ButtonText = 'CashTab Pay';

export default {
  title: 'ButtonQR'
};

export const DefaultAllKnobs = {
  render: () => (
    <ButtonQR
      toAddress={text('To address', 'bitcoincash:pp8skudq3x5hzw8ew7vzsw8tn4k8wxsqsv0lt0mf3g')}
      amountSatoshis={number('Satoshis', 550)}
      sizeQR={number('QR size', 125)}
      step={'fresh'}
    >
      <Text>{ButtonText}</Text>
    </ButtonQR>
  ),

  name: 'default - all knobs',

  parameters: {
    notes:
      'Button is a stateful controlled component which is the primary visual indicator for the Cashtab payment process'
  }
};

export const PaymentPending = {
  render: () => (
    <ButtonQR
      toAddress={text('To address', 'bitcoincash:pp8skudq3x5hzw8ew7vzsw8tn4k8wxsqsv0lt0mf3g')}
      amountSatoshis={number('Satoshis', 550)}
      step={'pending'}
    >
      <Text>{ButtonText}</Text>
    </ButtonQR>
  ),

  name: 'payment pending',

  parameters: {
    notes: 'Awaiting a confirmation or cancellation of Cashtab popup'
  }
};

export const PaymentComplete = {
  render: () => (
    <ButtonQR
      toAddress={text('To address', 'bitcoincash:pp8skudq3x5hzw8ew7vzsw8tn4k8wxsqsv0lt0mf3g')}
      amountSatoshis={number('Satoshis', 550)}
      step={'complete'}
    >
      <Text>{ButtonText}</Text>
    </ButtonQR>
  ),

  name: 'payment complete',

  parameters: {
    notes: 'Payment received, at least on the front-end'
  }
};

export const InstallPrompt = {
  render: () => (
    <ButtonQR
      toAddress={text('To address', 'bitcoincash:pp8skudq3x5hzw8ew7vzsw8tn4k8wxsqsv0lt0mf3g')}
      amountSatoshis={number('Satoshis', 550)}
      step={'install'}
    >
      <Text>{ButtonText}</Text>
    </ButtonQR>
  ),

  name: 'install prompt',

  parameters: {
    notes: 'Cashtab plugin not installed, prompt user to install Cashtab'
  }
};
