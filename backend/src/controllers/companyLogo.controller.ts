import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { uploadCompanyLogoMulter } from '../config/uploads';
import { logAudit } from '../services/audit.service';

export const logoUploadMiddleware = uploadCompanyLogoMulter.single('logo');

/**
 * POST /api/settings/logo
 * Uploads the company logo once and stores its URL on the single
 * CompanySettings row. Every place that shows the logo (sidebar, salary
 * slip PDF, future letterheads) reads it from there, so uploading once
 * here reflects everywhere automatically.
 */
export async function uploadCompanyLogo(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({ error: 'No logo file was uploaded (expected form field "logo")' });
  }

  const publicUrl = `/uploads/company/${req.file.filename}`;

  let settings = await prisma.companySettings.findFirst();
  if (!settings) {
    settings = await prisma.companySettings.create({ data: { logoUrl: publicUrl } });
  } else {
    settings = await prisma.companySettings.update({ where: { id: settings.id }, data: { logoUrl: publicUrl } });
  }

  await logAudit({
    req,
    action: 'UPDATE',
    entityType: 'CompanySettings',
    entityId: String(settings.id),
    description: 'Uploaded a new company logo',
  });

  res.json({ message: 'Logo uploaded', settings });
}
