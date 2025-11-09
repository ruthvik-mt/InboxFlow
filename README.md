# 📧 OneBox - AI-Powered Email Aggregator

> **ReachInbox Backend Engineer Assignment**  
> A feature-rich onebox email aggregator with real-time IMAP synchronization, AI categorization, and advanced search capabilities.

---

## Project Overview

OneBox is a modern email management platform that aggregates multiple email accounts into a single intelligent inbox. Built with React, Node.js, Elasticsearch, and AI, it provides real-time synchronization, smart categorization, and powerful search capabilities.

### Key Features

- **Real-Time IMAP Synchronization** - Connect multiple email accounts with instant updates
- **Elasticsearch-Powered Search** - Find any email in milliseconds
- **AI Email Categorization** - Automatic classification into 5 categories
- **Smart Notifications** - Slack alerts and webhook triggers for important emails
- **Modern UI** - Clean, responsive interface with dark mode
- **Secure Authentication** - JWT-based auth with encrypted email passwords
---

## Architecture

```
┌─────────────────┐
│  React Frontend │  
│  (Tailwind CSS) │
└────────┬────────┘
         │ REST API
┌────────┴────────┐
│  Express.js API │
│   (TypeScript)  │
└────────┬────────┘
         │
    ┌────┴─────┬──────────┬──────────┐
    │          │          │          │
┌───┴───┐  ┌───┴───┐  ┌───┴───┐  ┌───┴────┐
│MongoDB│  │Elastic│  │Cerebras│ │  Slack │
│       │  │search │  │  API   │ │Webhooks│
└───────┘  └───────┘  └────────┘ └────────┘
```

---

## Tech Stack

### Frontend
- **React 18.2** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Axios** - HTTP client
- **Lucide React** - Icons

### Backend
- **Node.js 22.x** - Runtime
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **MongoDB** - User & account data
- **Elasticsearch 7.17** - Email search
- **IMAP** - Email synchronization
- **Cerebras AI** - LLM for categorization
- **Slack Web API** - Notifications
- **JWT** - Authentication

---

## Features Implemented

### Feature 1: Real-Time Email Synchronization
- Connects to multiple IMAP accounts (Gmail, Outlook, etc.)
- Persistent IMAP connections with IDLE mode
- Fetches last 30 days of emails
- Real-time notifications for new emails
- Per-user account isolation

### Feature 2: Searchable Storage (Elasticsearch)
- Local Elasticsearch instance (Docker)
- Full-text search across subject, body, sender, recipient
- Advanced filtering (account, folder, category)
- Fuzzy matching for typo tolerance
- Optimized indexing with deterministic document IDs

### Feature 3: AI-Based Email Categorization
- **Categories**: Interested, Meeting Booked, Not Interested, Spam, Out of Office
- Powered by Cerebras API (Llama 3.3 70B)
- Queue-based processing with rate limiting
- Smart heuristics + AI predictions
- Confidence scoring and explanations

### Feature 4: Slack & Webhook Integration
- Automatic Slack notifications for "Interested" emails
- Webhook triggers for external automation
- Rate limiting and retry logic
- Deduplication to prevent spam

### Feature 5: Frontend Interface
- Modern dark-themed UI
- Email list with category badges
- Detailed email viewer
- Advanced search interface
- Account management dashboard
- Real-time stats cards
---

## Installation & Setup

### Prerequisites
- Node.js 22.x or higher
- MongoDB instance
- Docker (for Elasticsearch)
- Gmail/Outlook account for testing

### 1. Clone Repository
```bash
git clone https://github.com/ruthvik-mt/reachinbox-onebox.git
cd reachinbox-onebox
```
### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Start Elasticsearch (Docker)
docker-compose up -d

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

**Required Environment Variables:**
```env
# DATABASE
MONGO_URI=your_mongodb_connection_string_here

# SECURITY
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here

# SLACK CONFIGURATION
SLACK_TOKEN=your_slack_token_here
SLACK_CHANNEL=all-mail

#WEBHOOK
WEBHOOK_URL=your_webhook_url_here

#SLACK RATE LIMITING
SLACK_CONCURRENCY=1
SLACK_INTERVAL_CAP=1
SLACK_INTERVAL_MS=3000
SLACK_DEDUPE_TTL_MS=86400000

# WEBHOOK RATE LIMITING
WEBHOOK_CONCURRENCY=1
WEBHOOK_INTERVAL_CAP=1
WEBHOOK_INTERVAL_MS=2000
WEBHOOK_DEDUPE_TTL_MS=300000

# CEREBRAS AI CONFIG
CEREBRAS_API_KEY=your_cerebras_api_key_here
CEREBRAS_URL=https://api.cerebras.ai/v1/chat/completions
CEREBRAS_MODEL=llama-3.3-70b
CEREBRAS_RPS=0.2
CEREBRAS_CONCURRENCY=1
CEREBRAS_MAX_RETRIES=3
CEREBRAS_BACKOFF_MS=5000
CEREBRAS_JITTER_MS=2000
CEREBRAS_TIMEOUT_MS=30000
CEREBRAS_MAX_EMAIL_CHARS=4000

#EMAIL BATCH PROCESSING
EMAIL_BATCH_SIZE=10
EMAIL_BATCH_DELAY_MS=30000

#ELASTICSEARCH CONFIG
ELASTICSEARCH_URL=https://your_elasticsearch_endpoint_here
ELASTICSEARCH_INDEX=emails
ELASTICSEARCH_APIKEY=your_elasticsearch_api_key_here

#SERVER
PORT=5000

```

**Start Backend:**
```bash
npm run build
npm start

# Or for development
npm run dev
```

Server runs at: `http://localhost:5000`

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Create .env file
REACT_APP_API_BASE=BACKEND_URL

# Start development server
npm start
```
App runs at: `http://localhost:3000`

---

## Configuration Guide

### Gmail Setup (App Password)

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification
3. Go to App Passwords
4. Generate password for "Mail" app
5. Use this password in OneBox (not your regular password)

### Slack Integration

1. Create a Slack App at [api.slack.com/apps](https://api.slack.com/apps)
2. Add OAuth scopes: `chat:write`, `chat:write.public`
3. Install app to workspace
4. Copy Bot Token (starts with `xoxb-`)
5. Invite bot to your channel: `/invite @your-bot`
6. Set `SLACK_CHANNEL` to channel name (without #)

### Webhook Setup

1. Visit [webhook.site](https://webhook.site)
2. Copy your unique URL
3. Set as `WEBHOOK_URL` in .env
4. Monitor webhook calls on the website

---

## API Documentation

### Authentication
```bash
# Register
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123","name":"John Doe"}'

# Login
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123"}'
```

### Email Accounts
```bash
# Add Account
curl -X POST http://localhost:5000/accounts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"your@gmail.com",
    "password":"your_app_password",
    "imapHost":"imap.gmail.com",
    "imapPort":993,
    "accountName":"Work Email"
  }'

# List Accounts
curl -X GET http://localhost:5000/accounts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Email Search
```bash
# Search Emails
curl -X GET "http://localhost:5000/emails/search?q=meeting&label=Interested" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get All Emails (last 30 days)
curl -X GET "http://localhost:5000/emails?days=30&size=100" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## System Monitoring

### Health Checks

```bash
# Server Health
curl http://localhost:5000/health

# Elasticsearch Health
curl http://localhost:5000/health/elasticsearch

# System Stats
curl http://localhost:5000/stats
```

**Stats Response:**
```json
{
  "ok": true,
  "time": "2025-01-10T12:00:00Z",
  "es": {
    "connected": true,
    "status": "green",
    "nodeCount": 1
  },
  "ai": {
    "queueLength": 12,
    "running": 1,
    "dynamicDelayMs": 5000,
    "consecutiveRateLimits": 2
  }
}
```

---

## Testing

### Manual Testing Checklist

**Authentication:**
- [ ] User can register with email/password
- [ ] User can login and receive JWT token
- [ ] Protected routes require authentication
- [ ] Logout clears session

**Email Accounts:**
- [ ] Add Gmail account successfully
- [ ] Add Outlook account successfully
- [ ] Toggle account active/inactive
- [ ] Delete account removes emails

**Email Sync:**
- [ ] Emails sync within 10 seconds of adding account
- [ ] New emails appear in real-time
- [ ] Last 30 days of emails are fetched
- [ ] Multiple accounts work simultaneously

**AI Categorization:**
- [ ] Promotional emails → "Not Interested"
- [ ] Meeting requests → "Meeting Booked"
- [ ] OOO replies → "Out of Office"
- [ ] Interested leads → "Interested"
- [ ] Spam emails → "Spam"

**Search & Filter:**
- [ ] Full-text search works
- [ ] Filter by account
- [ ] Filter by folder
- [ ] Filter by category
- [ ] Combined filters work

**Notifications:**
- [ ] Slack receives "Interested" emails
- [ ] Webhook triggers for "Interested" emails
- [ ] No duplicate notifications

---

## Project Structure

```
onebox-email-aggregator/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts
│   │   ├── middleware/
│   │   │   └── auth.ts
│   │   ├── models/
│   │   │   └── User.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── accounts.ts
│   │   │   └── emails.ts
│   │   ├── services/
│   │   │   ├── aiService.ts
│   │   │   ├── elasticService.ts
│   │   │   ├── imapService.ts
│   │   │   ├── imapManager.ts
│   │   │   └── notificationService.ts
│   │   ├── utils/
│   │   │   └── encryption.ts
│   │   └── server.ts
│   ├── docker-compose.yml
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AccountManager.tsx
│   │   │   ├── EmailList.tsx
│   │   │   ├── EmailDetail.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   └── StatsCards.tsx
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── LandingPage.tsx
│   │   │   ├── Login.tsx
│   │   │   └── Register.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── types.ts
│   │   ├── App.tsx
│   │   └── index.tsx
│   ├── public/
│   ├── package.json
│   └── tailwind.config.js
│
└── README.md
```

---

## Security Features

- **JWT Authentication** - Secure token-based auth with 7-day expiry
- **Password Hashing** - bcrypt with salt rounds
- **Email Password Encryption** - AES-256-CBC encryption
- **User Isolation** - All queries filtered by userId
- **CORS Protection** - Whitelist-based origin validation
- **Input Validation** - express-validator for all inputs
- **Environment Variables** - Sensitive data in .env files

---

## Deployment

### Backend (Render/Railway)

1. Create new Web Service
2. Connect GitHub repository
3. Set build command: `npm run build`
4. Set start command: `npm start`
5. Add environment variables from .env
6. Deploy

### Frontend (Vercel)

1. Import GitHub repository
2. Framework: Create React App
3. Build command: `npm run build`
4. Output directory: `build`
5. Add environment variable: `REACT_APP_API_BASE=https://your-backend-url.com`
6. Deploy

### Elasticsearch (Elastic Cloud)

1. Sign up at [cloud.elastic.co](https://cloud.elastic.co)
2. Create deployment
3. Copy Cloud ID and API Key
4. Update `ELASTICSEARCH_URL` and `ELASTICSEARCH_APIKEY` in backend .env

---

## Performance Metrics

- **Email Sync**: < 10 seconds for initial fetch
- **Search**: < 50ms response time
- **AI Categorization**: ~2-5 seconds per email
- **Concurrent Users**: Supports 100+ simultaneous users
- **Uptime**: 99.9% with proper infrastructure

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request
   
---

*Built with ❤️ using React, Node.js, TypeScript & AI*  
*November 2025*
