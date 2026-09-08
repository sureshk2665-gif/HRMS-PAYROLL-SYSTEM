import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { seedPermissions } from './permissions.seed';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ---- Manager account (primary user — the only role that can create/manage other logins) ----
  const managerUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
  const managerPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
  const existingManager = await prisma.user.findUnique({ where: { username: managerUsername } });
  if (!existingManager) {
    const passwordHash = await bcrypt.hash(managerPassword, 10);
    await prisma.user.create({ data: { username: managerUsername, passwordHash, role: 'MANAGER' } });
    console.log(`Created manager user "${managerUsername}" (change this password after first login).`);
  } else {
    console.log('Manager user already exists, skipping.');
  }

  // ---- Company Settings (single row) ----
  const settingsCount = await prisma.companySettings.count();
  if (settingsCount === 0) {
    await prisma.companySettings.create({
      data: {
        companyName: 'Your Company Pvt Ltd',
        addressLine: 'Company Address, City, State',
        workingDaysMonth: 24,
        paidHolidays: 7,
        paidLeaveDefault: 0,
        esiRate: 0.0075,
        pfRate: 0.12,
      },
    });
    console.log('Created default company settings.');
  }

  // ---- Departments ----
  const departments = [
    'Accounts', 'HR', 'Admin', 'Sales', 'Marketing',
    'Production', 'Design', 'Stores', 'Purchase', 'Management',
  ];
  for (const name of departments) {
    await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`Seeded ${departments.length} departments.`);

  // ---- Attendance Statuses (drives the leave rules engine) ----
  // payFraction: 1.0 = full pay, 0.5 = half pay, 0 = no pay (LOP)
  const statuses: {
    code: string; label: string; payRuleType: 'FULL_PAY' | 'HALF_PAY' | 'NO_PAY'; payFraction: number; isDefault?: boolean;
  }[] = [
    { code: 'PRESENT', label: 'Present', payRuleType: 'FULL_PAY', payFraction: 1.0, isDefault: true },
    { code: 'HOLIDAY', label: 'Holiday', payRuleType: 'FULL_PAY', payFraction: 1.0 },
    { code: 'WEEKLY_OFF', label: 'Weekly Off', payRuleType: 'FULL_PAY', payFraction: 1.0 },
    { code: 'FESTIVAL_HOLIDAY', label: 'Festival Holiday', payRuleType: 'FULL_PAY', payFraction: 1.0 },
    { code: 'CASUAL_LEAVE', label: 'Casual Leave', payRuleType: 'FULL_PAY', payFraction: 1.0 },
    { code: 'SICK_LEAVE', label: 'Sick Leave', payRuleType: 'FULL_PAY', payFraction: 1.0 },
    { code: 'PAID_LEAVE', label: 'Paid Leave', payRuleType: 'FULL_PAY', payFraction: 1.0 },
    { code: 'MATERNITY_LEAVE', label: 'Maternity Leave', payRuleType: 'FULL_PAY', payFraction: 1.0 },
    { code: 'PATERNITY_LEAVE', label: 'Paternity Leave', payRuleType: 'FULL_PAY', payFraction: 1.0 },
    { code: 'WORK_FROM_HOME', label: 'Work From Home', payRuleType: 'FULL_PAY', payFraction: 1.0 },
    { code: 'PERMISSION', label: 'Permission', payRuleType: 'FULL_PAY', payFraction: 1.0 },
    { code: 'HALF_DAY', label: 'Half Day', payRuleType: 'HALF_PAY', payFraction: 0.5 },
    { code: 'LOSS_OF_PAY', label: 'Loss Of Pay', payRuleType: 'NO_PAY', payFraction: 0.0 },
  ];
  for (const s of statuses) {
    await prisma.attendanceStatus.upsert({
      where: { code: s.code },
      update: { label: s.label, payRuleType: s.payRuleType, payFraction: s.payFraction, isDefault: s.isDefault ?? false },
      create: s,
    });
  }
  console.log(`Seeded ${statuses.length} attendance statuses.`);

  // ---- Leave Types ----
  const leaveTypes = [
    { code: 'CL', label: 'Casual Leave', isPaid: true, annualEntitlement: 12 },
    { code: 'SL', label: 'Sick Leave', isPaid: true, annualEntitlement: 12 },
    { code: 'EL', label: 'Earned Leave', isPaid: true, annualEntitlement: 15 },
    { code: 'PL', label: 'Paid Leave', isPaid: true, annualEntitlement: 0 },
    { code: 'MATERNITY', label: 'Maternity Leave', isPaid: true, annualEntitlement: 182 },
    { code: 'PATERNITY', label: 'Paternity Leave', isPaid: true, annualEntitlement: 15 },
  ];
  for (const lt of leaveTypes) {
    await prisma.leaveTypes.upsert({
      where: { code: lt.code },
      update: {},
      create: lt,
    });
  }
  console.log(`Seeded ${leaveTypes.length} leave types.`);

  await seedPermissions();

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
