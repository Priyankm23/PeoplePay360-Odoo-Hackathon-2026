const prisma = require('../../config/prisma');
const { ApiError } = require('../../utils/apiResponse');
const { recordAudit } = require('../../utils/audit');

class ContractService {
  /**
   * Helper to format Date or string to 'YYYY-MM-DD'
   */
  formatDate(d) {
    if (!d) return null;
    if (typeof d === 'string') return d.slice(0, 10);
    return d.toISOString().slice(0, 10);
  }

  /**
   * Derive whether a contract is currently active today
   * per schema.md §5:
   * status === 'RUNNING' && startDate <= today && (endDate === null || endDate >= today)
   */
  enrichContract(contract) {
    if (!contract) return null;
    const todayStr = new Date().toISOString().slice(0, 10);
    const startStr = this.formatDate(contract.startDate);
    const endStr = this.formatDate(contract.endDate);

    const isRunning = contract.status === 'RUNNING';
    const isStarted = startStr ? startStr <= todayStr : false;
    const notEnded = !endStr || endStr >= todayStr;
    const isActive = isRunning && isStarted && notEnded;

    const year = startStr ? new Date(startStr).getFullYear() : new Date().getFullYear();
    const fallbackRef = `CON/${year}/001`;

    return {
      ...contract,
      reference: contract.reference || fallbackRef,
      wage: contract.wage ? Number(contract.wage) : 0,
      isActive,
      startDate: startStr,
      endDate: endStr,
    };
  }

  /**
   * Generate next sequential contract reference code: CON/YYYY/XXX
   */
  async generateReference(startDate) {
    const d = startDate ? new Date(startDate) : new Date();
    const year = isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
    const prefix = `CON/${year}/`;

    const existing = await prisma.contract.findMany({
      where: {
        reference: { startsWith: prefix },
      },
      select: { reference: true },
    });

    let maxSeq = 0;
    for (const c of existing) {
      if (c.reference) {
        const parts = c.reference.split('/');
        if (parts.length >= 3) {
          const num = parseInt(parts[2], 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }
    }

    const nextSeq = String(maxSeq + 1).padStart(3, '0');
    return `${prefix}${nextSeq}`;
  }

  /**
   * Backfill missing references for any legacy or unsequenced contracts
   */
  async backfillMissingReferences() {
    try {
      const missing = await prisma.contract.findMany({
        where: { reference: null },
        orderBy: { createdAt: 'asc' },
      });
      for (const c of missing) {
        const ref = await this.generateReference(c.startDate);
        await prisma.contract.update({
          where: { id: c.id },
          data: { reference: ref },
        });
      }
    } catch (e) {
      // Safe fallback
    }
  }

  /**
   * List contracts with optional filters (employeeId, status, search)
   */
  async getContractsList({ employeeId, status, search }) {
    await this.backfillMissingReferences();

    const where = {
      isArchived: false,
    };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { reference: { contains: term, mode: 'insensitive' } },
        {
          employee: {
            OR: [
              { firstName: { contains: term, mode: 'insensitive' } },
              { lastName: { contains: term, mode: 'insensitive' } },
              { email: { contains: term, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImageUrl: true,
          },
        },
        department: {
          select: { id: true, name: true },
        },
        jobPosition: {
          select: { id: true, title: true },
        },
        workingSchedule: {
          select: { id: true, name: true, type: true },
        },
        salaryStructure: {
          select: { id: true, name: true },
        },
        _count: {
          select: { payslips: true },
        },
      },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });

    return contracts.map((c) => this.enrichContract(c));
  }

  /**
   * Get single contract by ID
   */
  async getContractById(id) {
    const contract = await prisma.contract.findFirst({
      where: { id, isArchived: false },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            profileImageUrl: true,
          },
        },
        department: {
          select: { id: true, name: true },
        },
        jobPosition: {
          select: { id: true, title: true },
        },
        workingSchedule: {
          select: {
            id: true,
            name: true,
            type: true,
            lines: {
              select: { day: true, startTime: true, endTime: true, breakMinutes: true },
            },
          },
        },
        salaryStructure: {
          select: { id: true, name: true },
        },
        _count: {
          select: { payslips: true },
        },
      },
    });

    if (!contract) {
      throw ApiError.notFound('Contract not found', 'CONTRACT_NOT_FOUND');
    }

    return this.enrichContract(contract);
  }

  /**
   * Create a new Contract (starts in DRAFT status)
   */
  async createContract(data, user, reqMeta = {}) {
    // 1. Verify employee exists
    const employee = await prisma.employee.findFirst({
      where: { id: data.employeeId, isArchived: false },
    });
    if (!employee) {
      throw ApiError.notFound('Employee not found', 'EMPLOYEE_NOT_FOUND');
    }

    // 2. Verify salary structure exists
    const salaryStructure = await prisma.salaryStructure.findFirst({
      where: { id: data.salaryStructureId, isArchived: false },
    });
    if (!salaryStructure) {
      throw ApiError.notFound('Salary Structure not found', 'SALARY_STRUCTURE_NOT_FOUND');
    }

    // 3. Fallbacks from employee if not explicitly passed
    const departmentId = data.departmentId || employee.departmentId || null;
    const jobPositionId = data.jobPositionId || employee.jobPositionId || null;
    const workingScheduleId = data.workingScheduleId || employee.workingScheduleId || null;

    const startDate = new Date(data.startDate);
    const endDate = data.endDate ? new Date(data.endDate) : null;
    const reference = await this.generateReference(data.startDate);

    const newContract = await prisma.contract.create({
      data: {
        reference,
        employeeId: data.employeeId,
        departmentId,
        jobPositionId,
        workingScheduleId,
        salaryStructureId: data.salaryStructureId,
        startDate,
        endDate,
        wage: data.wage,
        status: 'DRAFT',
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, email: true } },
        salaryStructure: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        jobPosition: { select: { id: true, title: true } },
      },
    });

    await recordAudit({
      actorId: user?.id,
      action: 'CONTRACT_CREATED',
      entity: 'Contract',
      entityId: newContract.id,
      metadata: {
        employeeId: data.employeeId,
        wage: data.wage,
        startDate: data.startDate,
        endDate: data.endDate || null,
        status: 'DRAFT',
      },
      ipAddress: reqMeta.ip,
    });

    return this.enrichContract(newContract);
  }

  /**
   * Update contract fields
   */
  async updateContract(id, data, user, reqMeta = {}) {
    const existing = await prisma.contract.findFirst({
      where: { id, isArchived: false },
    });

    if (!existing) {
      throw ApiError.notFound('Contract not found', 'CONTRACT_NOT_FOUND');
    }

    if (existing.status === 'CANCELLED' || existing.status === 'EXPIRED') {
      throw ApiError.badRequest(
        `Cannot edit a contract that is ${existing.status.toLowerCase()}. Please create a new contract if needed.`,
        'CONTRACT_IMMUTABLE'
      );
    }

    const updatePayload = {};

    if (data.departmentId !== undefined) updatePayload.departmentId = data.departmentId;
    if (data.jobPositionId !== undefined) updatePayload.jobPositionId = data.jobPositionId;
    if (data.workingScheduleId !== undefined) updatePayload.workingScheduleId = data.workingScheduleId;
    if (data.salaryStructureId !== undefined) updatePayload.salaryStructureId = data.salaryStructureId;
    if (data.wage !== undefined) updatePayload.wage = data.wage;
    if (data.startDate !== undefined) updatePayload.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updatePayload.endDate = data.endDate ? new Date(data.endDate) : null;

    // Ensure date consistency
    if (data.startDate || data.endDate !== undefined) {
      const newStart = data.startDate ? new Date(data.startDate) : existing.startDate;
      const newEnd = data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : existing.endDate;

      if (newEnd && newEnd <= newStart) {
        throw ApiError.badRequest(
          'endDate must be after startDate. Employment contracts cannot be a single day.',
          null,
          'INVALID_DATE_RANGE'
        );
      }

      // If contract is RUNNING and dates are changing, ensure no overlap with other running contracts
      if (existing.status === 'RUNNING') {
        await this.validateOverlap(existing.employeeId, newStart, newEnd, existing.id);
      }
    }

    const updated = await prisma.contract.update({
      where: { id },
      data: updatePayload,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, email: true } },
        salaryStructure: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        jobPosition: { select: { id: true, title: true } },
      },
    });

    await recordAudit({
      actorId: user?.id,
      action: 'CONTRACT_UPDATED',
      entity: 'Contract',
      entityId: id,
      metadata: { changes: data },
      ipAddress: reqMeta.ip,
    });

    return this.enrichContract(updated);
  }

  /**
   * Helper to check date range overlap against other RUNNING contracts
   */
  async validateOverlap(employeeId, startDate, endDate, excludeContractId = null) {
    const runningContracts = await prisma.contract.findMany({
      where: {
        employeeId,
        status: 'RUNNING',
        isArchived: false,
        ...(excludeContractId ? { id: { not: excludeContractId } } : {}),
      },
    });

    const targetStart = new Date(startDate).toISOString().slice(0, 10);
    const targetEnd = endDate ? new Date(endDate).toISOString().slice(0, 10) : '9999-12-31';

    for (const c of runningContracts) {
      const otherStart = new Date(c.startDate).toISOString().slice(0, 10);
      const otherEnd = c.endDate ? new Date(c.endDate).toISOString().slice(0, 10) : '9999-12-31';

      // Check if [targetStart, targetEnd] overlaps with [otherStart, otherEnd]
      if (targetStart <= otherEnd && targetEnd >= otherStart) {
        throw ApiError.conflict(
          'This employee already has an active contract covering part of this period.',
          { conflictingContractId: c.id },
          'CONTRACT_OVERLAP'
        );
      }
    }
  }

  /**
   * Activate contract (Transition DRAFT -> RUNNING with Key Business Rule #1 overlap check)
   */
  async activateContract(id, user, reqMeta = {}) {
    const contract = await prisma.contract.findFirst({
      where: { id, isArchived: false },
    });

    if (!contract) {
      throw ApiError.notFound('Contract not found', 'CONTRACT_NOT_FOUND');
    }

    if (contract.status === 'RUNNING') {
      return this.enrichContract(contract);
    }

    if (contract.status === 'CANCELLED' || contract.status === 'EXPIRED') {
      throw ApiError.badRequest(
        `Cannot activate a contract that is ${contract.status.toLowerCase()}.`,
        'INVALID_STATE_TRANSITION'
      );
    }

    const targetStart = new Date(contract.startDate).toISOString().slice(0, 10);
    const targetEnd = contract.endDate ? new Date(contract.endDate).toISOString().slice(0, 10) : '9999-12-31';

    // Find any existing RUNNING contracts for this employee
    const existingRunning = await prisma.contract.findMany({
      where: {
        employeeId: contract.employeeId,
        status: 'RUNNING',
        isArchived: false,
        id: { not: contract.id },
      },
    });

    // Auto-transition logic:
    // If an existing running contract has endDate on/before targetStart, it auto-transitions to EXPIRED.
    // If it still overlaps, block with CONTRACT_OVERLAP.
    const expiredToUpdate = [];

    for (const other of existingRunning) {
      const otherStart = new Date(other.startDate).toISOString().slice(0, 10);
      const otherEnd = other.endDate ? new Date(other.endDate).toISOString().slice(0, 10) : null;

      if (otherEnd && otherEnd <= targetStart) {
        // Safe to auto-expire
        expiredToUpdate.push(other.id);
      } else {
        // Potential overlap check
        const effectiveOtherEnd = otherEnd || '9999-12-31';
        if (targetStart <= effectiveOtherEnd && targetEnd >= otherStart) {
          throw ApiError.conflict(
            'This employee already has an active contract covering part of this period.',
            { conflictingContractId: other.id },
            'CONTRACT_OVERLAP'
          );
        }
      }
    }

    // Execute in transaction: expire older non-overlapping contracts and activate new contract
    const result = await prisma.$transaction(async (tx) => {
      if (expiredToUpdate.length > 0) {
        await tx.contract.updateMany({
          where: { id: { in: expiredToUpdate } },
          data: { status: 'EXPIRED' },
        });
      }

      return await tx.contract.update({
        where: { id },
        data: { status: 'RUNNING' },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, email: true } },
          salaryStructure: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
          jobPosition: { select: { id: true, title: true } },
        },
      });
    });

    await recordAudit({
      actorId: user?.id,
      action: 'CONTRACT_ACTIVATED',
      entity: 'Contract',
      entityId: id,
      metadata: {
        employeeId: contract.employeeId,
        autoExpiredContracts: expiredToUpdate,
      },
      ipAddress: reqMeta.ip,
    });

    return this.enrichContract(result);
  }

  /**
   * Cancel contract (Transition -> CANCELLED)
   */
  async cancelContract(id, user, reqMeta = {}) {
    const contract = await prisma.contract.findFirst({
      where: { id, isArchived: false },
    });

    if (!contract) {
      throw ApiError.notFound('Contract not found', 'CONTRACT_NOT_FOUND');
    }

    const cancelled = await prisma.contract.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, email: true } },
        salaryStructure: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        jobPosition: { select: { id: true, title: true } },
      },
    });

    await recordAudit({
      actorId: user?.id,
      action: 'CONTRACT_CANCELLED',
      entity: 'Contract',
      entityId: id,
      ipAddress: reqMeta.ip,
    });

    return this.enrichContract(cancelled);
  }

  /**
   * Soft delete (archive) contract
   */
  async archiveContract(id, user, reqMeta = {}) {
    const contract = await prisma.contract.findFirst({
      where: { id, isArchived: false },
    });

    if (!contract) {
      throw ApiError.notFound('Contract not found', 'CONTRACT_NOT_FOUND');
    }

    await prisma.contract.update({
      where: { id },
      data: { isArchived: true },
    });

    await recordAudit({
      actorId: user?.id,
      action: 'CONTRACT_ARCHIVED',
      entity: 'Contract',
      entityId: id,
      ipAddress: reqMeta.ip,
    });

    return { success: true, message: 'Contract archived successfully' };
  }

  /**
   * Lookup metadata options (Salary Structures, Working Schedules, etc.)
   */
  async getLookupOptions() {
    const [salaryStructures, workingSchedules] = await Promise.all([
      prisma.salaryStructure.findMany({
        where: { isArchived: false },
        select: { id: true, name: true, isActive: true },
        orderBy: { name: 'asc' },
      }),
      prisma.workingSchedule.findMany({
        where: { isArchived: false },
        select: { id: true, name: true, type: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      salaryStructures,
      workingSchedules,
    };
  }
}

module.exports = new ContractService();
