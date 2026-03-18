import { Response } from 'express';
import Notification from '../models/Notification';
import Invoice from '../models/Invoice';
import { AuthRequest } from '../middleware/auth';

/**
 * Get all notifications for company
 */
export const getNotifications = async (req: AuthRequest, res: Response) =>{
  try {
    const isSuperAdmin = req.userRole === 'super_admin';
    const { unreadOnly } = req.query;

    // Ensure overdue invoice notifications exist (backfill safety)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const overdueInvoices = await Invoice.find({
      ...(isSuperAdmin ? {} : { companyId: req.companyId }),
      dueDate: { $lt: startOfToday },
      // Draft invoices must remain draft until explicitly sent.
      status: { $in: ['sent', 'overdue'] },
      $expr: {
        $lt: [
          { $ifNull: ['$amountPaid', 0] },
          { $ifNull: ['$totalAmount', '$amount'] },
        ],
      },
    })
      .select('_id invoiceNumber clientId companyId')
      .populate('clientId', 'name');

    for (const invoice of overdueInvoices) {
      const invoiceCompanyId = (invoice as any).companyId || req.companyId;
      const exists = await Notification.findOne({
        companyId: invoiceCompanyId,
        type: 'invoice_overdue',
        relatedInvoiceId: invoice._id,
        isRead: false,
      }).select('_id');

      if (exists) continue;

      if ((invoice as any).status !== 'overdue') {
        await Invoice.updateOne({ _id: invoice._id }, { status: 'overdue' });
      }

      await Notification.create({
        companyId: invoiceCompanyId,
        type: 'invoice_overdue',
        title: 'Invoice Overdue',
        message: `Invoice ${invoice.invoiceNumber} for ${(invoice.clientId as any)?.name || 'Unknown Client'} is now overdue.`,
        relatedInvoiceId: invoice._id,
      });
    }

    const filter: any = isSuperAdmin ? {} : { companyId: req.companyId };
    if (unreadOnly === 'true') {
      filter.isRead = false;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('relatedInvoiceId', 'invoiceNumber totalAmount')
      .populate('relatedUserId', 'name email');

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch notifications',
    });
  }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (req: AuthRequest, res: Response) =>{
  try {
    const isSuperAdmin = req.userRole === 'super_admin';
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        ...(isSuperAdmin ? {} : { companyId: req.companyId }),
      },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error: any) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to mark notification as read',
    });
  }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (req: AuthRequest, res: Response) =>{
  try {
    const isSuperAdmin = req.userRole === 'super_admin';
    await Notification.updateMany(
      {
        ...(isSuperAdmin ? {} : { companyId: req.companyId }),
        isRead: false,
      },
      { isRead: true }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error: any) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to mark all notifications as read',
    });
  }
};

/**
 * Delete notification
 */
export const deleteNotification = async (req: AuthRequest, res: Response) =>{
  try {
    const isSuperAdmin = req.userRole === 'super_admin';
    const { id } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      ...(isSuperAdmin ? {} : { companyId: req.companyId }),
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete notification',
    });
  }
};

/**
 * Create notification (helper function)
 */
export const createNotification = async (
  companyId: string,
  type: string,
  title: string,
  message: string,
  relatedInvoiceId?: string,
  relatedUserId?: string
) =>{
  try {
    await Notification.create({
      companyId,
      type,
      title,
      message,
      relatedInvoiceId,
      relatedUserId,
    });
  } catch (error) {
    console.error('Create notification error:', error);
  }
};
