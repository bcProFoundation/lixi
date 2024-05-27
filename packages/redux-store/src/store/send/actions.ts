import { COIN } from '@bcpros/lixi-models';
import { createAction } from '@reduxjs/toolkit';

export const sendCoinSuccess = createAction<{ amount: number; coin: COIN }>('send/sendCoinSuccess');
export const sendCoinFailure = createAction<string>('send/sendCoinFailure');
