import cron from 'node-cron';
import { Invoice, Notification } from '../models';

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
  checkOverdueInvoices();
  console.log('All cron jobs initialized');
};
