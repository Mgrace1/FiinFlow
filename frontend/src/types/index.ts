export type Currency = 'RWF' | 'USD';
export type UserRole = 'super_admin' | 'admin' | 'finance_manager' | 'staff';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type InvoiceType = 'standard' | 'proforma' | 'tax' | 'commercial' | 'credit_note' | 'debit_note';
export type FileType = 'proforma' | 'invoice' | 'receipt';

export interface Company {
  _id: string;
  name: string;
  email: string;
  address: string;
  phone: string;
  industry?: string;
  defaultCurrency: Currency;
  exchangeRateUSD: number;
  taxRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string;
  companyId: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  _id: string;
  companyId: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  _id: string;
  companyId: string;
  clientId: string | Client;
  invoiceNumber: string;
  invoiceType?: InvoiceType;
  amount: number;
  currency: Currency;
  taxApplied: boolean;
  taxRate: number;
  totalAmount: number;
  status: InvoiceStatus;
  dueDate: string;
  proformaFileId?: string | FileRecord;
  invoiceFileId?: string | FileRecord;
  receiptFileId?: string | FileRecord;
  paymentDate?: string;
  amountPaid?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  _id: string;
  companyId: string;
  clientId?: string | Client;
  supplier: string;
  category: string;
  amount: number;
  currency: Currency;
  date: string;
  receiptFileId?: string | FileRecord;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileRecord {
  _id: string;
  companyId: string;
  type: FileType;
  path: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy?: string;
  uploadedAt: string;
}

export interface ApiResponse<T = any>{
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface DashboardData {
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    profit: number;
    profitMargin: number;
    outstandingInvoices: number;
  };
  topClients: Array<{
    clientId: string;
    clientName: string;
    totalRevenue: number;
    totalExpenses: number;
    profit: number;
    currency: string;
  }>;
  monthlyData: Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
  recentUploads: FileRecord[];
}

export interface ReportData {
  summary: {
    totalRevenue: number;
    totalPaid: number;
    totalPending: number;
    totalExpenses: number;
    profit: number;
    profitMargin: number;
  };
  invoices: Invoice[];
  expenses: Expense[];
}
