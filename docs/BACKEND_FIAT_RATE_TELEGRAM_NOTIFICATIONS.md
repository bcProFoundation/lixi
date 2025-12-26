# Fiat Rate API - Telegram Error Notifications

**Date**: October 12, 2025  
**Status**: ✅ **IMPLEMENTED**  
**Priority**: 🟡 **MONITORING & ALERTING**

---

## 📋 Overview

To prevent the fallback mechanism from silently hiding API errors, we've implemented **Telegram notifications** that alert the team when:

1. 🟡 **Fallback is Used**: Primary API fails, but fallback succeeds
2. 🔴 **All Endpoints Fail**: Critical - all APIs return zero rates or fail

This ensures visibility into API health even when the system continues to function via fallback.

---

## 🎯 Notification Types

### 1. Fallback Activated (⚠️ Warning)

**Trigger**: Primary URL fails/returns zeros, but fallback URL succeeds

**Message Example**:
```
🟡 Fiat Rate API Fallback Activated

Environment: production
Time: 2025-10-12T14:30:00.000Z

Primary URL Failed:
`https://aws-dev.abcpay.cash/bws/api/v3/fiatrates/`

Fallback URL Used:
`https://aws.abcpay.cash/bws/api/v3/fiatrates/`

Reason: All rates are zero

⚠️ Primary endpoint is experiencing issues. Please investigate.
```

**Action Required**: 
- ⚠️ Investigate primary endpoint
- Check logs for root cause
- May not be urgent if fallback is working

---

### 2. All Endpoints Failed (🚨 Critical)

**Trigger**: All configured endpoints fail or return zero rates

**Message Example**:
```
🔴 CRITICAL: All Fiat Rate APIs Failed

Environment: production
Time: 2025-10-12T14:30:00.000Z

All URLs Attempted:
1. `https://aws.abcpay.cash/bws/api/v3/fiatrates/`
2. `https://aws-dev.abcpay.cash/bws/api/v3/fiatrates/`

Last Error: All rates are zero

🚨 ACTION REQUIRED: Users cannot place Goods & Services orders!
```

**Action Required**:
- 🚨 **URGENT** - Service is down
- Users cannot place orders
- Investigate all endpoints immediately
- Check external API provider status

---

## 🔧 Configuration

### Environment Variable

Add to your `.env` file:

```bash
# Telegram Error Notifications
# Chat ID for receiving error notifications
# Get from @userinfobot (Telegram bot) or group info
TELEGRAM_ERROR_NOTIFICATION_CHAT_ID=
```

### Getting Chat ID

#### For Private Chat (Personal Notifications)
1. Start a chat with [@userinfobot](https://t.me/userinfobot) on Telegram
2. Send any message
3. Bot will reply with your user ID (e.g., `123456789`)
4. Use this ID in the config

#### For Group Chat (Team Notifications)
1. Create a Telegram group
2. Add [@userinfobot](https://t.me/userinfobot) to the group
3. Bot will send the group ID (e.g., `-1001234567890`)
4. Use this ID in the config
5. Remove the bot from the group (optional)

**Alternative Method**:
1. Add your bot to the group
2. Send a message in the group
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Look for `"chat":{"id":-1001234567890}` in the response

#### For Channel (Broadcast Notifications)
1. Create a Telegram channel
2. Add your bot as an administrator
3. Get channel ID using similar method as group

---

## 📝 Configuration Examples

### Development Environment
```bash
# .env
DEPLOY_ENVIRONMENT=development
BITCORE_URL=https://aws-dev.abcpay.cash/bws/api
BITCORE_URL_FALLBACK=https://aws.abcpay.cash/bws/api

# Send to personal chat
TELEGRAM_ERROR_NOTIFICATION_CHAT_ID=123456789
```

### Production Environment
```bash
# .env
DEPLOY_ENVIRONMENT=production
BITCORE_URL=https://aws.abcpay.cash/bws/api
BITCORE_URL_FALLBACK=https://aws-dev.abcpay.cash/bws/api

# Send to team group
TELEGRAM_ERROR_NOTIFICATION_CHAT_ID=-1001234567890
```

### Disable Notifications
```bash
# Leave empty or remove the variable
TELEGRAM_ERROR_NOTIFICATION_CHAT_ID=
```

---

## 🔍 Implementation Details

### Code Location
**File**: `packages/app-lixi-api/src/modules/escrow/fiat-currency-rate/fiatCurrencyRate.resolver.ts`

### Key Method
```typescript
private async sendTelegramErrorNotification(
  errorType: 'FALLBACK_USED' | 'ALL_ENDPOINTS_FAILED',
  details: {
    primaryUrl?: string;
    failedUrls?: string[];
    successUrl?: string;
    errorMessage?: string;
    timestamp?: string;
  }
): Promise<void>
```

### Flow Diagram

```
getAllFiatRate()
  ↓
Try Primary URL
  ↓
  ├─ Success → Return data ✅
  ├─ Zero rates or fail
  │   ↓
  │   Try Fallback URL
  │   ↓
  │   ├─ Success → Send "FALLBACK_USED" notification 🟡 → Return data ✅
  │   └─ Zero rates or fail
  │       ↓
  │       All URLs failed → Send "ALL_ENDPOINTS_FAILED" notification 🔴 → Throw error ❌
```

### Error Handling
- Notification failures are logged but **don't break** the main flow
- If Telegram bot is unavailable, the API continues to function
- Notifications are fire-and-forget (async, no waiting)

---

## 🧪 Testing

### Test Fallback Notification

**Simulate Primary Endpoint Failure**:
```bash
# Temporarily set primary to invalid URL
BITCORE_URL=https://invalid.example.com/bws/api
BITCORE_URL_FALLBACK=https://aws.abcpay.cash/bws/api
TELEGRAM_ERROR_NOTIFICATION_CHAT_ID=<your_chat_id>

# Restart server and call API
curl http://localhost:4800/graphql -d '{"query":"{ getAllFiatRate { currency } }"}'
```

**Expected**:
- ✅ API returns valid data (from fallback)
- 🟡 Telegram notification sent: "Fallback Activated"

---

### Test Critical Notification

**Simulate All Endpoints Failing**:
```bash
# Set all URLs to invalid
BITCORE_URL=https://invalid1.example.com/bws/api
BITCORE_URL_FALLBACK=https://invalid2.example.com/bws/api
TELEGRAM_ERROR_NOTIFICATION_CHAT_ID=<your_chat_id>

# Restart server and call API
curl http://localhost:4800/graphql -d '{"query":"{ getAllFiatRate { currency } }"}'
```

**Expected**:
- ❌ API returns GraphQL error
- 🔴 Telegram notification sent: "CRITICAL: All Fiat Rate APIs Failed"

---

### Test Without Chat ID

```bash
# Remove chat ID
TELEGRAM_ERROR_NOTIFICATION_CHAT_ID=

# Restart and test
curl http://localhost:4800/graphql -d '{"query":"{ getAllFiatRate { currency } }"}'
```

**Expected**:
- ✅ API works normally
- ℹ️ Log message: "TELEGRAM_ERROR_NOTIFICATION_CHAT_ID not configured, skipping notification"
- No Telegram messages sent

---

## 📊 Monitoring & Logging

### Log Messages

**Notification Sent**:
```
[Fiat Rate] Telegram notification sent to chat 123456789
```

**Chat ID Not Configured**:
```
[Fiat Rate] TELEGRAM_ERROR_NOTIFICATION_CHAT_ID not configured, skipping notification
```

**Notification Failed**:
```
[Fiat Rate] Failed to send Telegram notification: Unauthorized
```

### What to Monitor

1. **Frequency of "FALLBACK_USED" notifications**
   - Occasional: Normal (temporary network issues)
   - Frequent: Primary endpoint has issues - investigate

2. **"ALL_ENDPOINTS_FAILED" notifications**
   - 🚨 Always investigate immediately
   - Service is degraded
   - Users cannot place orders

3. **No notifications but logs show issues**
   - Check if `TELEGRAM_ERROR_NOTIFICATION_CHAT_ID` is set
   - Verify bot token is valid
   - Check bot permissions

---

## 🚀 Deployment Checklist

### Before Deploying

- [ ] Add `TELEGRAM_ERROR_NOTIFICATION_CHAT_ID` to environment config
- [ ] Test notification in staging environment
- [ ] Verify bot has permission to send messages to chat/group
- [ ] Document the chat/group in team wiki

### After Deploying

- [ ] Trigger a test notification (optional - use invalid URL temporarily)
- [ ] Monitor logs for successful notification delivery
- [ ] Add team members to notification group if using group chat
- [ ] Set up monitoring alerts for critical notifications (optional)

---

## 🔒 Security Considerations

### Bot Token Security
- ✅ Bot token is already in `.env` (not committed to git)
- ✅ Use environment variables in production
- ❌ Never hardcode tokens in code

### Chat ID Privacy
- Chat IDs are not sensitive (public groups have discoverable IDs)
- However, still use environment variables for flexibility
- Don't commit actual chat IDs to repository

### Rate Limiting
- Telegram API has rate limits (30 messages/second per bot)
- Our implementation sends max 1 notification per API call
- Not a concern for normal usage

---

## 📈 Benefits

### Before Notifications
- ❌ Fallback silently hides errors
- ❌ No visibility into API health
- ❌ Primary endpoint issues go unnoticed
- ❌ Reactive - only discover issues when everything fails

### After Notifications
- ✅ Immediate visibility into failures
- ✅ Proactive monitoring of primary endpoint
- ✅ Early warning before total failure
- ✅ Can investigate during business hours (not 3 AM emergencies)
- ✅ Transparent for debugging

---

## 🔗 Related Documentation

- [BACKEND_FIAT_FALLBACK_RECOMMENDATION.md](./BACKEND_FIAT_FALLBACK_RECOMMENDATION.md)
- [BACKEND_FIAT_RATE_ZERO_RATE_FIX.md](./BACKEND_FIAT_RATE_ZERO_RATE_FIX.md)
- [DEPLOYMENT_FIAT_RATE_CONFIG.md](./DEPLOYMENT_FIAT_RATE_CONFIG.md)

---

## 📞 Support

### Common Issues

**Issue**: "Bot was blocked by the user"
- **Cause**: You blocked the bot or deleted the chat
- **Fix**: Unblock bot and send a message to re-establish chat

**Issue**: "Chat not found"
- **Cause**: Incorrect chat ID or bot not added to group
- **Fix**: Verify chat ID using @userinfobot, add bot to group

**Issue**: "Forbidden: bot is not a member of the group"
- **Cause**: Bot was removed from group
- **Fix**: Add bot back to group as admin or member

**Issue**: No notifications received
- **Cause**: Chat ID not configured
- **Fix**: Set `TELEGRAM_ERROR_NOTIFICATION_CHAT_ID` in .env

---

**Implementation Date**: October 12, 2025 ✅  
**Status**: Ready for Production 🚀
