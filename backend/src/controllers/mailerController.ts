import { Request, Response } from 'express';
import nodemailer from 'nodemailer';

/**
 * Test email sending configuration
 */
export const testEmail = async (req: Request, res: Response) =>{
  try {
    const sanitize = (value?: string) => String(value || '').trim().replace(/^['"]|['"]$/g, '');
    const { to } = req.query;
    const testRecipient = sanitize(to as string) || sanitize(process.env.EMAIL_USER);
    const smtpHost = sanitize(process.env.EMAIL_HOST) || 'smtp.gmail.com';
    const smtpPort = parseInt(sanitize(process.env.EMAIL_PORT) || '587', 10);
    const isSecure = smtpPort === 465;
    const fallbackPort = smtpPort === 465 ? 587 : 465;

    console.log('Testing email configuration...');
    console.log(`Host: ${smtpHost}`);
    console.log(`Port: ${smtpPort}`);
    console.log(`Fallback Port: ${fallbackPort}`);
    console.log(`Secure: ${isSecure}`);
    console.log(`User: ${process.env.EMAIL_USER}`);
    console.log(`From: ${process.env.EMAIL_FROM}`);
    console.log(`Test recipient: ${testRecipient}`);

    const toConfig = (port: number) =>{
      const secure = port === 465;
      return {
        host: smtpHost,
        port,
        secure,
        requireTLS: !secure,
        auth: {
          user: sanitize(process.env.EMAIL_USER),
          pass: sanitize(process.env.EMAIL_PASS),
        },
        connectionTimeout: parseInt(sanitize(process.env.EMAIL_CONNECTION_TIMEOUT) || '10000', 10),
        greetingTimeout: parseInt(sanitize(process.env.EMAIL_GREETING_TIMEOUT) || '10000', 10),
        socketTimeout: parseInt(sanitize(process.env.EMAIL_SOCKET_TIMEOUT) || '20000', 10),
      };
    };

    const isConnectionError = (error: any) =>{
      const code = String(error?.code || '').toUpperCase();
      const command = String(error?.command || '').toUpperCase();
      return code === 'ETIMEDOUT' || code === 'ECONNECTION' || code === 'ECONNRESET' || code === 'ESOCKET' || command === 'CONN';
    };

    let transporter = nodemailer.createTransport(toConfig(smtpPort));

    // Verify connection
    try {
      await transporter.verify();
      console.log('SUCCESS: SMTP connection verified');
    } catch (verifyError: any) {
      if (!isConnectionError(verifyError)) throw verifyError;
      console.warn(`[EMAIL][TEST] Primary verify failed on ${smtpPort}, retrying on ${fallbackPort}`);
      transporter = nodemailer.createTransport(toConfig(fallbackPort));
      await transporter.verify();
      console.log('SUCCESS: SMTP connection verified (fallback)');
    }

    // Send test email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: testRecipient,
      subject: 'FinFlow Email Test',
      html: `
      <h2>Email Configuration Test</h2>
      <p>This is a test email from your FinFlow backend.</p>
      <p><strong>Configuration:</strong></p>
      <ul>
        <li>Host: ${process.env.EMAIL_HOST}</li>
        <li>Port: ${smtpPort}</li>
        <li>Secure: ${isSecure}</li>
        <li>User: ${process.env.EMAIL_USER}</li>
        <li>Frontend URL: ${process.env.FRONTEND_URL}</li>
      </ul>
      <p>If you received this email, your email configuration is working correctly!</p>
      `,
      text: `Email Configuration Test - FinFlow\n\nThis is a test email. Your email configuration is working!`,
    });

    console.log('SUCCESS: Test email sent successfully');
    console.log(`Message ID: ${info.messageId}`);

    res.json({
      success: true,
      message: 'Test email sent successfully',
      data: {
        messageId: info.messageId,
        recipient: testRecipient,
        accepted: info.accepted,
        response: info.response,
      },
    });
  } catch (error: any) {
    console.error('ERROR: Email test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send test email',
      details: error.code ? `SMTP Error Code: ${error.code}`: undefined,
    });
  }
};
