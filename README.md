# 📧 MailBot – Subscription Manager

MailBot is a full-stack web application for managing domain and service subscriptions, tracking expiry dates, and sending automated email reminders.

## 🚀 Features

- AI-powered email template generation
- Automated subscription reminder emails
- Email verification & JWT authentication
- Multiple recipient support
- SMTP configuration management
- Dashboard with analytics and charts
- Subscription categories and renewal cycles
- Responsive modern UI

## 🛠 Tech Stack

### Frontend
- React.js
- Tailwind CSS
- React Router
- Axios
- Recharts

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- Nodemailer
- Node Cron

### AI Integration
- Google Gemini API

## 📂 Project Structure

```bash
mailbot/
├── backend/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── middleware/
│   └── server.js
│
├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│   └── App.jsx
│
└── README.md
```

## ⚙️ Installation

### Clone Repository

```bash
git clone https://github.com/yourusername/mailbot.git
cd mailbot
```

### Backend Setup

```bash
cd backend
npm install
npm start
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## 🔧 Environment Variables

Create a `.env` file inside the backend folder.

```env
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@gmail.com
SMTP_PASS=your_app_password        # Use Gmail App Password, not your real password
SMTP_FROM_NAME=MailBot
SMTP_FROM_EMAIL=you@gmail.com

FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

> **Gmail tip**: Enable 2FA on your Google account, then generate an App Password at myaccount.google.com/apppasswords

### Frontend `.env`

```env
VITE_API_URL=http://localhost:5000/api
```

---

## Features

### Authentication
- Email + password login / register
- JWT tokens stored in localStorage
- First registered user is automatically **admin**
- Role-based access (admin can trigger cron manually)

### Subscriptions
- Full CRUD for domain subscriptions
- Fields: domain, registrar, owner, email, expiry date, notes, auto-renew
- Per-subscription reminder intervals (e.g. 30, 15, 7, 1 days)
- Toggle notifications per subscription
- One-click test email send
- Status: `active` / `expiring_soon` / `expired`

### Email Templates
- Create HTML + plain-text templates
- Variable substitution: `{{domain}}`, `{{owner}}`, `{{expiryDate}}`, `{{days}}`, `{{registrar}}`
- Types: `reminder_30`, `reminder_15`, `reminder_7`, `reminder_1`, `expired`, `custom`
- Set a default template per type
- **Seed Defaults** button creates 4 ready-to-use templates instantly

### Email Logs
- Every sent/failed email is logged
- Filter by status: sent / failed / pending
- Search by address, subject, domain
- Shows trigger source: `cron` / `manual` / `test`

### Dashboard
- Stats: total, active, expiring soon, expired
- Upcoming expiries (next 30 days)
- Recently added domains

### Settings
- SMTP connection test
- Manual cron trigger (admin only)
- Account info display

### Dark Mode
- Auto-detects system preference
- Toggle via sidebar button
- Persisted in localStorage

---

## Deployment

### Backend (e.g. Railway, Render, Fly.io)
1. Set all environment variables in the platform dashboard
2. Set `NODE_ENV=production`
3. Start command: `node server.js`

### Frontend (e.g. Vercel, Netlify)
1. Set `VITE_API_URL` to your deployed backend URL
2. Build command: `npm run build`
3. Output directory: `dist`

# MailBot-Domain-Subscription-Manager-2
