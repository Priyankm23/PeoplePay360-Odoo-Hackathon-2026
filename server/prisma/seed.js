const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for PeoplePay360...');

  // 1. Clear existing data in reverse dependency order
  await prisma.payslipLine.deleteMany();
  await prisma.payslip.deleteMany();
  await prisma.payrun.deleteMany();
  await prisma.salaryRule.deleteMany();
  await prisma.salaryStructure.deleteMany();
  await prisma.timeOffRequest.deleteMany();
  await prisma.timeOffAllocation.deleteMany();
  await prisma.timeOffType.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.scheduleLine.deleteMany();
  await prisma.workingSchedule.deleteMany();
  await prisma.jobPosition.deleteMany();
  await prisma.department.deleteMany();

  console.log('🧹 Cleaned existing database records.');

  // 2. Hash default password
  const defaultPassword = 'Password123!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // 3. Seed Departments
  const hrDept = await prisma.department.create({
    data: { name: 'Human Resources' },
  });
  const financeDept = await prisma.department.create({
    data: { name: 'Finance & Payroll' },
  });
  const engDept = await prisma.department.create({
    data: { name: 'Engineering' },
  });

  console.log('🏢 Departments seeded.');

  // 4. Seed Job Positions
  const hrManagerPos = await prisma.jobPosition.create({
    data: { title: 'HR Manager', departmentId: hrDept.id },
  });
  const payrollUserPos = await prisma.jobPosition.create({
    data: { title: 'Payroll Specialist', departmentId: financeDept.id },
  });
  const payrollManagerPos = await prisma.jobPosition.create({
    data: { title: 'Payroll Director', departmentId: financeDept.id },
  });
  const engineerPos = await prisma.jobPosition.create({
    data: { title: 'Senior Software Engineer', departmentId: engDept.id },
  });

  console.log('💼 Job Positions seeded.');

  // 5. Seed Working Schedule & Lines (Mon-Fri 09:00 - 18:00 with 60min break = 8h/day, 40h/week)
  const standardSchedule = await prisma.workingSchedule.create({
    data: {
      name: 'Standard Full-Time (40h/week)',
      type: 'FULL_TIME',
      lines: {
        create: [
          { day: 'MONDAY', startTime: '09:00', endTime: '18:00', breakMinutes: 60 },
          { day: 'TUESDAY', startTime: '09:00', endTime: '18:00', breakMinutes: 60 },
          { day: 'WEDNESDAY', startTime: '09:00', endTime: '18:00', breakMinutes: 60 },
          { day: 'THURSDAY', startTime: '09:00', endTime: '18:00', breakMinutes: 60 },
          { day: 'FRIDAY', startTime: '09:00', endTime: '18:00', breakMinutes: 60 },
        ],
      },
    },
  });

  console.log('⏰ Working Schedule seeded.');

  // 6. Seed Salary Structure & Rules
  const regularStructure = await prisma.salaryStructure.create({
    data: {
      name: 'Regular Full-Time Structure',
      isActive: true,
    },
  });

  // Rule 1: BASIC (Fixed)
  const basicRule = await prisma.salaryRule.create({
    data: {
      salaryStructureId: regularStructure.id,
      name: 'Basic Salary',
      code: 'BASIC',
      category: 'BASIC',
      sequence: 1,
      computationMethod: 'FIXED',
      fixedAmount: 50000.0,
    },
  });

  // Rule 2: HRA (Percentage of BASIC: 40%)
  const hraRule = await prisma.salaryRule.create({
    data: {
      salaryStructureId: regularStructure.id,
      name: 'House Rent Allowance (HRA)',
      code: 'HRA',
      category: 'ALLOWANCE',
      sequence: 2,
      computationMethod: 'PERCENTAGE',
      percentage: 40.0,
      baseRuleId: basicRule.id,
    },
  });

  // Rule 3: PF (Provident Fund Deduction: 12% of BASIC)
  const pfRule = await prisma.salaryRule.create({
    data: {
      salaryStructureId: regularStructure.id,
      name: 'Provident Fund (PF)',
      code: 'PF',
      category: 'DEDUCTION',
      sequence: 3,
      computationMethod: 'PERCENTAGE',
      percentage: 12.0,
      baseRuleId: basicRule.id,
    },
  });

  console.log('🧮 Salary Structure & Rules seeded.');

  // 7. Seed Time Off Types
  const annualLeave = await prisma.timeOffType.create({
    data: {
      name: 'Annual Paid Leave',
      unit: 'DAYS',
      requiresAllocation: true,
      requiresApproval: true,
      affectsPayroll: true,
    },
  });

  const sickLeave = await prisma.timeOffType.create({
    data: {
      name: 'Sick Leave',
      unit: 'DAYS',
      requiresAllocation: true,
      requiresApproval: true,
      affectsPayroll: false,
    },
  });

  console.log('🏖️ Time Off Types seeded.');

  // 8. Seed Employees and Linked Users for All 5 Roles

  // A. Admin (No linked Employee)
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  // B. HR Manager
  const hrManagerEmp = await prisma.employee.create({
    data: {
      firstName: 'Sarah',
      lastName: 'Jenkins',
      email: 'hrmanager@demo.com',
      phone: '+1 555-0101',
      departmentId: hrDept.id,
      jobPositionId: hrManagerPos.id,
      workingScheduleId: standardSchedule.id,
      status: 'ACTIVE',
      bankAccount: 'US89370400440532013000',
    },
  });
  await prisma.user.create({
    data: {
      email: hrManagerEmp.email,
      passwordHash,
      role: 'HR_MANAGER',
      employeeId: hrManagerEmp.id,
    },
  });

  // C. HR Payroll User
  const payrollUserEmp = await prisma.employee.create({
    data: {
      firstName: 'Michael',
      lastName: 'Chen',
      email: 'payrolluser@demo.com',
      phone: '+1 555-0102',
      departmentId: financeDept.id,
      jobPositionId: payrollUserPos.id,
      workingScheduleId: standardSchedule.id,
      status: 'ACTIVE',
      bankAccount: 'US89370400440532013001',
    },
  });
  await prisma.user.create({
    data: {
      email: payrollUserEmp.email,
      passwordHash,
      role: 'HR_PAYROLL_USER',
      employeeId: payrollUserEmp.id,
    },
  });

  // D. HR Payroll Manager
  const payrollManagerEmp = await prisma.employee.create({
    data: {
      firstName: 'Elena',
      lastName: 'Rostova',
      email: 'payrollmanager@demo.com',
      phone: '+1 555-0103',
      departmentId: financeDept.id,
      jobPositionId: payrollManagerPos.id,
      workingScheduleId: standardSchedule.id,
      status: 'ACTIVE',
      bankAccount: 'US89370400440532013002',
    },
  });
  await prisma.user.create({
    data: {
      email: payrollManagerEmp.email,
      passwordHash,
      role: 'HR_PAYROLL_MANAGER',
      employeeId: payrollManagerEmp.id,
    },
  });

  // E. Regular Employee
  const devEmp = await prisma.employee.create({
    data: {
      firstName: 'Alex',
      lastName: 'Rivera',
      email: 'employee@demo.com',
      phone: '+1 555-0104',
      departmentId: engDept.id,
      jobPositionId: engineerPos.id,
      managerId: hrManagerEmp.id,
      workingScheduleId: standardSchedule.id,
      status: 'ACTIVE',
      bankAccount: 'US89370400440532013003',
    },
  });
  await prisma.user.create({
    data: {
      email: devEmp.email,
      passwordHash,
      role: 'EMPLOYEE',
      employeeId: devEmp.id,
    },
  });

  console.log('👥 5 Demo Role Users & Employees seeded.');

  // 9. Seed Active Contract for Alex Rivera
  const devContract = await prisma.contract.create({
    data: {
      employeeId: devEmp.id,
      departmentId: engDept.id,
      jobPositionId: engineerPos.id,
      workingScheduleId: standardSchedule.id,
      salaryStructureId: regularStructure.id,
      startDate: new Date('2026-01-01'),
      endDate: null, // open-ended
      wage: 50000.0,
      status: 'RUNNING',
    },
  });

  console.log('📜 Active Contract seeded for Alex Rivera.');

  // 10. Seed Leave Allocation & Request for Alex Rivera
  const devAllocation = await prisma.timeOffAllocation.create({
    data: {
      employeeId: devEmp.id,
      timeOffTypeId: annualLeave.id,
      allocated: 20.0,
      taken: 3.0,
      validFrom: new Date('2026-01-01'),
      validTo: new Date('2026-12-31'),
      status: 'APPROVED',
    },
  });

  // Pending submitted request
  await prisma.timeOffRequest.create({
    data: {
      employeeId: devEmp.id,
      timeOffTypeId: annualLeave.id,
      allocationId: devAllocation.id,
      startDate: new Date('2026-09-15'),
      endDate: new Date('2026-09-16'),
      duration: 2.0,
      status: 'SUBMITTED',
      decisionNote: 'Annual personal time off & family vacation',
    },
  });

  console.log('🏖️ Leave Allocation & Pending Request seeded.');

  // 11. Seed Attendance History for Alex Rivera
  await prisma.attendance.createMany({
    data: [
      {
        employeeId: devEmp.id,
        date: new Date('2026-09-01'),
        checkIn: new Date('2026-09-01T09:00:00Z'),
        checkOut: new Date('2026-09-01T18:00:00Z'),
        workedHours: 8.0,
        status: 'PRESENT',
      },
      {
        employeeId: devEmp.id,
        date: new Date('2026-09-02'),
        checkIn: new Date('2026-09-02T09:35:00Z'),
        checkOut: new Date('2026-09-02T18:00:00Z'),
        workedHours: 7.42,
        status: 'LATE',
      },
      {
        employeeId: devEmp.id,
        date: new Date('2026-09-03'),
        checkIn: new Date('2026-09-03T09:00:00Z'),
        checkOut: null,
        workedHours: null,
        status: 'MISSING_CHECKOUT',
      },
    ],
  });

  console.log('⏱️ Attendance history seeded.');
  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
