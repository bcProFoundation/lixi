import { BurnForType } from '@bcpros/lixi-models/lib/burn/burn.model';
import { COIN } from '@bcpros/lixi-models/constants/coins/coin';
import { coinInfo } from '@bcpros/lixi-models/constants/coins/coin-info';
import { Account, Comment, CommentType, Page, Post } from '@generated/types.generated';
import { BurnForItem } from '@generated/types';
import { usePostQuery } from '@store/post/posts.api';
import { fromSatoshisToCoin } from '@bcpros/redux-store/utils/cashMethods';
import BigNumber from 'bignumber.js';

export const calBurnAmountWithFee = (value: number, burnAmountPerCoin: number, coinBurned: COIN) => {
  const totalBurnWithoutFee = value * burnAmountPerCoin;
  const fee = calFeeWhenBurn(value, burnAmountPerCoin, coinBurned);
  const totalBurn = totalBurnWithoutFee + Number(fee);
  const rounded = coinBurned === COIN.XRG ? false : true;

  return rounded ? Math.ceil(totalBurn) : parseFloat(totalBurn.toFixed(2));
};

export const calFeeWhenBurn = (value: number, burnAmountPerCoin: number, coinBurned: COIN) => {
  const totalFee = value * burnAmountPerCoin * 0.04;
  const cashDecimals =
    coinBurned === COIN.XRG ? coinInfo[COIN.XRG].microCashDecimals : coinInfo[coinBurned].cashDecimals;
  const dustFee = parseFloat(fromSatoshisToCoin(BigNumber(coinInfo[coinBurned].dustSats), cashDecimals).toString());
  if (dustFee > totalFee) {
    return dustFee;
  }

  return totalFee.toFixed(2);
};

export const calBurnAmountWithoutFee = (value: number, burnAmountPerCoin: number, rounded: boolean) => {
  const totalBurn = value * burnAmountPerCoin;
  return rounded ? Math.ceil(totalBurn) : parseFloat(totalBurn.toFixed(2));
};

export const getHashOwner = async (dataItem: BurnForItem, burnForType: BurnForType) => {
  let hashOwner: any = '';
  switch (burnForType) {
    case BurnForType.Post:
      const post = dataItem as Post;
      hashOwner = post.page ? post.page.pageAccount.hash160 : post.account.hash160;
      break;
    case BurnForType.Page:
      const page = dataItem as Page;
      hashOwner = page.pageAccount.hash160;
      break;
    case BurnForType.Account:
      const account = dataItem as Account;
      hashOwner = account.hash160;
      break;
    case BurnForType.Comment:
      const comment = dataItem as Comment;
      const commentToId = comment.commentable.commentToId;
      if (comment.commentable.type === CommentType.Post) {
        const { data } = await usePostQuery({ id: commentToId });
        const post = data.post;
        const page = post?.page;
        const pageHash160 = page ? page?.pageAccount?.hash160 : undefined;
        const postHash160 = post.account.hash160;
        hashOwner = pageHash160 ?? postHash160;
      }
      break;
  }

  return typeof hashOwner !== 'string' ? Buffer.from(hashOwner?.data).toString('hex') : hashOwner;
};
