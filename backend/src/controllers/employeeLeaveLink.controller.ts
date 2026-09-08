import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { generateLeaveRequestToken } from '../utils/leaveRequestToken';
import { logAudit } from '../services/audit.service';

/**
 * POST /api/employees/:code/leave-link
 * Generates (or regenerates) the employee's unique no-login leave-request
 * link. Regenerating invalidates any previously shared link — useful if a
 * link was sent to the wrong person or an employee leaves the company.
 */
export async function generateLeaveRequestLink(req: Request, res: Response) {
  const employee = await prisma.employee.findUnique({ where: { code: req.params.code } });
  if (!employee) return res.status(404).json({ error: 'Employee not found' });

  const token = generateLeaveRequestToken();
  await prisma.employee.update({ where: { id: employee.id }, data: { leaveRequestToken: token } });

  await logAudit({
    req,
    action: 'UPDATE',
    entityType: 'Employee',
    entityId: employee.code,
    description: `Generated a new leave-request link for ${employee.name} (${employee.code})`,
  });

  res.json({ token, path: `/leave-request/${employee.code}/${token}` });
}
