import mongoose, { Schema, Document } from 'mongoose';
import { Types } from 'mongoose';

export type NotificationType =
  | 'user_signup'
  | 'invoice_overdue'
  | 'invoice_paid'
  | 'invoice_sent'
  | 'budget_exceeded';

export interface INotification {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  relatedInvoiceId?: Types.ObjectId;
  relatedUserId?: Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationDocument extends INotification, Document {}

const NotificationSchema: Schema = new Schema(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required'],
      index: true,
    },
    type: {
      type: String,
      enum: ['user_signup', 'invoice_overdue', 'invoice_paid', 'invoice_sent', 'budget_exceeded'],
      required: [true, 'Notification type is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
    },
    relatedInvoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    relatedUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for faster queries
NotificationSchema.index({ companyId: 1, isRead: 1 });
NotificationSchema.index({ companyId: 1, createdAt: -1 });

export default mongoose.model<INotificationDocument>('Notification', NotificationSchema);
