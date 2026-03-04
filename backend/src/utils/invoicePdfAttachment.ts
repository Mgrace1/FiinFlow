import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

const FONT_REGULAR = 'Helvetica';
const FONT_BOLD = 'Helvetica-Bold';

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

export const generateInvoicePdfAttachmentBuffer = async (invoice: any, company: any) => {
  return await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const accentColor = String(company?.brandColor || '#2563EB');
    const companyName = company.displayName || company.name || 'Company';
    const client = invoice.clientId as any;
    const clientName = client?.name || 'N/A';
    const clientEmail = client?.email || '';
    const clientPhone = client?.phone || '';
    const clientAddress = client?.address || '';
    const invoiceDate = new Date(invoice.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-');
    const dueDate = new Date(invoice.dueDate).toLocaleDateString('en-GB').replace(/\//g, '-');
    const lineItems = Array.isArray(invoice?.items) && invoice.items.length > 0
      ? invoice.items.map((item: any) => ({
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
    const companyDefaultInstructions = String(company?.defaultPaymentInstructions || '').trim();
    const paymentLines = companyDefaultInstructions
      ? companyDefaultInstructions.split('\n').map((l: string) => l.trim()).filter(Boolean)
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
    const invoiceTypeKey = String(invoice?.invoiceType || 'standard').trim().toLowerCase();
    const invoiceTypeLabel = invoiceTypeLabels[invoiceTypeKey] || String(invoice?.invoiceType || 'Invoice');

    doc.fontSize(20).fillColor('#1f2937').font(FONT_BOLD);
    doc.text(companyName, 50, 56);
    doc.fontSize(11).fillColor('#334155').font(FONT_REGULAR);
    if (company.address) {
      doc.text(String(company.address), 50, 82, { width: 240 });
    }
    if (company.phone) {
      doc.text(String(company.phone), 50, 98);
    }

    doc.rect(330, 52, 220, 64).lineWidth(1).strokeColor('#B6C5C1').stroke();
    if (company.logoUrl) {
      try {
        const logoPath = path.join(__dirname, '../../uploads/company-logos', path.basename(company.logoUrl));
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 346, 62, { fit: [190, 42], align: 'center', valign: 'center' });
        } else {
          doc.fontSize(16).fillColor(accentColor).font(FONT_BOLD);
          doc.text('Upload Logo', 390, 76, { width: 130, align: 'center' });
        }
      } catch {
        doc.fontSize(16).fillColor(accentColor).font(FONT_BOLD);
        doc.text('Upload Logo', 390, 76, { width: 130, align: 'center' });
      }
    } else {
      doc.fontSize(16).fillColor(accentColor).font(FONT_BOLD);
      doc.text('Upload Logo', 390, 76, { width: 130, align: 'center' });
    }

    const titleText = invoiceTypeLabel.toUpperCase();
    const titleFontSize = titleText.length > 12 ? 28 : 42;
    const titleLetterSpacing = titleText.length > 12 ? 1 : 2;
    doc.fontSize(titleFontSize).fillColor(accentColor).font(FONT_BOLD);
    doc.text(titleText, 300, 142, { width: 250, align: 'right', characterSpacing: titleLetterSpacing });

    doc.fontSize(13).fillColor(accentColor).font(FONT_BOLD);
    doc.text('Bill To', 50, 236);
    doc.fontSize(18).fillColor('#1f2937').font(FONT_BOLD);
    doc.text(clientName, 50, 256);
    doc.fontSize(11).fillColor('#334155').font(FONT_REGULAR);
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
    doc.fontSize(13).fillColor(accentColor).font(FONT_BOLD);
    doc.text('Invoice #', 360, 234, { width: 95 });
    doc.text('Invoice date', 360, 258, { width: 95 });
    doc.text('Due date', 360, 282, { width: 95 });
    doc.fontSize(13).fillColor('#1f2937').font(FONT_REGULAR);
    doc.text(String(invoice.invoiceNumber || ''), 420, 234, { width: 130, align: 'right' });
    doc.text(invoiceDate, 420, 258, { width: 130, align: 'right' });
    doc.text(dueDate, 420, 282, { width: 130, align: 'right' });

    const tableY = 365;
    doc.rect(50, tableY, 500, 24).fillColor(accentColor).fill();
    doc.fontSize(11).fillColor('#ffffff').font(FONT_BOLD);
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
      doc.fontSize(11).fillColor('#111827').font(FONT_REGULAR);
      doc.text(Number(item.qty || 0).toFixed(2), 60, rowY, { width: 45 });
      const desc = `${String(item.product || '')}${item.description ? ` ${String(item.description)}` : ''}`.trim();
      doc.text(desc, 112, rowY, { width: 250 });
      doc.text(new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(item.rate || 0)), 390, rowY, { width: 70, align: 'right' });
      doc.text(new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(item.amount || 0)), 470, rowY, { width: 70, align: 'right' });
      rowY += 30;
    });
    if (rows.length > maxRows) {
      doc.fontSize(10).fillColor('#6b7280').font(FONT_REGULAR);
      doc.text(`+ ${rows.length - maxRows} more items`, 112, rowY, { width: 250 });
      rowY += 18;
    }

    doc.moveTo(50, rowY - 8).lineTo(550, rowY - 8).strokeColor('#9CA3AF').lineWidth(1).stroke();

    const totalsXLabel = 330;
    const totalsXVal = 470;
    const numFmt = (n: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
    doc.fontSize(14).fillColor('#1f2937').font(FONT_REGULAR);
    let totalsY = rowY + 4;
    doc.text('Subtotal', totalsXLabel, totalsY, { width: 120 });
    doc.text(numFmt(subtotal), totalsXVal, totalsY, { width: 70, align: 'right' });
    totalsY += 26;

    if (invoice.taxApplied && taxAmount > 0) {
      doc.text(`Sales Tax (${invoice.taxRate || 0}%)`, totalsXLabel, totalsY, { width: 120 });
      doc.text(numFmt(taxAmount), totalsXVal, totalsY, { width: 70, align: 'right' });
      totalsY += 26;
    }

    doc.moveTo(totalsXLabel, totalsY).lineTo(550, totalsY).strokeColor(accentColor).lineWidth(1).stroke();
    totalsY += 8;
    doc.fontSize(15).fillColor(accentColor).font(FONT_BOLD);
    doc.text(`Total (${invoice.currency || 'USD'})`, totalsXLabel, totalsY, { width: 120 });
    doc.text(numFmt(total), totalsXVal, totalsY, { width: 70, align: 'right' });

    const termsY = 700;
    doc.fontSize(13).fillColor(accentColor).font(FONT_BOLD);
    doc.text('How to Pay', 50, termsY);
    doc.fontSize(11).fillColor('#374151').font(FONT_REGULAR);
    paymentLines.forEach((line, index) => {
      doc.text(line, 50, termsY + 24 + (index * 18), { width: 500 });
    });

    doc.end();
  });
};
