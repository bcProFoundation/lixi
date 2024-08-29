import BCHJS from '@bcpros/xpi-js';
import { ChronikClient, Utxo, ChronikClientNode, Utxo_InNode } from 'chronik-client';
import { COIN } from '@bcpros/lixi-models/constants/coins/coin';
import { coinInfo } from '@bcpros/lixi-models/constants/coins/coin-info';
import { useXPI } from './useXPI';
import { useXEC } from './useXEC';
import { useXRG } from './useXRG';

export default function useCoin() {
  const sendCoin = async (
    coin: COIN,
    XPI: BCHJS,
    chronik: ChronikClient | ChronikClientNode,
    fundingWif: string,
    utxos: Array<Utxo & { address: string }> | Array<Utxo_InNode & { address: string }>,
    optionalOpReturnMsg: string | undefined,
    encryptionFlag: boolean,
    isOneToMany: boolean,
    destinationHashAndValueArray: Array<string> | null,
    destinationHash: string,
    sendSingleAmount: number,
    returnHex?: boolean
  ) => {
    try {
      const { sendXpi } = useXPI();
      const { sendXec } = useXEC();
      const { sendXrg } = useXRG();

      let result;
      switch (coin) {
        case COIN.XPI:
          result = await sendXpi(
            XPI,
            chronik as ChronikClient,
            fundingWif,
            utxos as Array<Utxo & { address: string }>,
            coinInfo[COIN.XPI].defaultFee,
            optionalOpReturnMsg,
            encryptionFlag,
            isOneToMany, //indicate send mode is one to one
            destinationHashAndValueArray,
            destinationHash,
            sendSingleAmount,
            coinInfo[COIN.XPI].etokenSats,
            returnHex // return hex
          );
          break;
        case COIN.XEC:
          result = await sendXec(
            chronik as ChronikClientNode,
            fundingWif,
            utxos as Array<Utxo_InNode & { address: string }>,
            coinInfo[COIN.XEC].defaultFee,
            optionalOpReturnMsg,
            isOneToMany, //indicate send mode is one to one
            destinationHashAndValueArray,
            destinationHash,
            sendSingleAmount,
            coinInfo[COIN.XEC].etokenSats,
            returnHex // return hex
          );
          break;
        case COIN.XRG:
          result = await sendXrg(
            chronik as ChronikClient,
            fundingWif,
            utxos as Array<Utxo & { address: string }>,
            coinInfo[COIN.XRG].defaultFee,
            optionalOpReturnMsg,
            isOneToMany, //indicate send mode is one to one
            destinationHashAndValueArray,
            destinationHash,
            sendSingleAmount,
            coinInfo[COIN.XRG].etokenSats,
            returnHex // return hex
          );
          break;
        default:
          result = await sendXpi(
            XPI,
            chronik as ChronikClient,
            fundingWif,
            utxos as Array<Utxo & { address: string }>,
            coinInfo[COIN.XPI].defaultFee,
            optionalOpReturnMsg,
            encryptionFlag,
            isOneToMany, //indicate send mode is one to one
            destinationHashAndValueArray,
            destinationHash,
            sendSingleAmount,
            coinInfo[COIN.XPI].etokenSats,
            returnHex // return hex
          );
      }

      return result;
    } catch (err) {
      throw new Error(err);
    }
  };

  return {
    sendCoin
  } as const;
}
