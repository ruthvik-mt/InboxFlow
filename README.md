# 📧 InboxFlow

An AI-powered full-stack web app to aggregate multiple email accounts into one intelligent inbox with real-time sync, smart categorization, and advanced search.

## Table of Contents

- [Introduction](#introduction)
- [Live Demo](#live-demo)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation & Running](#installation--running)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Introduction

InboxFlow solves email overload by aggregating multiple email accounts (Gmail, Outlook, etc.) into a unified dashboard with AI-driven categorization and intelligent filtering. Manage all your emails in one place and let AI prioritize what matters most.

The frontend is built using React and TypeScript, offering a fast and responsive user experience. The backend is powered by Node.js and Express, connecting to a MongoDB database. It utilizes Elasticsearch for powerful search capabilities and Cerebras AI (Llama 3.1) for intelligent email categorization.

---

## Live Demo

🌐 Visit the website: [InboxFlow](https://inbox-flow-ai.vercel.app)

---

## Features

- **Multi-Account Sync**: Connect Gmail, Outlook, and other IMAP accounts with real-time updates.
- **AI Categorization**: Automatic classification (Interested, Meeting Booked, Not Interested, Spam, Out of Office).
- **Advanced Search**: Full-text search across all emails with fuzzy matching powered by Elasticsearch.
- **Smart Notifications**: Slack alerts and webhook triggers for important emails.
- **Dashboard Overview**: Modern dark-themed interface with email stats and quick filters.

---

## Prerequisites

- Node.js v22+ – for running both the frontend and backend
- MongoDB – local or cloud instance for user and account data
- Elasticsearch 7.17+ – for the search engine
- Cerebras API Key – for AI categorization
- Slack Token – (optional) for notifications

---

## Installation & Running

### 1. Clone the Repository
```bash
git clone https://github.com/ruthvik-mt/InboxFlow.git
cd InboxFlow
```

### 2. Environment Setup
Create a `.env` file in both the `backend` and `frontend` directories based on their respective `.env.example` files with your database credentials, API keys, and JWT secret.

### 3. Manual Run

#### Backend
```bash
cd backend
npm install
npm run dev
```

#### Frontend
```bash
cd frontend
npm install
npm start
```

The frontend will be at http://localhost:3000 and the backend at http://localhost:5000.

---

## Deployment

- Frontend: Vercel (Set root directory to `frontend`)
- Backend: Render (Set root directory to `backend`)
- Database: MongoDB (Atlas or local)
- Live Site: [InboxFlow](https://inbox-flow-ai.vercel.app)

---

## Contributing

1. Fork the repository
2. Clone the repository:
   
```bash
git clone https://github.com/ruthvik-mt/InboxFlow.git
cd InboxFlow
```
3. Add remote:
```bash
git remote add origin https://github.com/ruthvik-mt/InboxFlow.git
```
4. Now, if you run `git remote -v` you should see origin pointing to your repository.

---

## License

This project is licensed under the MIT License - see the [LICENSE](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository) file for more details.

---

<div align="center">
  <strong>Made with ❤️ using Node.js, React & AI</strong>
</div>
