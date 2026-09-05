const prisma = require('../../config/prisma');
const { ApiError } = require('../../utils/apiResponse');

class DepartmentService {
  async getDepartments() {
    const departments = await prisma.department.findMany({
      where: { isArchived: false },
      include: {
        _count: {
          select: { employees: { where: { isArchived: false } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    return departments.map((d) => ({
      id: d.id,
      name: d.name,
      employeeCount: d._count.employees,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));
  }

  async createDepartment(data) {
    const name = data.name.trim();
    const existing = await prisma.department.findUnique({
      where: { name },
    });

    if (existing) {
      if (existing.isArchived) {
        // Unarchive
        return await prisma.department.update({
          where: { id: existing.id },
          data: { isArchived: false },
        });
      }
      throw ApiError.conflict('Department with this name already exists', null, 'DUPLICATE_DEPARTMENT');
    }

    return await prisma.department.create({
      data: { name },
    });
  }

  async updateDepartment(id, data) {
    const name = data.name ? data.name.trim() : undefined;
    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing || existing.isArchived) {
      throw ApiError.notFound('Department not found', 'DEPARTMENT_NOT_FOUND');
    }

    if (name && name !== existing.name) {
      const conflict = await prisma.department.findUnique({ where: { name } });
      if (conflict && conflict.id !== id) {
        throw ApiError.conflict('Department with this name already exists', null, 'DUPLICATE_DEPARTMENT');
      }
    }

    return await prisma.department.update({
      where: { id },
      data: { ...(name && { name }) },
    });
  }

  async archiveDepartment(id) {
    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing || existing.isArchived) {
      throw ApiError.notFound('Department not found', 'DEPARTMENT_NOT_FOUND');
    }

    return await prisma.department.update({
      where: { id },
      data: { isArchived: true },
    });
  }
}

module.exports = new DepartmentService();
