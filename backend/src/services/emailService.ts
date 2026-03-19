import nodemailer from 'nodemailer';
import logger from '../utils/logger';

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || process.env.EMAIL_HOST,
  port: parseInt(process.env.MAIL_PORT || process.env.EMAIL_PORT || '587', 10),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.MAIL_USERNAME || process.env.EMAIL_USER,
    pass: process.env.MAIL_PASSWORD || process.env.EMAIL_PASS,
  },
});

export const sendOTP = async (email: string, otp: string) => {
  try {
    const fromEmail = process.env.MAIL_FROM || process.env.EMAIL_USER;
    const mailOptions = {
      from: `"InboxFlow" <${fromEmail}>`,
      to: email,
      subject: 'Verify your email - InboxFlow',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #2563eb; text-align: center;">Welcome to InboxFlow!</h2>
          <p style="font-size: 16px; color: #333;">To complete your registration, please use the following verification code:</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #111827;">${otp}</span>
          </div>
          <p style="font-size: 14px; color: #666;">This code will expire in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">&copy; 2026 InboxFlow. All rights reserved.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`[EmailService] OTP sent to ${email}`);
    return true;
  } catch (error) {
    logger.error(`[EmailService] Error sending OTP to ${email}:`, error);
    throw error;
  }
};
