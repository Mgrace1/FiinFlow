# FinFlow

FinFlow is a full‑stack financial management system for small and Medium Enterpises(SMEs). It covers invoicing, expenses, client management, reporting, and forecasting, with a web UI and a REST API.

This repo contains three services:
- `frontend/`: React + Vite web app.
- `backend/`: Express + TypeScript REST API.
- `backend/forecasting_service/`: Python Flask service for cash‑flow forecasting.


# LIVE LINKS


  GITHUB REPO
- [https://github.com/Mgrace1/FinFlow.git]() Remote repository

FIGMA LINK

-https://www.figma.com/design/YxZRrdptNzkIIRlJMqRqZa/FinFlow?node-id=0-1&t=S3WiNSNfm4cj1XiU-1 Figma link
  
  

## Tech Stack

Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Chart.js + Recharts

Backend
- Node.js + Express + TypeScript
- MongoDB + Mongoose
- Swagger (OpenAPI)
- JWT authentication
- Nodemailer (SMTP email)
- Multer (file uploads)
- Cron jobs (overdue invoices)
- Gemini AI (receipt extraction)
- KPay integration

Forecasting service
- Python + Flask
- Prophet (time‑series forecasting)
- Pandas + PyMongo

## Features

- Company workspaces and role‑based access (admin, finance_manager, staff)
- Clients, invoices, and expenses tracking
- File uploads and attachments
- Email notifications (welcome, invites, password reset, invoice updates)
- AI receipt parsing (Gemini)
- Forecasting (90‑day cash‑flow projection)
- Dashboard analytics and reporting
- Swagger API docs at `http://localhost:5000/api/docs`


## Environment Setup

### Backend (`backend/.env`)

Create `backend/.env` with:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/finflow
JWT_SECRET=replace-with-a-strong-secret

# Email (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-email-password-or-app-password
EMAIL_FROM="FinFlow Support" <noreply@finflow.com>

# Frontend base URL for links in emails
FRONTEND_URL=http://localhost:5173

# Optional integrations
GEMINI_API_KEY=your-gemini-api-key
KPAY_API_KEY=your-kpay-api-key
KPAY_USERNAME=your-kpay-username
KPAY_PASSWORD=your-kpay-password
KPAY_RETAILER_ID=your-kpay-retailer-id

# Forecasting service (optional override)
FORECASTING_SERVICE_URL=http://localhost:5001
```

### Frontend (`frontend/.env`)

Create `frontend/.env` with:

```env
VITE_API_URL=http://localhost:5000/api
```

### Forecasting Service (`backend/forecasting_service/.env`)

Create `backend/forecasting_service/.env` with:

```env
MONGODB_URI=mongodb://localhost:27017/finflow
PORT=5001
```

## Install & Run (Local)

```bash
cd backend
npm install
npm run dev
```

3. Forecasting service (optional but required for `/api/forecasting`)

```bash
cd backend/forecasting_service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

4. Frontend

```bash
cd frontend
npm install
npm run dev
```

App URLs:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000/api`
- Swagger: `http://localhost:5000/api/docs`
- Forecasting: `http://localhost:5001/health`

## Seed Dashboard Data

If your dashboard charts are empty, you can generate sample clients, invoices, and expenses:

```bash
cd backend
npm run seed:dashboard
```

Optional targeting:

```bash
npm run seed:dashboard -- --companyId=YOUR_COMPANY_ID
npm run seed:dashboard -- --companyEmail=company@example.com
```

The seed script populates recent months of data and can be re-run safely.
