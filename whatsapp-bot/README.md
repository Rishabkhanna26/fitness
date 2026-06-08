# FitNation WhatsApp Bot

A WhatsApp chatbot for the FitNation Gym CRM that automatically answers questions about gym timing, membership plans, and diet plans using AI (OpenRouter).

## Setup

### 1. Prerequisites

- Node.js 16+
- WhatsApp account (any type — personal or business)
- OpenRouter API key (get from https://openrouter.ai)

### 2. Install Dependencies

```bash
cd whatsapp-bot
npm install
```

### 3. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

**Required fields:**
- `OPENROUTER_API_KEY` — Your OpenRouter API key for AI responses
- `SUPABASE_URL` — Same as your Next.js app
- `SUPABASE_API_URL` — Same as your Next.js app
- `SUPABASE_ANON_KEY` — Same as your Next.js app
- `BOT_PORT` — Port the bot listens on (default: 3001)
- `BOT_SECRET` — Shared secret with Next.js app

Also set these in your **Next.js `.env.local`**:
```
WHATSAPP_BOT_URL=http://localhost:3001
WHATSAPP_BOT_SECRET=your-bot-secret-here
```

### 4. Run the Bot

```bash
npm start
```

For development with hot-reload:
```bash
npm run dev
```

You should see:
```
🤖 FitNation WhatsApp Bot Service running on port 3001
   State: idle
   OpenRouter: configured ✓
```

### 5. Login with Pairing Code

- Go to Settings → WhatsApp Chatbot in your FitNation admin panel
- Enter your WhatsApp phone number (with country code, e.g. 919876543210)
- You'll receive a **pairing code** on your WhatsApp app
- Follow the "Link a Device" instructions on your phone
- Once confirmed, the bot is ready

## How It Works

1. **Code-based Login** — Uses WhatsApp Web's official pairing flow (no QR codes needed for admin)
2. **Message Handling** — When someone messages the bot:
   - Loads gym context (timing, pricing, diet plans) from Supabase settings
   - Sends the message + gym context to OpenRouter AI (gpt-4o-mini)
   - Replies with AI-generated response about the gym
3. **Conversation History** — Keeps last 10 message pairs per user for context
4. **Ignored Messages** — Ignores group chats, status broadcasts, and self-messages

## API Endpoints

All endpoints require `x-bot-secret` header.

### GET `/health`
Health check.

### GET `/status`
Returns current bot state:
```json
{
  "state": "ready",
  "hasPairingCode": false,
  "pairingCode": null,
  "phone": "919876543210"
}
```

States: `idle`, `waiting_code`, `authenticated`, `ready`, `auth_failed`, `offline`

### POST `/start-pairing`
Initiate pairing with a phone number.

Request:
```json
{ "phone": "919876543210" }
```

Response:
```json
{
  "success": true,
  "state": "waiting_code",
  "pairingCode": "ABC12345"
}
```

### POST `/disconnect`
Logout and reset the bot.

### POST `/send`
Send a test message (admin only).

Request:
```json
{ "to": "919876543210", "message": "Hello!" }
```

## Troubleshooting

### Bot not connecting
- Check `OPENROUTER_API_KEY` is valid
- Verify `BOT_SECRET` matches between bot and Next.js
- Check bot service is running on the correct port
- Look at bot logs for errors

### Pairing code not received
- Make sure you're entering the correct phone number
- WhatsApp might take 10-15s to send the code
- Check your WhatsApp app for a notification about device linking

### No responses to messages
- Make sure OpenRouter API is working (check https://openrouter.ai)
- Check bot logs for AI errors
- Verify gym settings are saved (timing, pricing, diet plans)

### Bot replies with "please configure OpenRouter API key"
- You forgot to set `OPENROUTER_API_KEY` in `.env`
- Restart the bot after setting the key

## Architecture

```
┌─────────────────────┐
│   Next.js Admin     │
│   (Settings UI)     │
└──────────┬──────────┘
           │ POST /api/whatsapp/start-pairing
           │ GET /api/whatsapp/status
           │ POST /api/whatsapp/disconnect
           ↓
┌─────────────────────────────────┐
│  Next.js API Routes             │
│  (Proxies to bot service)       │
└──────────┬──────────────────────┘
           │ HTTP (localhost:3001)
           ↓
┌─────────────────────────────────┐
│  WhatsApp Bot Service (Node.js) │
│  • whatsapp-web.js              │
│  • Express server               │
│  • Manages client session       │
└──────────┬──────────────────────┘
           │ Answers WhatsApp messages
           │ Queries OpenRouter AI
           │ Fetches gym data from Supabase
           ↓
┌──────────────────────────────────┐
│ WhatsApp Web + OpenRouter + DB   │
└──────────────────────────────────┘
```

## Notes

- The bot authenticates using WhatsApp Web's pairing code (no automated QR scanning)
- Session data is stored in `wwebjs_auth/` directory
- Conversation history is in-memory (lost on restart)
- For production, consider persisting history to a database
- The bot only handles text messages
- Media (images, files) are ignored

## License

Part of FitNation Gym CRM
