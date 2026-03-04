import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentIngestionConnectionDocument extends Document {
  companyId: Schema.Types.ObjectId;
  channel: 'gmail' | 'sms_forward';
  identifier: string;
  displayName?: string;
  isActive: boolean;
  createdBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentIngestionConnectionSchema = new Schema(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ['gmail', 'sms_forward'],
      required: true,
    },
    identifier: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
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

PaymentIngestionConnectionSchema.index(
  { companyId: 1, channel: 1, identifier: 1 },
  { unique: true }
);

export default mongoose.model<IPaymentIngestionConnectionDocument>(
  'PaymentIngestionConnection',
  PaymentIngestionConnectionSchema
);
