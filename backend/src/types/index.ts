import { Types } from 'mongoose';

export type Currency = 'RWF' | 'USD' | 'EUR';

export type UserRole = 'admin' | 'finance_manager' | 'staff';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type InvoiceType = 'standard' | 'proforma' | 'tax' | 'commercial' | 'credit_note' | 'debit_note';

export type FileType = 'proforma' | 'invoice_pdf' | 'service_attachment' | 'payment_receipt' | 'invoice' | 'receipt';

export interface ICompany {
  _id: Types.ObjectId;
  name: string;
  email: string;
  address: string;
  phone: string;
  industry?: string;
  defaultCurrency: Currency;
  exchangeRateUSD: number;
  taxRate: number;
  logoUrl?: string;
  displayName?: string;
  brandColor?: string;
  brandSecondaryColor?: string;
  invoiceFooterText?: string;
  invoicePrefix?: string;
  defaultPaymentInstructions?: string;
  taxRegistrationNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUser {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  status: 'pending' | 'active' | 'suspended';
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  invitedBy?: Types.ObjectId;
  invitedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IClient {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxApplied: boolean;
  amount: number;
}

export interface IInvoiceHistory {
  action: string;
  by: Types.ObjectId;
  at: Date;
  details?: string;
  from?: string;
  to?: string;
  paymentReference?: string;
}

export interface IInvoice {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  clientId: Types.ObjectId;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  items?: IInvoiceItem[];
  amount: number;
  currency: Currency;
  taxApplied: boolean;
  taxRate: number;
  subtotal?: number;
  taxAmount?: number;
  totalAmount: number;
  status: InvoiceStatus;
  dueDate: Date;
  sentAt?: Date;
  paidAt?: Date;
  proformaFileId?: Types.ObjectId;
  invoiceFileId?: Types.ObjectId;
  receiptFileId?: Types.ObjectId;
  paymentDate?: Date;
  amountPaid?: number;
  paymentMethod?: string;
  paymentReference?: string;
  receivedBy?: string;
  notes?: string;
  description?: string;
  createdBy?: Types.ObjectId;
  attachments?: Array<{
    fileId: Types.ObjectId;
    type: 'proforma' | 'invoice_pdf' | 'service_attachment' | 'payment_receipt';
    uploadedAt: Date;
    uploadedBy?: Types.ObjectId;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IExpense {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  clientId?: Types.ObjectId;
  supplier: string;
  category: string;
  amount: number;
  amountPaid: number;
  currency: Currency;
  dueDate: Date;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  description?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFile {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  type: FileType;
  path: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy?: Types.ObjectId;
  uploadedAt: Date;
  approved: boolean;
}

export interface ApiResponse<T = any>{
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T>{
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
