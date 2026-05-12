# MailBot — Domain Subscription Manager

A full-stack web app for managing domain subscriptions with automated email reminders.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Database | MongoDB (Mongoose) |
| Email | Nodemailer |
| Auth | JWT + bcrypt |
| Scheduling | node-cron (daily @ 8 AM UTC) |

---

## Project Structure

```
mailbot/
├── backend/
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express route handlers
│   ├── services/        # emailService, cronService
│   ├── middleware/       # JWT auth guard
│   └── server.js
└── frontend/
    └── src/
        ├── components/  # Layout, Modal, SubscriptionForm
        ├── context/     # AuthContext, ThemeContext
        ├── lib/         # Axios instance
        └── pages/       # Dashboard, Subscriptions, Templates, Logs, Settings
```

---

## Quick Start

### 1. MongoDB
Make sure MongoDB is running locally, or use a cloud URI (MongoDB Atlas).

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and SMTP credentials
npm install
npm run dev
# Runs on http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# VITE_API_URL=http://localhost:5000/api
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## Environment Variables

### Backend `.env`

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/mailbot
JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRES_IN=7d

# SMTP (Gmail example)
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

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET  | `/api/auth/me` | Get current user |
| GET  | `/api/subscriptions` | List subscriptions |
| GET  | `/api/subscriptions/stats` | Dashboard stats |
| POST | `/api/subscriptions` | Create subscription |
| PUT  | `/api/subscriptions/:id` | Update subscription |
| DELETE | `/api/subscriptions/:id` | Delete subscription |
| POST | `/api/subscriptions/:id/send-test` | Send test reminder |
| GET  | `/api/templates` | List templates |
| POST | `/api/templates` | Create template |
| POST | `/api/templates/seed-defaults` | Seed 4 default templates |
| GET  | `/api/logs` | List email logs |
| GET  | `/api/logs/stats` | Log statistics |
| POST | `/api/settings/test-email` | Test SMTP connection |
| POST | `/api/settings/run-cron` | Manually run reminder check (admin) |

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
# MailBot-Domain-Subscription-Manager
# MailBot-Domain-Subscription-Manager-2
