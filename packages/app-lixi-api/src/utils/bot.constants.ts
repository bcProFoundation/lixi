export const BOT = {
  MESSAGE: {
    ARBITRATOR_SELECTED: `🧑‍⚖️ Heads up! You have been assigned as the arbitrator for a new order! \r\n\r\n`,
    MODERATOR_SELECTED: `🧑‍⚖️ Heads up! You have been assigned as the moderator for a new order! \r\n\r\n`,
    ORDER_CREATED:
      `📦 Order of %s XEC has been placed by %s! \r\n\r\n` +
      `*Offer:* %s\n` +
      `*Amount paying:* %s %s \n` +
      `*Message:* %s \n`,
    ORDER_CANCELED: `❌ Order has been canceled! \r\n\r\n`,
    ORDER_DECLINED: `❌ Order has been declined! \r\n\r\n`,
    ORDER_ESCROW: `✅ Order has been escrowed! \r\n\r\n`,
    ORDER_COMPLETED: `✅ Order has been completed! \r\n\r\n`,
    ORDER_RETURN_BY_ARBMOD_SELLER: `The order's dispute has been resolved. The funds have been returned to you! \r\n\r\n`,
    ORDER_RETURN_BY_ARBMOD_BUYER: `The order's dispute has been resolved. The funds have been returned to seller! \r\n\r\n`,
    ORDER_RELEASE_BY_ARBMOD_SELLER: `The order's dispute has been resolved. The funds have been released to buyer! \r\n\r\n`,
    ORDER_RELEASE_BY_ARBMOD_BUYER: `The order's dispute has been resolved. The funds have been released to you! \r\n\r\n`,
    SELLER_RAISED_DISPUTE:
      `⚖️ The seller has raised a dispute with the arbitrator/moderator regarding your order! \r\n\r\n` +
      `Reason: "%s" \r\n\r\n`,
    BUYER_RAISED_DISPUTE:
      `⚖️ The buyer has raised a dispute with the arbitrator/moderator regarding your order! \r\n\r\n` +
      `Reason: "%s" \r\n\r\n`,
    NOTIFY_ARBI_MOD_DISPUTE:
      `⚖️ A dispute has been raised for an order under your arbitration! \r\n\r\n` +
      `Seller: %s \r\n` +
      `Buyer: %s \r\n\r\n` +
      `Contract amount: %s XEC \r\n` +
      `Contract address: [%s](%s) \r\n\r\n` +
      `Reason: "%s" \r\n\r\n`,
    SELLER_REQUEST_CHAT: `💬 The seller %s has requested to chat with you! \r\n\r\n`,
    BUYER_REQUEST_CHAT: `💬 The buyer %s has requested to chat with you! \r\n\r\n`,
    ARBI_REQUEST_CHAT: `💬 The arbitrator %s has requested to chat with you! \r\n\r\n`,
    MOD_REQUEST_CHAT: `💬 The mod %s has requested to chat with you! \r\n\r\n`,
    BOOST_NOTIFY:
      `An offer is boosted! \n` +
      `*Message:* %s \n` +
      `*Order limit:* %s \n` +
      `*Payment method:* %s\n` +
      `*Location:* %s\n\n` +
      `[View offer](%s)`,
    BOOST_NOTIFY_WITHOUT_LOCATION:
      `An offer is boosted! \n` +
      `*Message:* %s \n` +
      `*Order limit:* %s \n` +
      `*Payment method:* %s\n` +
      `[View offer](%s)`,
    OFFER_CREATED:
      `%s Offer [#%s](%s) \n` +
      `*Headline:* %s \n` +
      `*Margin:* %s% \n` +
      `*Order limit:* %s\n` +
      `*Payment method:* %s\n` +
      `*Location:* %s\n`,
    OFFER_CREATED_WITHOUT_LOCATION:
      `%s Offer [#%s](%s) \n` +
      `*Headline:* %s \n` +
      `*Margin:* %s% \n` +
      `*Order limit:* %s\n` +
      `*Payment method:* %s\n`,
    OFFER_CREATED_GOODS_SERVICES:
      `%s Offer [#%s](%s) \n` + `*Headline:* %s \n` + `*Order limit:* %s \n` + `*Payment method:* %s\n`,
    ORDER_RELEASED: `✅ Order has been released! You can now claim your funds!`,
    ORDER_RETURNED: `❌ Order has been canceled! You can now claim your funds!`,
    CHRONIK_WATCH_RECEIVED_XEC: `Received %s XEC to _%s_ from _%s_ \r\n\r\n` + `[View tx on the Explorer](%s)`,
    CHRONIK_WATCH_RECEIVED_SLP: `Received %s %s to _%s_ from _%s_ \r\n\r\n` + `[View tx on the Explorer](%s)`,
    CHRONIK_WATCH_SENT_XEC: `Sent %s XEC from _%s_ to _%s_ \r\n\r\n` + `[View tx on the Explorer](%s)`,
    CHRONIK_WATCH_SENT_SLP: `Sent %s %s from _%s_ to _%s_ \r\n\r\n` + `[View tx on the Explorer](%s)`,
    ORDER_MARK_AS_PAID_SELLER: `The order has been marked as paid! Please review it and release the funds!`,
    OFFER_MAKER_ALLOW_CHAT: `The offer-maker has accepted your order, so you can chat with the buyer right now!`
  }
};

export const PERIOD_TIME = {
  YEAR: '1 year',
  MONTH: '1 month',
  WEEK: '1 week',
  DAY: '1 day'
};

export interface InfoStatistics {
  amount_donated: number;
  success_ratio: number;
  avg_settle_time: number;
  amount_traded: number;
  total_trades: bigint;
  unique_trade_count: bigint;
}
