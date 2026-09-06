const prisma = require('../../config/prisma');
const { ApiError } = require('../../utils/apiResponse');
const { recordAudit } = require('../../utils/audit');
const { sendPayslipStatementEmail } = require('../../utils/mailer');

class PayrunService {
  /**
   * Helper: check if string is valid UUID
   */
  isValidUUID(id) {
    const regex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return typeof id === 'string' && regex.test(id);
  }

  /**
   * Helper: format date object to YYYY-MM-DD
   */
  formatDate(date) {
    if (!date) return null;
    return new Date(date).toISOString().split('T')[0];
  }

  /**
   * Helper: Convert Decimal fields to Number for JSON serialization
   */
  enrichPayslip(payslip) {
    if (!payslip) return null;
    return {
      ...payslip,
      workedDays: payslip.workedDays !== null ? Number(payslip.workedDays) : 0,
      grossSalary: payslip.grossSalary !== null ? Number(payslip.grossSalary) : 0,
      netSalary: payslip.netSalary !== null ? Number(payslip.netSalary) : 0,
      lines: payslip.lines
        ? payslip.lines.map((l) => ({
            ...l,
            amount: Number(l.amount),
          }))
        : [],
    };
  }

  /**
   * Wizard Step 1: Preview Eligible Employees
   * PURE CALCULATION - PERSISTS NOTHING TO THE DATABASE
   */
  async previewEligible({ salaryStructureId, periodStart, periodEnd }) {
    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);

    // Verify salary structure exists and is active
    const structure = await prisma.salaryStructure.findFirst({
      where: { id: salaryStructureId, isArchived: false },
      include: {
        rules: { where: { isArchived: false } },
      },
    });
    if (!structure) {
      throw ApiError.notFound('Salary structure not found', 'SALARY_STRUCTURE_NOT_FOUND');
    }

    // Find all unarchived employees
    const employees = await prisma.employee.findMany({
      where: { isArchived: false, status: 'ACTIVE' },
      include: {
        department: { select: { id: true, name: true } },
        jobPosition: { select: { id: true, title: true } },
        contracts: {
          where: {
            isArchived: false,
            status: 'RUNNING',
            startDate: { lte: endDate },
            OR: [{ endDate: null }, { endDate: { gte: startDate } }],
          },
          include: {
            salaryStructure: { select: { id: true, name: true } },
          },
          orderBy: { startDate: 'desc' },
        },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    const eligibleEmployees = [];

    for (const emp of employees) {
      // Key Business Rule #1: Resolve contract that matches salary structure and overlaps period
      const matchingContract = emp.contracts.find(
        (c) => c.salaryStructureId === salaryStructureId
      );

      const hasRunningContract = !!matchingContract;
      const warnings = [];

      if (!hasRunningContract) {
        if (emp.contracts.length > 0) {
          warnings.push(
            `Assigned to different structure ('${emp.contracts[0].salaryStructure?.name}')`
          );
        } else {
          warnings.push('No active running contract in this period');
        }
      }

      if (!emp.bankAccount) {
        warnings.push('Missing bank account details');
      }

      eligibleEmployees.push({
        employeeId: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        email: emp.email,
        department: emp.department?.name || 'General',
        jobTitle: emp.jobPosition?.title || 'Team Member',
        wage: matchingContract ? Number(matchingContract.wage) : 0,
        contractId: matchingContract?.id || null,
        hasRunningContract,
        warnings,
      });
    }

    return {
      salaryStructure: {
        id: structure.id,
        name: structure.name,
        rulesCount: structure.rules.length,
      },
      periodStart,
      periodEnd,
      totalEmployees: employees.length,
      eligibleCount: eligibleEmployees.filter((e) => e.hasRunningContract).length,
      eligibleEmployees,
    };
  }

  /**
   * Wizard Step 2: Create Payrun and Draft Payslips
   */
  async createPayrun(data, actorUser, reqMeta = {}) {
    const { name, salaryStructureId, periodStart, periodEnd, employeeIds } = data;
    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);

    // Verify structure
    const structure = await prisma.salaryStructure.findFirst({
      where: { id: salaryStructureId, isArchived: false },
    });
    if (!structure) {
      throw ApiError.notFound('Salary structure not found', 'SALARY_STRUCTURE_NOT_FOUND');
    }

    // Server-side re-validation of eligibility for selected employees
    const employees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        isArchived: false,
      },
      include: {
        contracts: {
          where: {
            salaryStructureId,
            status: 'RUNNING',
            isArchived: false,
            startDate: { lte: endDate },
            OR: [{ endDate: null }, { endDate: { gte: startDate } }],
          },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (employees.length !== employeeIds.length) {
      throw ApiError.badRequest('One or more selected employees could not be found');
    }

    // Verify each selected employee has an eligible running contract
    const resolvedContracts = new Map();
    for (const emp of employees) {
      if (!emp.contracts || emp.contracts.length === 0) {
        throw ApiError.badRequest(
          `Employee '${emp.firstName} ${emp.lastName}' does not have an active running contract for this salary structure in the selected pay period`,
          { employeeId: emp.id },
          'EMPLOYEE_NOT_ELIGIBLE'
        );
      }
      resolvedContracts.set(emp.id, emp.contracts[0].id);
    }

    // Create Payrun and Draft Payslips in transaction
    const payrun = await prisma.$transaction(async (tx) => {
      const createdPayrun = await tx.payrun.create({
        data: {
          name: name.trim(),
          salaryStructureId,
          periodStart: startDate,
          periodEnd: endDate,
          status: 'DRAFT',
          payslips: {
            create: employeeIds.map((empId) => ({
              employeeId: empId,
              contractId: resolvedContracts.get(empId),
              status: 'DRAFT',
              workedDays: 0,
              grossSalary: 0,
              netSalary: 0,
            })),
          },
        },
        include: {
          salaryStructure: { select: { id: true, name: true } },
          _count: { select: { payslips: true } },
        },
      });

      return createdPayrun;
    });

    await recordAudit({
      actorId: actorUser?.id,
      action: 'PAYRUN_CREATED',
      entity: 'Payrun',
      entityId: payrun.id,
      metadata: {
        name: payrun.name,
        structure: structure.name,
        employeeCount: employeeIds.length,
        periodStart,
        periodEnd,
      },
      ipAddress: reqMeta.ip,
    });

    return {
      id: payrun.id,
      name: payrun.name,
      salaryStructureId: payrun.salaryStructureId,
      salaryStructure: payrun.salaryStructure?.name,
      periodStart: this.formatDate(payrun.periodStart),
      periodEnd: this.formatDate(payrun.periodEnd),
      status: payrun.status,
      employeeCount: payrun._count.payslips,
      createdAt: payrun.createdAt,
    };
  }

  /**
   * List Payruns with summary metrics
   */
  async getPayruns({ status, search } = {}) {
    const where = {};
    if (status && status !== 'ALL') {
      where.status = status.toUpperCase();
    }
    if (search && search.trim()) {
      where.name = { contains: search.trim(), mode: 'insensitive' };
    }

    const payruns = await prisma.payrun.findMany({
      where,
      include: {
        salaryStructure: { select: { id: true, name: true } },
        payslips: {
          select: {
            id: true,
            grossSalary: true,
            netSalary: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return payruns.map((p) => {
      const employeeCount = p.payslips.length;
      const totalGross = p.payslips.reduce((sum, ps) => sum + (ps.grossSalary ? Number(ps.grossSalary) : 0), 0);
      const totalNet = p.payslips.reduce((sum, ps) => sum + (ps.netSalary ? Number(ps.netSalary) : 0), 0);

      return {
        id: p.id,
        name: p.name,
        salaryStructureId: p.salaryStructureId,
        salaryStructure: p.salaryStructure?.name,
        periodStart: this.formatDate(p.periodStart),
        periodEnd: this.formatDate(p.periodEnd),
        status: p.status.toLowerCase(),
        employeeCount,
        totalGross,
        totalNet,
        createdAt: p.createdAt,
      };
    });
  }

  /**
   * Get Payrun details with child payslips summary
   */
  async getPayrunById(id) {
    if (!this.isValidUUID(id)) {
      throw ApiError.notFound('Payrun not found', 'PAYRUN_NOT_FOUND');
    }

    const payrun = await prisma.payrun.findUnique({
      where: { id },
      include: {
        salaryStructure: {
          include: {
            rules: {
              where: { isArchived: false },
              orderBy: { sequence: 'asc' },
            },
          },
        },
        payslips: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                bankAccount: true,
                department: { select: { name: true } },
                jobPosition: { select: { title: true } },
              },
            },
            contract: {
              select: {
                id: true,
                reference: true,
                wage: true,
                status: true,
              },
            },
            _count: { select: { lines: true } },
          },
          orderBy: [{ employee: { firstName: 'asc' } }, { employee: { lastName: 'asc' } }],
        },
      },
    });

    if (!payrun) {
      throw ApiError.notFound('Payrun not found', 'PAYRUN_NOT_FOUND');
    }

    const payslips = payrun.payslips.map((ps) => {
      const warnings = Array.isArray(ps.warnings) ? ps.warnings : [];
      return {
        id: ps.id,
        employeeId: ps.employeeId,
        employeeName: `${ps.employee.firstName} ${ps.employee.lastName}`,
        email: ps.employee.email,
        department: ps.employee.department?.name || 'General',
        jobTitle: ps.employee.jobPosition?.title || 'Team Member',
        contractRef: ps.contract?.reference || 'CON-REF',
        wage: ps.contract?.wage ? Number(ps.contract.wage) : 0,
        workedDays: ps.workedDays !== null ? Number(ps.workedDays) : 0,
        grossSalary: ps.grossSalary !== null ? Number(ps.grossSalary) : 0,
        netSalary: ps.netSalary !== null ? Number(ps.netSalary) : 0,
        status: ps.status.toLowerCase(),
        warnings,
        hasBlockingWarnings: warnings.some((w) => w.severity === 'blocking'),
        linesCount: ps._count.lines,
      };
    });

    const totalGross = payslips.reduce((acc, p) => acc + p.grossSalary, 0);
    const totalNet = payslips.reduce((acc, p) => acc + p.netSalary, 0);
    const totalWarnings = payslips.reduce((acc, p) => acc + p.warnings.length, 0);

    return {
      id: payrun.id,
      name: payrun.name,
      salaryStructureId: payrun.salaryStructureId,
      salaryStructure: payrun.salaryStructure?.name,
      rulesCount: payrun.salaryStructure?.rules?.length || 0,
      periodStart: this.formatDate(payrun.periodStart),
      periodEnd: this.formatDate(payrun.periodEnd),
      status: payrun.status.toLowerCase(),
      employeeCount: payslips.length,
      totalGross,
      totalNet,
      totalWarnings,
      createdAt: payrun.createdAt,
      payslips,
    };
  }

  /**
   * Compute Payrun: Deterministic Batch Rule Calculation Engine
   */
  async computePayrun(id, actorUser, reqMeta = {}) {
    if (!this.isValidUUID(id)) {
      throw ApiError.notFound('Payrun not found', 'PAYRUN_NOT_FOUND');
    }

    const payrun = await prisma.payrun.findUnique({
      where: { id },
      include: {
        salaryStructure: {
          include: {
            rules: {
              where: { isArchived: false },
              orderBy: { sequence: 'asc' },
            },
          },
        },
        payslips: {
          include: {
            employee: true,
            contract: true,
          },
        },
      },
    });

    if (!payrun) {
      throw ApiError.notFound('Payrun not found', 'PAYRUN_NOT_FOUND');
    }

    if (payrun.status === 'VALIDATED' || payrun.status === 'PAID') {
      throw ApiError.conflict(
        `Cannot recompute payrun in '${payrun.status}' status. Only DRAFT or COMPUTED payruns can be computed.`,
        { status: payrun.status },
        'INVALID_STATUS'
      );
    }

    const rules = payrun.salaryStructure.rules;
    if (rules.length === 0) {
      throw ApiError.badRequest(
        'Cannot compute payrun: assigned salary structure has no rules configured',
        null,
        'STRUCTURE_HAS_NO_RULES'
      );
    }

    const startDate = new Date(payrun.periodStart);
    const endDate = new Date(payrun.periodEnd);

    // Compute each payslip in transaction
    await prisma.$transaction(async (tx) => {
      for (const payslip of payrun.payslips) {
        // 1. Calculate Attendance Worked Days for period
        const attendances = await tx.attendance.findMany({
          where: {
            employeeId: payslip.employeeId,
            date: { gte: startDate, lte: endDate },
            status: { in: ['PRESENT', 'LATE', 'OVERTIME'] },
          },
        });
        const workedDays = attendances.length;

        // 2. Base wage from active contract
        const baseWage = payslip.contract?.wage ? Number(payslip.contract.wage) : 0;

        // 3. Rule Evaluation in strict sequence order
        const computedAmounts = new Map(); // ruleId -> amount
        const linesToCreate = [];

        for (const rule of rules) {
          let lineAmount = 0;

          if (rule.computationMethod === 'FIXED') {
            const fixedVal = rule.fixedAmount !== null ? Number(rule.fixedAmount) : 0;
            // If BASIC rule with 0 fixed amount, evaluate to employee contract wage
            if (rule.category === 'BASIC' && fixedVal === 0) {
              lineAmount = baseWage;
            } else {
              lineAmount = fixedVal;
            }
          } else if (rule.computationMethod === 'PERCENTAGE') {
            const pct = rule.percentage !== null ? Number(rule.percentage) : 0;
            let baseVal = baseWage;

            if (rule.baseRuleId && computedAmounts.has(rule.baseRuleId)) {
              baseVal = computedAmounts.get(rule.baseRuleId);
            }

            lineAmount = Number(((baseVal * pct) / 100).toFixed(2));
          }

          computedAmounts.set(rule.id, lineAmount);
          linesToCreate.push({
            salaryRuleId: rule.id,
            code: rule.code,
            name: rule.name,
            category: rule.category,
            amount: lineAmount,
          });
        }

        // 4. Calculate Gross, Deductions, Net
        const grossSalary = linesToCreate
          .filter((l) => ['BASIC', 'ALLOWANCE', 'GROSS'].includes(l.category))
          .reduce((sum, l) => sum + l.amount, 0);

        const totalDeductions = linesToCreate
          .filter((l) => l.category === 'DEDUCTION')
          .reduce((sum, l) => sum + l.amount, 0);

        // Find explicit NET rule if defined, otherwise gross - deductions
        const netRuleLine = linesToCreate.find((l) => l.category === 'NET');
        const netSalary = netRuleLine
          ? netRuleLine.amount
          : Math.max(0, Number((grossSalary - totalDeductions).toFixed(2)));

        // 5. Generate Warnings
        const warnings = [];

        if (!payslip.employee.bankAccount) {
          warnings.push({
            code: 'MISSING_BANK_DETAILS',
            message: 'Employee has no bank account details on file',
            severity: 'advisory',
          });
        }

        // Duplicate payslip check in other payruns
        const duplicate = await tx.payslip.findFirst({
          where: {
            employeeId: payslip.employeeId,
            payrunId: { not: payrun.id },
            payrun: {
              periodStart: { lte: endDate },
              periodEnd: { gte: startDate },
              status: { in: ['COMPUTED', 'VALIDATED', 'PAID'] },
            },
          },
        });
        if (duplicate) {
          warnings.push({
            code: 'DUPLICATE_PAYSLIP',
            message: 'Another computed or finalized payslip exists for this employee in an overlapping pay period',
            severity: 'advisory',
          });
        }

        // Active contract check
        if (payslip.contract.status !== 'RUNNING' || payslip.contract.isArchived) {
          warnings.push({
            code: 'NO_ACTIVE_CONTRACT',
            message: 'Associated employment contract is cancelled or expired',
            severity: 'blocking',
          });
        }

        // 6. Delete old lines & insert newly computed lines (clean overwrite)
        await tx.payslipLine.deleteMany({ where: { payslipId: payslip.id } });
        await tx.payslipLine.createMany({
          data: linesToCreate.map((line) => ({
            payslipId: payslip.id,
            ...line,
          })),
        });

        // 7. Update Payslip record
        await tx.payslip.update({
          where: { id: payslip.id },
          data: {
            workedDays,
            grossSalary,
            netSalary,
            status: 'COMPUTED',
            warnings,
          },
        });
      }

      // 8. Update Payrun Status
      await tx.payrun.update({
        where: { id },
        data: { status: 'COMPUTED' },
      });
    });

    await recordAudit({
      actorId: actorUser?.id,
      action: 'PAYRUN_COMPUTED',
      entity: 'Payrun',
      entityId: id,
      metadata: { name: payrun.name, employeeCount: payrun.payslips.length },
      ipAddress: reqMeta.ip,
    });

    return this.getPayrunById(id);
  }

  /**
   * Validate Payrun: Transition to VALIDATED
   */
  async validatePayrun(id, actorUser, reqMeta = {}) {
    if (!this.isValidUUID(id)) {
      throw ApiError.notFound('Payrun not found', 'PAYRUN_NOT_FOUND');
    }

    const payrun = await prisma.payrun.findUnique({
      where: { id },
      include: {
        payslips: true,
      },
    });

    if (!payrun) {
      throw ApiError.notFound('Payrun not found', 'PAYRUN_NOT_FOUND');
    }

    if (payrun.status !== 'COMPUTED') {
      throw ApiError.conflict(
        `Only payruns in 'COMPUTED' status can be validated. Current status is '${payrun.status}'.`,
        { status: payrun.status },
        'INVALID_STATUS'
      );
    }

    // Check for blocking warnings across child payslips
    const blockingPayslips = payrun.payslips.filter((ps) => {
      const warnings = Array.isArray(ps.warnings) ? ps.warnings : [];
      return warnings.some((w) => w.severity === 'blocking');
    });

    if (blockingPayslips.length > 0) {
      throw ApiError.conflict(
        `Cannot validate payrun: ${blockingPayslips.length} employee payslip(s) contain blocking warnings (e.g. invalid contracts)`,
        { blockingCount: blockingPayslips.length },
        'UNRESOLVED_WARNINGS'
      );
    }

    await prisma.$transaction([
      prisma.payrun.update({
        where: { id },
        data: { status: 'VALIDATED' },
      }),
      prisma.payslip.updateMany({
        where: { payrunId: id },
        data: { status: 'VALIDATED' },
      }),
    ]);

    await recordAudit({
      actorId: actorUser?.id,
      action: 'PAYRUN_VALIDATED',
      entity: 'Payrun',
      entityId: id,
      metadata: { name: payrun.name },
      ipAddress: reqMeta.ip,
    });

    return this.getPayrunById(id);
  }

  /**
   * Mark Paid: Irreversible transition to PAID (Manager/Admin only)
   */
  async markPaid(id, actorUser, reqMeta = {}) {
    if (!this.isValidUUID(id)) {
      throw ApiError.notFound('Payrun not found', 'PAYRUN_NOT_FOUND');
    }

    const payrun = await prisma.payrun.findUnique({
      where: { id },
      include: { payslips: true },
    });

    if (!payrun) {
      throw ApiError.notFound('Payrun not found', 'PAYRUN_NOT_FOUND');
    }

    if (payrun.status !== 'VALIDATED') {
      throw ApiError.conflict(
        `Only payruns in 'VALIDATED' status can be marked as paid. Current status is '${payrun.status}'.`,
        { status: payrun.status },
        'INVALID_STATUS'
      );
    }

    await prisma.$transaction([
      prisma.payrun.update({
        where: { id },
        data: { status: 'PAID' },
      }),
      prisma.payslip.updateMany({
        where: { payrunId: id },
        data: { status: 'PAID' },
      }),
    ]);

    await recordAudit({
      actorId: actorUser?.id,
      action: 'PAYRUN_MARKED_PAID',
      entity: 'Payrun',
      entityId: id,
      metadata: { name: payrun.name, payslipsCount: payrun.payslips.length },
      ipAddress: reqMeta.ip,
    });

    return this.getPayrunById(id);
  }

  /**
   * Delete Payrun (Permitted only in DRAFT or COMPUTED)
   */
  async deletePayrun(id, actorUser, reqMeta = {}) {
    if (!this.isValidUUID(id)) {
      throw ApiError.notFound('Payrun not found', 'PAYRUN_NOT_FOUND');
    }

    const payrun = await prisma.payrun.findUnique({
      where: { id },
    });

    if (!payrun) {
      throw ApiError.notFound('Payrun not found', 'PAYRUN_NOT_FOUND');
    }

    if (payrun.status === 'VALIDATED' || payrun.status === 'PAID') {
      throw ApiError.conflict(
        `Cannot delete finalized payrun in '${payrun.status}' status. Historical payroll records are permanent.`,
        { status: payrun.status },
        'CANNOT_DELETE_FINALIZED_PAYRUN'
      );
    }

    await prisma.payrun.delete({
      where: { id },
    });

    await recordAudit({
      actorId: actorUser?.id,
      action: 'PAYRUN_DELETED',
      entity: 'Payrun',
      entityId: id,
      metadata: { name: payrun.name },
      ipAddress: reqMeta.ip,
    });

    return { id, success: true, message: 'Payrun deleted successfully' };
  }

  async sendPayslipStatements(id, actorUser, reqMeta = {}) {
    if (!this.isValidUUID(id)) throw ApiError.notFound('Payrun not found', 'PAYRUN_NOT_FOUND');

    const payrun = await prisma.payrun.findUnique({
      where: { id },
      include: {
        payslips: {
          include: {
            employee: { select: { firstName: true, lastName: true, email: true } },
            contract: { select: { reference: true } },
            lines: { select: { name: true, amount: true }, orderBy: { createdAt: 'asc' } },
          },
        },
      },
    });

    if (!payrun) throw ApiError.notFound('Payrun not found', 'PAYRUN_NOT_FOUND');
    if (!['VALIDATED', 'PAID'].includes(payrun.status)) {
      throw ApiError.conflict('Payslips can only be sent after the payrun is validated or paid.', { status: payrun.status }, 'PAYRUN_NOT_READY_FOR_DELIVERY');
    }

    const results = { sent: [], failed: [] };
    for (const payslip of payrun.payslips) {
      const employeeName = `${payslip.employee.firstName} ${payslip.employee.lastName}`;
      if (!payslip.employee.email) {
        results.failed.push({ payslipId: payslip.id, employeeName, reason: 'Employee has no email address' });
        continue;
      }

      const grossSalary = Number(payslip.grossSalary || 0);
      const netSalary = Number(payslip.netSalary || 0);
      const deductions = Math.max(0, grossSalary - netSalary);
      try {
        await sendPayslipStatementEmail({
          email: payslip.employee.email,
          employeeName,
          payrunName: payrun.name,
          periodStart: this.formatDate(payrun.periodStart),
          periodEnd: this.formatDate(payrun.periodEnd),
          reference: payslip.contract?.reference || payslip.id,
          grossSalary: grossSalary.toFixed(2),
          deductions: deductions.toFixed(2),
          netSalary: netSalary.toFixed(2),
          lines: payslip.lines.map((line) => ({ name: line.name, amount: Number(line.amount).toFixed(2) })),
        });
        await prisma.payslip.update({ where: { id: payslip.id }, data: { sentAt: new Date() } });
        results.sent.push({ payslipId: payslip.id, employeeName, email: payslip.employee.email });
      } catch (error) {
        results.failed.push({ payslipId: payslip.id, employeeName, reason: error.message });
      }
    }

    await recordAudit({ actorId: actorUser?.id, action: 'PAYSLIPS_SENT', entity: 'Payrun', entityId: id, metadata: { sent: results.sent.length, failed: results.failed.length }, ipAddress: reqMeta.ip });
    return { payrunId: id, total: payrun.payslips.length, ...results };
  }

  /**
   * Get single Payslip with rule line breakdown
   */
  async getPayslipById(id, currentUser) {
    if (!this.isValidUUID(id)) {
      throw ApiError.notFound('Payslip not found', 'PAYSLIP_NOT_FOUND');
    }

    const payslip = await prisma.payslip.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            bankAccount: true,
            department: { select: { name: true } },
            jobPosition: { select: { title: true } },
          },
        },
        contract: {
          select: {
            id: true,
            reference: true,
            wage: true,
            startDate: true,
            endDate: true,
            salaryStructure: { select: { name: true } },
          },
        },
        payrun: {
          select: {
            id: true,
            name: true,
            periodStart: true,
            periodEnd: true,
            status: true,
          },
        },
        lines: {
          include: {
            salaryRule: {
              select: { sequence: true },
            },
          },
          orderBy: { salaryRule: { sequence: 'asc' } },
        },
      },
    });

    if (!payslip) {
      throw ApiError.notFound('Payslip not found', 'PAYSLIP_NOT_FOUND');
    }

    // Role-based scope for Employee role
    if (currentUser?.role === 'EMPLOYEE') {
      if (payslip.employeeId !== currentUser.employeeId) {
        throw ApiError.forbidden('You do not have permission to view this payslip');
      }
      if (payslip.status === 'DRAFT') {
        throw ApiError.forbidden('Payslip is not yet published');
      }
    }

    const enriched = this.enrichPayslip(payslip);

    return {
      id: enriched.id,
      payrunId: enriched.payrunId,
      payrunName: enriched.payrun?.name,
      payPeriod: `${this.formatDate(enriched.payrun?.periodStart)} → ${this.formatDate(enriched.payrun?.periodEnd)}`,
      payrunRef: enriched.contract?.reference || 'PAY-REF',
      employee: {
        id: enriched.employee.id,
        name: `${enriched.employee.firstName} ${enriched.employee.lastName}`,
        firstName: enriched.employee.firstName,
        lastName: enriched.employee.lastName,
        email: enriched.employee.email,
        phone: enriched.employee.phone,
        bankAccount: enriched.employee.bankAccount,
        department: enriched.employee.department?.name || 'General',
        jobTitle: enriched.employee.jobPosition?.title || 'Team Member',
      },
      contract: {
        id: enriched.contract?.id,
        reference: enriched.contract?.reference,
        wage: enriched.contract?.wage ? Number(enriched.contract.wage) : 0,
        structure: enriched.contract?.salaryStructure?.name,
      },
      workedDays: enriched.workedDays,
      grossSalary: enriched.grossSalary,
      netSalary: enriched.netSalary,
      status: enriched.status.toLowerCase(),
      warnings: Array.isArray(enriched.warnings) ? enriched.warnings : [],
      lines: enriched.lines.map((line) => ({
        id: line.id,
        salaryRuleId: line.salaryRuleId,
        code: line.code,
        ruleName: line.name,
        name: line.name,
        category: line.category,
        amount: line.amount,
        sequence: line.salaryRule?.sequence || 0,
      })),
      createdAt: enriched.createdAt,
    };
  }

  /**
   * List all Payslips (filtered by payrunId or employeeId)
   */
  async getPayslips({ payrunId, employeeId, status } = {}, currentUser) {
    const where = {};

    if (currentUser?.role === 'EMPLOYEE') {
      where.employeeId = currentUser.employeeId || 'none';
      where.status = { not: 'DRAFT' };
    } else {
      if (employeeId) where.employeeId = employeeId;
      if (status && status !== 'ALL') where.status = status.toUpperCase();
    }

    if (payrunId) {
      where.payrunId = payrunId;
    }

    const payslips = await prisma.payslip.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: { select: { name: true } },
            jobPosition: { select: { title: true } },
          },
        },
        payrun: {
          select: {
            id: true,
            name: true,
            periodStart: true,
            periodEnd: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return payslips.map((ps) => ({
      id: ps.id,
      payrunId: ps.payrunId,
      payrunName: ps.payrun?.name,
      employeeId: ps.employeeId,
      employeeName: `${ps.employee.firstName} ${ps.employee.lastName}`,
      department: ps.employee.department?.name || 'General',
      jobTitle: ps.employee.jobPosition?.title || 'Team Member',
      payPeriod: `${this.formatDate(ps.payrun?.periodStart)} → ${this.formatDate(ps.payrun?.periodEnd)}`,
      grossSalary: ps.grossSalary !== null ? Number(ps.grossSalary) : 0,
      netSalary: ps.netSalary !== null ? Number(ps.netSalary) : 0,
      status: ps.status.toLowerCase(),
      createdAt: ps.createdAt,
    }));
  }
}

module.exports = new PayrunService();
