// @flow

import React from 'react';

import Button from './Button';
import Text from '../Text';

const ButtonText = 'CashTab Pay';

export default {
  title: 'Button'
};

export const Default = {
  render: () => (
    <Button step={'fresh'}>
      <Text>{ButtonText}</Text>
    </Button>
  ),

  name: 'default',

  parameters: {
    notes:
      'Button is a stateful controlled component which is the primary visual indicator for the badger payment process'
  }
};

export const PaymentPending = {
  render: () => (
    <Button step={'pending'}>
      <Text>{ButtonText}</Text>
    </Button>
  ),

  name: 'payment pending',

  parameters: {
    notes: 'Awaiting a confirmation or cancellation of Badger popup'
  }
};

export const PaymentComplete = {
  render: () => (
    <Button step={'complete'}>
      <Text>{ButtonText}</Text>
    </Button>
  ),

  name: 'payment complete',

  parameters: {
    notes: 'Payment received, at least on the front-end'
  }
};

export const InstallPrompt = {
  render: () => (
    <Button step={'install'}>
      <Text>{ButtonText}</Text>
    </Button>
  ),

  name: 'install prompt',

  parameters: {
    notes: 'CashTab extension not installed, prompt user to install CashTab'
  }
};
