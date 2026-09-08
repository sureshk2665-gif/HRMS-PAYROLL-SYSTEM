import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { logAudit, diffFields } from '../services/audit.service';
import { isEmailConfigured } from '../services/email.service';
import { isSmsConfigured } from '../services/sms.service';

const settingsSchema = z.object({
  companyName: z.string().trim().min(1).max(200),
  addressLine: z.string().trim().max(500).optional().nullable(),
  workingDaysMonth: z.number().int().min(1).max(31),
  paidHolidays: z.number().int().min(0).max(31),
  paidLeaveDefault: z.number().int().min(0).max(31),
  esiRate: z.number().min(0).max(1),
  pfRate: z.number().min(0).max(1),
  emailNotificationsEnabled: z.boolean().optional(),
  smsNotificationsEnabled: z.boolean().optional(),
  birthdayRemindersEnabled: z.boolean().optional(),
  birthdayReminderHour: z.number().int().min(0).max(23).optional(),
});

/** GET /api/settings — the single CompanySettings row (created if missing) */
export async function getSettings(_req: Request, res: Response) {
  let settings = await prisma.companySettings.findFirst();
  if (!settings) {
    settings = await prisma.companySettings.create({ data: {} });
  }
  res.json({ settings });
}

/** PUT /api/settings — update the single CompanySettings row */
export async function updateSettings(req: Request, res: Response) {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  let existing = await prisma.companySettings.findFirst();
  let settings;
  if (!existing) {
    settings = await prisma.companySettings.create({ data: parsed.data });
    await logAudit({
      req,
      action: 'CREATE',
      entityType: 'CompanySettings',
      entityId: String(settings.id),
      description: 'Created company settings',
    });
  } else {
    settings = await prisma.companySettings.update({ where: { id: existing.id }, data: parsed.data });
    const changes = diffFields(existing as any, settings as any, ['id', 'updatedAt', 'logoUrl']);
    if (Object.keys(changes).length > 0) {
      await logAudit({
        req,
        action: 'UPDATE',
        entityType: 'CompanySettings',
        entityId: String(settings.id),
        description: `Updated company settings (${Object.keys(changes).join(', ')})`,
        changes,
      });
    }
  }

  res.json({
    settings,
    warnings: [
      settings.emailNotificationsEnabled && !isEmailConfigured()
        ? 'Email notifications are turned on, but SMTP is not configured in .env yet — no emails will actually send until you add SMTP_HOST/PORT/USER/PASS.'
        : null,
      settings.smsNotificationsEnabled && !isSmsConfigured()
        ? 'SMS notifications are turned on, but MSG91 is not configured in .env yet — no SMS will actually send until you add MSG91_AUTH_KEY/SENDER_ID.'
        : null,
    ].filter(Boolean),
  });
}
