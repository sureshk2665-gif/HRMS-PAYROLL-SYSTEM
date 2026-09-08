import { prisma } from '../config/prisma';

interface LogNotificationParams {
  employeeId?: number | null;
  channel: 'EMAIL' | 'SMS';
  category: 'PAYSLIP' | 'BIRTHDAY';
  recipient: string;
  subject?: string | null;
  status: 'SENT' | 'FAILED' | 'SKIPPED';
  errorMessage?: string | null;
  triggeredById?: number | null;
  triggeredByName?: string | null;
}

/** Records one notification attempt. Never throws — logging failure shouldn't crash the send flow. */
export async function logNotification(params: LogNotificationParams): Promise<void> {
  try {
    await prisma.notificationLog.create({ data: params });
  } catch (err) {
    console.error('Failed to write notification log:', err);
  }
}
