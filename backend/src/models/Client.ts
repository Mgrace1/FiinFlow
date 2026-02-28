import mongoose, { Schema, Document } from 'mongoose';
import { IClient } from '../types';

export interface IClientDocument extends IClient, Document {}

const ClientSchema: Schema = new Schema(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
    },
    contactPerson: {
      type: String,
      required: [true, 'Contact person is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for faster company-specific queries
ClientSchema.index({ companyId: 1, name: 1 });

export default mongoose.model<IClientDocument>('Client', ClientSchema);
