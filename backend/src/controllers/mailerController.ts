import { Request, Response } from 'express';
import nodemailer from 'nodemailer';

/**
 * Test email sending configuration
 */
export const testEmail = async (req: Request, res: Response) =>{
  try {
    const { to } = req.query;
    const testRecipient = (to as string) || process.env.EMAIL_USER;

    console.log('Testing email configuration...');
    console.log(`Host: ${process.env.EMAIL_HOST}`);
    console.log(`Port: ${process.env.EMAIL_PORT}`);
    console.log(`User: ${process.env.EMAIL_USER}`);
    console.log(`From: ${process.env.EMAIL_FROM}`);
    console.log(`Test recipient: ${testRecipient}`);

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Verify connection
    await transporter.verify();
    console.log('SUCCESS: SMTP connection verified');

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
        <li>Port: ${process.env.EMAIL_PORT}</li>
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
