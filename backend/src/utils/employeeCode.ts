import { prisma } from '../config/prisma';

/**
 * Generates the next sequential employee code (EMP001, EMP002, ...).
 * Reads the highest existing numeric suffix rather than keeping a separate
 * counter row, so it self-heals if a record was ever deleted or imported.
 */
export async function generateNextEmployeeCode(): Promise<string> {
  const lastEmployee = await prisma.employee.findFirst({
    orderBy: { id: 'desc' },
    select: { code: true },
  });

  let nextNumber = 1;
  if (lastEmployee?.code) {
    const match = lastEmployee.code.match(/(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  const code = `EMP${String(nextNumber).padStart(3, '0')}`;

  // Guard against a rare race/gap (e.g. manually inserted code) by checking uniqueness.
  const exists = await prisma.employee.findUnique({ where: { code } });
  if (exists) {
    // Extremely unlikely given the ordering above, but fall back to a scan.
    let n = nextNumber + 1;
    while (await prisma.employee.findUnique({ where: { code: `EMP${String(n).padStart(3, '0')}` } })) {
      n++;
    }
    return `EMP${String(n).padStart(3, '0')}`;
  }

  return code;
}
