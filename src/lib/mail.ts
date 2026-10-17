import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

export function generateVerificationEmail(name: string, token: string) {
  const url = `${process.env.APP_URL}/verify-email?token=${token}`;
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #1d1d1f; font-size: 24px; font-weight: 600; margin-bottom: 20px;">Verify your email</h1>
      <p style="color: #6e6e73; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Hi ${name},</p>
      <p style="color: #6e6e73; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">Thanks for signing up! Please click the button below to verify your email address.</p>
      <a href="${url}" style="display: inline-block; background-color: #0071e3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 999px; font-weight: 500;">Verify Email</a>
      <p style="color: #86868b; font-size: 14px; margin-top: 30px;">If you didn't create an account, you can safely ignore this email.</p>
    </div>
  `;
}

export function generateResetPasswordEmail(name: string, token: string) {
  const url = `${process.env.APP_URL}/reset-password?token=${token}`;
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #1d1d1f; font-size: 24px; font-weight: 600; margin-bottom: 20px;">Reset your password</h1>
      <p style="color: #6e6e73; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Hi ${name},</p>
      <p style="color: #6e6e73; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">You requested to reset your password. Click the button below to set a new password.</p>
      <a href="${url}" style="display: inline-block; background-color: #0071e3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 999px; font-weight: 500;">Reset Password</a>
      <p style="color: #86868b; font-size: 14px; margin-top: 30px;">This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;
}
