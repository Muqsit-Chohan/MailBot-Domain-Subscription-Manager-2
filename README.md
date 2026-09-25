# MailMate - Domain and Subscription Manager

MailMate is a full-stack web application for managing domains, hosting services, SSL certificates, email services, SaaS tools, and other digital subscriptions. Users can track expiry dates, configure reminders, and receive automated renewal notifications.

## Features

- User registration, login, email verification, and password reset
- JWT authentication and bcrypt password hashing
- Admin and regular-user roles
- Create, edit, search, filter, and delete subscriptions
- Domain, Hosting, SSL, and Custom subscription types
- Monthly, Quarterly, Yearly, and Custom renewal cycles
- Cost, currency, owner, multiple recipient, auto-renew, and notes support
- Active, expiring-soon, and expired statuses
- Custom reminder intervals
- CSV import and export
- WHOIS/RDAP domain lookup
- SSL/TLS certificate inspection
- Dashboard statistics, charts, cost projections, and upcoming expiries
- SMTP configuration, test emails, and automated reminder emails
- HTML and plain-text email templates
- Email delivery logs
- AI-generated templates with Google Gemini
- Slack, Discord, and generic webhook notifications
- Responsive UI, dark mode, animated landing page, and smooth scrolling navbar
- Local Privacy Policy and Terms & Conditions pages

## Technology Stack

### Frontend

- React 19 and Vite
- React Router
- Tailwind CSS
- Axios
- Framer Motion
- GSAP and Lenis
- Recharts
- Lucide React

### Backend

- Node.js and Express.js
- MongoDB and Mongoose
- JWT and bcryptjs
- Nodemailer
- node-cron
- express-validator

### Integrations

- Google Gemini API for AI email templates
- SMTP for email delivery
- DNS, WHOIS/RDAP, and TLS certificate inspection
- Slack, Discord, and generic webhooks

## How It Works

```text
React Frontend
      |
      | Axios REST API requests
      v
Express Backend
      |
      | JWT authentication and validation
      v
MongoDB Database
      |
      v
Daily Cron Service
      |
      +--> SMTP reminder emails
      +--> Webhook notifications
      +--> Email delivery logs
```

The scheduler runs every day at **8:00 AM UTC**. It checks configured subscription reminder intervals and sends an email when a subscription reaches one of those intervals.

## Project Structure

```text
MailMate/
├── backend/
│   ├── middleware/auth.js
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── server.js
├── frontend/
│   ├── public/mailmateLogo.svg
│   ├── src/components/
│   ├── src/context/
│   ├── src/pages/
│   ├── src/App.jsx
│   └── index.html
└── README.md
```

## Frontend Routes

| Route | Description |
|---|---|
| `/` | Public landing page |
| `/login` | Login and registration |
| `/verify-email` | Email verification |
| `/reset-password` | Password reset |
| `/dashboard` | Dashboard analytics |
| `/subscriptions` | Subscription management |
| `/templates` | Email template management |
| `/logs` | Email delivery logs |
| `/settings` | SMTP, webhook, and scheduler settings |
| `/privacy-policy` | Privacy Policy |
| `/terms-and-conditions` | Terms & Conditions |

Protected pages require authentication.

## Backend API

```text
POST /api/auth/register              POST /api/auth/login
GET  /api/auth/verify-email          POST /api/auth/forgot-password
POST /api/auth/reset-password        GET  /api/auth/me
PUT  /api/auth/profile

GET    /api/subscriptions            POST   /api/subscriptions
GET    /api/subscriptions/:id        PUT    /api/subscriptions/:id
DELETE /api/subscriptions/:id        GET    /api/subscriptions/stats
POST   /api/subscriptions/lookup     GET    /api/subscriptions/export-csv
POST   /api/subscriptions/import-csv POST   /api/subscriptions/:id/send-test

GET    /api/templates                POST   /api/templates
PUT    /api/templates/:id            DELETE /api/templates/:id
POST   /api/templates/seed-defaults  POST   /api/templates/generate

GET    /api/logs                     GET    /api/logs/stats
DELETE /api/logs/:id

GET    /api/settings/smtp            PUT    /api/settings/smtp
POST   /api/settings/test-email      POST   /api/settings/test-webhook
POST   /api/settings/run-cron

GET    /health
```

## Database Models

- `User` - user accounts, roles, verification, and webhook settings
- `Subscription` - domains and service subscriptions
- `Template` - reusable HTML and text email templates
- `EmailLog` - sent, failed, and pending email records
- `SmtpSettings` - user SMTP configuration
- `PendingVerification` - temporary registration verification data

## Installation

### Requirements

- Node.js 18 or newer
- MongoDB local instance or MongoDB Atlas
- SMTP account for email delivery
- Google Gemini API key for AI generation

Install dependencies from the project root:

```bash
npm run install:all
```

## Environment Variables

Create `backend/.env`:

```env
MONGODB_URI=mongodb://localhost:27017/mailbot
JWT_SECRET=replace_with_a_secure_random_secret
JWT_EXPIRES_IN=7d
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@example.com
SMTP_PASS=your_smtp_app_password
SMTP_FROM_NAME=MailMate
SMTP_FROM_EMAIL=your_email@example.com

GEMINI_API_KEY=your_gemini_api_key
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Never commit real credentials, API keys, SMTP passwords, JWT secrets, or database URLs. Gmail users should use an App Password.

## Running the Application

Start the backend in one terminal:

```bash
npm run dev:backend
```

Start the frontend in another terminal:

```bash
npm run dev:frontend
```

Default URLs:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:5000
Health:   http://localhost:5000/health
```

Build the frontend:

```bash
npm run build
```

Production files are generated in `frontend/dist`.

## Presentation Demo Flow

1. Register or log in.
2. Open the dashboard.
3. Add a domain or subscription.
4. Set expiry date and reminder intervals.
5. Run domain and SSL lookup.
6. Create or generate an AI email template.
7. Configure SMTP settings.
8. Send a test email.
9. View Email Logs and dashboard analytics.
10. Demonstrate dark mode, Privacy Policy, and Terms & Conditions.

## Production Considerations

Before production deployment, review user-level data isolation for subscriptions and logs, protect admin-only operations with `adminOnly`, verify the manual cron service reference, encrypt stored SMTP passwords, add rate limiting, configure security headers, and enable strict CORS settings.

## License

This project is currently private and does not define a public open-source license.
