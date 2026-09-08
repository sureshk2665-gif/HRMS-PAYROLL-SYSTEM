import cron from 'node-cron';
import { prisma } from '../config/prisma';
import { sendTodaysBirthdayGreetings } from './notification.service';

let scheduledTask: cron.ScheduledTask | null = null;

/**
 * Registers the daily birthday-check job. Re-reads CompanySettings each
 * run (not just at startup) so toggling "Birthday Reminders" on/off in
 * Settings, or changing the hour, takes effect without a server restart —
 * the job runs every hour and checks internally whether "now" matches the
 * configured hour, rather than trying to re-schedule a cron expression
 * dynamically.
 */
export function startNotificationCronJobs(): void {
  if (scheduledTask) return; // already running — avoid double-registration on hot reload

  // Runs at the top of every hour; the job itself decides whether this is
  // "the" configured hour before doing any actual sending, and only sends
  // once that day (see the dedupe check inside runBirthdayCheck).
  scheduledTask = cron.schedule('0 * * * *', () => {
    runBirthdayCheckIfDue().catch((err) => console.error('Birthday reminder job failed:', err));
  });

  console.log('Notification cron jobs registered (hourly birthday check).');
}

let lastBirthdayRunDate: string | null = null; // 'YYYY-MM-DD', prevents double-sending within the same day

async function runBirthdayCheckIfDue(): Promise<void> {
  const settings = await prisma.companySettings.findFirst();
  if (!settings?.birthdayRemindersEnabled) return;

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  if (now.getHours() !== settings.birthdayReminderHour) return;
  if (lastBirthdayRunDate === todayKey) return; // already ran this hour-window today

  lastBirthdayRunDate = todayKey;
  const result = await sendTodaysBirthdayGreetings();
  console.log(`Birthday reminder job: sent=${result.sent} skipped=${result.skipped} failed=${result.failed}`);
}
