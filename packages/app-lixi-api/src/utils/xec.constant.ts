const SEND_XEC_ERRORS = {
  INSUFFICIENT_FUNDS: 0,
  NETWORK_ERROR: 1,
  INSUFFICIENT_PRIORITY: 66, // ~insufficient fee
  DOUBLE_SPENDING: 18,
  MAX_UNCONFIRMED_TXS: 64
};

const explorer = {
  blockExplorerUrl: 'https://explorer.e.cash',
  blockExplorerUrlTestnet: 'https://texplorer.bitcoinabc.org',
  pdfReceiptUrl: 'https://blockchair.com/ecash/transaction'
};

const aliasSettings = {
  aliasEnabled: false,
  aliasPaymentAddress: 'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
  aliasServerBaseUrl: 'https://alias.etokens.cash',
  aliasMaxLength: 21, // max byte length, refer to the Alias spec at https://reviews.bitcoinabc.org/D12972
  aliasKeyUpTimeoutMs: 1000
};

const appConfig = {
  name: 'eCash',
  ticker: 'XEC',
  legacyPrefix: 'bitcoincash',
  coingeckoId: 'ecash',
  defaultFee: 2.01,
  dustSats: 550,
  etokenSats: 546,
  cashDecimals: 2,
  tokenName: 'eToken',
  tokenTicker: 'eToken',
  notificationDurationShort: 3,
  notificationDurationLong: 5,
  localStorageMaxCharacters: 24,
  monitorExtension: false
};

const opReturn = {
  opReturnPrefixHex: '6a',
  opReturnPrefixDec: '106',
  opPushDataOne: '4c',
  appPrefixesHex: {
    eToken: '534c5000',
    cashtab: '00746162',
    cashtabEncrypted: '65746162', // Preserve here for use in tx processing
    airdrop: '64726f70',
    aliasRegistration: '2e786563'
  },
  /* The max payload per spec is 220 bytes (or 223 bytes including +1 for OP_RETURN and +2 for pushdata opcodes)
		Within this 223 bytes, transaction building will take up 8 bytes, hence cashtabMsgByteLimit is set to 215 bytes
		i.e.
		 6a
		 04
		 [prefix byte]
		 [prefix byte]
		 [prefix byte]
		 [prefix byte]
		 4c [next byte is pushdata byte]
		 [pushdata byte] (d7 for 215 on a max-size Cashtab msg)
	*/
  cashtabMsgByteLimit: 215,
  // Airdrop spec is <OP_RETURN> <Airdrop protocol identifier> <tokenId> <optionalMsg>
  // in bytes, = 1 + (1 + 4) + (1 + 32) + (1 or 2 + LIMIT)
  // airdropMsgByteLimit = 182 = 223 - 1 - 5 - 33 - 2
  airdropMsgByteLimit: 182
};

export { SEND_XEC_ERRORS, explorer, aliasSettings, appConfig, opReturn };
