import crypto from 'crypto';
import { Types } from 'mongoose';
import { Expense, Invoice, Notification, PaymentIngestionEvent } from '../models';

type AlertSource = 'gmail' | 'sms' | 'manual';
type Direction = 'incoming' | 'outgoing' | 'unknown';
type TargetType = 'invoice' | 'expense';

export interface ParseResult {
  amount: number | null;
  currency: 'RWF' | 'USD' | null;
  direction: Direction;
  reference: string | null;
  invoiceCandidates: string[];
  confidence: number;
}

export interface ProcessPaymentAlertInput {
  companyId: Types.ObjectId;
  createdBy?: Types.ObjectId;
  source: AlertSource;
  channelIdentifier?: string;
  externalId?: string;
  subject?: string;
  messageText: string;
  directionHint?: Direction;
  targetType?: TargetType;
  targetId?: string;
  dryRun?: boolean;
}

interface MatchResult {
  targetType: TargetType;
  targetId: string;
  confidence: number;
  reason: string;
}

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sanitizeText = (value: string): string => value.replace(/\s+/g, ' ').trim();

const extractAmount = (text: string): number | null => {
  const candidates: number[] = [];
  const amountRegex = /(?:RWF|USD|\$)?\s*([0-9]{1,3}(?:[,\s][0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/gi;

  let match: RegExpExecArray | null = null;
  while ((match = amountRegex.exec(text)) !== null) {
    const raw = String(match[1] || '').replace(/[\s,]/g, '');
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) continue;
    candidates.push(value);
  }

  if (candidates.length === 0) return null;
  return Math.max(...candidates);
};

const extractCurrency = (text: string): 'RWF' | 'USD' | null => {
  const upper = text.toUpperCase();
  if (/\bRWF\b/.test(upper) || /FRW/.test(upper)) return 'RWF';
  if (/\bUSD\b/.test(upper) || /\$/.test(upper)) return 'USD';
  return null;
};

const extractReference = (text: string): string | null => {
  const patterns = [
    /\b(?:ref(?:erence)?|txn|txid|transaction(?:\s*id)?)\s*[:#-]?\s*([A-Z0-9-]{4,})\b/i,
    /\b(?:id)\s*[:#-]?\s*([A-Z0-9-]{6,})\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
};

const extractInvoiceCandidates = (text: string): string[] => {
  const results = new Set<string>();
  const patterns = [
    /\b(INV[-/][A-Z0-9-]{2,})\b/gi,
    /\b(INVOICE)\s*(?:NO|NUMBER|#)?\s*[:#-]?\s*([A-Z0-9-]{2,})\b/gi,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null = null;
    while ((match = pattern.exec(text)) !== null) {
      const candidate = match[1]?.toUpperCase() === 'INVOICE'
        ? String(match[2] || '').toUpperCase()
        : String(match[1] || '').toUpperCase();
      if (candidate) results.add(candidate);
    }
  }

  return Array.from(results);
};

const detectDirection = (text: string, hint?: Direction): Direction => {
  if (hint && hint !== 'unknown') return hint;
  const lower = text.toLowerCase();

  const incomingSignals = ['received', 'credited', 'deposit', 'incoming', 'payment received', 'you got'];
  const outgoingSignals = ['sent', 'debited', 'withdraw', 'paid to', 'transfer to', 'outgoing'];

  if (incomingSignals.some((token) => lower.includes(token))) return 'incoming';
  if (outgoingSignals.some((token) => lower.includes(token))) return 'outgoing';
  return 'unknown';
};

export const parsePaymentAlert = (rawText: string, directionHint?: Direction): ParseResult => {
  const text = sanitizeText(rawText);
  const amount = extractAmount(text);
  const currency = extractCurrency(text);
  const reference = extractReference(text);
  const invoiceCandidates = extractInvoiceCandidates(text);
  const direction = detectDirection(text, directionHint);

  let confidence = 0.3;
  if (amount !== null) confidence += 0.35;
  if (currency) confidence += 0.1;
  if (reference) confidence += 0.15;
  if (invoiceCandidates.length > 0) confidence += 0.2;
  if (direction !== 'unknown') confidence += 0.1;

  return {
    amount,
    currency,
    direction,
    reference,
    invoiceCandidates,
    confidence: Math.min(1, confidence),
  };
};

const buildFingerprint = (input: ProcessPaymentAlertInput): string => {
  const normalized = [
    String(input.companyId),
    input.source,
    (input.channelIdentifier || '').toLowerCase().trim(),
    (input.externalId || '').trim(),
    sanitizeText(input.subject || ''),
    sanitizeText(input.messageText || ''),
  ].join('|');

  return crypto.createHash('sha256').update(normalized).digest('hex');
};

const isPastDue = (date?: Date): boolean => {
  if (!date) return false;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return new Date(date).getTime() < todayStart.getTime();
};

const findInvoiceByCandidates = async (
  companyId: Types.ObjectId,
  candidates: string[]
): Promise<any | null> => {
  for (const candidate of candidates) {
    const invoice = await Invoice.findOne({
      companyId,
      invoiceNumber: { $regex: `^${candidate}$`, $options: 'i' },
      status: { $nin: ['paid', 'cancelled'] },
    });
    if (invoice) return invoice;
  }
  return null;
};

const selectByAmount = (items: any[], amount: number): any | null => {
  if (items.length === 0) return null;
  let best: any = null;
  let bestDelta = Number.POSITIVE_INFINITY;

  for (const item of items) {
    const total = Math.max(0, toNumber(item.totalAmount, toNumber(item.amount, 0)));
    const paid = Math.max(0, toNumber(item.amountPaid, 0));
    const remaining = Math.max(0, total - paid);
    const delta = Math.abs(remaining - amount);
    if (delta < bestDelta) {
      best = item;
      bestDelta = delta;
    }
  }

  const threshold = Math.max(100, amount * 0.05);
  if (best && bestDelta <= threshold) return best;
  if (items.length === 1) return items[0];
  return null;
};

const findMatch = async (
  companyId: Types.ObjectId,
  parsed: ParseResult,
  targetType?: TargetType,
  targetId?: string
): Promise<MatchResult | null> => {
  if (targetType && targetId) {
    const found = targetType === 'invoice'
      ? await Invoice.findOne({ _id: targetId, companyId })
      : await Expense.findOne({ _id: targetId, companyId });
    if (!found) return null;
    return {
      targetType,
      targetId: String(found._id),
      confidence: 1,
      reason: 'Explicit target supplied by caller',
    };
  }

  const amount = parsed.amount;
  if (amount === null) return null;

  const invoiceByNumber = await findInvoiceByCandidates(companyId, parsed.invoiceCandidates);
  if (invoiceByNumber) {
    return {
      targetType: 'invoice',
      targetId: String(invoiceByNumber._id),
      confidence: 0.95,
      reason: 'Matched invoice number from payment alert',
    };
  }

  const invoiceFilter: any = {
    companyId,
    status: { $nin: ['paid', 'cancelled'] },
    $expr: {
      $lt: [
        { $ifNull: ['$amountPaid', 0] },
        { $ifNull: ['$totalAmount', '$amount'] },
      ],
    },
  };
  if (parsed.currency) invoiceFilter.currency = parsed.currency;

  const expenseFilter: any = {
    companyId,
    paymentStatus: { $ne: 'paid' },
    $expr: {
      $lt: [
        { $ifNull: ['$amountPaid', 0] },
        '$amount',
      ],
    },
  };
  if (parsed.currency) expenseFilter.currency = parsed.currency;

  const [invoices, expenses] = await Promise.all([
    Invoice.find(invoiceFilter).sort({ dueDate: 1, createdAt: 1 }).limit(40),
    Expense.find(expenseFilter).sort({ dueDate: 1, createdAt: 1 }).limit(40),
  ]);

  if (parsed.direction === 'outgoing') {
    const exp = selectByAmount(expenses, amount);
    if (exp) {
      return {
        targetType: 'expense',
        targetId: String(exp._id),
        confidence: 0.7,
        reason: 'Outgoing alert amount matched unpaid expense',
      };
    }
  }

  const inv = selectByAmount(invoices, amount);
  if (inv) {
    return {
      targetType: 'invoice',
      targetId: String(inv._id),
      confidence: 0.7,
      reason: 'Alert amount matched outstanding invoice',
    };
  }

  if (parsed.direction !== 'incoming') {
    const exp = selectByAmount(expenses, amount);
    if (exp) {
      return {
        targetType: 'expense',
        targetId: String(exp._id),
        confidence: 0.55,
        reason: 'Fallback amount match to expense',
      };
    }
  }

  return null;
};

const applyToInvoice = async (
  companyId: Types.ObjectId,
  invoiceId: string,
  parsed: ParseResult,
  source: AlertSource,
  dryRun?: boolean
) => {
  const invoice = await Invoice.findOne({ _id: invoiceId, companyId }).populate('clientId');
  if (!invoice) throw new Error('Matched invoice no longer exists');

  const total = Math.max(0, toNumber(invoice.totalAmount, toNumber(invoice.amount, 0)));
  const currentPaid = Math.max(0, toNumber(invoice.amountPaid, 0));
  const increment = Math.max(0, parsed.amount || 0);
  const nextPaid = Math.min(total, currentPaid + increment);
  const remaining = Math.max(0, total - nextPaid);
  const wasPaid = invoice.status === 'paid';
  const now = new Date();
  const nextStatus = remaining === 0
    ? 'paid'
    : isPastDue(invoice.dueDate)
      ? 'overdue'
      : (invoice.status === 'draft' ? 'draft' : 'sent');

  if (!dryRun) {
    invoice.amountPaid = nextPaid;
    invoice.status = nextStatus as any;
    invoice.paymentDate = now;
    invoice.paymentMethod = invoice.paymentMethod || 'Other';
    if (parsed.reference) invoice.paymentReference = parsed.reference;
    invoice.paidAt = nextStatus === 'paid' ? now : undefined;
    await invoice.save();

    if (nextStatus === 'paid' && !wasPaid) {
      const alreadyNotified = await Notification.findOne({
        companyId,
        type: 'invoice_paid',
        relatedInvoiceId: invoice._id,
        isRead: false,
      }).select('_id');

      if (!alreadyNotified) {
        await Notification.create({
          companyId,
          type: 'invoice_paid',
          title: 'Invoice Paid',
          message: `Payment detected from ${source.toUpperCase()} for invoice ${invoice.invoiceNumber}.`,
          relatedInvoiceId: invoice._id,
        });
      }
    }
  }

  return {
    targetType: 'invoice' as const,
    targetId: String(invoice._id),
    invoiceNumber: invoice.invoiceNumber,
    amountApplied: increment,
    amountPaid: nextPaid,
    remainingAmount: remaining,
    status: nextStatus,
  };
};

const applyToExpense = async (
  companyId: Types.ObjectId,
  expenseId: string,
  parsed: ParseResult,
  dryRun?: boolean
) => {
  const expense = await Expense.findOne({ _id: expenseId, companyId });
  if (!expense) throw new Error('Matched expense no longer exists');

  const total = Math.max(0, toNumber(expense.amount, 0));
  const currentPaid = Math.max(0, toNumber(expense.amountPaid, 0));
  const increment = Math.max(0, parsed.amount || 0);
  const nextPaid = Math.min(total, currentPaid + increment);
  const remaining = Math.max(0, total - nextPaid);
  const nextStatus = remaining === 0 ? 'paid' : 'pending';

  if (!dryRun) {
    expense.amountPaid = nextPaid;
    expense.paymentStatus = nextStatus as any;
    await expense.save();
  }

  return {
    targetType: 'expense' as const,
    targetId: String(expense._id),
    amountApplied: increment,
    amountPaid: nextPaid,
    remainingAmount: remaining,
    status: nextStatus,
  };
};

export const processPaymentAlert = async (input: ProcessPaymentAlertInput) => {
  const fingerprint = buildFingerprint(input);

  const existing = await PaymentIngestionEvent.findOne({
    companyId: input.companyId,
    fingerprint,
  }).lean();

  if (existing) {
    return {
      duplicate: true,
      eventId: String(existing._id),
      status: 'duplicate',
      parsed: existing.parsed || null,
      match: existing.match || null,
      applied: null,
      message: 'Duplicate payment alert ignored',
    };
  }

  const parsed = parsePaymentAlert(input.messageText, input.directionHint);

  const event = await PaymentIngestionEvent.create({
    companyId: input.companyId,
    source: input.source,
    channelIdentifier: input.channelIdentifier?.toLowerCase().trim(),
    externalId: input.externalId,
    fingerprint,
    subject: input.subject,
    messageText: input.messageText,
    parsed,
    status: 'received',
    createdBy: input.createdBy,
  });

  try {
    const match = await findMatch(input.companyId, parsed, input.targetType, input.targetId);

    if (!match) {
      event.status = 'ignored';
      event.match = {
        reason: 'No invoice/expense match found',
      };
      event.processedAt = new Date();
      await event.save();

      return {
        duplicate: false,
        eventId: String(event._id),
        status: 'ignored',
        parsed,
        match: null,
        applied: null,
        message: 'Alert parsed, but no matching invoice/expense was found',
      };
    }

    let applied: any = null;
    if (match.targetType === 'invoice') {
      applied = await applyToInvoice(
        input.companyId,
        match.targetId,
        parsed,
        input.source,
        input.dryRun
      );
    } else {
      applied = await applyToExpense(
        input.companyId,
        match.targetId,
        parsed,
        input.dryRun
      );
    }

    event.status = 'processed';
    event.match = {
      targetType: match.targetType,
      targetId: match.targetId,
      confidence: match.confidence,
      reason: match.reason,
    };
    event.appliedAmount = Math.max(0, toNumber(parsed.amount, 0));
    event.processedAt = new Date();
    await event.save();

    return {
      duplicate: false,
      eventId: String(event._id),
      status: 'processed',
      parsed,
      match,
      applied,
      message: input.dryRun ? 'Dry-run completed; no database updates applied' : 'Payment alert processed',
    };
  } catch (error: any) {
    event.status = 'failed';
    event.errorMessage = error?.message || 'Unhandled ingestion failure';
    event.processedAt = new Date();
    await event.save();
    throw error;
  }
};
