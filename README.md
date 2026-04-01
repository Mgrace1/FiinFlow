# FiinFlow

FiinFlow is a full‑stack financial management system for SMEs covering invoicing, expenses, client management, reporting, and forecasting.

## Links
- Web App: `https://fiin-flow-ten.vercel.app/`
- GitHub: `https://github.com/Mgrace1/FiinFlow`
- Figma: `https://www.figma.com/design/yapiSji6t6Os4YcfA6nFYD/FiinFlow?node-id=0-1&t=dlf2CSHwS3UtxxRR-1`
- Demo Video: `https://drive.google.com/file/d/16EjS8xrVjodrfRsqI4Tk6yAKf5lh-unl/view?usp=drivesdk`

## Services
- `frontend/` — React + Vite web app
- `backend/` — Express + TypeScript API
- `backend/forecasting_service/` — Python Flask forecasting service

## Features
- Role‑based access
- Clients, invoices, expenses
- File uploads and attachments
- Email notifications
- Reports and dashboards
- 90‑day forecasting

## Environment Setup
Use the provided `.env.example` files and create local `.env` files from them. Do not hardcode secrets in this README.

## Run Locally (Step‑by‑Step)
1. Backend API
```bash
cd backend
npm install
npm run dev
```

2. Forecasting service
```bash
cd backend/forecasting_service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py port --5001
```

3. Frontend
```bash
cd frontend
npm install
npm run devtry to m
```

## Local URLs
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000/api`
- Swagger: `http://localhost:5000/api/docs`
- Forecasting: `http://localhost:5001/health`


### Dashboard
Description: Overview of KPIs, cashflow trends, and recent activity.

### Generated Report
Description: Financial summary with charts and key metrics.


### Forecasting
Description: 90‑day forecast with risk indicators and insights.


### Invoice
Description: Invoice detail view and actions (PDF, status updates, receipts).

