import mongoose, { Schema, Document } from 'mongoose';
import { IInvoice, Currency, InvoiceStatus } from '../types';

export interface IInvoiceDocument extends IInvoice, Document {}

const InvoiceSchema: Schema = new Schema(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required'],
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client ID is required'],
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      trim: true,
    },
    invoiceType: {
      type: String,
      default: 'standard',
    },
    items: [{
      name: {
        type: String,
        trim: true,
      },
      description: {
        type: String,
        trim: true,
      },
      quantity: {
        type: Number,
        min: 0,
        default: 1,
      },
      rate: {
        type: Number,
        min: 0,
        default: 0,
      },
      amount: {
        type: Number,
        min: 0,
        default: 0,
      },
    }],
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: 0,
    },
    currency: {
      type: String,
      enum: ['RWF', 'USD'],
      default: 'RWF',
    },
    taxApplied: {
      type: Boolean,
      default: false,
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
      default: 'draft',
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    sentAt: {
      type: Date,
    },
    paidAt: {
      type: Date,
    },
    proformaFileId: {
      type: Schema.Types.ObjectId,
      ref: 'File',
    },
    invoiceFileId: {
      type: Schema.Types.ObjectId,
      ref: 'File',
    },
    receiptFileId: {
      type: Schema.Types.ObjectId,
      ref: 'File',
    },
    paymentDate: {
      type: Date,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'MobileMoney', 'BankTransfer', 'Other', ''],
    },
    paymentReference: {
      type: String,
    },
    receivedBy: {
      type: String,
    },
    amountPaid: {
      type: Number,
      min: 0,
    },
    notes: {
      type: String,
    },
    description: {
      type: String,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    attachments: [{
      fileId: {
        type: Schema.Types.ObjectId,
        ref: 'File',
      },
      type: {
        type: String,
        enum: ['proforma', 'invoice_pdf', 'service_attachment', 'payment_receipt'],
        required: true,
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
      uploadedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    }],
  },
  {
    timestamps: true,
  }
);

// Compound indexes for faster queries
InvoiceSchema.index({ companyId: 1, status: 1 });
InvoiceSchema.index({ companyId: 1, clientId: 1 });
InvoiceSchema.index({ companyId: 1, invoiceNumber: 1 }, { unique: true });

// Pre-save hook to calculate total amount
InvoiceSchema.pre('save', function (next) {
  const doc = this as any;
  if (doc.taxApplied && doc.taxRate >0) {
    doc.totalAmount = doc.amount + (doc.amount * doc.taxRate / 100);
  } else {
    doc.totalAmount = doc.amount;
  }
  next();
});

export default mongoose.model<IInvoiceDocument>('Invoice', InvoiceSchema);
