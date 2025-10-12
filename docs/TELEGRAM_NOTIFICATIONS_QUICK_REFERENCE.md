# Telegram Error Notifications - Quick Reference

**Date**: October 12, 2025  
**Status**: ✅ **READY FOR USE**

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Create Separate Telegram Bots

You need **separate bots** for each environment (dev, staging, prod).

#### Create Bots via @BotFather

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` command
3. Follow prompts to create bots:

**Development Bot**:
- Name: `YourApp Dev Errors` (or similar)
- Username: `yourapp_dev_errors_bot`
- Token: `1234567890:ABCdefGHIjklMNOpqrSTUvwxyz`

**Production Bot**:
- Name: `YourApp Prod Errors`
- Username: `yourapp_prod_errors_bot`  
- Token: `9876543210:ZYXwvuTSRqpONMlkjIHGfeDCBA`

💡 **Keep tokens secret!** Store them in `.env` files, never commit to git.

---

### Step 2: Get Chat/Group ID

#### For Personal Notifications
1. Start chat with [@userinfobot](https://t.me/userinfobot)
2. Bot replies with your user ID (e.g., `123456789`)

#### For Team Group Notifications (Recommended)
1. Create a Telegram group (e.g., "Dev Errors" or "Prod Alerts")
2. Add [@userinfobot](https://t.me/userinfobot) to the group
3. Bot sends the group ID (e.g., `-1001234567890`)
4. **Important**: Add your error notification bot to the group as admin or member

---

### Step 3: Configure Environment Variables

#### Development Environment

**`.env` file**:
```bash
# Development bot token
TELEGRAM_ERROR_NOTIFICATION_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUvwxyz

# Dev group chat ID
TELEGRAM_ERROR_NOTIFICATION_CHAT_ID=-1001111111111
```

#### Production Environment

**`.env` file**:
```bash
# Production bot token (different from dev!)
TELEGRAM_ERROR_NOTIFICATION_BOT_TOKEN=9876543210:ZYXwvuTSRqpONMlkjIHGfeDCBA

# Prod group chat ID
TELEGRAM_ERROR_NOTIFICATION_CHAT_ID=-1002222222222
```

---

### Step 4: Restart Server

```bash
# Restart to load new env variables
pnpm run dev
# or
npm run start:dev
```

**Check logs for**:
```
[Fiat Rate] Telegram notification bot initialized
```

---

## 📋 Configuration Summary

### Required Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `TELEGRAM_ERROR_NOTIFICATION_BOT_TOKEN` | Bot token (separate for each env) | `1234567890:ABC...` |
| `TELEGRAM_ERROR_NOTIFICATION_CHAT_ID` | Chat/Group ID to send notifications | `-1001234567890` |

### Optional - Disable Notifications

Leave both variables empty to disable:
```bash
TELEGRAM_ERROR_NOTIFICATION_BOT_TOKEN=
TELEGRAM_ERROR_NOTIFICATION_CHAT_ID=
```

---

## 🔍 Verify Setup

### Check Bot Initialization

**Look for this log on server start**:
```
[Fiat Rate] Telegram notification bot initialized
```

**If you see this instead**:
```
[Fiat Rate] TELEGRAM_ERROR_NOTIFICATION_BOT_TOKEN not configured
```
→ Add the bot token to your `.env` file

---

### Test Notifications

#### Quick Test (Simulate Primary Endpoint Failure)

```bash
# Temporarily set invalid primary URL in .env
BITCORE_URL=https://invalid.example.com/bws/api
BITCORE_URL_FALLBACK=https://aws.abcpay.cash/bws/api

# Restart and test
curl http://localhost:4800/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ getAllFiatRate { currency } }"}'
```

**Expected**:
- ✅ API returns valid data (from fallback)
- 🟡 Telegram notification: "Fallback Activated"

---

## 🎯 Notification Examples

### 🟡 Fallback Warning

```
🟡 Fiat Rate API Fallback Activated

Environment: development
Time: 2025-10-12T14:30:00.000Z

Primary URL Failed:
`https://aws-dev.abcpay.cash/bws/api`

Fallback URL Used:
`https://aws.abcpay.cash/bws/api`

Reason: All rates are zero

⚠️ Primary endpoint is experiencing issues. Please investigate.
```

### 🔴 Critical Alert

```
🔴 CRITICAL: All Fiat Rate APIs Failed

Environment: production
Time: 2025-10-12T14:30:00.000Z

All URLs Attempted:
1. `https://aws.abcpay.cash/bws/api`
2. `https://aws-dev.abcpay.cash/bws/api`

Last Error: All rates are zero

🚨 ACTION REQUIRED: Users cannot place Goods & Services orders!
```

---

## 🛠️ Troubleshooting

### Problem: No notifications received

**Check**:
1. Is `TELEGRAM_ERROR_NOTIFICATION_BOT_TOKEN` set?
2. Is `TELEGRAM_ERROR_NOTIFICATION_CHAT_ID` set?
3. Did you restart the server?
4. Is the bot added to the group (if using group chat)?
5. Check logs for errors

### Problem: "Bot was blocked by the user"

**Solution**: Unblock the bot or start a new chat with it

### Problem: "Chat not found"

**Solution**: 
- Verify chat ID using @userinfobot
- Add bot to the group if using group chat
- Make sure bot has permission to send messages

### Problem: "Forbidden: bot is not a member of the group"

**Solution**: Add the bot to the group as a member or admin

---

## 📊 Best Practices

### Environment Separation
- ✅ **DO**: Use different bots for dev/staging/prod
- ❌ **DON'T**: Use the same bot for all environments

**Why?** 
- Prevents notification confusion
- Better security (dev token leak doesn't affect prod)
- Can set different alert levels per environment

### Group Setup
- ✅ Create separate groups: "App Dev Errors", "App Prod Alerts"
- ✅ Add relevant team members to each group
- ✅ Use clear naming conventions

### Token Security
- ✅ Store tokens in `.env` files
- ✅ Add `.env` to `.gitignore`
- ✅ Use environment variables in production
- ❌ Never commit tokens to repository
- ❌ Never hardcode tokens in code

---

## 📝 Complete Configuration Example

### Development `.env`
```bash
# Existing bot (leave intact)
TELEGRAM_LOCAL_ECASH_BOT_TOKEN=7655589619:AAEqPYvim3_HPTOxuy_01_kUy0j2mNCfvQ4

# Error notification bot (DEV)
TELEGRAM_ERROR_NOTIFICATION_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUvwxyz
TELEGRAM_ERROR_NOTIFICATION_CHAT_ID=-1001111111111

# Fiat rate API
BITCORE_URL=https://aws-dev.abcpay.cash/bws/api
BITCORE_URL_FALLBACK=https://aws.abcpay.cash/bws/api

DEPLOY_ENVIRONMENT=development
```

### Production `.env`
```bash
# Existing bot (leave intact)
TELEGRAM_LOCAL_ECASH_BOT_TOKEN=<prod_bot_token>

# Error notification bot (PROD - different token!)
TELEGRAM_ERROR_NOTIFICATION_BOT_TOKEN=9876543210:ZYXwvuTSRqpONMlkjIHGfeDCBA
TELEGRAM_ERROR_NOTIFICATION_CHAT_ID=-1002222222222

# Fiat rate API
BITCORE_URL=https://aws.abcpay.cash/bws/api
BITCORE_URL_FALLBACK=https://aws-dev.abcpay.cash/bws/api

DEPLOY_ENVIRONMENT=production
```

---

## 🔗 Additional Resources

- **Full Documentation**: [BACKEND_FIAT_RATE_TELEGRAM_NOTIFICATIONS.md](./BACKEND_FIAT_RATE_TELEGRAM_NOTIFICATIONS.md)
- **Implementation Summary**: [TELEGRAM_NOTIFICATIONS_SUMMARY.md](./TELEGRAM_NOTIFICATIONS_SUMMARY.md)
- **Fallback Strategy**: [BACKEND_FIAT_FALLBACK_RECOMMENDATION.md](./BACKEND_FIAT_FALLBACK_RECOMMENDATION.md)

---

## ✅ Setup Checklist

- [ ] Created dev bot via @BotFather
- [ ] Created prod bot via @BotFather  
- [ ] Got dev group chat ID
- [ ] Got prod group chat ID
- [ ] Added dev bot token to dev `.env`
- [ ] Added prod bot token to prod `.env`
- [ ] Added chat IDs to respective `.env` files
- [ ] Restarted dev server
- [ ] Verified "bot initialized" log message
- [ ] Tested notification (optional)
- [ ] Added team members to notification groups
- [ ] Documented bot credentials securely

---

**Setup Time**: ~5 minutes  
**Status**: Ready for Production ✅
