import cron from 'node-cron';
import { Invoice, Notification } from '../models';

const hasOutstandingBalanceQuery = {
  $expr: {
    $lt: [
      { $ifNull: ['$amountPaid', 0] },
      { $ifNull: ['$totalAmount', '$amount'] },
    ],
  },
};

/**
 * Notify due-today invoices that still have outstanding balance
 * Runs daily at 08:00
 */
export const notifyInvoicesDueToday = () =>{
  cron.schedule('0 8 * * *', async () =>{
    try {
      console.log('Running due-today invoice reminder...');

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999);

      const dueTodayInvoices = await Invoice.find({
        dueDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['draft', 'sent', 'overdue'] },
        ...hasOutstandingBalanceQuery,
      }).populate('clientId', 'name');

      for (const invoice of dueTodayInvoices) {
        const existingToday = await Notification.findOne({
          companyId: invoice.companyId,
          type: 'invoice_due_today',
          relatedInvoiceId: invoice._id,
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        });

        if (existingToday) continue;

        await Notification.create({
          companyId: invoice.companyId,
          type: 'invoice_due_today',
          title: 'Invoice Payment Due Today',
          message: `Invoice ${invoice.invoiceNumber} for ${(invoice.clientId as any)?.name || 'Unknown Client'} is due today.`,
          relatedInvoiceId: invoice._id,
        });
      }

      console.log(`Due-today reminders created for ${dueTodayInvoices.length} invoice(s)`);
    } catch (error) {
      console.error('Error creating due-today reminders:', error);
    }
  });

  console.log('Due-today invoice reminder scheduled (runs daily at 08:00)');
};

/**
 * Check for overdue invoices and update their status
 * Runs daily at 00:00 (midnight)
 */
export const checkOverdueInvoices = () =>{
  cron.schedule('0 0 * * *', async () =>{
    try {
      console.log('Running overdue invoice check...');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find invoices that are past due date and not paid or overdue
      const overdueInvoices = await Invoice.find({
        dueDate: { $lt: today },
        status: { $in: ['draft', 'sent'] },
        ...hasOutstandingBalanceQuery,
      }).populate('clientId', 'name')
        .populate('companyId', 'name');

      console.log(`Found ${overdueInvoices.length} overdue invoices`);

      for (const invoice of overdueInvoices) {
        // Update invoice status to overdue
        invoice.status = 'overdue';
        await invoice.save();

        // Create notification
        await Notification.create({
          companyId: invoice.companyId,
          type: 'invoice_overdue',
          title: 'Invoice Overdue',
          message: `Invoice ${invoice.invoiceNumber} for ${(invoice.clientId as any)?.name || 'Unknown Client'} is now overdue.`,
          relatedInvoiceId: invoice._id,
        });

        console.log(`Updated invoice ${invoice.invoiceNumber} to overdue status`);
      }

      console.log('Overdue invoice check completed');
    } catch (error) {
      console.error('Error checking overdue invoices:', error);
    }
  });

  console.log('Overdue invoice cron job scheduled (runs daily at midnight)');
};

/**
 * Initialize all cron jobs
 */
export const initCronJobs = () =>{
  notifyInvoicesDueToday();
  checkOverdueInvoices();
  console.log('All cron jobs initialized');
};
