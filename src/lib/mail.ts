import nodemailer from 'nodemailer';
import { appUrl } from '@/lib/site';

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
  const url = `${appUrl("/verify-email")}?token=${token}`;
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
  const url = `${appUrl("/reset-password")}?token=${token}`;
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

export interface ReminderDigestItem {
  title: string;
  body: string;
}

function escapeHtml(value: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return value.replace(/[&<>"']/g, (c) => map[c]);
}

/** Daily digest listing the user's outstanding reminders. */
export function generateReminderDigestEmail(
  name: string,
  items: ReminderDigestItem[]
) {
  const url = appUrl("/reminders");
  const rows = items
    .map(
      (i) => `
        <tr>
          <td style="padding: 14px 0; border-bottom: 1px solid #e5e5ea;">
            <p style="margin: 0 0 4px; color: #1d1d1f; font-size: 16px; font-weight: 600;">${escapeHtml(
              i.title
            )}</p>
            <p style="margin: 0; color: #6e6e73; font-size: 14px; line-height: 1.5;">${escapeHtml(
              i.body
            )}</p>
          </td>
        </tr>`
    )
    .join("");

  const count = items.length;
  const lead =
    count === 1
      ? "Here is one thing worth your attention."
      : `Here are ${count} things worth your attention.`;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #1d1d1f; font-size: 24px; font-weight: 600; margin-bottom: 20px;">Your reminders</h1>
      <p style="color: #6e6e73; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hi ${escapeHtml(
        name
      )}, ${lead}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
      <a href="${url}" style="display: inline-block; margin-top: 28px; background-color: #0071e3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 999px; font-weight: 500;">Open Ledger</a>
      <p style="color: #86868b; font-size: 13px; margin-top: 30px;">You are receiving this because reminders are on in your Ledger profile. You can turn them off there at any time.</p>
    </div>
  `;
}
