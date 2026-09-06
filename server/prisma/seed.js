const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for PeoplePay360 with realistic human names...');

  // 1. Clear existing data in reverse dependency order
  await prisma.payslipLine.deleteMany();
  await prisma.payslip.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.payrun.deleteMany();
  await prisma.salaryRule.deleteMany();
  await prisma.salaryStructure.deleteMany();
  await prisma.timeOffRequest.deleteMany();
  await prisma.timeOffAllocation.deleteMany();
  await prisma.timeOffType.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.scheduleLine.deleteMany();
  await prisma.workingSchedule.deleteMany();
  await prisma.jobPosition.deleteMany();
  await prisma.department.deleteMany();

  console.log('🧹 Cleaned existing database records.');

  // 2. Hash default password for demo accounts
  const defaultPassword = 'Password123!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // 3. Seed Departments (Human Resources, Finance & Payroll, Engineering, R&D, Marketing)
  const hrDept = await prisma.department.create({
    data: { name: 'Human Resources' },
  });
  const financeDept = await prisma.department.create({
    data: { name: 'Finance & Payroll' },
  });
  const engDept = await prisma.department.create({
    data: { name: 'Engineering' },
  });
  const rdDept = await prisma.department.create({
    data: { name: 'R&D' },
  });
  const mktgDept = await prisma.department.create({
    data: { name: 'Marketing' },
  });

  console.log('🏢 5 Core Departments seeded.');

  // 4. Seed Job Positions
  // HR
  const hrDirectorPos = await prisma.jobPosition.create({
    data: { title: 'HR Director', departmentId: hrDept.id },
  });
  const hrManagerPos = await prisma.jobPosition.create({
    data: { title: 'HR Manager', departmentId: hrDept.id },
  });
  const talentAcqPos = await prisma.jobPosition.create({
    data: { title: 'Talent Acquisition Specialist', departmentId: hrDept.id },
  });
  const peopleOpsPos = await prisma.jobPosition.create({
    data: { title: 'People Operations Partner', departmentId: hrDept.id },
  });

  // Finance
  const payrollManagerPos = await prisma.jobPosition.create({
    data: { title: 'Payroll Director', departmentId: financeDept.id },
  });
  const payrollUserPos = await prisma.jobPosition.create({
    data: { title: 'Payroll Specialist', departmentId: financeDept.id },
  });
  const finAnalystPos = await prisma.jobPosition.create({
    data: { title: 'Senior Financial Analyst', departmentId: financeDept.id },
  });
  const apLeadPos = await prisma.jobPosition.create({
    data: { title: 'Accounts Payable Lead', departmentId: financeDept.id },
  });

  // Engineering
  const leadArchitectPos = await prisma.jobPosition.create({
    data: { title: 'Lead Software Architect', departmentId: engDept.id },
  });
  const engineerPos = await prisma.jobPosition.create({
    data: { title: 'Senior Software Engineer', departmentId: engDept.id },
  });
  const fullStackPos = await prisma.jobPosition.create({
    data: { title: 'Full Stack Engineer', departmentId: engDept.id },
  });
  const backendPos = await prisma.jobPosition.create({
    data: { title: 'Backend Engineer', departmentId: engDept.id },
  });
  const frontendPos = await prisma.jobPosition.create({
    data: { title: 'Frontend Developer', departmentId: engDept.id },
  });
  const devopsPos = await prisma.jobPosition.create({
    data: { title: 'DevOps Engineer', departmentId: engDept.id },
  });

  // R&D
  const rdLeadPos = await prisma.jobPosition.create({
    data: { title: 'AI/ML Research Lead', departmentId: rdDept.id },
  });
  const mlScientistPos = await prisma.jobPosition.create({
    data: { title: 'Machine Learning Scientist', departmentId: rdDept.id },
  });
  const principalScientistPos = await prisma.jobPosition.create({
    data: { title: 'Principal Research Scientist', departmentId: rdDept.id },
  });
  const dataScientistPos = await prisma.jobPosition.create({
    data: { title: 'Senior Data Scientist', departmentId: rdDept.id },
  });

  // Marketing
  const mktgDirectorPos = await prisma.jobPosition.create({
    data: { title: 'Marketing Director', departmentId: mktgDept.id },
  });
  const socialMediaPos = await prisma.jobPosition.create({
    data: { title: 'Social Media Manager', departmentId: mktgDept.id },
  });
  const contentStrategistPos = await prisma.jobPosition.create({
    data: { title: 'Content Strategist', departmentId: mktgDept.id },
  });
  const growthLeadPos = await prisma.jobPosition.create({
    data: { title: 'Growth Marketing Lead', departmentId: mktgDept.id },
  });

  console.log('💼 Job Positions seeded.');

  // 5. Seed Working Schedule & Lines
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

  // 8. Seed Admin User (standalone)
  await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  // 9. Employee definitions: 6 employees per department with realistic human names
  const employeeDefs = [
    // --- HUMAN RESOURCES (6) ---
    {
      firstName: 'Sarah',
      lastName: 'Jenkins',
      email: 'hrmanager@demo.com',
      phone: '+1 555-0101',
      bankAccount: 'US89370400440532013000',
      deptId: hrDept.id,
      jobPosId: hrManagerPos.id,
      wage: 85000,
      role: 'HR_MANAGER',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
    },
    {
      firstName: 'David',
      lastName: 'Vance',
      email: 'david.vance@demo.com',
      phone: '+1 555-0105',
      bankAccount: 'US89370400440532013004',
      deptId: hrDept.id,
      jobPosId: hrDirectorPos.id,
      wage: 110000,
      role: 'EMPLOYEE',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    },
    {
      firstName: 'Amara',
      lastName: 'Okafor',
      email: 'amara.okafor@demo.com',
      phone: '+1 555-0106',
      bankAccount: 'US89370400440532013005',
      deptId: hrDept.id,
      jobPosId: talentAcqPos.id,
      wage: 62000,
      role: 'EMPLOYEE',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    },
    {
      firstName: 'Chloe',
      lastName: 'Dupont',
      email: 'chloe.dupont@demo.com',
      phone: '+1 555-0107',
      bankAccount: 'US89370400440532013006',
      deptId: hrDept.id,
      jobPosId: peopleOpsPos.id,
      wage: 58000,
      role: null,
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
    },
    {
      firstName: 'Marcus',
      lastName: 'Bennett',
      email: 'marcus.bennett@demo.com',
      phone: '+1 555-0108',
      bankAccount: 'US89370400440532013007',
      deptId: hrDept.id,
      jobPosId: peopleOpsPos.id,
      wage: 56000,
      role: null,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    },
    {
      firstName: 'Emily',
      lastName: 'Zhao',
      email: 'emily.zhao@demo.com',
      phone: '+1 555-0109',
      bankAccount: 'US89370400440532013008',
      deptId: hrDept.id,
      jobPosId: talentAcqPos.id,
      wage: 60000,
      role: null,
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
    },

    // --- FINANCE & PAYROLL (6) ---
    {
      firstName: 'Elena',
      lastName: 'Rostova',
      email: 'payrollmanager@demo.com',
      phone: '+1 555-0103',
      bankAccount: 'US89370400440532013002',
      deptId: financeDept.id,
      jobPosId: payrollManagerPos.id,
      wage: 95000,
      role: 'HR_PAYROLL_MANAGER',
      avatar: 'https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&w=256&q=80',
    },
    {
      firstName: 'Michael',
      lastName: 'Chen',
      email: 'payrolluser@demo.com',
      phone: '+1 555-0102',
      bankAccount: 'US89370400440532013001',
      deptId: financeDept.id,
      jobPosId: payrollUserPos.id,
      wage: 65000,
      role: 'HR_PAYROLL_USER',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80',
    },
    {
      firstName: 'Sophia',
      lastName: 'Martinez',
      email: 'sophia.martinez@demo.com',
      phone: '+1 555-0110',
      bankAccount: 'US89370400440532013009',
      deptId: financeDept.id,
      jobPosId: finAnalystPos.id,
      wage: 72000,
      role: 'EMPLOYEE',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
    },
    {
      firstName: 'Rohan',
      lastName: 'Patel',
      email: 'rohan.patel@demo.com',
      phone: '+1 555-0111',
      bankAccount: 'US89370400440532013010',
      deptId: financeDept.id,
      jobPosId: apLeadPos.id,
      wage: 68000,
      role: null,
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&q=80',
    },
    {
      firstName: 'Arthur',
      lastName: 'Pendelton',
      email: 'arthur.pendelton@demo.com',
      phone: '+1 555-0112',
      bankAccount: 'US89370400440532013011',
      deptId: financeDept.id,
      jobPosId: finAnalystPos.id,
      wage: 78000,
      role: null,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80',
    },
    {
      firstName: 'Oliver',
      lastName: 'Kim',
      email: 'oliver.kim@demo.com',
      phone: '+1 555-0113',
      bankAccount: 'US89370400440532013012',
      deptId: financeDept.id,
      jobPosId: payrollUserPos.id,
      wage: 62000,
      role: null,
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&q=80',
    },

    // --- ENGINEERING (6) ---
    {
      firstName: 'Alex',
      lastName: 'Rivera',
      email: 'employee@demo.com',
      phone: '+1 555-0104',
      bankAccount: 'US89370400440532013003',
      deptId: engDept.id,
      jobPosId: engineerPos.id,
      wage: 85000,
      role: 'EMPLOYEE',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=256&q=80',
    },
    {
      firstName: 'Jordan',
      lastName: 'Hayes',
      email: 'jordan.hayes@demo.com',
      phone: '+1 555-0114',
      bankAccount: 'US89370400440532013013',
      deptId: engDept.id,
      jobPosId: leadArchitectPos.id,
      wage: 125000,
      role: 'EMPLOYEE',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80',
    },
    {
      firstName: 'Priyank',
      lastName: 'Moradiya',
      email: 'priyank.moradiya@demo.com',
      phone: '+1 555-0115',
      bankAccount: 'US89370400440532013014',
      deptId: engDept.id,
      jobPosId: fullStackPos.id,
      wage: 95000,
      role: 'EMPLOYEE',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80',
    },
    {
      firstName: 'Meet',
      lastName: 'Patel',
      email: 'meet.patel@demo.com',
      phone: '+1 555-0116',
      bankAccount: 'US89370400440532013015',
      deptId: engDept.id,
      jobPosId: backendPos.id,
      wage: 88000,
      role: null,
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=256&q=80',
    },
    {
      firstName: 'Lucas',
      lastName: 'Silva',
      email: 'lucas.silva@demo.com',
      phone: '+1 555-0117',
      bankAccount: 'US89370400440532013016',
      deptId: engDept.id,
      jobPosId: frontendPos.id,
      wage: 82000,
      role: null,
      avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=256&q=80',
    },
    {
      firstName: 'Daniel',
      lastName: 'Morales',
      email: 'daniel.morales@demo.com',
      phone: '+1 555-0118',
      bankAccount: 'US89370400440532013017',
      deptId: engDept.id,
      jobPosId: devopsPos.id,
      wage: 92000,
      role: null,
      avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=256&q=80',
    },

    // --- R&D (6) ---
    {
      firstName: 'Jay',
      lastName: 'Shah',
      email: 'jay.shah@demo.com',
      phone: '+1 555-0119',
      bankAccount: 'US89370400440532013018',
      deptId: rdDept.id,
      jobPosId: rdLeadPos.id,
      wage: 115000,
      role: 'EMPLOYEE',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&q=80',
    },
    {
      firstName: 'Rohan',
      lastName: 'Shah',
      email: 'rohan.shah@demo.com',
      phone: '+1 555-0120',
      bankAccount: 'US89370400440532013019',
      deptId: rdDept.id,
      jobPosId: mlScientistPos.id,
      wage: 98000,
      role: 'EMPLOYEE',
      avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=256&q=80',
    },
    {
      firstName: 'Evelyn',
      lastName: 'Zhang',
      email: 'evelyn.zhang@demo.com',
      phone: '+1 555-0121',
      bankAccount: 'US89370400440532013020',
      deptId: rdDept.id,
      jobPosId: principalScientistPos.id,
      wage: 130000,
      role: null,
      avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=256&q=80',
    },
    {
      firstName: 'Julian',
      lastName: 'Brooks',
      email: 'julian.brooks@demo.com',
      phone: '+1 555-0122',
      bankAccount: 'US89370400440532013021',
      deptId: rdDept.id,
      jobPosId: dataScientistPos.id,
      wage: 89000,
      role: null,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    },
    {
      firstName: 'Priya',
      lastName: 'Sharma',
      email: 'priya.sharma@demo.com',
      phone: '+1 555-0123',
      bankAccount: 'US89370400440532013022',
      deptId: rdDept.id,
      jobPosId: mlScientistPos.id,
      wage: 94000,
      role: null,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    },
    {
      firstName: 'Alexander',
      lastName: 'Reed',
      email: 'alexander.reed@demo.com',
      phone: '+1 555-0124',
      bankAccount: 'US89370400440532013023',
      deptId: rdDept.id,
      jobPosId: dataScientistPos.id,
      wage: 86000,
      role: null,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    },

    // --- MARKETING (6) ---
    {
      firstName: 'Jay',
      lastName: 'Patel',
      email: 'jay.patel@demo.com',
      phone: '+1 555-0125',
      bankAccount: 'US89370400440532013024',
      deptId: mktgDept.id,
      jobPosId: mktgDirectorPos.id,
      wage: 105000,
      role: 'EMPLOYEE',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=256&q=80',
    },
    {
      firstName: 'Isabella',
      lastName: 'Rossi',
      email: 'isabella.rossi@demo.com',
      phone: '+1 555-0126',
      bankAccount: 'US89370400440532013025',
      deptId: mktgDept.id,
      jobPosId: socialMediaPos.id,
      wage: 64000,
      role: 'EMPLOYEE',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
    },
    {
      firstName: 'Harper',
      lastName: 'Tanaka',
      email: 'harper.tanaka@demo.com',
      phone: '+1 555-0127',
      bankAccount: 'US89370400440532013026',
      deptId: mktgDept.id,
      jobPosId: contentStrategistPos.id,
      wage: 68000,
      role: null,
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
    },
    {
      firstName: 'Noah',
      lastName: 'Patel',
      email: 'noah.patel@demo.com',
      phone: '+1 555-0128',
      bankAccount: 'US89370400440532013027',
      deptId: mktgDept.id,
      jobPosId: growthLeadPos.id,
      wage: 76000,
      role: null,
      avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=256&q=80',
    },
    {
      firstName: 'Charlotte',
      lastName: 'Miller',
      email: 'charlotte.miller@demo.com',
      phone: '+1 555-0129',
      bankAccount: 'US89370400440532013028',
      deptId: mktgDept.id,
      jobPosId: socialMediaPos.id,
      wage: 61000,
      role: null,
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
    },
    {
      firstName: 'Gabriel',
      lastName: 'Santos',
      email: 'gabriel.santos@demo.com',
      phone: '+1 555-0130',
      bankAccount: 'US89370400440532013029',
      deptId: mktgDept.id,
      jobPosId: contentStrategistPos.id,
      wage: 65000,
      role: null,
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&q=80',
    },
  ];

  console.log(`👥 Creating ${employeeDefs.length} employees with natural names (6 per department)...`);

  const createdEmployees = [];

  for (let i = 0; i < employeeDefs.length; i++) {
    const def = employeeDefs[i];

    const emp = await prisma.employee.create({
      data: {
        firstName: def.firstName,
        lastName: def.lastName,
        email: def.email,
        phone: def.phone,
        bankAccount: def.bankAccount,
        departmentId: def.deptId,
        jobPositionId: def.jobPosId,
        workingScheduleId: standardSchedule.id,
        status: 'ACTIVE',
        profileImageUrl: def.avatar,
      },
    });

    // Create User login if role specified
    if (def.role) {
      await prisma.user.create({
        data: {
          email: emp.email,
          passwordHash,
          role: def.role,
          employeeId: emp.id,
        },
      });
    }

    // Create Active Contract for each employee
    const contract = await prisma.contract.create({
      data: {
        reference: `CNT-2026-${String(i + 1).padStart(4, '0')}`,
        employeeId: emp.id,
        departmentId: def.deptId,
        jobPositionId: def.jobPosId,
        workingScheduleId: standardSchedule.id,
        salaryStructureId: regularStructure.id,
        startDate: new Date('2026-01-01'),
        endDate: null,
        wage: def.wage,
        status: 'RUNNING',
      },
    });

    // Create Time Off Allocations
    const allocAnnual = await prisma.timeOffAllocation.create({
      data: {
        employeeId: emp.id,
        timeOffTypeId: annualLeave.id,
        allocated: 20.0,
        taken: (i % 4) + 1,
        validFrom: new Date('2026-01-01'),
        validTo: new Date('2026-12-31'),
        status: 'APPROVED',
      },
    });

    await prisma.timeOffAllocation.create({
      data: {
        employeeId: emp.id,
        timeOffTypeId: sickLeave.id,
        allocated: 10.0,
        taken: i % 2,
        validFrom: new Date('2026-01-01'),
        validTo: new Date('2026-12-31'),
        status: 'APPROVED',
      },
    });

    // Seed realistic Time Off Requests for half the employees
    if (i % 2 === 0) {
      const startDay = 10 + (i % 15);
      await prisma.timeOffRequest.create({
        data: {
          employeeId: emp.id,
          timeOffTypeId: annualLeave.id,
          allocationId: allocAnnual.id,
          startDate: new Date(`2026-09-${String(startDay).padStart(2, '0')}`),
          endDate: new Date(`2026-09-${String(startDay + 2).padStart(2, '0')}`),
          duration: 2.0,
          status: i % 4 === 0 ? 'APPROVED' : 'SUBMITTED',
          decisionNote: i % 4 === 0 ? 'Approved for annual personal time off' : 'Family event and travel',
        },
      });
    }

    // Seed realistic attendance records for each employee (Sep 1 to Sep 3)
    await prisma.attendance.createMany({
      data: [
        {
          employeeId: emp.id,
          date: new Date('2026-09-01'),
          checkIn: new Date('2026-09-01T09:00:00Z'),
          checkOut: new Date('2026-09-01T18:00:00Z'),
          workedHours: 8.0,
          status: 'PRESENT',
        },
        {
          employeeId: emp.id,
          date: new Date('2026-09-02'),
          checkIn: i % 5 === 0 ? new Date('2026-09-02T09:35:00Z') : new Date('2026-09-02T08:58:00Z'),
          checkOut: new Date('2026-09-02T18:00:00Z'),
          workedHours: i % 5 === 0 ? 7.42 : 8.0,
          status: i % 5 === 0 ? 'LATE' : 'PRESENT',
        },
        {
          employeeId: emp.id,
          date: new Date('2026-09-03'),
          checkIn: new Date('2026-09-03T09:00:00Z'),
          checkOut: i % 7 === 0 ? null : new Date('2026-09-03T18:00:00Z'),
          workedHours: i % 7 === 0 ? null : 8.0,
          status: i % 7 === 0 ? 'MISSING_CHECKOUT' : 'PRESENT',
        },
      ],
    });

    createdEmployees.push({ emp, contract, wage: def.wage });
  }

  // Set realistic managers (Sarah Jenkins for HR, Elena Rostova for Finance, Jordan Hayes for Eng, Jay Shah for R&D, Jay Patel for Mktg)
  const sarah = createdEmployees.find((e) => e.emp.email === 'hrmanager@demo.com')?.emp;
  const elena = createdEmployees.find((e) => e.emp.email === 'payrollmanager@demo.com')?.emp;
  const jordan = createdEmployees.find((e) => e.emp.email === 'jordan.hayes@demo.com')?.emp;
  const jayShah = createdEmployees.find((e) => e.emp.email === 'jay.shah@demo.com')?.emp;
  const jayPatel = createdEmployees.find((e) => e.emp.email === 'jay.patel@demo.com')?.emp;

  for (const { emp } of createdEmployees) {
    let managerId = null;
    if (emp.departmentId === hrDept.id && emp.id !== sarah?.id) managerId = sarah?.id;
    else if (emp.departmentId === financeDept.id && emp.id !== elena?.id) managerId = elena?.id;
    else if (emp.departmentId === engDept.id && emp.id !== jordan?.id) managerId = jordan?.id;
    else if (emp.departmentId === rdDept.id && emp.id !== jayShah?.id) managerId = jayShah?.id;
    else if (emp.departmentId === mktgDept.id && emp.id !== jayPatel?.id) managerId = jayPatel?.id;

    if (managerId) {
      await prisma.employee.update({
        where: { id: emp.id },
        data: { managerId },
      });
    }
  }

  // 10. Seed August 2026 Payrun with complete Payslips & PayslipLines
  const augustPayrun = await prisma.payrun.create({
    data: {
      name: 'August 2026 Regular Payroll',
      salaryStructureId: regularStructure.id,
      periodStart: new Date('2026-08-01'),
      periodEnd: new Date('2026-08-31'),
      status: 'PAID',
    },
  });

  for (const { emp, contract, wage } of createdEmployees) {
    const basic = Number(wage);
    const hra = basic * 0.4;
    const pf = basic * 0.12;
    const gross = basic + hra;
    const net = gross - pf;

    const payslip = await prisma.payslip.create({
      data: {
        payrunId: augustPayrun.id,
        employeeId: emp.id,
        contractId: contract.id,
        workedDays: 22,
        grossSalary: gross,
        netSalary: net,
        status: 'PAID',
        sentAt: new Date('2026-08-31T17:00:00Z'),
      },
    });

    await prisma.payslipLine.createMany({
      data: [
        {
          payslipId: payslip.id,
          salaryRuleId: basicRule.id,
          code: 'BASIC',
          name: 'Basic Salary',
          category: 'BASIC',
          amount: basic,
        },
        {
          payslipId: payslip.id,
          salaryRuleId: hraRule.id,
          code: 'HRA',
          name: 'House Rent Allowance (HRA)',
          category: 'ALLOWANCE',
          amount: hra,
        },
        {
          payslipId: payslip.id,
          salaryRuleId: pfRule.id,
          code: 'PF',
          name: 'Provident Fund (PF)',
          category: 'DEDUCTION',
          amount: pf,
        },
      ],
    });
  }

  console.log('💰 August 2026 Payrun & 30 Payslips with line items seeded.');
  console.log('🎉 Database seeding completed successfully with authentic human names!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
