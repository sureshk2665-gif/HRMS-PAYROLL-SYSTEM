-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'HR_STAFF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_settings" (
    "id" SERIAL NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT 'Your Company Pvt Ltd',
    "addressLine" TEXT,
    "logoUrl" TEXT,
    "workingDaysMonth" INTEGER NOT NULL DEFAULT 24,
    "paidHolidays" INTEGER NOT NULL DEFAULT 7,
    "paidLeaveDefault" INTEGER NOT NULL DEFAULT 0,
    "esiRate" DECIMAL(65,30) NOT NULL DEFAULT 0.0075,
    "pfRate" DECIMAL(65,30) NOT NULL DEFAULT 0.12,
    "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smsNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "birthdayRemindersEnabled" BOOLEAN NOT NULL DEFAULT false,
    "birthdayReminderHour" INTEGER NOT NULL DEFAULT 9,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photoUrl" TEXT,
    "gender" TEXT,
    "dob" TIMESTAMP(3),
    "relativeName" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "address" TEXT,
    "joiningDate" TIMESTAMP(3),
    "departmentId" INTEGER,
    "designation" TEXT,
    "employmentType" TEXT NOT NULL DEFAULT 'FULL_TIME',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "bankName" TEXT,
    "branch" TEXT,
    "accountNo" TEXT,
    "ifsc" TEXT,
    "pan" TEXT,
    "aadhaar" TEXT,
    "pfNumber" TEXT,
    "esiNumber" TEXT,
    "uan" TEXT,
    "paymentMode" TEXT NOT NULL DEFAULT 'NEFT_RTGS',
    "basic" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "hra" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "da" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "specialAllow" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "medicalAllow" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "conveyance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "washingAllow" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otherAllow" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otRatePerHour" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "pfDeduction" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "esiApplicable" BOOLEAN NOT NULL DEFAULT true,
    "professionalTax" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "canteenRatePerDay" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "rentDeduction" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otherDeduction" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "elBalance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "clBalance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "leaveRequestToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_statuses" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "payRuleType" TEXT NOT NULL DEFAULT 'FULL_PAY',
    "payFraction" DECIMAL(65,30) NOT NULL DEFAULT 1.0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "attendance_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "attendanceStatusId" INTEGER NOT NULL,
    "remarks" TEXT,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_types" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    "annualEntitlement" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "leave_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_adjustments" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "otHours" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "lopOverride" DECIMAL(65,30),
    "advance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "tax" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otherAllowanceOneOff" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "nowd" INTEGER NOT NULL,
    "lopDays" DECIMAL(65,30) NOT NULL,
    "daysWorking" DECIMAL(65,30) NOT NULL,
    "noph" INTEGER NOT NULL,
    "nopl" INTEGER NOT NULL,
    "otHours" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "basicEarned" DECIMAL(65,30) NOT NULL,
    "hraEarned" DECIMAL(65,30) NOT NULL,
    "daEarned" DECIMAL(65,30) NOT NULL,
    "specialEarned" DECIMAL(65,30) NOT NULL,
    "medicalEarned" DECIMAL(65,30) NOT NULL,
    "conveyanceEarned" DECIMAL(65,30) NOT NULL,
    "washingEarned" DECIMAL(65,30) NOT NULL,
    "otAmount" DECIMAL(65,30) NOT NULL,
    "otherAllowance" DECIMAL(65,30) NOT NULL,
    "scaleTotal" DECIMAL(65,30) NOT NULL,
    "earningsTotal" DECIMAL(65,30) NOT NULL,
    "esiDeduction" DECIMAL(65,30) NOT NULL,
    "taxDeduction" DECIMAL(65,30) NOT NULL,
    "rentDeduction" DECIMAL(65,30) NOT NULL,
    "canteenDeduction" DECIMAL(65,30) NOT NULL,
    "advanceDeduction" DECIMAL(65,30) NOT NULL,
    "otherDeduction" DECIMAL(65,30) NOT NULL,
    "pfDeduction" DECIMAL(65,30) NOT NULL,
    "deductionsTotal" DECIMAL(65,30) NOT NULL,
    "netSalary" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GENERATED',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "regeneratedAt" TIMESTAMP(3),

    CONSTRAINT "payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_slips" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "payrollId" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "pdfPath" TEXT,
    "amountInWords" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_slips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "username" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "changes" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "leaveTypeCode" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedById" INTEGER,
    "reviewedByName" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" SERIAL NOT NULL,
    "role" TEXT NOT NULL,
    "permissionId" INTEGER NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_permission_overrides" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,
    "allowed" BOOLEAN NOT NULL,
    "setById" INTEGER,
    "setByName" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_permission_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER,
    "channel" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "triggeredById" INTEGER,
    "triggeredByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");
CREATE UNIQUE INDEX "employees_code_key" ON "employees"("code");
CREATE UNIQUE INDEX "employees_leaveRequestToken_key" ON "employees"("leaveRequestToken");
CREATE UNIQUE INDEX "attendance_statuses_code_key" ON "attendance_statuses"("code");
CREATE UNIQUE INDEX "attendance_employeeId_date_key" ON "attendance"("employeeId", "date");
CREATE UNIQUE INDEX "leave_types_code_key" ON "leave_types"("code");
CREATE UNIQUE INDEX "payroll_adjustments_employeeId_month_year_key" ON "payroll_adjustments"("employeeId", "month", "year");
CREATE UNIQUE INDEX "payroll_employeeId_month_year_key" ON "payroll"("employeeId", "month", "year");
CREATE UNIQUE INDEX "salary_slips_payrollId_key" ON "salary_slips"("payrollId");
CREATE UNIQUE INDEX "salary_slips_employeeId_month_year_key" ON "salary_slips"("employeeId", "month", "year");
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");
CREATE UNIQUE INDEX "role_permissions_role_permissionId_key" ON "role_permissions"("role", "permissionId");
CREATE UNIQUE INDEX "user_permission_overrides_userId_permissionId_key" ON "user_permission_overrides"("userId", "permissionId");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_attendanceStatusId_fkey" FOREIGN KEY ("attendanceStatusId") REFERENCES "attendance_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "salary_slips" ADD CONSTRAINT "salary_slips_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "salary_slips" ADD CONSTRAINT "salary_slips_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "payroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
