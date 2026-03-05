import nodemailer from 'nodemailer';

// Create Gmail SMTP transporter for real email sending
const createTransporter = () =>{
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false, // true for 465, false for other ports (587 uses STARTTLS)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  console.log('Email transporter created with Gmail SMTP');
  console.log(`Sender: ${process.env.EMAIL_USER}`);

  return transporter;
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

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"FinFlow Support" <noreply@finflow.com>',
      to: data.adminEmail,
      subject: 'Your FinFlow Workspace Is Ready ',
      html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .credential-box {
              background: white;
              border-left: 4px solid #667eea;
              padding: 15px;
              margin: 15px 0;
              border-radius: 5px;
            }
            .credential-label {
              font-weight: bold;
              color: #667eea;
              font-size: 14px;
              text-transform: uppercase;
              margin-bottom: 5px;
            }
            .credential-value {
              font-size: 16px;
              color: #333;
              word-break: break-all;
            }
            .password-box {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 15px 0;
              border-radius: 5px;
            }
            .button {
              display: inline-block;
              background: #667eea;
              color: white !important;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .warning {
              background: #fff3cd;
              border: 1px solid #ffc107;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              color: #666;
              font-size: 12px;
              margin-top: 30px;
            }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Welcome to FinFlow!</h1>
          <p>Your financial management workspace is ready</p>
        </div>

        <div class="content">
          <h2>Hi there!</h2>
          <p>Your FinFlow workspace for <strong>${data.companyName}</strong>has been successfully created. You can now start managing your finances with ease!</p>

          <div class="warning">
            <strong>Important:</strong>Save these credentials now! This is the only time you'll see your temporary password.
          </div>

          <h3>Your Login Credentials:</h3>

          <div class="credential-box">
            <div class="credential-label">Company Workspace</div>
            <div class="credential-value">${data.companyName}</div>
          </div>

          <div class="credential-box">
            <div class="credential-label">Login URL</div>
            <div class="credential-value">
              <a href="${data.loginUrl}" style="color: #667eea;">${data.loginUrl}</a>
            </div>
          </div>

          <div class="credential-box">
            <div class="credential-label">Admin Email</div>
            <div class="credential-value">${data.adminEmail}</div>
          </div>

          <div class="password-box">
            <div class="credential-label" style="color: #856404;">Temporary Password</div>
            <div class="credential-value" style="font-family: monospace; font-size: 18px; font-weight: bold; color: #856404;">
                ${data.temporaryPassword}
            </div>
          </div>

          <center>
            <a href="${data.loginUrl}" class="button">Login to Your Workspace</a>
          </center>

          <h3>What's Next?</h3>
          <ul>
            <li>Login to your workspace using the credentials above</li>
            <li>Change your temporary password</li>
            <li>Add team members</li>
            <li>Configure your company settings</li>
            <li>Start managing your finances!</li>
          </ul>

          <h3>Need Help?</h3>
          <p>If you have any questions or need assistance, please contact our support team at:</p>
          <p><a href="mailto:support@finflow.com">support@finflow.com</a></p>
        </div>

        <div class="footer">
          <p>&copy; 2024 FinFlow. All rights reserved.</p>
          <p>This email was sent to ${data.adminEmail}</p>
        </div>
      </body>
      </html>
      `,
      text: `
Welcome to FinFlow!

Your workspace for ${data.companyName} has been successfully created.

Login Credentials:
------------------
Company: ${data.companyName}
Login URL: ${data.loginUrl}
Admin Email: ${data.adminEmail}
Temporary Password: ${data.temporaryPassword}

 IMPORTANT: Save these credentials now! This is the only time you'll see your temporary password.

What's Next?
- Login to your workspace
- Change your temporary password
- Add team members
- Configure your company settings
- Start managing your finances!

Need Help?
Contact us at support@finflow.com

© 2024 FinFlow. All rights reserved.
      `,
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

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"FinFlow Support" <noreply@finflow.com>',
      to: data.userEmail,
      subject: `Welcome to ${data.companyName} - FinFlow Account Created`,
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; }
            .credentials { background: white; border-left: 4px solid #667eea; padding: 15px; margin: 15px 0; }
            .password { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to FinFlow!</h1>
          </div>
          <div class="content">
            <h2>Hi ${data.userName},</h2>
            <p>Your FinFlow account has been created for <strong>${data.companyName}</strong>.</p>

            <div class="credentials">
              <strong>Email:</strong>${data.userEmail}
            </div>

            <div class="password">
              <strong>Temporary Password:</strong><br>
              <code style="font-size: 16px; font-weight: bold;">${data.temporaryPassword}</code>
            </div>

            <p><strong>Important:</strong>Please change your password after your first login.</p>

            <center style="margin: 30px 0;">
              <a href="${data.loginUrl}" class="button">Login to FinFlow</a>
            </center>

            <p>If you have any questions, please contact your system administrator.</p>
          </div>
        </div>
      </body>
      </html>
      `,
      text: `
Welcome to FinFlow!

Hi ${data.userName},

Your FinFlow account has been created for ${data.companyName}.

Login Credentials:
Email: ${data.userEmail}
Temporary Password: ${data.temporaryPassword}

 Important: Please change your password after your first login.

Login URL: ${data.loginUrl}
      `,
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

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"FinFlow Support" <noreply@finflow.com>',
      to: data.clientEmail,
      subject: `Overdue Invoice Reminder - ${data.invoiceNumber}`,
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; }
            .invoice-details { background: white; padding: 15px; margin: 15px 0; border: 1px solid #ddd; }
            .amount { font-size: 24px; font-weight: bold; color: #dc3545; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Overdue</h1>
          </div>
          <div class="content">
            <h2>Dear ${data.clientName},</h2>
            <p>This is a reminder that the following invoice is now overdue:</p>

            <div class="invoice-details">
              <p><strong>Invoice Number:</strong>${data.invoiceNumber}</p>
              <p><strong>Amount Due:</strong><span class="amount">${data.currency} ${data.amount.toLocaleString()}</span></p>
              <p><strong>Due Date:</strong>${data.dueDate}</p>
              <p><strong>From:</strong>${data.companyName}</p>
            </div>

            <p>Please arrange payment at your earliest convenience.</p>
            <p>If you have already made this payment, please disregard this message.</p>

            <p>Thank you,<br>${data.companyName}</p>
          </div>
        </div>
      </body>
      </html>
      `,
      text: `
Payment Overdue Reminder

Dear ${data.clientName},

This is a reminder that the following invoice is now overdue:

Invoice Number: ${data.invoiceNumber}
Amount Due: ${data.currency} ${data.amount.toLocaleString()}
Due Date: ${data.dueDate}
From: ${data.companyName}

Please arrange payment at your earliest convenience.

Thank you,
${data.companyName}
      `,
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

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"FinFlow Support" <noreply@finflow.com>',
      to: data.clientEmail,
      subject: `Payment Received - Invoice ${data.invoiceNumber}`,
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #28a745; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; }
            .invoice-details { background: white; padding: 15px; margin: 15px 0; border: 1px solid #ddd; }
            .amount { font-size: 24px; font-weight: bold; color: #28a745; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Received</h1>
          </div>
          <div class="content">
            <h2>Dear ${data.clientName},</h2>
            <p>Thank you! We have received your payment for the following invoice:</p>

            <div class="invoice-details">
              <p><strong>Invoice Number:</strong>${data.invoiceNumber}</p>
              <p><strong>Amount Paid:</strong><span class="amount">${data.currency} ${data.amount.toLocaleString()}</span></p>
              <p><strong>Payment Date:</strong>${data.paidDate}</p>
              <p><strong>From:</strong>${data.companyName}</p>
            </div>

            <p>Your payment has been successfully processed and recorded in our system.</p>
            <p>We appreciate your business!</p>

            <p>Best regards,<br>${data.companyName}</p>
          </div>
        </div>
      </body>
      </html>
      `,
      text: `
Payment Received Confirmation

Dear ${data.clientName},

Thank you! We have received your payment for the following invoice:

Invoice Number: ${data.invoiceNumber}
Amount Paid: ${data.currency} ${data.amount.toLocaleString()}
Payment Date: ${data.paidDate}
From: ${data.companyName}

Your payment has been successfully processed and recorded in our system.

Best regards,
${data.companyName}
      `,
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

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"FinFlow Support" <noreply@finflow.com>',
      to: data.userEmail,
      subject: `You've been invited to join ${data.companyName} on FinFlow`,
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .logo { max-width: 100px; margin-bottom: 15px; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; border-left: 4px solid #667eea; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .button { display: inline-block; background: #667eea; color: white !important; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .role-badge { display: inline-block; background: #667eea; color: white; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: bold; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
              ${data.companyLogoUrl ? `<img src="${data.companyLogoUrl}" alt="${data.companyName}" class="logo">`: ''}
            <h1>You're Invited!</h1>
            <p>Join ${data.companyName} on FinFlow</p>
          </div>

          <div class="content">
            <h2>Hi ${data.userName}!</h2>
            <p><strong>${data.invitedByName}</strong>has invited you to join <strong>${data.companyName}</strong>on FinFlow.</p>

            <div class="info-box">
              <p><strong>Company:</strong>${data.companyName}</p>
              <p><strong>Your Email:</strong>${data.userEmail}</p>
              <p><strong>Role:</strong><span class="role-badge">${data.role.toUpperCase()}</span></p>
            </div>

            <p>Click the button below to set your password and activate your account:</p>

            <center>
              <a href="${data.inviteUrl}" class="button">Set Password & Get Started</a>
            </center>

            <p style="color: #666; font-size: 14px;">This invitation link will expire in 7 days.</p>

            <h3>What's Next?</h3>
            <ul>
              <li>Click the button above to set your password</li>
              <li>Log in to your FinFlow workspace</li>
              <li>Start collaborating with your team!</li>
            </ul>

            <p>If you have any questions, please contact ${data.invitedByName} or your system administrator.</p>
          </div>

          <div class="footer">
            <p>&copy; 2025 FinFlow. All rights reserved.</p>
            <p>This email was sent to ${data.userEmail}</p>
          </div>
        </div>
      </body>
      </html>
      `,
      text: `
You've been invited to join ${data.companyName} on FinFlow!

Hi ${data.userName},

${data.invitedByName} has invited you to join ${data.companyName} on FinFlow.

Company: ${data.companyName}
Your Email: ${data.userEmail}
Role: ${data.role.toUpperCase()}

Click the link below to set your password and activate your account:
${data.inviteUrl}

This invitation link will expire in 7 days.

What's Next?
- Set your password
- Log in to your FinFlow workspace
- Start collaborating with your team!

If you have any questions, please contact ${data.invitedByName} or your system administrator.

© 2025 FinFlow. All rights reserved.
      `,
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

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"FinFlow Support" <noreply@finflow.com>',
      to: data.userEmail,
      subject: 'Reset Your FinFlow Password',
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #667eea; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white !important; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>

          <div class="content">
            <h2>Hi ${data.userName},</h2>
            <p>We received a request to reset your password for your FinFlow account at <strong>${data.companyName}</strong>.</p>

            <p>Click the button below to reset your password:</p>

            <center>
              <a href="${data.resetUrl}" class="button">Reset Password</a>
            </center>

            <div class="warning">
              <p><strong>Important:</strong></p>
              <ul style="margin: 5px 0;">
                <li>This link will expire in 1 hour</li>
                <li>If you didn't request this, please ignore this email</li>
                <li>Your password will remain unchanged unless you click the link</li>
              </ul>
            </div>

            <p>If you're having trouble clicking the button, copy and paste this URL into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${data.resetUrl}</p>

            <p>If you didn't request a password reset, you can safely ignore this email.</p>
          </div>

          <div class="footer">
            <p>&copy; 2025 FinFlow. All rights reserved.</p>
            <p>This email was sent to ${data.userEmail}</p>
          </div>
        </div>
      </body>
      </html>
      `,
      text: `
Password Reset Request

Hi ${data.userName},

We received a request to reset your password for your FinFlow account at ${data.companyName}.

Click the link below to reset your password:
${data.resetUrl}

 Important:
- This link will expire in 1 hour
- If you didn't request this, please ignore this email
- Your password will remain unchanged unless you click the link

If you didn't request a password reset, you can safely ignore this email.

© 2025 FinFlow. All rights reserved.
      `,
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
const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

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

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"FinFlow Support" <noreply@finflow.com>',
      to: data.clientEmail,
      subject: isUpdated
        ? `Updated ${invoiceTypeLabel} ${data.invoiceNumber} from ${data.companyName}`
        : `New ${invoiceTypeLabel} ${data.invoiceNumber} from ${data.companyName}`,
      attachments: data.pdfAttachment ? [data.pdfAttachment] : [],
      html: `
      <div style="font-family: Helvetica, Arial, sans-serif; color: #1f2937; font-size: 14px; line-height: 1.55;">
        <p style="margin: 0 0 12px;">Dear ${escapeHtml(data.clientName || 'Client')},</p>
        <p style="margin: 0 0 12px;">I hope you are doing well.</p>
        <p style="margin: 0 0 12px;">Please find attached the invoice for the requested service/product.</p>
        <p style="margin: 0 0 12px;">Kindly review the attached document and let us know if you require any clarification or additional information.</p>
        <p style="margin: 0;">Best regards,</p>
      </div>
      `,
      text: `Dear ${data.clientName || 'Client'},

I hope you are doing well.

Please find attached the invoice for the requested service/product.

Kindly review the attached document and let us know if you require any clarification or additional information.

Best regards,`,
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

