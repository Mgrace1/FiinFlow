import { Response } from 'express';
import Notification from '../models/Notification';
import { AuthRequest } from '../middleware/auth';

/**
 * Get all notifications for company
 */
export const getNotifications = async (req: AuthRequest, res: Response) =>{
  try {
    const { unreadOnly } = req.query;

    const filter: any = { companyId: req.companyId };
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
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        companyId: req.companyId,
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
    await Notification.updateMany(
      {
        companyId: req.companyId,
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
    const { id } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      companyId: req.companyId,
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
