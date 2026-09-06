const prisma = require('../../config/prisma');
const { ApiError } = require('../../utils/apiResponse');
const { recordAudit } = require('../../utils/audit');

class TimeOffService {
  formatDate(d) {
    if (!d) return null;
    if (typeof d === 'string') return d.slice(0, 10);
    return d.toISOString().slice(0, 10);
  }

  // =======================================================
  // 1. TIME OFF TYPES
  // =======================================================

  async listTypes() {
    const types = await prisma.timeOffType.findMany({
      where: { isArchived: false },
      include: {
        _count: {
          select: {
            allocations: true,
            requests: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return types.map((t) => ({
      id: t.id,
      name: t.name,
      unit: t.unit,
      requiresAllocation: t.requiresAllocation,
      requiresApproval: t.requiresApproval,
      affectsPayroll: t.affectsPayroll,
      isArchived: t.isArchived,
      allocationCount: t._count.allocations,
      requestCount: t._count.requests,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  }

  async getTypeById(id) {
    const type = await prisma.timeOffType.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            allocations: true,
            requests: true,
          },
        },
      },
    });

    if (!type || type.isArchived) {
      throw ApiError.notFound('Time off type not found');
    }

    return {
      ...type,
      allocationCount: type._count.allocations,
      requestCount: type._count.requests,
    };
  }

  async createType(data, actorId) {
    const existing = await prisma.timeOffType.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      if (existing.isArchived) {
        // Reactivate archived type
        const updated = await prisma.timeOffType.update({
          where: { id: existing.id },
          data: {
            isArchived: false,
            unit: data.unit ?? existing.unit,
            requiresAllocation: data.requiresAllocation ?? existing.requiresAllocation,
            requiresApproval: data.requiresApproval ?? existing.requiresApproval,
            affectsPayroll: data.affectsPayroll ?? existing.affectsPayroll,
          },
        });
        await recordAudit({
          action: 'REACTIVATE_TIME_OFF_TYPE',
          entity: 'TimeOffType',
          entityId: updated.id,
          actorId,
        });
        return updated;
      }
      throw ApiError.conflict(`A leave type with name "${data.name}" already exists`);
    }

    const created = await prisma.timeOffType.create({
      data: {
        name: data.name,
        unit: data.unit ?? 'DAYS',
        requiresAllocation: data.requiresAllocation ?? true,
        requiresApproval: data.requiresApproval ?? true,
        affectsPayroll: data.affectsPayroll ?? true,
      },
    });

    await recordAudit({
      action: 'CREATE_TIME_OFF_TYPE',
      entity: 'TimeOffType',
      entityId: created.id,
      actorId,
    });

    return created;
  }

  async updateType(id, data, actorId) {
    const existing = await prisma.timeOffType.findUnique({ where: { id } });
    if (!existing || existing.isArchived) {
      throw ApiError.notFound('Time off type not found');
    }

    if (data.name && data.name !== existing.name) {
      const nameConflict = await prisma.timeOffType.findUnique({
        where: { name: data.name },
      });
      if (nameConflict && nameConflict.id !== id) {
        throw ApiError.conflict(`A leave type with name "${data.name}" already exists`);
      }
    }

    const updated = await prisma.timeOffType.update({
      where: { id },
      data: {
        name: data.name ?? existing.name,
        unit: data.unit ?? existing.unit,
        requiresAllocation: data.requiresAllocation ?? existing.requiresAllocation,
        requiresApproval: data.requiresApproval ?? existing.requiresApproval,
        affectsPayroll: data.affectsPayroll ?? existing.affectsPayroll,
      },
    });

    await recordAudit({
      action: 'UPDATE_TIME_OFF_TYPE',
      entity: 'TimeOffType',
      entityId: updated.id,
      actorId,
    });

    return updated;
  }

  async archiveType(id, actorId) {
    const existing = await prisma.timeOffType.findUnique({ where: { id } });
    if (!existing || existing.isArchived) {
      throw ApiError.notFound('Time off type not found');
    }

    const archived = await prisma.timeOffType.update({
      where: { id },
      data: { isArchived: true },
    });

    await recordAudit({
      action: 'ARCHIVE_TIME_OFF_TYPE',
      entity: 'TimeOffType',
      entityId: archived.id,
      actorId,
    });

    return archived;
  }

  // =======================================================
  // 2. TIME OFF ALLOCATIONS
  // =======================================================

  enrichAllocation(alloc) {
    if (!alloc) return null;
    const allocated = Number(alloc.allocated);
    const taken = Number(alloc.taken);
    const remaining = Math.max(0, Number((allocated - taken).toFixed(2)));

    return {
      ...alloc,
      allocated,
      taken,
      remaining,
      validFrom: this.formatDate(alloc.validFrom),
      validTo: this.formatDate(alloc.validTo),
    };
  }

  async listAllocations({ employeeId, timeOffTypeId, status, user }) {
    const where = {};

    // RBAC: Employee role restricted to own allocations
    if (user.role === 'EMPLOYEE') {
      if (!user.employeeId) {
        return [];
      }
      where.employeeId = user.employeeId;
    } else if (employeeId) {
      where.employeeId = employeeId;
    }

    if (timeOffTypeId) {
      where.timeOffTypeId = timeOffTypeId;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    const allocations = await prisma.timeOffAllocation.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: {
              select: { id: true, name: true },
            },
            jobPosition: {
              select: { id: true, title: true },
            },
          },
        },
        timeOffType: {
          select: {
            id: true,
            name: true,
            unit: true,
            requiresAllocation: true,
            requiresApproval: true,
            affectsPayroll: true,
          },
        },
      },
      orderBy: [{ validFrom: 'desc' }, { createdAt: 'desc' }],
    });

    return allocations.map((a) => this.enrichAllocation(a));
  }

  async getAllocationById(id, user) {
    const alloc = await prisma.timeOffAllocation.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: {
              select: { id: true, name: true },
            },
            jobPosition: {
              select: { id: true, title: true },
            },
          },
        },
        timeOffType: true,
        requests: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            duration: true,
            status: true,
          },
        },
      },
    });

    if (!alloc) {
      throw ApiError.notFound('Time off allocation not found');
    }

    if (user.role === 'EMPLOYEE' && alloc.employeeId !== user.employeeId) {
      throw ApiError.forbidden('Access denied to this allocation');
    }

    return this.enrichAllocation(alloc);
  }

  async createAllocation(data, actorId) {
    // 1. Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
    });
    if (!employee || employee.isArchived) {
      throw ApiError.notFound('Employee not found or archived');
    }

    // 2. Verify timeOffType exists
    const type = await prisma.timeOffType.findUnique({
      where: { id: data.timeOffTypeId },
    });
    if (!type || type.isArchived) {
      throw ApiError.notFound('Time off type not found or archived');
    }

    // 3. Check duplicate non-REFUSED allocation rule
    // Per features.md §6: only one non-REFUSED Allocation may exist per (employeeId, timeOffTypeId)
    const existing = await prisma.timeOffAllocation.findFirst({
      where: {
        employeeId: data.employeeId,
        timeOffTypeId: data.timeOffTypeId,
        status: { in: ['PENDING', 'APPROVED'] },
      },
    });

    if (existing) {
      throw ApiError.conflict(
        `A ${existing.status.toLowerCase()} allocation already exists for this employee and leave type. Only one active/pending allocation is permitted at a time.`,
        null,
        'DUPLICATE_ALLOCATION'
      );
    }

    // 4. Create allocation with status PENDING
    const created = await prisma.timeOffAllocation.create({
      data: {
        employeeId: data.employeeId,
        timeOffTypeId: data.timeOffTypeId,
        allocated: data.allocated,
        taken: 0,
        validFrom: new Date(data.validFrom),
        validTo: data.validTo ? new Date(data.validTo) : null,
        status: 'PENDING',
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: { select: { id: true, name: true } },
          },
        },
        timeOffType: true,
      },
    });

    await recordAudit({
      action: 'CREATE_TIME_OFF_ALLOCATION',
      entity: 'TimeOffAllocation',
      entityId: created.id,
      actorId,
    });

    return this.enrichAllocation(created);
  }

  async approveAllocation(id, actorId) {
    const alloc = await prisma.timeOffAllocation.findUnique({ where: { id } });
    if (!alloc) {
      throw ApiError.notFound('Time off allocation not found');
    }

    if (alloc.status === 'APPROVED') {
      throw ApiError.badRequest('Allocation is already approved');
    }

    if (alloc.status === 'REFUSED') {
      throw ApiError.badRequest('Refused allocations cannot be approved. Please create a new allocation.');
    }

    const updated = await prisma.timeOffAllocation.update({
      where: { id },
      data: { status: 'APPROVED' },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
        timeOffType: true,
      },
    });

    await recordAudit({
      action: 'APPROVE_TIME_OFF_ALLOCATION',
      entity: 'TimeOffAllocation',
      entityId: updated.id,
      actorId,
    });

    return this.enrichAllocation(updated);
  }

  async refuseAllocation(id, actorId) {
    const alloc = await prisma.timeOffAllocation.findUnique({ where: { id } });
    if (!alloc) {
      throw ApiError.notFound('Time off allocation not found');
    }

    if (alloc.status === 'REFUSED') {
      throw ApiError.badRequest('Allocation is already refused');
    }

    if (alloc.status === 'APPROVED' && Number(alloc.taken) > 0) {
      throw ApiError.badRequest('Cannot refuse an approved allocation that already has taken leave requests');
    }

    const updated = await prisma.timeOffAllocation.update({
      where: { id },
      data: { status: 'REFUSED' },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
        timeOffType: true,
      },
    });

    await recordAudit({
      action: 'REFUSE_TIME_OFF_ALLOCATION',
      entity: 'TimeOffAllocation',
      entityId: updated.id,
      actorId,
    });

    return this.enrichAllocation(updated);
  }

  async deleteAllocation(id, actorId) {
    const alloc = await prisma.timeOffAllocation.findUnique({ where: { id } });
    if (!alloc) {
      throw ApiError.notFound('Time off allocation not found');
    }

    if (alloc.status !== 'PENDING') {
      throw ApiError.badRequest('Only PENDING allocations can be deleted');
    }

    await prisma.timeOffAllocation.delete({ where: { id } });

    await recordAudit({
      action: 'DELETE_TIME_OFF_ALLOCATION',
      entity: 'TimeOffAllocation',
      entityId: id,
      actorId,
    });

    return { id, message: 'Allocation deleted successfully' };
  }

  // =======================================================
  // 3. TIME OFF REQUESTS
  // =======================================================

  enrichRequest(req) {
    if (!req) return null;
    let reason = req.decisionNote || 'Personal leave & time off';
    let refusalNote = null;
    if (req.decisionNote && req.decisionNote.includes(' [Refusal note: ')) {
      const parts = req.decisionNote.split(' [Refusal note: ');
      reason = parts[0];
      refusalNote = parts[1].replace(/\]$/, '');
    } else if (req.status === 'REFUSED') {
      refusalNote = req.decisionNote;
    }

    return {
      ...req,
      duration: Number(req.duration),
      startDate: this.formatDate(req.startDate),
      endDate: this.formatDate(req.endDate),
      allocation: req.allocation ? this.enrichAllocation(req.allocation) : null,
      reason,
      decisionNote: refusalNote || req.decisionNote,
    };
  }

  async listRequests({ employeeId, timeOffTypeId, status, user }) {
    const where = {};

    // RBAC: Employee role restricted to own requests
    if (user.role === 'EMPLOYEE') {
      if (!user.employeeId) {
        return [];
      }
      where.employeeId = user.employeeId;
    } else if (employeeId) {
      where.employeeId = employeeId;
    }

    if (timeOffTypeId) {
      where.timeOffTypeId = timeOffTypeId;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    const requests = await prisma.timeOffRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: {
              select: { id: true, name: true },
            },
            jobPosition: {
              select: { id: true, title: true },
            },
          },
        },
        timeOffType: true,
        allocation: true,
        approver: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });

    return requests.map((r) => this.enrichRequest(r));
  }

  async getRequestById(id, user) {
    const req = await prisma.timeOffRequest.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: {
              select: { id: true, name: true },
            },
            jobPosition: {
              select: { id: true, title: true },
            },
          },
        },
        timeOffType: true,
        allocation: true,
        approver: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!req) {
      throw ApiError.notFound('Time off request not found');
    }

    if (user.role === 'EMPLOYEE' && req.employeeId !== user.employeeId) {
      throw ApiError.forbidden('Access denied to this request');
    }

    return this.enrichRequest(req);
  }

  async createRequest(data, user) {
    let targetEmployeeId = data.employeeId;

    if (user.role === 'EMPLOYEE') {
      if (!user.employeeId) {
        throw ApiError.forbidden('Your user account is not linked to an employee profile.');
      }
      targetEmployeeId = user.employeeId;
    } else if (!targetEmployeeId) {
      throw ApiError.badRequest('employeeId is required');
    }

    const employee = await prisma.employee.findUnique({
      where: { id: targetEmployeeId },
    });
    if (!employee || employee.isArchived) {
      throw ApiError.notFound('Employee not found or archived');
    }

    const type = await prisma.timeOffType.findUnique({
      where: { id: data.timeOffTypeId },
    });
    if (!type || type.isArchived) {
      throw ApiError.notFound('Time off type not found or archived');
    }

    let linkedAllocationId = null;

    if (type.requiresAllocation) {
      // Find employee's APPROVED allocation for this leave type
      const allocation = await prisma.timeOffAllocation.findFirst({
        where: {
          employeeId: targetEmployeeId,
          timeOffTypeId: data.timeOffTypeId,
          status: 'APPROVED',
        },
      });

      if (!allocation) {
        throw ApiError.badRequest(
          `No approved leave allocation found for "${type.name}". An allocation must be approved before requesting leave.`,
          null,
          'INSUFFICIENT_BALANCE'
        );
      }

      const remaining = Number(allocation.allocated) - Number(allocation.taken);
      if (remaining < Number(data.duration)) {
        throw ApiError.badRequest(
          `Insufficient leave balance for "${type.name}": requested ${data.duration} days, but only ${remaining} days remaining.`,
          { requested: Number(data.duration), remaining },
          'INSUFFICIENT_BALANCE'
        );
      }

      linkedAllocationId = allocation.id;
    }

    const created = await prisma.timeOffRequest.create({
      data: {
        employeeId: targetEmployeeId,
        timeOffTypeId: data.timeOffTypeId,
        allocationId: linkedAllocationId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        duration: data.duration,
        status: 'SUBMITTED',
        decisionNote: data.reason || null,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: { select: { id: true, name: true } },
          },
        },
        timeOffType: true,
        allocation: true,
      },
    });

    await recordAudit({
      action: 'CREATE_TIME_OFF_REQUEST',
      entity: 'TimeOffRequest',
      entityId: created.id,
      actorId: user.id,
    });

    return this.enrichRequest(created);
  }

  /**
   * Key Business Rule #2 (ACID Transaction):
   * Approval and balance deduction execute in a single database transaction:
   * TimeOffRequest.status = APPROVED AND TimeOffAllocation.taken += duration commit together or not at all.
   */
  async approveRequest(id, actorId) {
    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.timeOffRequest.findUnique({
        where: { id },
        include: {
          timeOffType: true,
          allocation: true,
        },
      });

      if (!request) {
        throw ApiError.notFound('Time off request not found');
      }

      if (request.status === 'APPROVED') {
        throw ApiError.badRequest('This request is already approved');
      }

      if (request.status === 'REFUSED') {
        throw ApiError.badRequest(
          'Refused requests cannot be approved. Refusal is terminal; a new request must be submitted.'
        );
      }

      if (request.timeOffType.requiresAllocation) {
        if (!request.allocationId) {
          throw ApiError.badRequest('Leave type requires an allocation, but none is linked to this request');
        }

        // Re-read allocation in transaction to verify balance
        const allocation = await tx.timeOffAllocation.findUnique({
          where: { id: request.allocationId },
        });

        if (!allocation || allocation.status !== 'APPROVED') {
          throw ApiError.badRequest('The linked allocation is no longer approved or valid');
        }

        const remaining = Number(allocation.allocated) - Number(allocation.taken);
        const duration = Number(request.duration);

        if (remaining < duration) {
          throw ApiError.badRequest(
            `Cannot approve request: insufficient balance remaining (${remaining} days available, ${duration} requested).`,
            { remaining, duration },
            'INSUFFICIENT_BALANCE'
          );
        }

        // Atomically increment taken
        await tx.timeOffAllocation.update({
          where: { id: allocation.id },
          data: {
            taken: {
              increment: duration,
            },
          },
        });
      }

      // Update request status to APPROVED
      const approved = await tx.timeOffRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approverId: actorId,
        },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              department: { select: { id: true, name: true } },
            },
          },
          timeOffType: true,
          allocation: true,
          approver: {
            select: { id: true, email: true, role: true },
          },
        },
      });

      return approved;
    });

    await recordAudit({
      action: 'APPROVE_TIME_OFF_REQUEST',
      entity: 'TimeOffRequest',
      entityId: result.id,
      actorId,
    });

    return this.enrichRequest(result);
  }

  /**
   * Refusing a request transitions status = REFUSED.
   * Per Key Business Rule #2: Refusing a request NEVER touches the Allocation balance.
   */
  async refuseRequest(id, { decisionNote }, actorId) {
    const request = await prisma.timeOffRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw ApiError.notFound('Time off request not found');
    }

    if (request.status === 'REFUSED') {
      throw ApiError.badRequest('This request is already refused');
    }

    if (request.status === 'APPROVED') {
      throw ApiError.badRequest('Approved requests cannot be refused directly');
    }

    const refused = await prisma.timeOffRequest.update({
      where: { id },
      data: {
        status: 'REFUSED',
        approverId: actorId,
        decisionNote: decisionNote
          ? (request.decisionNote ? `${request.decisionNote} [Refusal note: ${decisionNote}]` : decisionNote)
          : request.decisionNote,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        timeOffType: true,
        allocation: true,
        approver: {
          select: { id: true, email: true, role: true },
        },
      },
    });

    await recordAudit({
      action: 'REFUSE_TIME_OFF_REQUEST',
      entity: 'TimeOffRequest',
      entityId: refused.id,
      actorId,
    });

    return this.enrichRequest(refused);
  }

  async deleteRequest(id, user) {
    const request = await prisma.timeOffRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw ApiError.notFound('Time off request not found');
    }

    if (user.role === 'EMPLOYEE' && request.employeeId !== user.employeeId) {
      throw ApiError.forbidden('Access denied to this request');
    }

    if (request.status === 'APPROVED') {
      throw ApiError.badRequest('Approved requests cannot be deleted');
    }

    await prisma.timeOffRequest.delete({ where: { id } });

    await recordAudit({
      action: 'DELETE_TIME_OFF_REQUEST',
      entity: 'TimeOffRequest',
      entityId: id,
      actorId: user.id,
    });

    return { id, message: 'Time off request deleted successfully' };
  }
}

module.exports = new TimeOffService();
