import { Response } from 'express';
import PDFDocument from 'pdfkit';
import { AuthRequest } from '../middleware/auth';
import { Company, Invoice, Expense, User, Client } from '../models';
import path from 'path';
import fs from 'fs';

const truncateText = (value: string, maxLength: number) => {
  const text = String(value || '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(1, maxLength - 1))}…`;
};

const resolveGeneratedBy = (req: AuthRequest, currentUser?: { name?: string; email?: string } | null) => {
  const fromUser = currentUser?.name || currentUser?.email;
  const fromReqUser = (req as any)?.user?.name || (req as any)?.user?.email;
  return truncateText(String(fromUser || fromReqUser || 'System'), 42);
};

/**
 * Helper function to add company header to PDF
 */
const addCompanyHeader = (
  doc: PDFKit.PDFDocument,
  company: any,
  title: string
) =>{
  const brandColor = company.brandColor || '#2563EB';
  const displayName = company.displayName || company.name;

  // Add logo if available
  if (company.logoUrl) {
    try {
      const logoPath = path.join(__dirname, '../../uploads/company-logos', path.basename(company.logoUrl));
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 45, { width: 60 });
      }
    } catch (error) {
      console.error('Error loading logo:', error);
    }
  }

  // Company name
  doc.fontSize(18).fillColor(brandColor).font('Helvetica-Bold');
  doc.text(displayName, 120, 50, { align: 'left' });

  // Document title
  doc.fontSize(14).fillColor('#000000');
  doc.text(title, 400, 50, { align: 'right' });

  // Divider line
  doc.moveTo(50, 90).lineTo(550, 90).strokeColor(brandColor).lineWidth(2).stroke();

  return doc;
};

/**
 * Helper function to add footer
 */
const addFooter = (doc: PDFKit.PDFDocument, company: any, pageNum: number = 1) =>{
  const footerText = company.invoiceFooterText || 'Thank you for your business!';
  const today = new Date();
  const formattedDate = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`;

  doc.fontSize(10).fillColor('#666666').font('Helvetica-Oblique');
  doc.text(footerText, 50, 720, { align: 'center', width: 500 });
  doc.fontSize(8).fillColor('#999999').font('Helvetica');
  doc.text(`Generated on: ${formattedDate} | Page ${pageNum}`, 50, 740, { align: 'center', width: 500 });
};

const money = (value: number, currency: string) => {
  return `${new Intl.NumberFormat('en-RW', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value || 0)} ${currency}`;
};

const drawCard = (
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  bg: string = '#F8FAFC',
  border: string = '#E5E7EB'
) => {
  doc.save();
  doc.rect(x, y, width, height).fillColor(bg).fill();
  doc.rect(x, y, width, height).lineWidth(1).strokeColor(border).stroke();
  doc.restore();
};

const parseInvoiceLineItems = (description?: string) => {
  if (!description) return [];
  const lines = description.split('\n').map((line) => line.trim()).filter(Boolean);

  return lines.map((line) => {
    const itemMatch = line.match(/^(.*?):\s*(.*?)\s*\(x([\d.]+)\s*@\s*([\d.]+)\)$/i);
    if (itemMatch) {
      const product = itemMatch[1]?.trim() || 'Item';
      const itemDescription = itemMatch[2]?.trim() || '';
      const qty = Number(itemMatch[3]) || 1;
      const rate = Number(itemMatch[4]) || 0;
      return {
        product,
        description: itemDescription,
        qty,
        rate,
        amount: qty * rate,
      };
    }

    return {
      product: line,
      description: '',
      qty: 1,
      rate: 0,
      amount: 0,
    };
  });
};
/**
 * Generate Invoice PDF
 */
export const generateInvoicePDF = async (req: AuthRequest, res: Response) =>{
  try {
    const { invoiceId } = req.params;

    const invoice = await Invoice.findById(invoiceId)
      .populate('clientId')
      .populate('createdBy')
      .populate({
        path: 'attachments.fileId',
        model: 'File',
      })
      .populate({
        path: 'attachments.uploadedBy',
        model: 'User',
      });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    const userRole = req.userRole;
    if (userRole === 'staff' && invoice.createdBy?._id?.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only download invoices you created',
      });
    }

    const company = await Company.findById(req.companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found',
      });
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`
    );

    doc.pipe(res);

    const accentColor = String((company as any).brandColor || '#2563EB');
    const companyName = company.displayName || company.name || 'Company';
    const client = invoice.clientId as any;
    const clientName = client?.name || 'N/A';
    const clientEmail = client?.email || '';
    const clientPhone = client?.phone || '';
    const clientAddress = client?.address || '';
    const invoiceDate = new Date(invoice.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-');
    const dueDate = new Date(invoice.dueDate).toLocaleDateString('en-GB').replace(/\//g, '-');
    const lineItems = Array.isArray((invoice as any).items) && (invoice as any).items.length > 0
      ? (invoice as any).items.map((item: any) => ({
          product: item?.name || 'Item',
          description: item?.description || '',
          qty: Number(item?.quantity || 1),
          rate: Number(item?.rate || 0),
          amount: Number(item?.amount || (Number(item?.quantity || 1) * Number(item?.rate || 0))),
        }))
      : parseInvoiceLineItems(invoice.description);
    const subtotal = Number(invoice.amount) || 0;
    const taxAmount = invoice.taxApplied ? Number(invoice.totalAmount - invoice.amount) || 0 : 0;
    const total = Number(invoice.totalAmount) || subtotal;
    const companyDefaultInstructions = String((company as any).defaultPaymentInstructions || '').trim();
    const paymentLines = companyDefaultInstructions
      ? companyDefaultInstructions.split('\n').map((l) => l.trim()).filter(Boolean)
      : [
          `Mobile Money (MoMo): ${String(company.phone || 'Use your registered company number')}`,
          `Bank Transfer: Use reference ${String(invoice.invoiceNumber || '')}`,
          `Payment due by: ${dueDate}`,
        ];
    const invoiceTypeLabels: Record<string, string> = {
      standard: 'Invoice',
      proforma: 'Proforma Invoice',
      tax: 'Tax Invoice',
      commercial: 'Commercial Invoice',
      credit_note: 'Credit Note',
      debit_note: 'Debit Note',
    };
    const invoiceTypeKey = String((invoice as any).invoiceType || 'standard').trim().toLowerCase();
    const invoiceTypeLabel = invoiceTypeLabels[invoiceTypeKey] || String((invoice as any).invoiceType || 'Invoice');
    // Top left: company info
    doc.fontSize(20).fillColor('#1f2937').font('Helvetica-Bold');
    doc.text(companyName, 50, 56);
    doc.fontSize(11).fillColor('#334155').font('Helvetica');
    if (company.address) {
      doc.text(String(company.address), 50, 82, { width: 240 });
    }
    if (company.phone) {
      doc.text(String(company.phone), 50, 98);
    }

    // Top right: actual logo only (no placeholder)
    if (company.logoUrl) {
      try {
        const logoPath = path.join(__dirname, '../../uploads/company-logos', path.basename(company.logoUrl));
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 346, 62, { fit: [190, 42], align: 'center', valign: 'center' });
        }
      } catch {
        // Intentionally ignore logo rendering failures.
      }
    }

    // Invoice title
    const titleText = invoiceTypeLabel.toUpperCase();
    const titleFontSize = titleText.length > 12 ? 28 : 42;
    const titleLetterSpacing = titleText.length > 12 ? 1 : 2;
    doc.fontSize(titleFontSize).fillColor(accentColor).font('Helvetica-Bold');
    doc.text(titleText, 300, 142, { width: 250, align: 'right', characterSpacing: titleLetterSpacing });

    // Bill to
    doc.fontSize(13).fillColor(accentColor).font('Helvetica-Bold');
    doc.text('Bill To', 50, 236);
    doc.fontSize(18).fillColor('#1f2937').font('Helvetica-Bold');
    doc.text(clientName, 50, 256);
    doc.fontSize(11).fillColor('#334155').font('Helvetica');
    let clientLineY = 281;
    if (clientAddress) {
      doc.text(clientAddress, 50, clientLineY, { width: 250 });
      clientLineY += 16;
    }
    if (clientEmail) {
      doc.text(clientEmail, 50, clientLineY, { width: 250 });
      clientLineY += 16;
    }
    if (clientPhone) {
      doc.text(clientPhone, 50, clientLineY, { width: 250 });
    }

    // Invoice meta (right) — no Type or Generated By
    doc.fontSize(13).fillColor(accentColor).font('Helvetica-Bold');
    doc.text('Invoice #', 360, 234, { width: 95 });
    doc.text('Invoice date', 360, 258, { width: 95 });
    doc.text('Due date', 360, 282, { width: 95 });
    doc.fontSize(13).fillColor('#1f2937').font('Helvetica');
    doc.text(String(invoice.invoiceNumber || ''), 420, 234, { width: 130, align: 'right' });
    doc.text(invoiceDate, 420, 258, { width: 130, align: 'right' });
    doc.text(dueDate, 420, 282, { width: 130, align: 'right' });

    // Items table
    const tableY = 365;
    doc.rect(50, tableY, 500, 24).fillColor(accentColor).fill();
    doc.fontSize(11).fillColor('#ffffff').font('Helvetica-Bold');
    doc.text('QTY', 60, tableY + 7, { width: 45 });
    doc.text('Description', 112, tableY + 7, { width: 250 });
    doc.text('Unit Price', 390, tableY + 7, { width: 70, align: 'right' });
    doc.text('Amount', 470, tableY + 7, { width: 70, align: 'right' });

    let rowY = tableY + 30;
    const rows = lineItems.length > 0 ? lineItems : [{
      product: invoice.description || 'Invoice item',
      description: '',
      qty: 1,
      rate: subtotal,
      amount: subtotal,
    }];
    const maxRows = 10;
    rows.slice(0, maxRows).forEach((item: any) => {
      doc.fontSize(11).fillColor('#111827').font('Helvetica');
      doc.text(Number(item.qty || 0).toFixed(2), 60, rowY, { width: 45 });
      const desc = `${String(item.product || '')}${item.description ? ` ${String(item.description)}` : ''}`.trim();
      doc.text(desc, 112, rowY, { width: 250 });
      doc.text(new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(item.rate || 0)), 390, rowY, { width: 70, align: 'right' });
      doc.text(new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(item.amount || 0)), 470, rowY, { width: 70, align: 'right' });
      rowY += 30;
    });
    if (rows.length > maxRows) {
      doc.fontSize(10).fillColor('#6b7280').font('Helvetica-Oblique');
      doc.text(`+ ${rows.length - maxRows} more items`, 112, rowY, { width: 250 });
      rowY += 18;
    }

    doc.moveTo(50, rowY - 8).lineTo(550, rowY - 8).strokeColor('#9CA3AF').lineWidth(1).stroke();

    // Totals
    const totalsXLabel = 330;
    const totalsXVal = 470;
    const numFmt = (v: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
    let totalsY = rowY + 4;
    doc.fontSize(14).fillColor('#1f2937').font('Helvetica');
    doc.text('Subtotal', totalsXLabel, totalsY, { width: 120 });
    doc.text(numFmt(subtotal), totalsXVal, totalsY, { width: 70, align: 'right' });
    totalsY += 26;
    if (invoice.taxApplied && taxAmount > 0) {
      doc.text(`Tax (${invoice.taxRate || 0}%)`, totalsXLabel, totalsY, { width: 120 });
      doc.text(numFmt(taxAmount), totalsXVal, totalsY, { width: 70, align: 'right' });
      totalsY += 26;
    }
    doc.moveTo(totalsXLabel, totalsY).lineTo(550, totalsY).strokeColor(accentColor).lineWidth(1).stroke();
    totalsY += 8;
    doc.fontSize(15).fillColor(accentColor).font('Helvetica-Bold');
    doc.text(`Total (${invoice.currency || 'RWF'})`, totalsXLabel, totalsY, { width: 120 });
    doc.text(numFmt(total), totalsXVal, totalsY, { width: 70, align: 'right' });

    // How to pay
    const termsY = 700;
    doc.fontSize(13).fillColor(accentColor).font('Helvetica-Bold');
    doc.text('How to Pay', 50, termsY);
    doc.fontSize(11).fillColor('#374151').font('Helvetica');
    paymentLines.forEach((line, index) => {
      doc.text(line, 50, termsY + 24 + (index * 18), { width: 500 });
    });

    doc.end();
  } catch (error: any) {
    console.error('Generate invoice PDF error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate invoice PDF',
      });
    }
  }
};

/**
 * Generate Expenses List PDF
 */
export const generateExpensesPDF = async (req: AuthRequest, res: Response) =>{
  try {
    const expenses = await Expense.find({ companyId: req.companyId })
      .populate('createdBy')
      .sort({ date: -1 });

    const company = await Company.findById(req.companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found',
      });
    }

    const currentUser = await User.findById(req.userId).select('name email').lean();
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=expenses-report.pdf');
    doc.pipe(res);

    const FONT_REGULAR = 'Helvetica';
    const FONT_BOLD = 'Helvetica-Bold';
    const accentColor = '#4f8b80';
    const companyName = company.displayName || company.name || 'Company';
    const reportDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    const generatedBy = resolveGeneratedBy(req, currentUser as any);
    const totalsByCurrency = expenses.reduce<Record<string, number>>((acc, exp: any) => {
      const key = String(exp.currency || 'RWF');
      acc[key] = (acc[key] || 0) + Number(exp.amount || 0);
      return acc;
    }, {});
    const paidCount = expenses.filter((exp: any) => exp.paymentStatus === 'paid').length;
    const pendingCount = expenses.filter((exp: any) => exp.paymentStatus !== 'paid').length;
    const mostUsedCurrency = Object.keys(totalsByCurrency)[0] || 'RWF';
    const primaryTotal = totalsByCurrency[mostUsedCurrency] || 0;
    let pageNum = 1;

    const drawFooter = (page: number) => {
      doc.fontSize(9).fillColor('#64748b').font(FONT_REGULAR);
      doc.text(`Generated on ${reportDate} | Page ${page}`, 50, 772, { width: 500, align: 'center' });
    };

    const drawHeader = (isFirstPage: boolean) => {
      if (!isFirstPage) {
        // For continuation pages, avoid rendering report heading blocks.
        // This keeps page 2+ focused on continued table rows only.
        return;
      }

      doc.fontSize(20).fillColor('#1f2937').font(FONT_BOLD);
      doc.text(companyName, 50, 56);
      doc.fontSize(11).fillColor('#334155').font(FONT_REGULAR);
      if (company.address) doc.text(String(company.address), 50, 82, { width: 240 });
      if (company.phone) doc.text(String(company.phone), 50, 98);

      if (company.logoUrl) {
        try {
          const logoPath = path.join(__dirname, '../../uploads/company-logos', path.basename(company.logoUrl));
          if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 346, 62, { fit: [190, 42], align: 'center', valign: 'center' });
          }
        } catch {
          // Intentionally ignore logo rendering failures.
        }
      }

      doc.fontSize(34).fillColor(accentColor).font(FONT_BOLD);
      doc.text('EXPENSES REPORT', 280, 142, { width: 270, align: 'right', characterSpacing: 1 });

      doc.fontSize(12).fillColor(accentColor).font(FONT_BOLD);
      doc.text('Report date', 330, 232, { width: 125 });
      doc.text('Generated by', 330, 254, { width: 125 });
      doc.fontSize(12).fillColor('#1f2937').font(FONT_REGULAR);
      doc.text(reportDate, 420, 232, { width: 130, align: 'right' });
      doc.text(generatedBy, 420, 254, { width: 130, align: 'right' });

      {
        const cardY = 286;
        const cardW = 158;
        const gap = 13;
        const cards = [
          { label: 'Total expenses', value: `${new Intl.NumberFormat('en-US').format(primaryTotal)} ${mostUsedCurrency}` },
          { label: 'Paid', value: `${paidCount}` },
          { label: 'Pending', value: `${pendingCount}` },
        ];
        cards.forEach((card, idx) => {
          const x = 50 + idx * (cardW + gap);
          doc.rect(x, cardY, cardW, 58).fillColor('#f2f7f5').fill();
          doc.rect(x, cardY, cardW, 58).lineWidth(1).strokeColor('#c8ddd7').stroke();
          doc.fontSize(10).fillColor('#4b5563').font(FONT_REGULAR);
          doc.text(card.label, x + 10, cardY + 10, { width: cardW - 20 });
          doc.fontSize(16).fillColor('#1f2937').font(FONT_BOLD);
          doc.text(card.value, x + 10, cardY + 28, { width: cardW - 20 });
        });
      }
    };

    const drawTableHeader = (y: number) => {
      doc.rect(50, y, 500, 24).fillColor(accentColor).fill();
      doc.fontSize(10).fillColor('#ffffff').font(FONT_BOLD);
      doc.text('Date', 60, y + 7, { width: 62 });
      doc.text('Supplier', 128, y + 7, { width: 150 });
      doc.text('Category', 282, y + 7, { width: 90 });
      doc.text('Status', 376, y + 7, { width: 78 });
      doc.text('Amount', 460, y + 7, { width: 80, align: 'right' });
    };

    drawHeader(true);
    let tableY = 365;
    drawTableHeader(tableY);
    let yPos = tableY + 30;

    const formatDate = (value: any) => new Date(value).toLocaleDateString('en-GB').replace(/\//g, '-');
    const fit = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 3)}...` : value);

    expenses.forEach((expense: any) => {
      if (yPos > 720) {
        drawFooter(pageNum);
        doc.addPage();
        pageNum += 1;
        drawHeader(false);
        tableY = 50;
        drawTableHeader(tableY);
        yPos = tableY + 30;
      }

      const status = String(expense.paymentStatus || 'pending').toLowerCase();
      const statusLabel = status === 'paid' ? 'Paid' : 'Pending';
      const statusColor = status === 'paid' ? '#15803d' : '#b45309';
      const supplier = fit(String(expense.supplier || 'N/A'), 28);
      const category = fit(String(expense.category || 'General'), 18);
      const amountText = `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(expense.amount || 0))} ${expense.currency || 'RWF'}`;

      doc.fontSize(10).fillColor('#111827').font(FONT_REGULAR);
      doc.text(formatDate(expense.dueDate || expense.createdAt), 60, yPos, { width: 62 });
      doc.text(supplier, 128, yPos, { width: 150 });
      doc.text(category, 282, yPos, { width: 90 });
      doc.fillColor(statusColor).font(FONT_BOLD).text(statusLabel, 376, yPos, { width: 78 });
      doc.fillColor('#111827').font(FONT_REGULAR).text(amountText, 460, yPos, { width: 80, align: 'right' });

      doc.moveTo(50, yPos + 16).lineTo(550, yPos + 16).strokeColor('#e5e7eb').lineWidth(1).stroke();
      yPos += 22;
    });

    if (yPos > 700) {
      drawFooter(pageNum);
      doc.addPage();
      pageNum += 1;
      drawHeader(false);
      yPos = 60;
    }

    doc.fontSize(12).fillColor(accentColor).font(FONT_BOLD);
    doc.text('Totals by currency', 50, yPos + 10);
    let totalsY = yPos + 30;
    Object.entries(totalsByCurrency).forEach(([currency, value]) => {
      doc.fontSize(11).fillColor('#1f2937').font(FONT_REGULAR);
      doc.text(`${currency}: ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value)}`, 50, totalsY);
      totalsY += 16;
    });

    drawFooter(pageNum);
    doc.end();
  } catch (error: any) {
    console.error('Generate expenses PDF error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate expenses PDF',
      });
    }
  }
};

/**
 * Helper function to draw a box with background and border
 */
const drawRoundedBox = (
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  fillColor: string,
  strokeColor: string = '#E5E7EB',
  cornerRadius: number = 5
) =>{
  // Draw filled rectangle with border
  doc.rect(x, y, width, height)
    .fillColor(fillColor)
    .fill()
    .strokeColor(strokeColor)
    .lineWidth(0.5)
    .stroke();
};

/**
 * Helper function to add a metric card
 */
const addMetricCard = (
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  value: string,
  valueColor: string = '#000000',
  bgColor: string = '#F9FAFB'
) =>{
  // Draw card background
  drawRoundedBox(doc, x, y, width, height, bgColor, '#E5E7EB', 8);
  
  // Add label
  doc.fontSize(9).fillColor('#6B7280').font('Helvetica');
  doc.text(label, x + 12, y + 10, { width: width - 24 });
  
  // Add value
  doc.fontSize(16).fillColor(valueColor).font('Helvetica-Bold');
  doc.text(value, x + 12, y + 25, { width: width - 24 });
};

/**
 * Generate Dashboard Summary PDF
 */
export const generateSummaryPDF = async (req: AuthRequest, res: Response) =>{
  try {
    const company = await Company.findById(req.companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found',
      });
    }

    const currentUser = await User.findById(req.userId).select('name email').lean();
    const allInvoices = await Invoice.find({ companyId: req.companyId }).populate('clientId');
    const totalInvoices = allInvoices.length;
    const paidInvoices = allInvoices.filter((inv) =>inv.status === 'paid');
    const paidCount = paidInvoices.length;
    const paidAmount = paidInvoices.reduce((sum, inv) =>sum + inv.totalAmount, 0);
    const pendingInvoices = allInvoices.filter((inv) =>inv.status === 'sent');
    const pendingCount = pendingInvoices.length;
    const pendingAmount = pendingInvoices.reduce((sum, inv) =>sum + inv.totalAmount, 0);
    const overdueInvoices = allInvoices.filter((inv) =>inv.status === 'overdue');
    const overdueCount = overdueInvoices.length;
    const overdueAmount = overdueInvoices.reduce((sum, inv) =>sum + inv.totalAmount, 0);
    const draftInvoices = allInvoices.filter((inv) =>inv.status === 'draft');
    const draftCount = draftInvoices.length;

    const allExpenses = await Expense.find({ companyId: req.companyId }).populate('createdBy');
    const totalExpenses = allExpenses.reduce((sum, exp) =>sum + exp.amount, 0);
    const expenseCount = allExpenses.length;

    const netIncome = paidAmount - totalExpenses;
    const profitMargin = paidAmount > 0 ? ((netIncome / paidAmount) * 100).toFixed(1) : '0.0';

    const latestInvoices = allInvoices
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 12);
    const latestExpenses = allExpenses
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
      .slice(0, 12);

    const accentColor = '#4f8b80';
    const FONT_REGULAR = 'Helvetica';
    const FONT_BOLD = 'Helvetica-Bold';
    const companyName = company.displayName || company.name || 'Company';
    const reportDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    const generatedBy = resolveGeneratedBy(req, currentUser as any);
    const currency = company.defaultCurrency || 'RWF';

    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
    const today = new Date();
    const monthly = Array.from({ length: 6 }).map((_, idx) => {
      const d = new Date(today.getFullYear(), today.getMonth() - (5 - idx), 1);
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: monthFormatter.format(d),
        revenue: 0,
        expense: 0,
      };
    });
    const monthlyMap = new Map(monthly.map((m) => [m.key, m]));
    paidInvoices.forEach((inv) => {
      const d = new Date(inv.paidAt || inv.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const row = monthlyMap.get(key);
      if (row) row.revenue += Number(inv.totalAmount || 0);
    });
    allExpenses.forEach((exp: any) => {
      const d = new Date(exp.dueDate || exp.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const row = monthlyMap.get(key);
      if (row) row.expense += Number(exp.amount || 0);
    });

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    const dateSlug = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Disposition', `attachment; filename=financial-summary-${dateSlug}.pdf`);
    doc.pipe(res);

    let pageNum = 1;
    const drawFooter = () => {
      doc.fontSize(9).fillColor('#64748b').font(FONT_REGULAR);
      doc.text(`Generated on ${reportDate} | Page ${pageNum}`, 50, 772, { width: 500, align: 'center' });
    };

    const drawHeader = (compact = false, title = 'FINANCIAL SUMMARY REPORT') => {
      if (compact) {
        doc.fontSize(16).fillColor('#1f2937').font(FONT_BOLD);
        doc.text(companyName, 50, 46);
        doc.fontSize(13).fillColor(accentColor).font(FONT_BOLD);
        doc.text(title, 300, 48, { width: 250, align: 'right' });
        doc.fontSize(10).fillColor('#475569').font(FONT_REGULAR);
        doc.text(`Date: ${reportDate}`, 50, 68);
        doc.text(`Generated by: ${generatedBy}`, 280, 68, { width: 270, align: 'right' });
        doc.moveTo(50, 88).lineTo(550, 88).strokeColor('#cbd5e1').lineWidth(1).stroke();
        return 104;
      }

      doc.fontSize(20).fillColor('#1f2937').font(FONT_BOLD);
      doc.text(companyName, 50, 56);
      doc.fontSize(11).fillColor('#334155').font(FONT_REGULAR);
      if (company.address) doc.text(String(company.address), 50, 82, { width: 240 });
      if (company.phone) doc.text(String(company.phone), 50, 98);

      if (company.logoUrl) {
        try {
          const logoPath = path.join(__dirname, '../../uploads/company-logos', path.basename(company.logoUrl));
          if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 346, 62, { fit: [190, 42], align: 'center', valign: 'center' });
          }
        } catch {
          // Intentionally ignore logo rendering failures.
        }
      }

      doc.fontSize(30).fillColor(accentColor).font(FONT_BOLD);
      doc.text('FINANCIAL SUMMARY', 280, 142, { width: 270, align: 'right', characterSpacing: 1 });

      doc.fontSize(12).fillColor(accentColor).font(FONT_BOLD);
      doc.text('Report date', 330, 232, { width: 125 });
      doc.text('Generated by', 330, 254, { width: 125 });
      doc.fontSize(12).fillColor('#1f2937').font(FONT_REGULAR);
      doc.text(reportDate, 420, 232, { width: 130, align: 'right' });
      doc.text(generatedBy, 420, 254, { width: 130, align: 'right' });
      return 286;
    };

    const drawCard = (x: number, y: number, w: number, label: string, value: string, color = '#1f2937') => {
      doc.rect(x, y, w, 58).fillColor('#f2f7f5').fill();
      doc.rect(x, y, w, 58).lineWidth(1).strokeColor('#c8ddd7').stroke();
      doc.fontSize(10).fillColor('#4b5563').font(FONT_REGULAR);
      doc.text(label, x + 10, y + 10, { width: w - 20 });
      doc.fontSize(15).fillColor(color).font(FONT_BOLD);
      doc.text(value, x + 10, y + 28, { width: w - 20 });
    };

    const drawSectionTitle = (text: string, y: number) => {
      doc.fontSize(12).fillColor(accentColor).font(FONT_BOLD);
      doc.text(text, 50, y);
    };

    const renderTableHeader = (y: number, cols: Array<{ label: string; x: number; w?: number; align?: 'left' | 'right' }>) => {
      doc.rect(50, y, 500, 24).fillColor(accentColor).fill();
      doc.fontSize(10).fillColor('#ffffff').font(FONT_BOLD);
      cols.forEach((col) => doc.text(col.label, col.x, y + 7, { width: col.w, align: col.align }));
    };

    const invoiceHealth = [
      { label: 'Paid', value: paidCount, color: '#16a34a' },
      { label: 'Pending', value: pendingCount, color: '#0ea5e9' },
      { label: 'Overdue', value: overdueCount, color: '#f59e0b' },
      { label: 'Draft', value: draftCount, color: '#6b7280' },
    ];
    const maxHealth = Math.max(1, ...invoiceHealth.map((x) => x.value));

    const categoryMap = new Map<string, number>();
    allExpenses.forEach((exp: any) => {
      const key = String(exp.category || 'General');
      categoryMap.set(key, (categoryMap.get(key) || 0) + Number(exp.amount || 0));
    });
    const topCategories = Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    const maxCategory = Math.max(1, ...topCategories.map((c) => c.value));

    const netSeries = monthly.map((m) => ({ label: m.label, value: m.revenue - m.expense }));
    const maxNetAbs = Math.max(1, ...netSeries.map((n) => Math.abs(n.value)));

    let y = drawHeader(false);
    const cardW = 158;
    const gap = 13;
    drawCard(50, y, cardW, 'Revenue', money(paidAmount, currency), '#15803d');
    drawCard(50 + cardW + gap, y, cardW, 'Expenses', money(totalExpenses, currency), '#b91c1c');
    drawCard(50 + (cardW + gap) * 2, y, cardW, 'Net Income', money(netIncome, currency), netIncome >= 0 ? '#15803d' : '#b91c1c');
    y += 74;
    drawCard(50, y, cardW, 'Total invoices', String(totalInvoices));
    drawCard(50 + cardW + gap, y, cardW, 'Paid / Pending', `${paidCount} / ${pendingCount}`);
    drawCard(50 + (cardW + gap) * 2, y, cardW, 'Overdue / Draft', `${overdueCount} / ${draftCount}`);
    y += 82;

    drawSectionTitle('Income vs Expenses (last 6 months)', y);
    y += 18;
    const chart1X = 50;
    const chart1Y = y;
    const chart1W = 500;
    const chart1H = 130;
    doc.rect(chart1X, chart1Y, chart1W, chart1H).lineWidth(1).strokeColor('#dbe5e2').stroke();
    const maxIncomeExpense = Math.max(1, ...monthly.map((m) => Math.max(m.revenue, m.expense)));
    const slotW = chart1W / monthly.length;
    monthly.forEach((m, i) => {
      const x = chart1X + i * slotW + 16;
      const revH = (m.revenue / maxIncomeExpense) * (chart1H - 32);
      const expH = (m.expense / maxIncomeExpense) * (chart1H - 32);
      doc.rect(x, chart1Y + chart1H - revH - 14, 12, revH).fillColor('#16a34a').fill();
      doc.rect(x + 16, chart1Y + chart1H - expH - 14, 12, expH).fillColor('#ea580c').fill();
      doc.fontSize(8).fillColor('#475569').font(FONT_REGULAR);
      doc.text(m.label, x - 4, chart1Y + chart1H - 10, { width: 38, align: 'center' });
    });
    doc.fontSize(9).fillColor('#16a34a').font(FONT_BOLD).text('Income', 54, chart1Y + 6);
    doc.fontSize(9).fillColor('#ea580c').font(FONT_BOLD).text('Expenses', 102, chart1Y + 6);
    y += 152;

    drawSectionTitle('Invoice Health', y);
    y += 18;
    const healthX = 50;
    const healthY = y;
    const healthW = 500;
    const healthH = 105;
    doc.rect(healthX, healthY, healthW, healthH).lineWidth(1).strokeColor('#dbe5e2').stroke();
    invoiceHealth.forEach((item, idx) => {
      const rowY = healthY + 12 + idx * 22;
      const barW = (Math.max(0, item.value) / maxHealth) * 280;
      doc.fontSize(9).fillColor('#334155').font(FONT_REGULAR);
      doc.text(item.label, healthX + 10, rowY + 3, { width: 70 });
      doc.rect(healthX + 84, rowY, 290, 12).fillColor('#e2e8f0').fill();
      doc.rect(healthX + 84, rowY, barW, 12).fillColor(item.color).fill();
      doc.fontSize(9).fillColor('#111827').font(FONT_BOLD);
      doc.text(String(item.value), healthX + 390, rowY + 2, { width: 40, align: 'right' });
    });
    drawFooter();

    doc.addPage();
    pageNum += 1;
    y = drawHeader(true, 'Financial Summary Charts');

    drawSectionTitle('Net Cashflow (Income - Expenses)', y);
    y += 18;
    const netX = 50;
    const netY = y;
    const netW = 500;
    const netH = 145;
    doc.rect(netX, netY, netW, netH).lineWidth(1).strokeColor('#dbe5e2').stroke();
    const axisY = netY + (netH / 2);
    doc.moveTo(netX + 8, axisY).lineTo(netX + netW - 8, axisY).strokeColor('#94a3b8').lineWidth(1).stroke();
    const netSlot = netW / monthly.length;
    let prevX = 0;
    let prevY = 0;
    netSeries.forEach((point, i) => {
      const px = netX + i * netSlot + netSlot / 2;
      const py = axisY - ((point.value / maxNetAbs) * ((netH / 2) - 20));
      if (i > 0) {
        doc.moveTo(prevX, prevY).lineTo(px, py).strokeColor('#4f8b80').lineWidth(2).stroke();
      }
      doc.circle(px, py, 3).fillColor('#4f8b80').fill();
      doc.fontSize(8).fillColor('#475569').font(FONT_REGULAR);
      doc.text(point.label, px - 12, netY + netH - 12, { width: 24, align: 'center' });
      prevX = px;
      prevY = py;
    });
    y += 167;

    drawSectionTitle('Categories Spent', y);
    y += 18;
    const catX = 50;
    const catY = y;
    const catW = 500;
    const catH = 260;
    doc.rect(catX, catY, catW, catH).lineWidth(1).strokeColor('#dbe5e2').stroke();
    if (topCategories.length === 0) {
      doc.fontSize(10).fillColor('#6b7280').font(FONT_REGULAR);
      doc.text('No expense categories found.', catX + 12, catY + 16);
    } else {
      topCategories.forEach((cat, idx) => {
        const rowY = catY + 14 + idx * 38;
        const barW = (cat.value / maxCategory) * 280;
        doc.fontSize(10).fillColor('#334155').font(FONT_REGULAR);
        doc.text(cat.name.slice(0, 20), catX + 10, rowY + 3, { width: 120 });
        doc.rect(catX + 136, rowY, 292, 14).fillColor('#e2e8f0').fill();
        doc.rect(catX + 136, rowY, barW, 14).fillColor('#4f8b80').fill();
        doc.fontSize(10).fillColor('#111827').font(FONT_BOLD);
        doc.text(money(cat.value, currency), catX + 432, rowY + 1, { width: 60, align: 'right' });
      });
    }
    drawFooter();

    doc.addPage();
    pageNum += 1;
    y = drawHeader(true, 'Recent Transactions');

    drawSectionTitle('Recent invoices', y);
    y += 16;
    renderTableHeader(y, [
      { label: 'Invoice #', x: 60, w: 80 },
      { label: 'Client', x: 145, w: 140 },
      { label: 'Status', x: 290, w: 90 },
      { label: 'Amount', x: 430, w: 110, align: 'right' },
    ]);
    y += 30;
    if (latestInvoices.length === 0) {
      doc.fontSize(10).fillColor('#6b7280').font(FONT_REGULAR);
      doc.text('No invoices found', 50, y);
      y += 20;
    } else {
      latestInvoices.slice(0, 6).forEach((inv) => {
        doc.fontSize(10).fillColor('#111827').font(FONT_REGULAR);
        doc.text(String(inv.invoiceNumber || ''), 60, y, { width: 80 });
        doc.text(String(((inv.clientId as any)?.name || 'N/A')).slice(0, 26), 145, y, { width: 140 });
        doc.text(String(inv.status || '').toUpperCase(), 290, y, { width: 90 });
        doc.text(money(Number(inv.totalAmount || 0), (inv as any).currency || currency), 430, y, { width: 110, align: 'right' });
        doc.moveTo(50, y + 14).lineTo(550, y + 14).strokeColor('#e5e7eb').lineWidth(1).stroke();
        y += 19;
      });
    }

    y += 18;
    drawSectionTitle('Recent expenses', y);
    y += 16;
    renderTableHeader(y, [
      { label: 'Date', x: 60, w: 86 },
      { label: 'Supplier', x: 150, w: 170 },
      { label: 'Category', x: 325, w: 92 },
      { label: 'Amount', x: 430, w: 110, align: 'right' },
    ]);
    y += 30;
    if (latestExpenses.length === 0) {
      doc.fontSize(10).fillColor('#6b7280').font(FONT_REGULAR);
      doc.text('No expenses found', 50, y);
    } else {
      latestExpenses.slice(0, 8).forEach((exp: any) => {
        const expDate = new Date(exp.dueDate || exp.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-');
        doc.fontSize(10).fillColor('#111827').font(FONT_REGULAR);
        doc.text(expDate, 60, y, { width: 86 });
        doc.text(String(exp.supplier || 'N/A').slice(0, 30), 150, y, { width: 170 });
        doc.text(String(exp.category || 'General').slice(0, 18), 325, y, { width: 92 });
        doc.text(money(Number(exp.amount || 0), exp.currency || currency), 430, y, { width: 110, align: 'right' });
        doc.moveTo(50, y + 14).lineTo(550, y + 14).strokeColor('#e5e7eb').lineWidth(1).stroke();
        y += 19;
      });
    }

    doc.fontSize(10).fillColor('#64748b').font(FONT_REGULAR);
    doc.text(
      `Summary: ${paidCount} paid, ${pendingCount} pending, ${overdueCount} overdue, ${draftCount} draft | ${expenseCount} expenses | Profit margin ${profitMargin}%`,
      50,
      738,
      { width: 500, align: 'left' }
    );
    drawFooter();
    doc.end();
  } catch (error: any) {
    console.error('Generate summary PDF error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate summary PDF',
      });
    }
  }
};

/**
 * Get performance analytics for clients and team members
 */
export const getPerformanceAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.companyId;
    const { startDate, endDate } = req.query;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Build date filter for the selected period
    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = new Date(startDate as string);
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }
    const invoiceFilter: any = { companyId };
    const expenseFilter: any = { companyId };
    if (Object.keys(dateFilter).length > 0) {
      invoiceFilter.createdAt = dateFilter;
      expenseFilter.dueDate = dateFilter;
    }

    const [invoices, expenses, clients, users] = await Promise.all([
      Invoice.find(invoiceFilter).select('clientId createdBy status totalAmount dueDate paidAt createdAt'),
      Expense.find(expenseFilter).select('createdBy amount paymentStatus dueDate createdAt'),
      Client.find({ companyId }).select('name email'),
      User.find({ companyId }).select('name email role status'),
    ]);

    const clientMap = new Map(
      clients.map((c: any) => [
        String(c._id),
        {
          clientId: String(c._id),
          clientName: c.name,
          clientEmail: c.email || '',
          totalInvoices: 0,
          paidInvoices: 0,
          overdueInvoices: 0,
          totalBilled: 0,
          totalCollected: 0,
          onTimePayments: 0,
          performanceScore: 0,
        },
      ])
    );

    invoices.forEach((inv: any) => {
      const key = String(inv.clientId || '');
      if (!key || !clientMap.has(key)) return;
      const row: any = clientMap.get(key);
      row.totalInvoices += 1;
      row.totalBilled += Number(inv.totalAmount || 0);

      if (inv.status === 'paid') {
        row.paidInvoices += 1;
        row.totalCollected += Number(inv.totalAmount || 0);
        const paidAt = inv.paidAt ? new Date(inv.paidAt) : null;
        const dueAt = inv.dueDate ? new Date(inv.dueDate) : null;
        if (paidAt && dueAt && paidAt.getTime() <= dueAt.getTime()) {
          row.onTimePayments += 1;
        }
      }
      if (inv.status === 'overdue') {
        row.overdueInvoices += 1;
      }
    });

    const clientsPerformance = Array.from(clientMap.values())
      .map((row: any) => {
        const paidRate = row.totalInvoices > 0 ? row.paidInvoices / row.totalInvoices : 0;
        const onTimeRate = row.paidInvoices > 0 ? row.onTimePayments / row.paidInvoices : 0;
        const collectionRate = row.totalBilled > 0 ? row.totalCollected / row.totalBilled : 0;
        const overdueRate = row.totalInvoices > 0 ? row.overdueInvoices / row.totalInvoices : 0;
        const score = (
          (collectionRate * 40) +
          (paidRate * 30) +
          (onTimeRate * 20) +
          ((1 - overdueRate) * 10)
        );

        row.performanceScore = Math.max(0, Math.min(100, Number(score.toFixed(1))));
        row.paidRate = Number((paidRate * 100).toFixed(1));
        row.onTimeRate = Number((onTimeRate * 100).toFixed(1));
        row.collectionRate = Number((collectionRate * 100).toFixed(1));
        row.overdueRate = Number((overdueRate * 100).toFixed(1));
        return row;
      })
      .sort((a: any, b: any) => b.performanceScore - a.performanceScore)
      .map((row: any, index: number) => ({ ...row, rank: index + 1 }));

    const memberMap = new Map(
      users.map((u: any) => [
        String(u._id),
        {
          userId: String(u._id),
          userName: u.name,
          userEmail: u.email,
          role: u.role,
          invoiceCount: 0,
          paidInvoiceCount: 0,
          revenueCollected: 0,
          expenseCount: 0,
          expenseAmount: 0,
          performanceScore: 0,
        },
      ])
    );

    invoices.forEach((inv: any) => {
      const key = String(inv.createdBy || '');
      if (!key || !memberMap.has(key)) return;
      const row: any = memberMap.get(key);
      row.invoiceCount += 1;
      if (inv.status === 'paid') {
        row.paidInvoiceCount += 1;
        row.revenueCollected += Number(inv.totalAmount || 0);
      }
    });

    expenses.forEach((exp: any) => {
      const key = String(exp.createdBy || '');
      if (!key || !memberMap.has(key)) return;
      const row: any = memberMap.get(key);
      row.expenseCount += 1;
      row.expenseAmount += Number(exp.amount || 0);
    });

    const teamRows = Array.from(memberMap.values());
    const maxInvoicesByMember = Math.max(1, ...teamRows.map((row: any) => Number(row.invoiceCount || 0)));
    const maxRevenueByMember = Math.max(1, ...teamRows.map((row: any) => Number(row.revenueCollected || 0)));

    const teamPerformance = teamRows
      .map((row: any) => {
        const conversionRate = row.invoiceCount > 0 ? row.paidInvoiceCount / row.invoiceCount : 0;
        const productivityRate = row.invoiceCount / maxInvoicesByMember;
        const revenueImpactRate = row.revenueCollected / maxRevenueByMember;
        const expenseControlRate = row.revenueCollected > 0
          ? Math.max(0, 1 - (row.expenseAmount / row.revenueCollected))
          : row.expenseAmount > 0 ? 0 : 0.5;
        const score = (
          (conversionRate * 35) +
          (productivityRate * 20) +
          (revenueImpactRate * 30) +
          (expenseControlRate * 15)
        );

        row.performanceScore = Math.max(0, Math.min(100, Number(score.toFixed(1))));
        row.conversionRate = Number((conversionRate * 100).toFixed(1));
        row.productivityRate = Number((productivityRate * 100).toFixed(1));
        row.revenueImpactRate = Number((revenueImpactRate * 100).toFixed(1));
        row.expenseControlRate = Number((expenseControlRate * 100).toFixed(1));
        return row;
      })
      .sort((a: any, b: any) => b.performanceScore - a.performanceScore)
      .map((row: any, index: number) => ({ ...row, rank: index + 1 }));

    const avgClientScore = clientsPerformance.length > 0
      ? Number((clientsPerformance.reduce((sum: number, row: any) => sum + row.performanceScore, 0) / clientsPerformance.length).toFixed(1))
      : 0;
    const avgTeamScore = teamPerformance.length > 0
      ? Number((teamPerformance.reduce((sum: number, row: any) => sum + row.performanceScore, 0) / teamPerformance.length).toFixed(1))
      : 0;
    const activeClients = clientsPerformance.filter((row: any) => row.totalInvoices > 0).length;
    const activeTeamMembers = teamPerformance.filter((row: any) => row.invoiceCount > 0 || row.expenseCount > 0).length;

    res.json({
      success: true,
      data: {
        topClient: clientsPerformance[0] || null,
        topTeamMember: teamPerformance[0] || null,
        clientsPerformance,
        teamPerformance,
        summary: {
          totalClientsTracked: clientsPerformance.length,
          activeClients,
          avgClientScore,
          totalTeamMembersTracked: teamPerformance.length,
          activeTeamMembers,
          avgTeamScore,
        },
      },
    });
  } catch (error: any) {
    console.error('Get performance analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch performance analytics',
    });
  }
};

