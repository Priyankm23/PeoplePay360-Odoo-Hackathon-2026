const prisma = require('../../config/prisma');
const { ApiError } = require('../../utils/apiResponse');

class JobPositionService {
  async getJobPositions(departmentId) {
    const where = { isArchived: false };
    if (departmentId) where.departmentId = departmentId;

    const positions = await prisma.jobPosition.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        _count: { select: { employees: { where: { isArchived: false } } } },
      },
      orderBy: { title: 'asc' },
    });

    return positions.map((p) => ({
      id: p.id,
      title: p.title,
      departmentId: p.departmentId,
      department: p.department,
      employeeCount: p._count.employees,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  async createJobPosition(data) {
    const { title, departmentId } = data;

    if (departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: departmentId } });
      if (!dept || dept.isArchived) {
        throw ApiError.badRequest('Referenced department not found', null, 'INVALID_DEPARTMENT');
      }
    }

    return await prisma.jobPosition.create({
      data: {
        title: title.trim(),
        departmentId: departmentId || null,
      },
      include: {
        department: { select: { id: true, name: true } },
      },
    });
  }

  async updateJobPosition(id, data) {
    const existing = await prisma.jobPosition.findUnique({ where: { id } });
    if (!existing || existing.isArchived) {
      throw ApiError.notFound('Job Position not found', 'JOB_POSITION_NOT_FOUND');
    }

    if (data.departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
      if (!dept || dept.isArchived) {
        throw ApiError.badRequest('Referenced department not found', null, 'INVALID_DEPARTMENT');
      }
    }

    return await prisma.jobPosition.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title.trim() }),
        ...(data.departmentId !== undefined && { departmentId: data.departmentId }),
      },
      include: {
        department: { select: { id: true, name: true } },
      },
    });
  }

  async archiveJobPosition(id) {
    const existing = await prisma.jobPosition.findUnique({ where: { id } });
    if (!existing || existing.isArchived) {
      throw ApiError.notFound('Job Position not found', 'JOB_POSITION_NOT_FOUND');
    }

    return await prisma.jobPosition.update({
      where: { id },
      data: { isArchived: true },
    });
  }
}

module.exports = new JobPositionService();
