const bcrypt = require('bcryptjs');
const prisma = require('../../config/prisma');
const { ApiError } = require('../../utils/apiResponse');
const { recordAudit } = require('../../utils/audit');
const { sendInitialAccessEmail } = require('../../utils/mailer');
const crypto = require('crypto');

class EmployeeService {
  /**
   * Get employees with List or Kanban view and filters
   */
  async getEmployees(query, user) {
    const { view, groupBy, departmentId, status, search, cursor, page, limit } = query;

    const where = {
      isArchived: false,
    };

    // Role scoping: Employees can only view themselves
    if (user.role === 'EMPLOYEE') {
      where.id = user.employeeId;
    } else {
      if (departmentId) where.departmentId = departmentId;
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }
    }

    const selectRelations = {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      bankAccount: true,
      status: true,
      profileImageUrl: true,
      createdAt: true,
      department: { select: { id: true, name: true } },
      jobPosition: { select: { id: true, title: true } },
      workingSchedule: { select: { id: true, name: true, type: true } },
      manager: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true } },
      user: { select: { id: true, role: true } },
    };

    // KANBAN VIEW
    if (view === 'kanban') {
      const employees = await prisma.employee.findMany({
        where,
        select: selectRelations,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { id: 'asc' }],
      });

      if (groupBy === 'departmentId') {
        const grouped = {};
        for (const emp of employees) {
          const deptKey = emp.department ? emp.department.name : 'Unassigned';
          if (!grouped[deptKey]) grouped[deptKey] = [];
          grouped[deptKey].push(emp);
        }
        return { view: 'kanban', groupBy: 'department', data: grouped, totalCount: employees.length };
      } else {
        // Group by status (default)
        const grouped = { ACTIVE: [], INACTIVE: [] };
        for (const emp of employees) {
          if (emp.status === 'ACTIVE') grouped.ACTIVE.push(emp);
          else grouped.INACTIVE.push(emp);
        }
        return { view: 'kanban', groupBy: 'status', data: grouped, totalCount: employees.length };
      }
    }

    // LIST VIEW (Cursor-based & Paginated)
    const findOptions = {
      where,
      select: selectRelations,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { id: 'asc' }],
      take: limit + 1,
    };

    if (cursor) {
      findOptions.cursor = { id: cursor };
      findOptions.skip = 1;
    } else if (page && page > 1) {
      findOptions.skip = (page - 1) * limit;
    }

    const [totalCount, rawItems] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany(findOptions),
    ]);

    const hasNextPage = rawItems.length > limit;
    const items = hasNextPage ? rawItems.slice(0, limit) : rawItems;
    const nextCursor = hasNextPage && items.length > 0 ? items[items.length - 1].id : null;

    return {
      view: 'list',
      items,
      pagination: {
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page || 1,
        limit,
        nextCursor,
        hasNextPage,
      },
    };
  }

  /**
   * Get single employee with smart button counts and active contract
   */
  async getEmployeeById(id, user) {
    if (user.role === 'EMPLOYEE' && user.employeeId !== id) {
      throw ApiError.forbidden('You can only view your own employee profile', 'FORBIDDEN_RESOURCE');
    }

    const employee = await prisma.employee.findFirst({
      where: { id, isArchived: false },
      include: {
        department: { select: { id: true, name: true } },
        jobPosition: { select: { id: true, title: true } },
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
        manager: { select: { id: true, firstName: true, lastName: true, email: true, profileImageUrl: true } },
        user: { select: { id: true, role: true } },
      },
    });

    if (!employee) {
      throw ApiError.notFound('Employee record not found', 'EMPLOYEE_NOT_FOUND');
    }

    // Smart-button badges count
    const today = new Date();
    const [contractsCount, attendanceCount, timeOffRequestsCount, timeOffAllocationsCount, activeContract] =
      await Promise.all([
        prisma.contract.count({ where: { employeeId: id, isArchived: false } }),
        prisma.attendance.count({ where: { employeeId: id } }),
        prisma.timeOffRequest.count({ where: { employeeId: id } }),
        prisma.timeOffAllocation.count({ where: { employeeId: id } }),
        prisma.contract.findFirst({
          where: {
            employeeId: id,
            status: 'RUNNING',
            isArchived: false,
            startDate: { lte: today },
            OR: [{ endDate: null }, { endDate: { gte: today } }],
          },
          include: {
            salaryStructure: { select: { id: true, name: true } },
          },
        }),
      ]);

    return {
      ...employee,
      counts: {
        contracts: contractsCount,
        attendance: attendanceCount,
        timeOffRequests: timeOffRequestsCount,
        timeOffAllocations: timeOffAllocationsCount,
      },
      activeContract: activeContract || null,
    };
  }

  /**
   * Create employee master record with optional user login issuance
   */
  async createEmployee(data, callerUser) {
    // 1. Validate unique email across employees and users
    const normalizedEmail = data.email.toLowerCase().trim();

    const existingEmployee = await prisma.employee.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingEmployee) {
      throw ApiError.conflict('An employee with this email already exists', null, 'DUPLICATE_EMAIL');
    }

    if (data.issueLogin) {
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (existingUser) {
        throw ApiError.conflict('A user account with this email already exists', null, 'DUPLICATE_USER');
      }
    }

    // 2. Validate foreign keys
    if (data.departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
      if (!dept) throw ApiError.badRequest('Referenced department not found', null, 'INVALID_DEPARTMENT');
    }
    if (data.jobPositionId) {
      const pos = await prisma.jobPosition.findUnique({ where: { id: data.jobPositionId } });
      if (!pos) throw ApiError.badRequest('Referenced job position not found', null, 'INVALID_JOB_POSITION');
    }
    if (data.workingScheduleId) {
      const sched = await prisma.workingSchedule.findUnique({ where: { id: data.workingScheduleId } });
      if (!sched) throw ApiError.badRequest('Referenced working schedule not found', null, 'INVALID_SCHEDULE');
    }
    if (data.managerId) {
      const manager = await prisma.employee.findUnique({ where: { id: data.managerId } });
      if (!manager) throw ApiError.badRequest('Referenced manager not found', null, 'INVALID_MANAGER');
    }

    // 3. Handle login issuance rules
    let initialCredentials = null;
    let emailCredentials = null;

    const result = await prisma.$transaction(async (tx) => {
      // Create Employee
      const employee = await tx.employee.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: normalizedEmail,
          phone: data.phone || null,
          bankAccount: data.bankAccount || null,
          departmentId: data.departmentId || null,
          jobPositionId: data.jobPositionId || null,
          managerId: data.managerId || null,
          workingScheduleId: data.workingScheduleId || null,
          status: data.status || 'ACTIVE',
          profileImageUrl: data.profileImageUrl || null,
        },
        include: {
          department: { select: { id: true, name: true } },
          jobPosition: { select: { id: true, title: true } },
          workingSchedule: { select: { id: true, name: true } },
        },
      });

      // Issue User login account if requested
      if (data.issueLogin) {
        // Security rule: HR Manager can only grant EMPLOYEE role. Only Admin can assign higher roles.
        let assignedRole = 'EMPLOYEE';
        if (callerUser.role === 'ADMIN' && data.role) {
          assignedRole = data.role;
        }

        // Generate a random password when the administrator does not provide one.
        let rawPassword = data.password;
        if (!rawPassword) {
          rawPassword = `PeoplePay@2026_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        }

        const passwordHash = await bcrypt.hash(rawPassword, 10);

        const user = await tx.user.create({
          data: {
            email: employee.email,
            passwordHash,
            role: assignedRole,
            employeeId: employee.id,
          },
        });

        initialCredentials = {
          userId: user.id,
          email: user.email,
          role: user.role,
          credentialsIssued: true,
          deliveryNote: 'Initial access details were sent to the employee email address.',
        };
        emailCredentials = { email: user.email, password: rawPassword };
      }

      await recordAudit({
        client: tx,
        actorId: callerUser.id,
        action: 'CREATE',
        entity: 'Employee',
        entityId: employee.id,
        metadata: { issueLogin: Boolean(data.issueLogin) },
      });

      return {
        employee,
        initialCredentials,
      };
    });

    if (emailCredentials) {
      try {
        await sendInitialAccessEmail(emailCredentials);
      } catch (error) {
        console.error(`[EMAIL] Initial access delivery failed for ${emailCredentials.email}:`, error.message);
        result.initialCredentials = {
          userId: result.initialCredentials.userId,
          email: result.initialCredentials.email,
          role: result.initialCredentials.role,
          credentialsIssued: true,
          deliveryNote: 'Account created, but email delivery failed. Use a secure administrator reset process.',
        };
      }
    }

    return result;
  }

  /**
   * Update employee record
   */
  async updateEmployee(id, data, callerUser) {
    const existing = await prisma.employee.findFirst({
      where: { id, isArchived: false },
    });

    if (!existing) {
      throw ApiError.notFound('Employee not found', 'EMPLOYEE_NOT_FOUND');
    }

    // Direct self-management loop check (overview.md §8 & features.md §2)
    if (data.managerId && data.managerId === id) {
      throw ApiError.badRequest('An employee cannot be their own manager', null, 'SELF_MANAGER_LOOP');
    }

    // If updating email, check uniqueness
    if (data.email && data.email.toLowerCase().trim() !== existing.email) {
      const emailConflict = await prisma.employee.findUnique({
        where: { email: data.email.toLowerCase().trim() },
      });
      if (emailConflict) {
        throw ApiError.conflict('An employee with this email already exists', null, 'DUPLICATE_EMAIL');
      }
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.email && { email: data.email.toLowerCase().trim() }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.bankAccount !== undefined && { bankAccount: data.bankAccount }),
        ...(data.departmentId !== undefined && { departmentId: data.departmentId }),
        ...(data.jobPositionId !== undefined && { jobPositionId: data.jobPositionId }),
        ...(data.managerId !== undefined && { managerId: data.managerId }),
        ...(data.workingScheduleId !== undefined && { workingScheduleId: data.workingScheduleId }),
        ...(data.status && { status: data.status }),
        ...(data.profileImageUrl !== undefined && { profileImageUrl: data.profileImageUrl }),
      },
      include: {
        department: { select: { id: true, name: true } },
        jobPosition: { select: { id: true, title: true } },
        workingSchedule: { select: { id: true, name: true } },
        manager: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await recordAudit({
      actorId: callerUser.id,
      action: 'UPDATE',
      entity: 'Employee',
      entityId: id,
      metadata: { fields: Object.keys(data) },
    });

    return updated;
  }

  /**
   * Soft delete (archive) employee
   */
  async archiveEmployee(id, callerUser) {
    const existing = await prisma.employee.findFirst({
      where: { id, isArchived: false },
    });

    if (!existing) {
      throw ApiError.notFound('Employee not found', 'EMPLOYEE_NOT_FOUND');
    }

    await prisma.employee.update({
      where: { id },
      data: { isArchived: true },
    });

    await recordAudit({ actorId: callerUser.id, action: 'ARCHIVE', entity: 'Employee', entityId: id });

    return { id, isArchived: true };
  }
}

module.exports = new EmployeeService();
