import { prisma } from '../config/prisma';
import { sendEmail, isEmailConfigured } from './email.service';
import { sendSms, isSmsConfigured } from './sms.service';
import { logNotification } from './notificationLog.service';
import { buildSlipData, generateSalarySlipPdf } from './salarySlip.service';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function payslipEmailHtml(employeeName: string, monthLabel: string, companyName: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #0f6b5c;">${companyName}</h2>
      <p>Hi ${employeeName},</p>
      <p>Your salary slip for <strong>${monthLabel}</strong> is attached to this email as a PDF.</p>
      <p style="color: #888; font-size: 12px;">This is an automated message. If you have any questions about your salary slip, please contact HR directly.</p>
    </div>
  `;
}

function birthdayEmailHtml(employeeName: string, companyName: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; text-align: center;">
      <h2 style="color: #0f6b5c;">🎉 Happy Birthday, ${employeeName}!</h2>
      <p>Wishing you a wonderful year ahead, from everyone at ${companyName}.</p>
    </div>
  `;
}

function birthdaySmsText(employeeName: string, companyName: string): string {
  return `Happy Birthday, ${employeeName}! Wishing you a great year ahead. - ${companyName}`;
}

/**
 * Emails one employee's salary slip PDF for a given month. Used both by
 * the manual "Email Payslip" button (one employee) and the bulk
 * "Email All Payslips" action (looped per employee) on the Payroll page.
 * Returns a result object rather than throwing so bulk sends can continue
 * past individual failures.
 */
export async function emailPayslipToEmployee(
  employeeCode: string,
  year: number,
  month: number,
  triggeredBy: { userId: number; username: string }
): Promise<{ success: boolean; error?: string }> {
  const employee = await prisma.employee.findUnique({ where: { code: employeeCode } });
  if (!employee) return { success: false, error: 'Employee not found' };

  if (!employee.email) {
    await logNotification({
      employeeId: employee.id, channel: 'EMAIL', category: 'PAYSLIP',
      recipient: '(no email on file)', status: 'SKIPPED',
      triggeredById: triggeredBy.userId, triggeredByName: triggeredBy.username,
    });
    return { success: false, error: 'This employee has no email address on file' };
  }

  const settings = await prisma.companySettings.findFirst();
  if (!settings?.emailNotificationsEnabled) {
    await logNotification({
      employeeId: employee.id, channel: 'EMAIL', category: 'PAYSLIP',
      recipient: employee.email, status: 'SKIPPED', errorMessage: 'Email notifications are disabled in Settings',
      triggeredById: triggeredBy.userId, triggeredByName: triggeredBy.username,
    });
    return { success: false, error: 'Email notifications are disabled in Settings' };
  }

  const payroll = await prisma.payroll.findUnique({
    where: { employeeId_month_year: { employeeId: employee.id, month, year } },
  });
  if (!payroll) return { success: false, error: 'Payroll has not been generated for this employee/month yet' };

  const slipData = buildSlipData(payroll, employee, settings);
  const pdfBuffer = await generateSalarySlipPdf(slipData);
  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;
  const subject = `Salary Slip - ${monthLabel} - ${settings.companyName}`;

  const result = await sendEmail({
    to: employee.email,
    subject,
    html: payslipEmailHtml(employee.name, monthLabel, settings.companyName),
    attachments: [{ filename: `${employee.code}-${year}-${String(month).padStart(2, '0')}.pdf`, content: pdfBuffer }],
  });

  await logNotification({
    employeeId: employee.id, channel: 'EMAIL', category: 'PAYSLIP',
    recipient: employee.email, subject,
    status: result.success ? 'SENT' : 'FAILED', errorMessage: result.error,
    triggeredById: triggeredBy.userId, triggeredByName: triggeredBy.username,
  });

  return result;
}

/**
 * Emails every employee who has a generated payroll record for the given
 * month. Used by the "Email All Payslips" bulk action.
 */
export async function emailAllPayslipsForMonth(
  year: number,
  month: number,
  triggeredBy: { userId: number; username: string }
): Promise<{ sent: number; skipped: number; failed: number; details: { code: string; status: string; error?: string }[] }> {
  const payrollRecords = await prisma.payroll.findMany({
    where: { year, month },
    include: { employee: true },
  });

  const details: { code: string; status: string; error?: string }[] = [];
  let sent = 0, skipped = 0, failed = 0;

  for (const record of payrollRecords) {
    const result = await emailPayslipToEmployee(record.employee.code, year, month, triggeredBy);
    if (result.success) {
      sent++;
      details.push({ code: record.employee.code, status: 'SENT' });
    } else if (result.error?.includes('no email') || result.error?.includes('disabled')) {
      skipped++;
      details.push({ code: record.employee.code, status: 'SKIPPED', error: result.error });
    } else {
      failed++;
      details.push({ code: record.employee.code, status: 'FAILED', error: result.error });
    }
  }

  return { sent, skipped, failed, details };
}

/**
 * Checks every active employee for a birthday today and sends a greeting
 * via whichever channels are enabled (email/SMS). Called by the daily
 * cron job (services/cron.service.ts) — not exposed as a manual action,
 * since birthdays are inherently date-driven.
 */
export async function sendTodaysBirthdayGreetings(): Promise<{ sent: number; skipped: number; failed: number }> {
  const settings = await prisma.companySettings.findFirst();
  if (!settings?.birthdayRemindersEnabled) {
    return { sent: 0, skipped: 0, failed: 0 };
  }

  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayDate = today.getDate();

  const employees = await prisma.employee.findMany({ where: { status: 'ACTIVE', dob: { not: null } } });
  const birthdayEmployees = employees.filter((e) => {
    const dob = e.dob!;
    return dob.getUTCMonth() + 1 === todayMonth && dob.getUTCDate() === todayDate;
  });

  let sent = 0, skipped = 0, failed = 0;

  for (const employee of birthdayEmployees) {
    let anySent = false;

    if (settings.emailNotificationsEnabled && employee.email && isEmailConfigured()) {
      const result = await sendEmail({
        to: employee.email,
        subject: `Happy Birthday from ${settings.companyName}!`,
        html: birthdayEmailHtml(employee.name, settings.companyName),
      });
      await logNotification({
        employeeId: employee.id, channel: 'EMAIL', category: 'BIRTHDAY',
        recipient: employee.email, status: result.success ? 'SENT' : 'FAILED', errorMessage: result.error,
      });
      if (result.success) anySent = true;
    }

    if (settings.smsNotificationsEnabled && employee.mobile && isSmsConfigured()) {
      const result = await sendSms(employee.mobile, birthdaySmsText(employee.name, settings.companyName));
      await logNotification({
        employeeId: employee.id, channel: 'SMS', category: 'BIRTHDAY',
        recipient: employee.mobile, status: result.success ? 'SENT' : 'FAILED', errorMessage: result.error,
      });
      if (result.success) anySent = true;
    }

    if (anySent) sent++;
    else if (!employee.email && !employee.mobile) skipped++;
    else failed++;
  }

  return { sent, skipped, failed };
}
