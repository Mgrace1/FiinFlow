import nodemailer from 'nodemailer';
import axios from 'axios';

const DEFAULT_BRAND_NAME = 'FiinFlow';
const DEFAULT_BRAND_COLOR = String(process.env.EMAIL_BRAND_COLOR || '#4f8b80');
const DEFAULT_SUPPORT_EMAIL = String(process.env.EMAIL_SUPPORT || 'support@finflow.com');

const escapeHtml = (value: string) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderKeyValue = (label: string, valueHtml: string) => `
  <div style="padding:12px 14px; border:1px solid #e5e7eb; border-radius:12px; margin-bottom:10px; background:#ffffff;">
    <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:#6b7280; font-weight:700;">
      ${escapeHtml(label)}
    </div>
    <div style="font-size:14px; color:#111827; margin-top:6px; word-break:break-word;">
      ${valueHtml}
    </div>
  </div>
`;

const renderEmailLayout = (opts: {
  title: string;
  subtitle?: string;
  preheader?: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
  brandColor?: string;
  logoUrl?: string;
}) => {
  const brandColor = opts.brandColor || DEFAULT_BRAND_COLOR;
  const preheader = opts.preheader ? escapeHtml(opts.preheader) : '';
  const logoBlock = opts.logoUrl
    ? `<img src="${opts.logoUrl}" alt="${DEFAULT_BRAND_NAME}" style="max-height:36px; display:block; margin-bottom:10px;" />`
    : '';

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(opts.title)}</title>
    </head>
    <body style="margin:0; padding:0; background:#f3f4f6;">
      <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${preheader}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6; padding:24px 0;">
        <tr>
          <td align="center" style="padding:0 16px;">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; background:#ffffff; border-radius:18px; overflow:hidden; border:1px solid #e5e7eb;">
              <tr>
                <td style="background:${brandColor}; color:#ffffff; padding:28px 28px 22px;">
                  ${logoBlock}
                  <div style="font-size:12px; letter-spacing:0.2em; text-transform:uppercase; opacity:0.85; font-weight:700;">
                    ${DEFAULT_BRAND_NAME}
                  </div>
                  <div style="font-size:24px; font-weight:700; margin-top:6px;">
                    ${escapeHtml(opts.title)}
                  </div>
                  ${opts.subtitle ? `<div style="font-size:14px; margin-top:6px; opacity:0.9;">${escapeHtml(opts.subtitle)}</div>` : ''}
                </td>
              </tr>
              <tr>
                <td style="padding:28px; font-family:'Segoe UI', Arial, sans-serif; color:#111827; font-size:14px; line-height:1.6;">
                  ${opts.bodyHtml}
                  ${opts.ctaLabel && opts.ctaUrl ? `
                  <div style="text-align:center; margin-top:24px;">
                    <a href="${opts.ctaUrl}" style="background:${brandColor}; color:#ffffff; padding:12px 28px; border-radius:999px; text-decoration:none; font-weight:700; display:inline-block;">
                      ${escapeHtml(opts.ctaLabel)}
                    </a>
                  </div>` : ''}
                </td>
              </tr>
              <tr>
                <td style="padding:18px 28px; background:#f9fafb; color:#6b7280; font-size:12px; text-align:center;">
                  ${opts.footerNote || `This email was sent by ${DEFAULT_BRAND_NAME}.`}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
};

// Create Gmail SMTP transporter for real email sending
const createTransporter = () =>{
  const sanitize = (value?: string) => String(value || '').trim().replace(/^['"]|['"]$/g, '');
  const smtpHost = sanitize(process.env.EMAIL_HOST) || 'smtp.gmail.com';
  const smtpHostFallback = sanitize(process.env.EMAIL_HOST_FALLBACK);
  const smtpPort = parseInt(sanitize(process.env.EMAIL_PORT) || '587', 10);
  const disableSmtpFallback = sanitize(process.env.EMAIL_DISABLE_SMTP_FALLBACK).toLowerCase() === 'true';
  const emailUser = sanitize(process.env.EMAIL_USER);
  const emailPass = sanitize(process.env.EMAIL_PASS);
  const connectionTimeout = parseInt(sanitize(process.env.EMAIL_CONNECTION_TIMEOUT) || '10000', 10);
  const greetingTimeout = parseInt(sanitize(process.env.EMAIL_GREETING_TIMEOUT) || '10000', 10);
  const socketTimeout = parseInt(sanitize(process.env.EMAIL_SOCKET_TIMEOUT) || '20000', 10);

  const toConfig = (port: number) =>{
    const isSecure = port === 465;
    return {
      host: smtpHost,
      port,
      secure: isSecure,
      // For 587 enforce STARTTLS negotiation when available.
      requireTLS: !isSecure,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      connectionTimeout,
      greetingTimeout,
      socketTimeout,
    };
  };

  const isConnectionError = (error: any) =>{
    const code = String(error?.code || '').toUpperCase();
    const command = String(error?.command || '').toUpperCase();
    return (
      code === 'ETIMEDOUT'
      || code === 'ECONNECTION'
      || code === 'ECONNRESET'
      || code === 'ESOCKET'
      || command === 'CONN'
    );
  };

  const primaryConfig = toConfig(smtpPort);
  const fallbackPort = smtpPort === 465 ? 587 : 465;
  const fallbackConfig = toConfig(fallbackPort);
  const candidateHosts = [smtpHost, smtpHostFallback].filter(Boolean);
  const resendApiKey = sanitize(process.env.RESEND_API_KEY);
  const resendApiUrl = sanitize(process.env.RESEND_API_URL) || 'https://api.resend.com/emails';
  const resendReplyTo = sanitize(process.env.EMAIL_REPLY_TO);
  const resendFrom = sanitize(process.env.RESEND_FROM);

  const normalizeRecipients = (value: any): string[] =>{
    if (!value) return [];
    if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
    return String(value)
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  };

  const toBase64Content = (value: any) =>{
    if (!value) return '';
    if (Buffer.isBuffer(value)) return value.toString('base64');
    if (value instanceof Uint8Array) return Buffer.from(value).toString('base64');
    return Buffer.from(String(value)).toString('base64');
  };

  const sendViaResend = async (mailOptions: any) =>{
    const fromAddress = resendFrom || sanitize(mailOptions.from) || sanitize(process.env.EMAIL_FROM);
    const payload: any = {
      from: fromAddress,
      to: normalizeRecipients(mailOptions.to),
      subject: mailOptions.subject,
      html: mailOptions.html,
      text: mailOptions.text,
    };

    if (resendReplyTo) {
      payload.reply_to = resendReplyTo;
    }

    if (Array.isArray(mailOptions.attachments) && mailOptions.attachments.length > 0) {
      payload.attachments = mailOptions.attachments.map((attachment: any) =>({
        filename: attachment.filename || attachment.name || 'attachment',
        content: toBase64Content(attachment.content),
      }));
    }

    const response = await axios.post(resendApiUrl, payload, {
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: socketTimeout,
    });

    return {
      messageId: response?.data?.id || undefined,
      accepted: payload.to,
      response: 'Resend API accepted',
    };
  };

  console.log('Email transporter created');
  console.log(`SMTP host(s): ${candidateHosts.join(', ')}`);
  console.log(`SMTP primary port: ${smtpPort}`);
  console.log(`SMTP fallback port: ${fallbackPort}`);
  console.log(`Sender: ${emailUser}`);
  console.log(`Email provider: ${resendApiKey ? 'resend+smtp-fallback' : 'smtp-only'}`);

  return {
    sendMail: async (mailOptions: any) =>{
      if (resendApiKey) {
        try {
          console.log('[EMAIL] Attempting Resend API delivery...');
          return await sendViaResend(mailOptions);
        } catch (resendError: any) {
          const status = resendError?.response?.status || resendError?.code || 'UNKNOWN';
          const details = resendError?.response?.data
            ? JSON.stringify(resendError.response.data)
            : resendError?.message || 'No details';
          if (disableSmtpFallback) {
            throw new Error(`Resend API failed (${status}): ${details}`);
          }
          console.warn(`[EMAIL] Resend API failed (${status}). Details: ${details}. Falling back to SMTP...`);
        }
      }

      let lastError: any = null;

      for (const host of candidateHosts) {
        const withHost = (config: any) => ({ ...config, host });

        try {
          console.log(`[EMAIL] Attempting SMTP ${host}:${smtpPort} (secure=${smtpPort === 465})`);
          return await nodemailer.createTransport(withHost(primaryConfig)).sendMail(mailOptions);
        } catch (primaryError: any) {
          lastError = primaryError;
          if (!isConnectionError(primaryError)) {
            throw primaryError;
          }

          console.warn(
            `[EMAIL] Primary SMTP connection failed on ${host}:${smtpPort} (${primaryError?.code || 'UNKNOWN'}). Retrying ${host}:${fallbackPort}...`
          );
        }

        try {
          console.log(`[EMAIL] Attempting SMTP ${host}:${fallbackPort} (secure=${fallbackPort === 465})`);
          return await nodemailer.createTransport(withHost(fallbackConfig)).sendMail(mailOptions);
        } catch (fallbackError: any) {
          lastError = fallbackError;
          if (!isConnectionError(fallbackError)) {
            throw fallbackError;
          }

          console.warn(
            `[EMAIL] Fallback SMTP connection failed on ${host}:${fallbackPort} (${fallbackError?.code || 'UNKNOWN'}).`
          );
        }
      }

      throw lastError || new Error('SMTP send failed');
    },
  };
};

/**
 * Send welcome email after company creation
 */
export const sendWelcomeEmail = async (data: {
  companyName: string;
  adminEmail: string;
  loginUrl: string;
  temporaryPassword: string;
}) =>{
  try {
    const transporter = createTransporter();

    const loginUrlHtml = `<a href="${data.loginUrl}" style="color:${DEFAULT_BRAND_COLOR}; text-decoration:none;">${escapeHtml(data.loginUrl)}</a>`;
    const html = renderEmailLayout({
      title: 'Workspace ready',
      subtitle: 'Your FinFlow workspace is ready to use',
      preheader: `Your ${data.companyName} workspace is ready`,
      bodyHtml: `
        <p style="margin:0 0 12px;">Hi there,</p>
        <p style="margin:0 0 16px;">Your workspace for <strong>${escapeHtml(data.companyName)}</strong> is ready. Use the details below to sign in.</p>
        <div style="padding:12px 14px; background:#fff7ed; border:1px solid #fed7aa; border-radius:12px; margin-bottom:16px;">
          <strong>Important:</strong> Save these credentials now. This is the only time you will see the temporary password.
        </div>
        ${renderKeyValue('Company Workspace', escapeHtml(data.companyName))}
        ${renderKeyValue('Login URL', loginUrlHtml)}
        ${renderKeyValue('Admin Email', escapeHtml(data.adminEmail))}
        ${renderKeyValue('Temporary Password', `<span style="font-family:monospace; font-size:16px; font-weight:700; color:#7c2d12;">${escapeHtml(data.temporaryPassword)}</span>`)}
        <p style="margin:16px 0 8px; font-weight:600;">Next steps</p>
        <ul style="margin:0; padding-left:18px; color:#374151;">
          <li>Sign in with the temporary password</li>
          <li>Change your password</li>
          <li>Add team members</li>
          <li>Configure company settings</li>
        </ul>
        <p style="margin:16px 0 0;">Need help? <a href="mailto:${DEFAULT_SUPPORT_EMAIL}" style="color:${DEFAULT_BRAND_COLOR}; text-decoration:none;">${DEFAULT_SUPPORT_EMAIL}</a></p>
      `,
      ctaLabel: 'Login to your workspace',
      ctaUrl: data.loginUrl,
      footerNote: `This email was sent to ${escapeHtml(data.adminEmail)}.`,
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"${DEFAULT_BRAND_NAME} Support" <noreply@finflow.com>`,
      to: data.adminEmail,
      subject: 'Your FinFlow Workspace Is Ready',
      html,
      text: `Your FinFlow workspace for ${data.companyName} is ready.\n\nLogin URL: ${data.loginUrl}\nAdmin Email: ${data.adminEmail}\nTemporary Password: ${data.temporaryPassword}\n\nImportant: Save these credentials now. This is the only time you will see the temporary password.`,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('SUCCESS: Welcome email sent successfully');
    console.log(`To: ${data.adminEmail}`);
    console.log(`Message ID: ${info.messageId}`);
    console.log(`Status: ${info.response}`);

    return {
      success: true,
      messageId: info.messageId,
      recipient: data.adminEmail,
    };
  } catch (error: any) {
    console.error('ERROR: Failed to send welcome email:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Send email when new user is created
 */
export const sendUserCreatedEmail = async (data: {
  userName: string;
  userEmail: string;
  companyName: string;
  temporaryPassword: string;
  loginUrl: string;
}) =>{
  try {
    const transporter = createTransporter();

    const html = renderEmailLayout({
      title: 'Account created',
      subtitle: `${data.companyName} has created your FinFlow account`,
      preheader: `Your FinFlow account for ${data.companyName} is ready`,
      bodyHtml: `
        <p style="margin:0 0 12px;">Hi ${escapeHtml(data.userName)},</p>
        <p style="margin:0 0 16px;">Your account has been created for <strong>${escapeHtml(data.companyName)}</strong>.</p>
        ${renderKeyValue('Email', escapeHtml(data.userEmail))}
        ${renderKeyValue('Temporary Password', `<span style="font-family:monospace; font-size:16px; font-weight:700; color:#7c2d12;">${escapeHtml(data.temporaryPassword)}</span>`)}
        <p style="margin:16px 0 0;">For security, change your password after your first login.</p>
      `,
      ctaLabel: 'Login to FinFlow',
      ctaUrl: data.loginUrl,
      footerNote: `This email was sent to ${escapeHtml(data.userEmail)}.`,
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"${DEFAULT_BRAND_NAME} Support" <noreply@finflow.com>`,
      to: data.userEmail,
      subject: `Welcome to ${data.companyName} - FinFlow Account Created`,
      html,
      text: `Hi ${data.userName},\n\nYour FinFlow account has been created for ${data.companyName}.\n\nEmail: ${data.userEmail}\nTemporary Password: ${data.temporaryPassword}\nLogin URL: ${data.loginUrl}\n\nPlease change your password after your first login.`,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('SUCCESS: User created email sent');
    console.log(`To: ${data.userEmail}`);

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('ERROR: Failed to send user created email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send email notification for overdue invoice
 */
export const sendOverdueInvoiceEmail = async (data: {
  clientName: string;
  clientEmail: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  dueDate: string;
  companyName: string;
}) =>{
  try {
    const transporter = createTransporter();

    const amountHtml = `<span style="font-size:18px; font-weight:700; color:#b91c1c;">${escapeHtml(data.currency)} ${data.amount.toLocaleString()}</span>`;
    const html = renderEmailLayout({
      title: 'Payment overdue',
      subtitle: `Invoice ${data.invoiceNumber} is past due`,
      preheader: `Overdue invoice ${data.invoiceNumber}`,
      bodyHtml: `
        <p style="margin:0 0 12px;">Dear ${escapeHtml(data.clientName)},</p>
        <p style="margin:0 0 16px;">This is a reminder that the invoice below is now overdue.</p>
        ${renderKeyValue('Invoice Number', escapeHtml(data.invoiceNumber))}
        ${renderKeyValue('Amount Due', amountHtml)}
        ${renderKeyValue('Due Date', escapeHtml(data.dueDate))}
        ${renderKeyValue('From', escapeHtml(data.companyName))}
        <p style="margin:16px 0 0;">Please arrange payment at your earliest convenience. If you have already paid, you can ignore this message.</p>
      `,
      footerNote: `This email was sent to ${escapeHtml(data.clientEmail)}.`,
      brandColor: '#b91c1c',
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"${DEFAULT_BRAND_NAME} Support" <noreply@finflow.com>`,
      to: data.clientEmail,
      subject: `Overdue Invoice Reminder - ${data.invoiceNumber}`,
      html,
      text: `Dear ${data.clientName},\n\nThis is a reminder that invoice ${data.invoiceNumber} is overdue.\nAmount Due: ${data.currency} ${data.amount.toLocaleString()}\nDue Date: ${data.dueDate}\nFrom: ${data.companyName}\n\nPlease arrange payment at your earliest convenience.`,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('SUCCESS: Overdue invoice email sent');
    console.log(`To: ${data.clientEmail}`);

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('ERROR: Failed to send overdue invoice email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send email notification when invoice is paid
 */
export const sendInvoicePaidEmail = async (data: {
  clientName: string;
  clientEmail: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  paidDate: string;
  companyName: string;
}) =>{
  try {
    const transporter = createTransporter();

    const amountHtml = `<span style="font-size:18px; font-weight:700; color:#15803d;">${escapeHtml(data.currency)} ${data.amount.toLocaleString()}</span>`;
    const html = renderEmailLayout({
      title: 'Payment received',
      subtitle: `Invoice ${data.invoiceNumber} has been paid`,
      preheader: `Payment received for invoice ${data.invoiceNumber}`,
      bodyHtml: `
        <p style="margin:0 0 12px;">Dear ${escapeHtml(data.clientName)},</p>
        <p style="margin:0 0 16px;">Thank you. We have received your payment.</p>
        ${renderKeyValue('Invoice Number', escapeHtml(data.invoiceNumber))}
        ${renderKeyValue('Amount Paid', amountHtml)}
        ${renderKeyValue('Payment Date', escapeHtml(data.paidDate))}
        ${renderKeyValue('From', escapeHtml(data.companyName))}
        <p style="margin:16px 0 0;">Your payment has been recorded successfully. We appreciate your business.</p>
      `,
      footerNote: `This email was sent to ${escapeHtml(data.clientEmail)}.`,
      brandColor: '#15803d',
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"${DEFAULT_BRAND_NAME} Support" <noreply@finflow.com>`,
      to: data.clientEmail,
      subject: `Payment Received - Invoice ${data.invoiceNumber}`,
      html,
      text: `Dear ${data.clientName},\n\nWe have received your payment for invoice ${data.invoiceNumber}.\nAmount Paid: ${data.currency} ${data.amount.toLocaleString()}\nPayment Date: ${data.paidDate}\nFrom: ${data.companyName}\n\nThank you for your business.`,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('SUCCESS: Invoice paid email sent');
    console.log(`To: ${data.clientEmail}`);

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('ERROR: Failed to send invoice paid email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send user invitation email
 */
export const sendUserInviteEmail = async (data: {
  userName: string;
  userEmail: string;
  companyName: string;
  companyLogoUrl?: string;
  role: string;
  inviteUrl: string;
  invitedByName: string;
}) =>{
  try {
    const transporter = createTransporter();

    const html = renderEmailLayout({
      title: "You're invited",
      subtitle: `${data.invitedByName} invited you to ${data.companyName}`,
      preheader: `Invitation to join ${data.companyName} on FinFlow`,
      bodyHtml: `
        <p style="margin:0 0 12px;">Hi ${escapeHtml(data.userName)},</p>
        <p style="margin:0 0 16px;"><strong>${escapeHtml(data.invitedByName)}</strong> invited you to join <strong>${escapeHtml(data.companyName)}</strong> on FinFlow.</p>
        ${renderKeyValue('Company', escapeHtml(data.companyName))}
        ${renderKeyValue('Your Email', escapeHtml(data.userEmail))}
        ${renderKeyValue('Role', `<span style="display:inline-block; padding:4px 10px; border-radius:999px; background:#e0f2f1; color:#0f766e; font-weight:700; font-size:12px;">${escapeHtml(data.role)}</span>`)}
        <p style="margin:16px 0 0;">This invitation link expires in 7 days.</p>
      `,
      ctaLabel: 'Set password & get started',
      ctaUrl: data.inviteUrl,
      footerNote: `This email was sent to ${escapeHtml(data.userEmail)}.`,
      logoUrl: data.companyLogoUrl,
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"${DEFAULT_BRAND_NAME} Support" <noreply@finflow.com>`,
      to: data.userEmail,
      subject: `You're invited to join ${data.companyName} on FinFlow`,
      html,
      text: `Hi ${data.userName},\n\n${data.invitedByName} invited you to join ${data.companyName} on FinFlow.\nRole: ${data.role}\n\nSet your password: ${data.inviteUrl}\n\nThis invitation link expires in 7 days.`,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('SUCCESS: User invite email sent');
    console.log(`To: ${data.userEmail}`);

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('ERROR: Failed to send user invite email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (data: {
  userName: string;
  userEmail: string;
  resetUrl: string;
  companyName: string;
}) =>{
  try {
    const transporter = createTransporter();

    const html = renderEmailLayout({
      title: 'Reset your password',
      subtitle: `${data.companyName} account security`,
      preheader: 'Reset your FinFlow password',
      bodyHtml: `
        <p style="margin:0 0 12px;">Hi ${escapeHtml(data.userName)},</p>
        <p style="margin:0 0 16px;">We received a request to reset your password for your FinFlow account at <strong>${escapeHtml(data.companyName)}</strong>.</p>
        <div style="padding:12px 14px; background:#fff7ed; border:1px solid #fed7aa; border-radius:12px; margin-bottom:16px;">
          This link expires in 1 hour. If you did not request this, you can ignore this email.
        </div>
        <p style="margin:0 0 12px;">If the button does not work, copy and paste this URL into your browser:</p>
        <p style="word-break:break-all; color:${DEFAULT_BRAND_COLOR}; margin:0 0 12px;">${escapeHtml(data.resetUrl)}</p>
      `,
      ctaLabel: 'Reset password',
      ctaUrl: data.resetUrl,
      footerNote: `This email was sent to ${escapeHtml(data.userEmail)}.`,
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"${DEFAULT_BRAND_NAME} Support" <noreply@finflow.com>`,
      to: data.userEmail,
      subject: 'Reset Your FinFlow Password',
      html,
      text: `Hi ${data.userName},\n\nWe received a request to reset your password for your FinFlow account at ${data.companyName}.\n\nReset link: ${data.resetUrl}\n\nThis link expires in 1 hour. If you did not request this, you can ignore this email.`,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('SUCCESS: Password reset email sent');
    console.log(`To: ${data.userEmail}`);

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('ERROR: Failed to send password reset email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send email notification when invoice is sent
 */
export const sendInvoiceSentEmail = async (data: {
  clientEmail: string;
  clientName: string;
  clientPhone?: string;
  clientAddress?: string;
  companyName: string;
  companyLogoUrl?: string;
  companyBrandColor?: string;
  companyAddress?: string;
  companyPhone?: string;
  invoiceNumber: string;
  invoiceType?: string;
  amount: number;
  totalAmount?: number;
  currency: string;
  taxRate?: number;
  taxApplied?: boolean;
  notes?: string;
  invoiceDate?: string;
  lineItems?: Array<{
    name: string;
    description?: string;
    quantity?: number;
    rate?: number;
    amount?: number;
  }>;
  dueDate: string;
  pdfAttachment?: {
    filename: string;
    content: Buffer;
  };
  emailMode?: 'new' | 'updated';
}) =>{
  try {
    const smtpHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
    console.log(`[EMAIL][INVOICE_SENT] Provider host: ${smtpHost}`);
    console.log(`[EMAIL][INVOICE_SENT] Recipient: ${data.clientEmail}`);
    console.log(`[EMAIL][INVOICE_SENT] Invoice: ${data.invoiceNumber}`);

    const transporter = createTransporter();

    const invoiceTypeLabels: Record<string, string> = {
      standard: 'Invoice',
      proforma: 'Proforma Invoice',
      tax: 'Tax Invoice',
      commercial: 'Commercial Invoice',
      credit_note: 'Credit Note',
      debit_note: 'Debit Note',
    };
    const invoiceTypeKey = String(data.invoiceType || 'standard').trim().toLowerCase();
    const invoiceTypeLabel = invoiceTypeLabels[invoiceTypeKey] || 'Invoice';
    const isUpdated = data.emailMode === 'updated';
    const brandColor = data.companyBrandColor || DEFAULT_BRAND_COLOR;
    const totalAmount = Number(data.totalAmount ?? data.amount ?? 0);
    const amountHtml = `<span style=\"font-size:18px; font-weight:700; color:${brandColor};\">${escapeHtml(data.currency)} ${totalAmount.toLocaleString()}</span>`;

    const html = renderEmailLayout({
      title: isUpdated ? 'Invoice updated' : 'Invoice sent',
      subtitle: `${invoiceTypeLabel} ${data.invoiceNumber} from ${data.companyName}`,
      preheader: `${invoiceTypeLabel} ${data.invoiceNumber}`,
      brandColor,
      logoUrl: data.companyLogoUrl,
      bodyHtml: `
        <p style="margin:0 0 12px;">Dear ${escapeHtml(data.clientName || 'Client')},</p>
        <p style="margin:0 0 16px;">${isUpdated ? 'We have updated the invoice below.' : 'Please find your invoice details below.'}</p>
        ${renderKeyValue('Invoice Number', escapeHtml(data.invoiceNumber))}
        ${renderKeyValue('Amount', amountHtml)}
        ${renderKeyValue('Due Date', escapeHtml(data.dueDate))}
        ${renderKeyValue('From', escapeHtml(data.companyName))}
        <p style="margin:16px 0 0;">The invoice PDF is attached for your records.</p>
      `,
      footerNote: `This email was sent to ${escapeHtml(data.clientEmail)}.`,
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"${DEFAULT_BRAND_NAME} Support" <noreply@finflow.com>`,
      to: data.clientEmail,
      subject: isUpdated
        ? `Updated ${invoiceTypeLabel} ${data.invoiceNumber} from ${data.companyName}`
        : `New ${invoiceTypeLabel} ${data.invoiceNumber} from ${data.companyName}`,
      attachments: data.pdfAttachment ? [data.pdfAttachment] : [],
      html,
      text: `${isUpdated ? 'Updated' : 'New'} ${invoiceTypeLabel} ${data.invoiceNumber} from ${data.companyName}.\nAmount: ${data.currency} ${totalAmount.toLocaleString()}\nDue Date: ${data.dueDate}`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('SUCCESS: Invoice sent email delivered');
    console.log(`To: ${data.clientEmail}`);
    console.log(`[EMAIL][INVOICE_SENT] Message ID: ${info.messageId}`);

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('ERROR: Failed to send invoice sent email:', error);
    return { success: false, error: error.message };
  }
};








