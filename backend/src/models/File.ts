import mongoose, { Schema, Document } from 'mongoose';
import { IFile, FileType } from '../types';

export interface IFileDocument extends IFile, Document {}

const FileSchema: Schema = new Schema(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required'],
      index: true,
    },
    type: {
      type: String,
      enum: ['proforma', 'invoice_pdf', 'service_attachment', 'payment_receipt', 'invoice', 'receipt'],
      required: [true, 'File type is required'],
    },
    path: {
      type: String,
      required: [true, 'File path is required'],
    },
    originalName: {
      type: String,
      required: [true, 'Original file name is required'],
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
    },
    size: {
      type: Number,
      required: [true, 'File size is required'],
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    approved: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for faster queries
FileSchema.index({ companyId: 1, type: 1 });
FileSchema.index({ companyId: 1, uploadedAt: -1 });

export default mongoose.model<IFileDocument>('File', FileSchema);
