import nodemailer, { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;
let initAttempted = false;

/**
 * Lazily builds the SMTP transporter from env vars. Returns null (rather
 * than throwing) if SMTP isn't configured — every caller in this file
 * checks for null and logs/records a SKIPPED notification instead of
 * crashing, since email is an optional feature that shouldn't break the
 * rest of the app if it's never been set up.
 */
function getTransporter(): Transporter | null {
  if (initAttempted) return transporter;
  initAttempted = true;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    console.warn('Email notifications: SMTP_HOST/PORT/USER/PASS not fully set in .env — email sending is disabled.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465, // true for port 465, false for 587/others (STARTTLS)
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

export function isEmailConfigured(): boolean {
  return getTransporter() !== null;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}

/**
 * Sends one email. Returns { success, error } rather than throwing, so
 * callers (especially bulk-send loops) can continue past individual
 * failures and report a per-recipient summary instead of aborting.
 */
export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  const client = getTransporter();
  if (!client) {
    return { success: false, error: 'SMTP is not configured' };
  }

  try {
    await client.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: params.to,
      subject: params.subject,
      html: params.html,
      attachments: params.attachments,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown email error' };
  }
}
