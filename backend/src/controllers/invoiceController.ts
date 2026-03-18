import { Response } from 'express';
import crypto from 'crypto';
import { Company, Invoice, File as FileModel, Notification } from '../models';
import { AuthRequest } from '../middleware/auth';
import fs from 'fs';
import { sendInvoiceSentEmail } from '../utils/emailService';
import { generateInvoicePdfAttachmentBuffer } from '../utils/invoicePdfAttachment';

const toAbsoluteUrl = (pathOrUrl?: string) => {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const backendBase = process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;
  return `${backendBase}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
};

const parseLineItemsFromDescription = (description?: string) => {
  if (!description) return [];

  return description
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const lineItemMatch = line.match(/^(.*?):\s*(.*?)\s*\(x([\d.]+)\s*@\s*([\d.]+)\)$/i);
      if (lineItemMatch) {
        const name = lineItemMatch[1]?.trim() || 'Item';
        const itemDescription = lineItemMatch[2]?.trim() || '';
        const quantity = Number(lineItemMatch[3]) || 1;
        const rate = Number(lineItemMatch[4]) || 0;
        return {
          name,
          description: itemDescription,
          quantity,
          rate,
          amount: quantity * rate,
        };
      }

      const colonIndex = line.indexOf(':');

      if (colonIndex === -1) {
        return {
          name: line,
          description: '',
          quantity: 1,
          rate: 0,
          amount: 0,
        };
      }

      return {
        name: line.slice(0, colonIndex).trim(),
        description: line.slice(colonIndex + 1).trim(),
        quantity: 1,
        rate: 0,
        amount: 0,
      };
    })
    .filter((item) => item.name);
};

const normalizeInvoiceItems = (items: any[] = []) => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      const name = String(item?.name || item?.product || item?.service || '').trim();
      const description = String(item?.description || '').trim();
      const quantity = Number(item?.quantity ?? item?.qty ?? 1) || 1;
      const rate = Number(item?.rate ?? item?.unitPrice ?? 0) || 0;
      const amount = Number(item?.amount ?? (quantity * rate)) || 0;

      return {
        name,
        description,
        quantity,
        rate,
        amount,
      };
    })
    .filter((item) => item.name);
};

const VALID_INVOICE_TYPES = ['standard', 'proforma', 'tax', 'commercial', 'credit_note', 'debit_note'] as const;
const normalizeInvoiceType = (invoiceType?: string) => {
  const normalized = String(invoiceType || 'standard').trim();
  if ((VALID_INVOICE_TYPES as readonly string[]).includes(normalized.toLowerCase())) {
    return normalized.toLowerCase();
  }
  // Allow custom type (user-defined, max 20 chars)
  return normalized.slice(0, 20) || 'standard';
};

const toSafeNumber = (value: any, fallback = 0): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const isSameCalendarDate = (a: Date, b: Date): boolean => (
  a.getFullYear() === b.getFullYear()
  && a.getMonth() === b.getMonth()
  && a.getDate() === b.getDate()
);

const parseValidDate = (value: any): Date | null => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const createInvoiceOverdueNotification = async (invoice: any, companyId: any) => {
  try {
    const existing = await Notification.findOne({
      companyId,
      type: 'invoice_overdue',
      relatedInvoiceId: invoice._id,
      isRead: false,
    });

    if (existing) return;

    const clientName = (invoice?.clientId as any)?.name || 'Unknown Client';
    await Notification.create({
      companyId,
      type: 'invoice_overdue',
      title: 'Invoice Overdue',
      message: `Invoice ${invoice.invoiceNumber} for ${clientName} is now overdue.`,
      relatedInvoiceId: invoice._id,
    });
  } catch (error) {
    console.error('Create overdue notification error:', error);
  }
};

const enrichInvoiceAmounts = (invoice: any) => {
  const raw = typeof invoice?.toObject === 'function' ? invoice.toObject() : invoice;
  const totalAmount = Math.max(0, toSafeNumber(raw?.totalAmount, toSafeNumber(raw?.amount, 0)));
  const amountPaid = Math.max(0, Math.min(totalAmount, toSafeNumber(raw?.amountPaid, 0)));
  const remainingAmount = Math.max(0, totalAmount - amountPaid);
  return { ...raw, totalAmount, amountPaid, remainingAmount };
};

const sendInvoiceSentNotification = async (invoice: any, companyId: any, mode: 'new' | 'updated' = 'new') => {
  try {
    const client = invoice?.clientId as any;
    const clientEmail = client?.email;

    if (!clientEmail) {
      console.warn('[EMAIL][INVOICE_SENT] Skipped: client email is missing');
      return {
        attempted: false,
        sent: false,
        reason: 'Client email is missing',
      };
    }

    const company = await Company.findById(companyId).select('name displayName logoUrl brandColor address phone defaultPaymentInstructions').lean();
    const companyName = company?.displayName || company?.name || 'FiinFlow';
    const companyLogoUrl = toAbsoluteUrl(company?.logoUrl);

    const lineItemsFromInvoice = Array.isArray(invoice?.items)
      ? invoice.items.map((item: any) => ({
          name: item?.name || item?.product || item?.service || item?.description || 'Item',
          description: item?.description || '',
          quantity: Number(item?.qty || item?.quantity || 1),
          rate: Number(item?.unitPrice || item?.rate || 0),
          amount: Number(item?.amount || ((item?.qty || item?.quantity || 1) * (item?.unitPrice || item?.rate || 0))),
        }))
      : [];
    const lineItems = lineItemsFromInvoice.length > 0
      ? lineItemsFromInvoice
      : parseLineItemsFromDescription(String(invoice?.description || ''));

    const pdfBuffer = await generateInvoicePdfAttachmentBuffer(invoice, company);
    const safeInvoiceNumber = String(invoice.invoiceNumber || 'invoice').replace(/[^\w.-]+/g, '-');

    const result = await sendInvoiceSentEmail({
      clientEmail,
      clientName: client?.contactPerson || client?.name || 'Client',
      companyName,
      companyLogoUrl,
      companyBrandColor: company?.brandColor || '#2563EB',
      companyAddress: String(company?.address || ''),
      companyPhone: String(company?.phone || ''),
      invoiceNumber: invoice.invoiceNumber,
      invoiceType: invoice.invoiceType || 'standard',
      amount: Number(invoice.totalAmount || invoice.amount || 0),
      totalAmount: Number(invoice.totalAmount || invoice.amount || 0),
      currency: invoice.currency || 'RWF',
      taxRate: Number(invoice.taxRate || 0),
      taxApplied: Boolean(invoice.taxApplied),
      notes: String(invoice.notes || ''),
      clientPhone: client?.phone || '',
      clientAddress: client?.address || '',
      invoiceDate: String(invoice.createdAt || ''),
      lineItems,
      dueDate: String(invoice.dueDate || ''),
      pdfAttachment: {
        filename: `${safeInvoiceNumber}.pdf`,
        content: pdfBuffer,
      },
      emailMode: mode,
    });

    if (!result.success) {
      return {
        attempted: true,
        sent: false,
        reason: result.error || 'Email send failed',
      };
    }

    return {
      attempted: true,
      sent: true,
      recipient: clientEmail,
      messageId: result.messageId,
    };
  } catch (error) {
    console.error('Invoice notification error:', error);
    return {
      attempted: true,
      sent: false,
      reason: 'Unexpected email notification error',
    };
  }
};

export const createInvoicePublicLink = async (req: AuthRequest, res: Response) => {
  try {
    const isSuperAdmin = req.userRole === 'super_admin';
    const invoice = await Invoice.findOne(
      isSuperAdmin
        ? { _id: req.params.id }
        : { _id: req.params.id, companyId: req.companyId }
    ).populate('clientId');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    const now = new Date();
    const hasValidToken =
      invoice.publicShareToken
      && invoice.publicShareExpiresAt
      && invoice.publicShareExpiresAt.getTime() > now.getTime();

    if (!hasValidToken) {
      const token = crypto.randomBytes(24).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      invoice.publicShareToken = token;
      invoice.publicShareExpiresAt = expiresAt;
      await invoice.save();
    }

    const tokenToUse = invoice.publicShareToken;
    const backendBase = process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;
    const publicPdfUrl = `${backendBase}/api/reports/public/invoices/${tokenToUse}/pdf`;

    return res.json({
      success: true,
      data: {
        url: publicPdfUrl,
        expiresAt: invoice.publicShareExpiresAt,
      },
    });
  } catch (error: any) {
    console.error('Create public invoice link error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create invoice link',
    });
  }
};

export const getNextInvoiceNumber = async (req: AuthRequest, res: Response) => {
  try {
    const company = await Company.findById(req.companyId).select('invoicePrefix').lean();
    const prefix = String((company as any)?.invoicePrefix || 'INV').toUpperCase().trim() || 'INV';

    const lastInvoice = await Invoice.findOne({ companyId: req.companyId })
      .sort({ createdAt: -1 })
      .select('invoiceNumber')
      .lean();

    let nextNum = 1;
    if (lastInvoice?.invoiceNumber) {
      const match = lastInvoice.invoiceNumber.match(/(\d+)$/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    const padded = String(nextNum).padStart(3, '0');
    const nextNumber = `${prefix}-${padded}`;

    res.json({ success: true, data: { nextNumber } });
  } catch (error: any) {
    console.error('Get next invoice number error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get next invoice number' });
  }
};

export const createInvoice = async (req: AuthRequest, res: Response) =>{
  try {
    const {
      clientId,
      invoiceNumber,
      amount,
      currency,
      taxApplied,
      taxRate,
      dueDate,
      notes,
      description,
      items,
      amountPaid,
      proformaFileId,
      invoiceType,
      status,
      skipEmail,
    } = req.body;

    if (!clientId || !invoiceNumber || amount === undefined || amount === null || !dueDate) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required fields',
      });
    }

    let initialStatus = status === 'sent' ? 'sent' : 'draft';
    const company = await Company.findById(req.companyId).select('taxRate defaultCurrency').lean();
    const safeTaxRate = Number.isFinite(Number(taxRate))
      ? Number(taxRate)
      : Number(company?.taxRate ?? 18);
    const safeCurrency = String(currency || company?.defaultCurrency || 'RWF').toUpperCase() === 'USD' ? 'USD' : 'RWF';
    const safeAmount = Math.max(0, toSafeNumber(amount, 0));
    const computedTotalAmount = Boolean(taxApplied) && safeTaxRate > 0
      ? safeAmount + (safeAmount * safeTaxRate / 100)
      : safeAmount;

    if (computedTotalAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invoice total amount must be greater than 0',
      });
    }
    const safeAmountPaid = Math.max(0, toSafeNumber(amountPaid, 0));
    const parsedDueDate = parseValidDate(dueDate);
    if (!parsedDueDate) {
      return res.status(400).json({
        success: false,
        error: 'Invalid due date',
      });
    }

    if (safeAmountPaid > computedTotalAmount) {
      return res.status(400).json({
        success: false,
        error: 'Amount paid cannot be greater than total amount',
      });
    }

    const hasOutstanding = computedTotalAmount > 0 && safeAmountPaid < computedTotalAmount;
    const dueAtCreate = parsedDueDate;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    // Only sent invoices can become overdue automatically.
    // Draft invoices must remain draft until explicitly sent.
    const shouldBeOverdueOnCreate =
      initialStatus === 'sent'
      && hasOutstanding
      && dueAtCreate.getTime() < startOfToday.getTime();

    if (computedTotalAmount > 0 && safeAmountPaid >= computedTotalAmount) {
      initialStatus = 'paid';
    } else if (shouldBeOverdueOnCreate) {
      initialStatus = 'overdue';
    }

    const normalizedItems = normalizeInvoiceItems(items);

    const invoice = await Invoice.create({
      companyId: req.companyId,
      clientId,
      invoiceNumber,
      invoiceType: normalizeInvoiceType(invoiceType),
      amount: safeAmount,
      items: normalizedItems,
      currency: safeCurrency,
      taxApplied: Boolean(taxApplied),
      taxRate: safeTaxRate >= 0 ? safeTaxRate : 0,
      totalAmount: computedTotalAmount,
      amountPaid: safeAmountPaid,
      dueDate: parsedDueDate,
      notes,
      description,
      proformaFileId,
      status: initialStatus,
      sentAt: (initialStatus === 'sent' || initialStatus === 'overdue') ? new Date() : undefined,
      paidAt: initialStatus === 'paid' ? new Date() : undefined,
      createdBy: req.userId,
    });

    await invoice.populate('clientId');
    await invoice.populate('createdBy');

    let emailNotification: any = null;
    if (initialStatus === 'sent' && !skipEmail) {
      emailNotification = await sendInvoiceSentNotification(invoice, req.companyId);
    }

    if (initialStatus === 'overdue') {
      await createInvoiceOverdueNotification(invoice, req.companyId);
    }

    const remainingAmount = Math.max(0, computedTotalAmount - safeAmountPaid);
    const dueAt = parsedDueDate;
    const today = new Date();
    if (remainingAmount > 0 && isSameCalendarDate(dueAt, today)) {
      await Notification.create({
        companyId: req.companyId,
        type: 'invoice_due_today',
        title: 'Invoice Payment Due Today',
        message: `Invoice ${invoiceNumber} is due today with ${remainingAmount.toLocaleString()} ${safeCurrency} remaining.`,
        relatedInvoiceId: invoice._id,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: enrichInvoiceAmounts(invoice),
      emailNotification,
    });
  } catch (error: any) {
    console.error('Create invoice error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create invoice',
    });
  }
};

export const getInvoices = async (req: AuthRequest, res: Response) =>{
  try {
    const { status, clientId } = req.query;
    const filter: any = req.userRole === 'super_admin' ? {} : { companyId: req.companyId };

    if (status) filter.status = status;
    if (clientId) filter.clientId = clientId;

    const invoices = await Invoice.find(filter)
      .populate('clientId')
      .populate('proformaFileId')
      .populate('invoiceFileId')
      .populate('receiptFileId')
      .populate('attachments.fileId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: invoices.map(enrichInvoiceAmounts),
    });
  } catch (error: any) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch invoices',
    });
  }
};

export const getInvoice = async (req: AuthRequest, res: Response) =>{
  try {
    const isSuperAdmin = req.userRole === 'super_admin';
    const invoice = await Invoice.findOne(
      isSuperAdmin
        ? { _id: req.params.id }
        : { _id: req.params.id, companyId: req.companyId }
    )
      .populate('clientId')
      .populate('proformaFileId')
      .populate('invoiceFileId')
      .populate('receiptFileId')
      .populate('attachments.fileId');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    res.json({
      success: true,
      data: enrichInvoiceAmounts(invoice),
    });
  } catch (error: any) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch invoice',
    });
  }
};

export const updateInvoice = async (req: AuthRequest, res: Response) =>{
  try {
    const updates = { ...req.body } as any;
    const requestedStatus = String(req.body?.status || '').toLowerCase();
    const skipEmail = Boolean(req.body?.skipEmail);
    // Status lifecycle is automatic in this endpoint.
    // We only support explicit draft -> sent promotion during update.
    delete updates.status;
    if (updates.items !== undefined) {
      updates.items = normalizeInvoiceItems(updates.items);
    }
    if (updates.invoiceType !== undefined) {
      updates.invoiceType = normalizeInvoiceType(updates.invoiceType);
    }
    if (updates.dueDate !== undefined) {
      const parsedDueDate = parseValidDate(updates.dueDate);
      if (!parsedDueDate) {
        return res.status(400).json({
          success: false,
          error: 'Invalid due date',
        });
      }
      updates.dueDate = parsedDueDate;
    }
    const isSuperAdmin = req.userRole === 'super_admin';
    const invoice = await Invoice.findOne(
      isSuperAdmin
        ? { _id: req.params.id }
        : { _id: req.params.id, companyId: req.companyId }
    );

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }
    const previousStatus = String(invoice.status || 'draft');
    const promoteDraftToSent = previousStatus === 'draft' && requestedStatus === 'sent';

    const nextAmount = updates.amount !== undefined ? Math.max(0, toSafeNumber(updates.amount, 0)) : Math.max(0, toSafeNumber(invoice.amount, 0));
    const nextTaxApplied = updates.taxApplied !== undefined ? Boolean(updates.taxApplied) : Boolean(invoice.taxApplied);
    const nextTaxRate = updates.taxRate !== undefined ? Math.max(0, toSafeNumber(updates.taxRate, 0)) : Math.max(0, toSafeNumber(invoice.taxRate, 0));
    const nextTotalAmount = nextTaxApplied && nextTaxRate > 0
      ? nextAmount + (nextAmount * nextTaxRate / 100)
      : nextAmount;

    if (nextTotalAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invoice total amount must be greater than 0',
      });
    }

    const requestedAmountPaid = updates.amountPaid !== undefined
      ? Math.max(0, toSafeNumber(updates.amountPaid, 0))
      : Math.max(0, toSafeNumber(invoice.amountPaid, 0));

    if (requestedAmountPaid > nextTotalAmount) {
      return res.status(400).json({
        success: false,
        error: 'Amount paid cannot be greater than total amount',
      });
    }

    updates.amount = nextAmount;
    updates.taxApplied = nextTaxApplied;
    updates.taxRate = nextTaxRate;
    updates.totalAmount = nextTotalAmount;
    updates.amountPaid = requestedAmountPaid;

    const dueDateToUse = updates.dueDate !== undefined
      ? parseValidDate(updates.dueDate)
      : parseValidDate(invoice.dueDate);
    if (!dueDateToUse) {
      return res.status(400).json({
        success: false,
        error: 'Invalid due date',
      });
    }
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const hasOutstanding = nextTotalAmount > 0 && requestedAmountPaid < nextTotalAmount;
    const shouldAutoOverdue = hasOutstanding && dueDateToUse.getTime() < startOfToday.getTime();

    let nextStatus = previousStatus;
    if (nextTotalAmount > 0 && requestedAmountPaid >= nextTotalAmount) {
      nextStatus = 'paid';
    } else if (previousStatus === 'cancelled') {
      nextStatus = 'cancelled';
    } else if (previousStatus === 'draft' && !promoteDraftToSent) {
      // Keep draft invoices as draft until explicitly sent.
      nextStatus = 'draft';
    } else {
      // Sent invoices are auto-managed by due date.
      nextStatus = shouldAutoOverdue ? 'overdue' : 'sent';
    }

    updates.status = nextStatus;
    if (nextStatus === 'paid') {
      updates.paidAt = invoice.paidAt || new Date();
      if (!invoice.sentAt) {
        updates.sentAt = new Date();
      }
    } else {
      updates.paidAt = undefined;
      if (nextStatus === 'sent' || nextStatus === 'overdue') {
        updates.sentAt = invoice.sentAt || new Date();
      } else if (nextStatus === 'draft') {
        updates.sentAt = undefined;
      }
    }

    invoice.set(updates);
    await invoice.save();
    await invoice.populate('clientId');
    await invoice.populate('createdBy');

    if (invoice.status === 'overdue' && previousStatus !== 'overdue') {
      await createInvoiceOverdueNotification(invoice, invoice.companyId);
    }

    let emailNotification: any = null;
    if (invoice.status === 'sent' && !skipEmail) {
      emailNotification = await sendInvoiceSentNotification(invoice, invoice.companyId, 'updated');
    }

    res.json({
      success: true,
      message: 'Invoice updated successfully',
      data: enrichInvoiceAmounts(invoice),
      emailNotification,
    });
  } catch (error: any) {
    console.error('Update invoice error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update invoice',
    });
  }
};

export const updateInvoiceStatus = async (req: AuthRequest, res: Response) =>{
  try {
    const { status, paymentMethod, paymentReference, receivedBy, skipEmail } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Please provide status',
      });
    }

    const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
      });
    }

    const isSuperAdmin = req.userRole === 'super_admin';
    const invoice = await Invoice.findOne(
      isSuperAdmin
        ? { _id: req.params.id }
        : { _id: req.params.id, companyId: req.companyId }
    );

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }
    const previousStatus = String(invoice.status || 'draft');

    // Enforce lifecycle transitions:
    // draft -> sent
    // sent/overdue -> paid or cancelled
    // (overdue may still be set internally)
    if (status !== previousStatus) {
      let allowed = false;
      if (previousStatus === 'draft' && status === 'sent') allowed = true;
      if ((previousStatus === 'sent' || previousStatus === 'overdue') && (status === 'paid' || status === 'cancelled' || status === 'overdue')) allowed = true;
      if (!allowed) {
        return res.status(400).json({
          success: false,
          error: `Invalid status transition from ${previousStatus} to ${status}`,
        });
      }
    }

    // PHASE 1: Require payment_receipt attachment before marking as Paid
    if (status === 'paid') {
      const hasReceipt = invoice.attachments?.some(
        (att) =>att.type === 'payment_receipt'
      );

      if (!hasReceipt) {
        return res.status(400).json({
          success: false,
          error: 'A payment receipt must be uploaded before marking invoice as Paid',
        });
      }

      // Set payment details
      invoice.amountPaid = Number(invoice.totalAmount || invoice.amount || 0);
      invoice.paidAt = new Date();
      invoice.paymentMethod = paymentMethod;
      invoice.paymentReference = paymentReference;
      invoice.receivedBy = receivedBy;
    }

    const shouldSendSentNotification = status === 'sent' && !invoice.sentAt;

    if (status === 'sent' && !invoice.sentAt) {
      invoice.sentAt = new Date();
    }

    invoice.status = status;
    await invoice.save();

    await invoice.populate('clientId');
    await invoice.populate('createdBy');

    if (status === 'overdue' && previousStatus !== 'overdue') {
      await createInvoiceOverdueNotification(invoice, invoice.companyId);
    }

    let emailNotification: any = null;
    if (shouldSendSentNotification && !skipEmail) {
      emailNotification = await sendInvoiceSentNotification(invoice, invoice.companyId);
    }

    res.json({
      success: true,
      message: `Invoice marked as ${status}`,
      data: enrichInvoiceAmounts(invoice),
      emailNotification,
    });
  } catch (error: any) {
    console.error('Update invoice status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update invoice status',
    });
  }
};

export const markInvoiceAsPaid = async (req: AuthRequest, res: Response) =>{
  try {
    const { paymentDate, amountPaid, receiptFileId, paymentMethod, paymentReference, receivedBy } = req.body;

    if (!paymentDate || amountPaid === undefined || amountPaid === null) {
      return res.status(400).json({
        success: false,
        error: 'Please provide payment date and amount paid',
      });
    }

    const isSuperAdmin = req.userRole === 'super_admin';
    const invoice = await Invoice.findOne(
      isSuperAdmin
        ? { _id: req.params.id }
        : { _id: req.params.id, companyId: req.companyId }
    );

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    // Check for payment receipt
    const hasReceipt = invoice.attachments?.some(
      (att) =>att.type === 'payment_receipt'
    );

    if (!hasReceipt && !receiptFileId) {
      return res.status(400).json({
        success: false,
        error: 'A payment receipt must be uploaded before marking invoice as Paid',
      });
    }

    const safeAmountPaid = Math.max(0, toSafeNumber(amountPaid, 0));
    const parsedPaymentDate = parseValidDate(paymentDate);
    if (!parsedPaymentDate) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment date',
      });
    }
    const invoiceTotal = Math.max(0, toSafeNumber(invoice.totalAmount, toSafeNumber(invoice.amount, 0)));
    if (safeAmountPaid > invoiceTotal) {
      return res.status(400).json({
        success: false,
        error: 'Amount paid cannot be greater than total amount',
      });
    }

    invoice.amountPaid = safeAmountPaid;
    invoice.paymentDate = parsedPaymentDate;
    invoice.receiptFileId = receiptFileId;
    invoice.paymentMethod = paymentMethod;
    invoice.paymentReference = paymentReference;
    invoice.receivedBy = receivedBy;

    if (safeAmountPaid >= invoiceTotal) {
      invoice.status = 'paid';
      invoice.paidAt = new Date();
    } else {
      const isPastDue = invoice.dueDate ? new Date(invoice.dueDate).getTime() < Date.now() : false;
      invoice.status = isPastDue ? 'overdue' : 'sent';
      invoice.paidAt = undefined;
    }

    await invoice.save();
    await invoice.populate('clientId');

    if (invoice.status === 'overdue') {
      await createInvoiceOverdueNotification(invoice, invoice.companyId);
    }

    res.json({
      success: true,
      message: safeAmountPaid >= invoiceTotal ? 'Invoice marked as paid' : 'Partial payment recorded',
      data: enrichInvoiceAmounts(invoice),
    });
  } catch (error: any) {
    console.error('Mark invoice as paid error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to mark invoice as paid',
    });
  }
};

export const deleteInvoice = async (req: AuthRequest, res: Response) =>{
  try {
    const isSuperAdmin = req.userRole === 'super_admin';
    const invoice = await Invoice.findOneAndDelete(
      isSuperAdmin
        ? { _id: req.params.id }
        : { _id: req.params.id, companyId: req.companyId }
    );

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    res.json({
      success: true,
      message: 'Invoice deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete invoice error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete invoice',
    });
  }
};

// PHASE 1: Attachment management
export const uploadInvoiceAttachment = async (req: AuthRequest, res: Response) =>{
  try {
    const { invoiceId } = req.params;
    const { type } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    const invoice = await Invoice.findOne({
      _id: invoiceId,
      companyId: req.companyId,
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    // Create file record
    const file = await FileModel.create({
      companyId: req.companyId,
      type: type || 'service_attachment',
      path: req.file.path,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.userId,
    });

    // Add to invoice attachments
    if (!invoice.attachments) {
      invoice.attachments = [];
    }
    invoice.attachments.push({
      fileId: file._id,
      type: type || 'service_attachment',
      uploadedAt: new Date(),
      uploadedBy: req.userId,
    });

    await invoice.save();

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        file,
        invoice,
      },
    });
  } catch (error: any) {
    console.error('Upload attachment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload attachment',
    });
  }
};

export const deleteInvoiceAttachment = async (req: AuthRequest, res: Response) =>{
  try {
    const { invoiceId, fileId } = req.params;

    const invoice = await Invoice.findOne({
      _id: invoiceId,
      companyId: req.companyId,
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    // Remove from attachments array
    invoice.attachments = invoice.attachments?.filter(
      (att) =>att.fileId.toString() !== fileId
    );

    await invoice.save();

    // Delete file record and physical file
    const file = await FileModel.findByIdAndDelete(fileId);
    if (file && file.path) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }

    res.json({
      success: true,
      message: 'Attachment deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete attachment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete attachment',
    });
  }
};
