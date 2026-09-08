import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { uploadEmployeePhotoMulter } from '../config/uploads';
import { logAudit } from '../services/audit.service';

// Exposed as middleware so the route file can chain it before the handler:
// router.post('/:code/photo', requirePermission('employees.photo'), employeePhotoUploadMiddleware, uploadEmployeePhoto)
export const employeePhotoUploadMiddleware = uploadEmployeePhotoMulter.single('photo');

/**
 * POST /api/employees/:code/photo
 * Saves the uploaded file (already written to disk by multer) and records
 * its public URL on the Employee row. The URL is served via the static
 * `/uploads` mount configured in app.ts.
 */
export async function uploadEmployeePhoto(req: Request, res: Response) {
  const employee = await prisma.employee.findUnique({ where: { code: req.params.code } });
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No photo file was uploaded (expected form field "photo")' });
  }

  const publicUrl = `/uploads/employee-photos/${req.file.filename}`;
  const updated = await prisma.employee.update({
    where: { id: employee.id },
    data: { photoUrl: publicUrl },
    select: { code: true, photoUrl: true },
  });

  await logAudit({
    req,
    action: 'UPDATE',
    entityType: 'Employee',
    entityId: employee.code,
    description: `Uploaded a new photo for ${employee.name} (${employee.code})`,
  });

  res.json({ message: 'Photo uploaded', employee: updated });
}
