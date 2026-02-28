import { apiClient } from './client';
import type {
  ApiResponse,
  Company,
  User,
  Client,
  Invoice,
  Expense,
  FileRecord,
  DashboardData,
  ReportData,
} from '../types';

// Company API
export const companyApi = {
  create: (data: Partial<Company>) =>
    apiClient.post<ApiResponse<{ company: Company; admin: User; token: string; workspaceUrl: string }>>('/companies', data),
  get: () =>apiClient.get<ApiResponse<Company>>('/companies'),
  update: (data: Partial<Company>) =>apiClient.put<ApiResponse<Company>>('/companies', data),
};

// User API
export const userApi = {
  create: (data: Partial<User>) =>apiClient.post<ApiResponse<User>>('/users', data),
  getAll: () =>apiClient.get<ApiResponse<User[]>>('/users'),
  getById: (id: string) =>apiClient.get<ApiResponse<User>>(`/users/${id}`),
  update: (id: string, data: Partial<User>) =>apiClient.put<ApiResponse<User>>(`/users/${id}`, data),
  delete: (id: string) =>apiClient.delete<ApiResponse>(`/users/${id}`),
};

// Client API
export const clientApi = {
  create: (data: Partial<Client>) =>apiClient.post<ApiResponse<Client>>('/clients', data),
  getAll: () =>apiClient.get<ApiResponse<Client[]>>('/clients'),
  getById: (id: string) =>apiClient.get<ApiResponse<{ client: Client; summary: any }>>(`/clients/${id}`),
  update: (id: string, data: Partial<Client>) =>apiClient.put<ApiResponse<Client>>(`/clients/${id}`, data),
  delete: (id: string) =>apiClient.delete<ApiResponse>(`/clients/${id}`),
};

// Invoice API
export const invoiceApi = {
  create: (data: Partial<Invoice>) =>apiClient.post<ApiResponse<Invoice>>('/invoices', data),
  getAll: (params?: { status?: string; clientId?: string }) =>
    apiClient.get<ApiResponse<Invoice[]>>('/invoices', { params }),
  getById: (id: string) =>apiClient.get<ApiResponse<Invoice>>(`/invoices/${id}`),
  update: (id: string, data: Partial<Invoice>) =>apiClient.put<ApiResponse<Invoice>>(`/invoices/${id}`, data),
  markAsPaid: (id: string, data: { paymentDate: string; amountPaid: number; receiptFileId?: string }) =>
    apiClient.put<ApiResponse<Invoice>>(`/invoices/${id}/mark-paid`, data),
  delete: (id: string) =>apiClient.delete<ApiResponse>(`/invoices/${id}`),
};

// Expense API
export const expenseApi = {
  create: (data: Partial<Expense>) =>apiClient.post<ApiResponse<Expense>>('/expenses', data),
  getAll: (params?: { clientId?: string; category?: string; startDate?: string; endDate?: string }) =>
    apiClient.get<ApiResponse<Expense[]>>('/expenses', { params }),
  getById: (id: string) =>apiClient.get<ApiResponse<Expense>>(`/expenses/${id}`),
  update: (id: string, data: Partial<Expense>) =>apiClient.put<ApiResponse<Expense>>(`/expenses/${id}`, data),
  delete: (id: string) =>apiClient.delete<ApiResponse>(`/expenses/${id}`),
};

// File API
export const fileApi = {
  upload: (file: File, type: string) =>{
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return apiClient.post<ApiResponse<FileRecord>>('/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getAll: (params?: { type?: string }) =>apiClient.get<ApiResponse<FileRecord[]>>('/files', { params }),
  getById: (id: string) =>apiClient.get<ApiResponse<FileRecord>>(`/files/${id}`),
  download: (id: string) =>apiClient.get(`/files/${id}/download`, { responseType: 'blob' }),
  delete: (id: string) =>apiClient.delete<ApiResponse>(`/files/${id}`),
};

// Dashboard API
export const dashboardApi = {
  getData: () =>apiClient.get<ApiResponse<DashboardData>>('/dashboard'),
  getReports: (params?: { startDate?: string; endDate?: string; clientId?: string }) =>
    apiClient.get<ApiResponse<ReportData>>('/dashboard/reports', { params }),
};
