# FinFlow Backend API

RESTful API for FinFlow financial management system.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your settings:
- `PORT=5000`
- `MONGODB_URI=mongodb://localhost:27017/finflow`
- `JWT_SECRET=your-secret-key`

3. Start MongoDB locally:
```bash
mongod
```

4. Run development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
npm start
```

## API Endpoints

### Company
- `POST /api/companies` - Create new company
- `GET /api/companies` - Get company details
- `PUT /api/companies` - Update company

### Users
- `POST /api/users` - Create user (admin only)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user (admin only)
- `DELETE /api/users/:id` - Delete user (admin only)

### Clients
- `POST /api/clients` - Create client
- `GET /api/clients` - Get all clients
- `GET /api/clients/:id` - Get client details with summary
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices` - Get all invoices (filter by status, clientId)
- `GET /api/invoices/:id` - Get invoice details
- `PUT /api/invoices/:id` - Update invoice
- `PUT /api/invoices/:id/mark-paid` - Mark invoice as paid
- `DELETE /api/invoices/:id` - Delete invoice

### Expenses
- `POST /api/expenses` - Create expense
- `GET /api/expenses` - Get all expenses (filter by clientId, category, dates)
- `GET /api/expenses/:id` - Get expense details
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Files
- `POST /api/files` - Upload file (multipart/form-data)
- `GET /api/files` - Get all files (filter by type)
- `GET /api/files/:id` - Get file metadata
- `GET /api/files/:id/download` - Download file
- `DELETE /api/files/:id` - Delete file

### Dashboard
- `GET /api/dashboard` - Get dashboard data
- `GET /api/dashboard/reports` - Get reports (filter by dates, clientId)

## Authentication

All routes except company creation require authentication via JWT token in Authorization header:

```
Authorization: Bearer <token>
```

## File Upload

Upload files using multipart/form-data:
- Field name: `file`
- Additional field: `type` (proforma, invoice, or receipt)
- Max size: 10MB
- Allowed types: PDF, JPG, JPEG, PNG
