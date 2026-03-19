# FiinFlow

FiinFlow is a full‑stack financial management system for SMEs covering invoicing, expenses, client management, reporting, and forecasting.

## Links
- Web App: https://fiin-flow-ten.vercel.app 
- GitHub: https://github.com/Mgrace1/FiinFlow.git 
- Figma: https://www.figma.com/design/yapiSji6t6Os4YcfA6nFYD/FiinFlow?node-id=0-1&t=dlf2CSHwS3UtxxRR-1 
- Demo Video: https://drive.google.com/drive/folders/18K5p9f5HFli2Uy9xAZYYG1e__HTpHh5l?usp=drive_link 

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

![2e0b994f-c81c-4bda-92ad-d4e37fb57ba5](https://github.com/user-attachments/assets/133e8864-1b08-4b4b-be4c-953f2bbf6edd)
![57b4d939-45d0-40ce-9e2b-cfe4dac562d6](https://github.com/user-attachments/assets/624ea46b-d2e0-48a4-9385-d69f9446b713)



### Generated Report
Description: Financial summary with charts and key metrics.
![9862a4cf-f014-445e-b391-15371c3cf547](https://github.com/user-attachments/assets/018e059a-cd74-4454-a46c-25e03f90e0bc)

![0aa8e6ad-0deb-4138-be8e-d85cd4672010](https://github.com/user-attachments/assets/5519eb8f-b07d-47ad-84bd-4ee974a0d937)


### Forecasting
Description: 90‑day forecast with risk indicators and insights.

![fa1d6415-3003-4313-8f50-a41a6ebf8e7f](https://github.com/user-attachments/assets/b3f955c2-a5b5-4703-bea6-25487966e881)

### Invoice
Description: Invoice detail view and actions (PDF, status updates, receipts).
<img width="1914" height="872" alt="Screenshot 2026-03-19 000052" src="https://github.com/user-attachments/assets/72663310-b736-4fde-bf07-9d8ebcef85c5" />

