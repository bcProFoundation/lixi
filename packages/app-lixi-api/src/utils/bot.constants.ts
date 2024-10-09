export const BOT = {
  MESSAGE: {
    ARBITRATOR_SELECTED:
      `🧑‍⚖️ Heads up! You have been assigned as the arbitrator for a new order! \r\n\r\n` + `[View order](%s)`,
    MODERATOR_SELECTED:
      `🧑‍⚖️ Heads up! You have been assigned as the moderator for a new order! \r\n\r\n` + `[View order](%s)`,
    ORDER_CREATED: `📦 A new order has been placed! \r\n\r\n` + `[View order](%s)`,
    ORDER_CANCELED: `❌ Your order has been canceled! \r\n\r\n` + `[View order](%s)`,
    ORDER_DECLINED: `❌ Your order has been declined! \r\n\r\n` + `[View order](%s)`,
    ORDER_ESCROW: `✅ Your order has been escrowed! \r\n\r\n` + `[View order](%s)`,
    ORDER_COMPLETED: `✅ Order has been completed! \r\n\r\n` + `[View order](%s)`,
    ORDER_RETURN_BY_ARBMOD_SELLER:
      `The order's dispute has been resolved. The funds have been returned to you! \r\n\r\n` + `[View order](%s)`,
    ORDER_RETURN_BY_ARBMOD_BUYER:
      `The order's dispute has been resolved. The funds have been returned to seller! \r\n\r\n` + `[View order](%s)`,
    ORDER_RELEASE_BY_ARBMOD_SELLER:
      `The order's dispute has been resolved. The funds have been released to buyer! \r\n\r\n` + `[View order](%s)`,
    ORDER_RELEASE_BY_ARBMOD_BUYER:
      `The order's dispute has been resolved. The funds have been released to you! \r\n\r\n` + `[View order](%s)`,
    SELLER_RAISED_DISPUTE:
      `⚖️ The seller has raised a dispute with the arbitrator/moderator regarding your order! \r\n\r\n` +
      `Reason: "%s" \r\n\r\n` +
      `[View order](%s)`,
    BUYER_RAISED_DISPUTE:
      `⚖️ The buyer has raised a dispute with the arbitrator/moderator regarding your order! \r\n\r\n` +
      `Reason: "%s" \r\n\r\n` +
      `[View order](%s)`,
    NOTIFY_ARBI_MOD_DISPUTE:
      `⚖️ A dispute has been raised for an order under your arbitration! \r\n\r\n` + `[View order](%s)`,
    ARB_RECEIVE_DISPUTE: `⚖️ The %s has raised a dispute! \r\n\r\n` + `Reason: "%s" \r\n\r\n` + `[View order](%s)`,
    SELLER_REQUEST_CHAT: `💬 The seller %s has requested to chat with you! \r\n\r\n` + `[View order](%s)`,
    BUYER_REQUEST_CHAT: `💬 The buyer %s has requested to chat with you! \r\n\r\n` + `[View order](%s)`,
    ARBI_REQUEST_CHAT: `💬 The arbitrator %s has requested to chat with you! \r\n\r\n` + `[View order](%s)`,
    MOD_REQUEST_CHAT: `💬 The mod %s has requested to chat with you! \r\n\r\n` + `[View order](%s)`,
    BOOST_NOTIFY:
      `A offer is boosted! \n` +
      `*Message:* %s \n` +
      `*Order limit:* %s \n` +
      `*Price:* %s \n` +
      `*Payment method:* %s\n` +
      `*Location:* %s\n\n` +
      `[View offer](%s)`
  }
};
