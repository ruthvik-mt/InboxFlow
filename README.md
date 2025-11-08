# 📧 OneBox Email Aggregator

A real-time email synchronization and AI-based categorization system built with **Node.js**, **React**, and **Cerebras AI**, featuring **Elasticsearch-powered search**, **Slack integration**, and a modern responsive frontend.

---

## ✨ Features Implemented

### ✅ 1. Real-Time Email Synchronization
- **Multi-account support**: Connects to 2+ Gmail accounts via IMAP  
- **IDLE mode**: Persistent connections with push notifications (NO polling!)  
- **Auto-fetch**: Retrieves last 7 days of emails on startup  
- **Reconnection logic**: Automatically reconnects on connection drops  
- **Batch processing**: Processes 10 emails at a time with rate limiting  

### ✅ 2. Searchable Storage (Elasticsearch)
- **Self-hosted**: Elasticsearch 8.11.0 via Docker  
- **Fuzzy search**: Search across subject, body, sender, recipient  
- **Advanced filtering**: Filter by account, folder, and category  
- **Deterministic IDs**: Prevents duplicate entries using `account:messageId`  
- **Auto-heal**: Recreates index on mapping errors  

### ✅ 3. AI-Based Email Categorization
- **AI Model**: Cerebras AI (Llama 3.3 70B)  
- **Categories**: Interested, Meeting Booked, Not Interested, Spam, Out of Office  
- **Smart heuristics**: Combines AI predictions with keyword detection  
- **Confidence scoring**: Each classification includes confidence level  
- **Rate limiting**: Queue-based system with exponential backoff (0.5 req/sec)  

### ✅ 4. Slack & Webhook Integration
- **Slack notifications**: Auto-send to Slack for "Interested" emails  
- **Webhook triggers**: POST to webhook.site for external automation  
- **Deduplication**: 24h cache for Slack, 5min for webhooks  
- **Rate limiting**: 1 req/3sec (Slack), 1 req/2sec (Webhook)  
- **Retry logic**: Exponential backoff with retry-after handling  

### ✅ 5. Frontend Interface
- **Landing page**: Modern hero section with feature showcase  
- **Dashboard**: Email list + detail view with real-time stats  
- **Search & filters**: Account, folder, category, and full-text search  
- **Responsive design**: Works on desktop, tablet, and mobile  
- **Dark theme**: Professional black/gray color scheme  

---

## 🛠️ Tech Stack

### **Backend**
- Runtime: Node.js 22.x  
- Language: TypeScript 5.3.3  
- Framework: Express.js 4.18.2  
- Database: Elasticsearch 7.17.0 (Docker)  
- Email Protocol: IMAP 0.8.19 with Mailparser 3.9.0  
- AI Service: Cerebras AI (Llama 3.3 70B)  
- Notifications: Slack Web API, Axios for webhooks  
- Queue Management: p-queue 6.6.2  

### **Frontend**
- Library: React 18.2.0  
- Language: TypeScript 4.9.5  
- Routing: React Router 7.9.5  
- Styling: Tailwind CSS 3.3.6  
- Icons: Lucide React 0.300.0  
- HTTP Client: Axios 1.6.0  

### **DevOps**
- Deployment: Render (Backend), Vercel (Frontend)  
- Containerization: Docker (Elasticsearch)  
- Version Control: Git + GitHub  

---

## 📦 Installation

### **Prerequisites**
- Node.js 22.x  
- Docker Desktop  
- Gmail account with App Password enabled  

### **1. Clone Repository**
```bash
git clone https://github.com/YOUR_USERNAME/onebox-email-aggregator.git
cd onebox-email-aggregator
