import mongoose, { Schema, Document } from 'mongoose';
import { ICompany, Currency } from '../types';

export interface ICompanyDocument extends ICompany, Document {}

const CompanySchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Company email is required'],
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      required: [true, 'Company address is required'],
    },
    phone: {
      type: String,
      required: [true, 'Company phone is required'],
    },
    industry: {
      type: String,
      trim: true,
    },
    defaultCurrency: {
      type: String,
      enum: ['RWF', 'USD', 'EUR'],
      default: 'RWF',
    },
    exchangeRateUSD: {
      type: Number,
      default: 1300, // Default RWF to USD rate
    },
    taxRate: {
      type: Number,
      default: 18, // Default 18% tax
      min: 0,
      max: 100,
    },
    logoUrl: {
      type: String,
      trim: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
    brandColor: {
      type: String,
      trim: true,
      default: '#2563EB', // Default primary blue
    },
    brandSecondaryColor: {
      type: String,
      trim: true,
      default: '#10B981', // Default success green
    },
    invoiceFooterText: {
      type: String,
      trim: true,
      default: 'Thank you for your business!',
    },
    invoicePrefix: {
      type: String,
      trim: true,
      default: 'INV',
    },
    defaultPaymentInstructions: {
      type: String,
      trim: true,
      default: '',
    },
    taxRegistrationNumber: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
CompanySchema.index({ email: 1 });

export default mongoose.model<ICompanyDocument>('Company', CompanySchema);
