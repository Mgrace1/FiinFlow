import mongoose, { Schema, Document } from 'mongoose';
import { IExpense, Currency } from '../types';

export interface IExpenseDocument extends IExpense, Document {}

const ExpenseSchema: Schema = new Schema(
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
    },
    receiptFileId: {
      type: Schema.Types.ObjectId,
      ref: 'File',
    },
    supplier: {
      type: String,
      required: [true, 'Supplier is required'],
      trim: true,
    },
    category: {
      type: String,
      default: 'Other',
      required: [true, 'Category is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    currency: {
      type: String,
      enum: ['RWF', 'USD'],
      default: 'RWF',
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    paymentMethod: {
      type: String,
      enum: ['Bank', 'Mobile Money', 'Cash', 'Card'],
      required: [true, 'Payment method is required'],
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
    description: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for faster queries
ExpenseSchema.index({ companyId: 1, dueDate: -1 });
ExpenseSchema.index({ companyId: 1, clientId: 1 });
ExpenseSchema.index({ companyId: 1, category: 1 });

export default mongoose.model<IExpenseDocument>('Expense', ExpenseSchema);
