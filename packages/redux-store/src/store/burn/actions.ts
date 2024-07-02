import { BurnCommand, BurnQueueCommand } from '@bcpros/lixi-models/lib/burn/burn.command';
import { createAction } from '@reduxjs/toolkit';
import { Burn, BurnForType } from '@bcpros/lixi-models/lib/burn/burn.model';
import { BurnForItem } from '../../generated/types';

export const burnForUpDownVote = createAction<BurnCommand>('burn/burnForUpDownVote');
export const burnForUpDownVoteSuccess = createAction<Burn>('burn/burnForUpDownVoteSuccess');
export const burnForUpDownVoteFailure = createAction<string>('burn/burnForUpDownVoteFailure');
export const addBurnTransaction = createAction<BurnQueueCommand>('burn/addBurnTransaction');
export const createTxHex = createAction<any>('burn/createTxHex');
export const returnTxHex = createAction<{ rawTxHex: string; minerFee: string }>('burn/returnTxHex');
export const prepareBurnCommand = createAction<{
  isUpVote: boolean;
  burnForItem: BurnForItem;
  burnForType: BurnForType;
  burnValue: string;
  amountDana: number;
}>('burn/prepareBurnCommand');
export const addBurnQueue = createAction<any>('burn/addBurnQueue');
export const removeBurnQueue = createAction('burn/removeBurnQueue');
export const clearBurnQueue = createAction('burn/clearBurnQueue');
export const addFailQueue = createAction<any>('burn/addFailQueue');
export const removeFailQueue = createAction('burn/removeFailQueue');
export const clearFailQueue = createAction('burn/clearFailQueue');
export const moveAllBurnToFailQueue = createAction('burn/moveAllBurnToFailQueue');
