import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { logAudit } from '../services/audit.service';

const departmentSchema = z.object({
  name: z.string().min(1, 'Department name is required').max(100),
});

/** GET /api/departments — list all, with employee counts */
export async function listDepartments(_req: Request, res: Response) {
  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { employees: true } } },
  });

  res.json({
    departments: departments.map((d) => ({
      id: d.id,
      name: d.name,
      employeeCount: d._count.employees,
      createdAt: d.createdAt,
    })),
  });
}

/** POST /api/departments — create */
export async function createDepartment(req: Request, res: Response) {
  const parsed = departmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const existing = await prisma.department.findUnique({ where: { name: parsed.data.name } });
  if (existing) {
    return res.status(409).json({ error: 'A department with this name already exists' });
  }

  const department = await prisma.department.create({ data: { name: parsed.data.name } });

  await logAudit({
    req,
    action: 'CREATE',
    entityType: 'Department',
    entityId: String(department.id),
    description: `Created department "${department.name}"`,
  });

  res.status(201).json({ department });
}

/** PUT /api/departments/:id — rename */
export async function updateDepartment(req: Request, res: Response) {
  const id = Number(req.params.id);
  const parsed = departmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const department = await prisma.department.findUnique({ where: { id } });
  if (!department) {
    return res.status(404).json({ error: 'Department not found' });
  }

  const nameTaken = await prisma.department.findFirst({
    where: { name: parsed.data.name, id: { not: id } },
  });
  if (nameTaken) {
    return res.status(409).json({ error: 'A department with this name already exists' });
  }

  const updated = await prisma.department.update({
    where: { id },
    data: { name: parsed.data.name },
  });

  if (updated.name !== department.name) {
    await logAudit({
      req,
      action: 'UPDATE',
      entityType: 'Department',
      entityId: String(id),
      description: `Renamed department "${department.name}" to "${updated.name}"`,
      changes: { name: { before: department.name, after: updated.name } },
    });
  }

  res.json({ department: updated });
}

/** DELETE /api/departments/:id — blocked if employees are still assigned */
export async function deleteDepartment(req: Request, res: Response) {
  const id = Number(req.params.id);

  const department = await prisma.department.findUnique({
    where: { id },
    include: { _count: { select: { employees: true } } },
  });
  if (!department) {
    return res.status(404).json({ error: 'Department not found' });
  }
  if (department._count.employees > 0) {
    return res.status(409).json({
      error: `Cannot delete "${department.name}" — ${department._count.employees} employee(s) are still assigned to it. Reassign them first.`,
    });
  }

  await prisma.department.delete({ where: { id } });

  await logAudit({
    req,
    action: 'DELETE',
    entityType: 'Department',
    entityId: String(id),
    description: `Deleted department "${department.name}"`,
  });

  res.json({ message: 'Department deleted' });
}
