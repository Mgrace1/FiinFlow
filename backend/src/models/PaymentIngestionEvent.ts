import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentIngestionEventDocument extends Document {
  companyId: Schema.Types.ObjectId;
  source: 'gmail' | 'sms' | 'manual';
  channelIdentifier?: string;
  externalId?: string;
  fingerprint: string;
  subject?: string;
  messageText: string;
  parsed?: Record<string, unknown>;
  match?: Record<string, unknown>;
  status: 'received' | 'processed' | 'ignored' | 'duplicate' | 'failed';
  appliedAmount: number;
  errorMessage?: string;
  processedAt?: Date;
  createdBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentIngestionEventSchema = new Schema(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ['gmail', 'sms', 'manual'],
      required: true,
    },
    channelIdentifier: {
      type: String,
      trim: true,
      lowercase: true,
    },
    externalId: {
      type: String,
      trim: true,
    },
    fingerprint: {
      type: String,
      required: true,
      index: true,
    },
    subject: {
      type: String,
      trim: true,
    },
    messageText: {
      type: String,
      required: true,
    },
    parsed: {
      type: Schema.Types.Mixed,
    },
    match: {
      type: Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: ['received', 'processed', 'ignored', 'duplicate', 'failed'],
      default: 'received',
      index: true,
    },
    appliedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    errorMessage: {
      type: String,
    },
    processedAt: {
      type: Date,
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

PaymentIngestionEventSchema.index({ companyId: 1, fingerprint: 1 }, { unique: true });
PaymentIngestionEventSchema.index({ companyId: 1, createdAt: -1 });

export default mongoose.model<IPaymentIngestionEventDocument>(
  'PaymentIngestionEvent',
  PaymentIngestionEventSchema
);
