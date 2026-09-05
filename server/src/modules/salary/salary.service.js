const prisma = require('../../config/prisma');
const { ApiError } = require('../../utils/apiResponse');
const { recordAudit } = require('../../utils/audit');

class SalaryService {
  /**
   * Format rule decimal fields to JavaScript numbers
   */
  enrichRule(rule) {
    if (!rule) return null;
    return {
      ...rule,
      fixedAmount: rule.fixedAmount !== null && rule.fixedAmount !== undefined ? Number(rule.fixedAmount) : null,
      percentage: rule.percentage !== null && rule.percentage !== undefined ? Number(rule.percentage) : null,
    };
  }

  /**
   * List all Salary Structures with rule counts and active contract usage counts
   */
  async getSalaryStructures({ includeInactive = false } = {}) {
    const where = {
      isArchived: false,
    };
    if (!includeInactive) {
      where.isActive = true;
    }

    const structures = await prisma.salaryStructure.findMany({
      where,
      include: {
        _count: {
          select: {
            rules: { where: { isArchived: false } },
            contracts: { where: { isArchived: false, status: 'RUNNING' } },
            payruns: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return structures.map((s) => ({
      id: s.id,
      name: s.name,
      isActive: s.isActive,
      rulesCount: s._count.rules,
      contractCount: s._count.contracts,
      payrunsCount: s._count.payruns,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }

  /**
   * Get single Salary Structure by ID with all its ordered Salary Rules
   */
  async getSalaryStructureById(id) {
    const structure = await prisma.salaryStructure.findFirst({
      where: { id, isArchived: false },
      include: {
        rules: {
          where: { isArchived: false },
          include: {
            baseRule: {
              select: {
                id: true,
                name: true,
                code: true,
                sequence: true,
              },
            },
          },
          orderBy: { sequence: 'asc' },
        },
        _count: {
          select: {
            contracts: { where: { isArchived: false, status: 'RUNNING' } },
            payruns: true,
          },
        },
      },
    });

    if (!structure) {
      throw ApiError.notFound('Salary Structure not found', 'SALARY_STRUCTURE_NOT_FOUND');
    }

    return {
      id: structure.id,
      name: structure.name,
      isActive: structure.isActive,
      contractCount: structure._count.contracts,
      payrunsCount: structure._count.payruns,
      rules: structure.rules.map((r) => this.enrichRule(r)),
      createdAt: structure.createdAt,
      updatedAt: structure.updatedAt,
    };
  }

  /**
   * Create a new Salary Structure
   */
  async createSalaryStructure(data, actorUser, reqMeta = {}) {
    // Name uniqueness check among active structures
    const existing = await prisma.salaryStructure.findFirst({
      where: {
        name: { equals: data.name.trim(), mode: 'insensitive' },
        isArchived: false,
      },
    });
    if (existing) {
      throw ApiError.conflict(
        `A salary structure with name '${data.name}' already exists`,
        { name: data.name },
        'DUPLICATE_STRUCTURE_NAME'
      );
    }

    const structure = await prisma.salaryStructure.create({
      data: {
        name: data.name.trim(),
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    await recordAudit({
      actorId: actorUser?.id,
      action: 'SALARY_STRUCTURE_CREATED',
      entity: 'SalaryStructure',
      entityId: structure.id,
      metadata: { name: structure.name, isActive: structure.isActive },
      ipAddress: reqMeta.ip,
    });

    return structure;
  }

  /**
   * Update Salary Structure
   */
  async updateSalaryStructure(id, data, actorUser, reqMeta = {}) {
    const structure = await prisma.salaryStructure.findFirst({
      where: { id, isArchived: false },
    });
    if (!structure) {
      throw ApiError.notFound('Salary Structure not found', 'SALARY_STRUCTURE_NOT_FOUND');
    }

    if (data.name && data.name.trim() !== structure.name) {
      const duplicate = await prisma.salaryStructure.findFirst({
        where: {
          id: { not: id },
          name: { equals: data.name.trim(), mode: 'insensitive' },
          isArchived: false,
        },
      });
      if (duplicate) {
        throw ApiError.conflict(
          `A salary structure with name '${data.name}' already exists`,
          { name: data.name },
          'DUPLICATE_STRUCTURE_NAME'
        );
      }
    }

    const updated = await prisma.salaryStructure.update({
      where: { id },
      data: {
        name: data.name ? data.name.trim() : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      },
    });

    await recordAudit({
      actorId: actorUser?.id,
      action: 'SALARY_STRUCTURE_UPDATED',
      entity: 'SalaryStructure',
      entityId: updated.id,
      metadata: { changes: data },
      ipAddress: reqMeta.ip,
    });

    return updated;
  }

  /**
   * Soft-delete Salary Structure
   */
  async deleteSalaryStructure(id, actorUser, reqMeta = {}) {
    const structure = await prisma.salaryStructure.findFirst({
      where: { id, isArchived: false },
    });
    if (!structure) {
      throw ApiError.notFound('Salary Structure not found', 'SALARY_STRUCTURE_NOT_FOUND');
    }

    // Check if in use by active contracts
    const runningContracts = await prisma.contract.count({
      where: { salaryStructureId: id, isArchived: false, status: 'RUNNING' },
    });
    if (runningContracts > 0) {
      throw ApiError.badRequest(
        `Cannot delete salary structure: it is currently assigned to ${runningContracts} running employment contract(s)`,
        'STRUCTURE_IN_USE'
      );
    }

    const timestamp = Date.now();
    const archived = await prisma.salaryStructure.update({
      where: { id },
      data: {
        isArchived: true,
        isActive: false,
        name: `${structure.name} (Archived ${timestamp})`,
      },
    });

    await recordAudit({
      actorId: actorUser?.id,
      action: 'SALARY_STRUCTURE_DELETED',
      entity: 'SalaryStructure',
      entityId: id,
      metadata: { name: structure.name },
      ipAddress: reqMeta.ip,
    });

    return archived;
  }

  /**
   * Get all rules across structures, optionally filtered by structureId
   */
  async getAllSalaryRules({ structureId } = {}) {
    const where = { isArchived: false };
    if (structureId) {
      where.salaryStructureId = structureId;
    }

    const rules = await prisma.salaryRule.findMany({
      where,
      include: {
        salaryStructure: {
          select: { id: true, name: true, isActive: true },
        },
        baseRule: {
          select: { id: true, name: true, code: true, sequence: true },
        },
      },
      orderBy: [
        { sequence: 'asc' },
      ],
    });

    return rules.map((r) => this.enrichRule(r));
  }

  /**
   * Get all rules for a given structure ordered by sequence ASC
   */
  async getStructureRules(structureId) {
    const structure = await prisma.salaryStructure.findFirst({
      where: { id: structureId, isArchived: false },
    });
    if (!structure) {
      throw ApiError.notFound('Salary Structure not found', 'SALARY_STRUCTURE_NOT_FOUND');
    }

    const rules = await prisma.salaryRule.findMany({
      where: { salaryStructureId: structureId, isArchived: false },
      include: {
        baseRule: {
          select: { id: true, name: true, code: true, sequence: true },
        },
      },
      orderBy: { sequence: 'asc' },
    });

    return rules.map((r) => this.enrichRule(r));
  }

  /**
   * Create a Salary Rule within a Structure
   * Enforces Key Business Rule #3: Deterministic Rule Sequencing (Sequence_base < Sequence_this)
   */
  async createSalaryRule(structureId, data, actorUser, reqMeta = {}) {
    // 1. Verify structure exists
    const structure = await prisma.salaryStructure.findFirst({
      where: { id: structureId, isArchived: false },
    });
    if (!structure) {
      throw ApiError.notFound('Salary Structure not found', 'SALARY_STRUCTURE_NOT_FOUND');
    }

    const codeUpper = data.code.trim().toUpperCase();

    // 2. Uniqueness of sequence within structure
    const existingSeq = await prisma.salaryRule.findFirst({
      where: {
        salaryStructureId: structureId,
        sequence: data.sequence,
        isArchived: false,
      },
    });
    if (existingSeq) {
      throw ApiError.conflict(
        `Sequence ${data.sequence} is already assigned to rule '${existingSeq.name}' (${existingSeq.code}) in this structure`,
        { sequence: data.sequence, conflictingRuleId: existingSeq.id },
        'DUPLICATE_SEQUENCE'
      );
    }

    // 3. Uniqueness of code within structure
    const existingCode = await prisma.salaryRule.findFirst({
      where: {
        salaryStructureId: structureId,
        code: codeUpper,
        isArchived: false,
      },
    });
    if (existingCode) {
      throw ApiError.conflict(
        `Rule code '${codeUpper}' already exists in this salary structure`,
        { code: codeUpper, conflictingRuleId: existingCode.id },
        'DUPLICATE_CODE'
      );
    }

    // 4. Key Business Rule #3 Enforcement
    let baseRuleId = null;
    let fixedAmount = null;
    let percentage = null;

    if (data.computationMethod === 'FIXED') {
      fixedAmount = data.fixedAmount;
    } else if (data.computationMethod === 'PERCENTAGE') {
      percentage = data.percentage;
      baseRuleId = data.baseRuleId;

      // Verify baseRuleId exists in the same structure
      const baseRule = await prisma.salaryRule.findFirst({
        where: {
          id: baseRuleId,
          salaryStructureId: structureId,
          isArchived: false,
        },
      });
      if (!baseRule) {
        throw ApiError.badRequest(
          'Referenced base rule does not exist in this salary structure',
          null,
          'BASE_RULE_NOT_FOUND'
        );
      }

      // STRICT VALIDATION: Sequence_base < Sequence_this
      if (baseRule.sequence >= data.sequence) {
        throw ApiError.badRequest(
          `Invalid rule sequence: base rule '${baseRule.code}' has sequence ${baseRule.sequence}, which must be strictly less than this rule's sequence (${data.sequence})`,
          null,
          'INVALID_RULE_SEQUENCE'
        );
      }
    }

    // 5. Create Rule
    const createdRule = await prisma.salaryRule.create({
      data: {
        salaryStructureId: structureId,
        name: data.name.trim(),
        code: codeUpper,
        category: data.category,
        sequence: data.sequence,
        computationMethod: data.computationMethod,
        fixedAmount,
        percentage,
        baseRuleId,
      },
      include: {
        baseRule: {
          select: { id: true, name: true, code: true, sequence: true },
        },
      },
    });

    await recordAudit({
      actorId: actorUser?.id,
      action: 'SALARY_RULE_CREATED',
      entity: 'SalaryRule',
      entityId: createdRule.id,
      metadata: {
        structureId,
        name: createdRule.name,
        code: createdRule.code,
        sequence: createdRule.sequence,
        category: createdRule.category,
        computationMethod: createdRule.computationMethod,
      },
      ipAddress: reqMeta.ip,
    });

    return this.enrichRule(createdRule);
  }

  /**
   * Update Salary Rule
   * Re-evaluates sequence dependencies if sequence or base rule changes
   */
  async updateSalaryRule(ruleId, data, actorUser, reqMeta = {}) {
    const existing = await prisma.salaryRule.findFirst({
      where: { id: ruleId, isArchived: false },
      include: {
        dependentRules: { where: { isArchived: false } },
        baseRule: true,
      },
    });
    if (!existing) {
      throw ApiError.notFound('Salary Rule not found', 'SALARY_RULE_NOT_FOUND');
    }

    const structureId = existing.salaryStructureId;
    const newSeq = data.sequence !== undefined ? data.sequence : existing.sequence;
    const newMethod = data.computationMethod !== undefined ? data.computationMethod : existing.computationMethod;
    const newBaseId = data.baseRuleId !== undefined ? data.baseRuleId : existing.baseRuleId;

    // Check sequence uniqueness if changed
    if (data.sequence && data.sequence !== existing.sequence) {
      const duplicateSeq = await prisma.salaryRule.findFirst({
        where: {
          id: { not: ruleId },
          salaryStructureId: structureId,
          sequence: data.sequence,
          isArchived: false,
        },
      });
      if (duplicateSeq) {
        throw ApiError.conflict(
          `Sequence ${data.sequence} is already in use by rule '${duplicateSeq.code}' in this structure`,
          { sequence: data.sequence },
          'DUPLICATE_SEQUENCE'
        );
      }
    }

    // Check code uniqueness if changed
    if (data.code && data.code.trim().toUpperCase() !== existing.code) {
      const codeUpper = data.code.trim().toUpperCase();
      const duplicateCode = await prisma.salaryRule.findFirst({
        where: {
          id: { not: ruleId },
          salaryStructureId: structureId,
          code: codeUpper,
          isArchived: false,
        },
      });
      if (duplicateCode) {
        throw ApiError.conflict(
          `Rule code '${codeUpper}' is already in use in this structure`,
          { code: codeUpper },
          'DUPLICATE_CODE'
        );
      }
    }

    // Key Business Rule #3: Re-evaluate sequence dependencies
    if (newMethod === 'PERCENTAGE') {
      if (!newBaseId) {
        throw ApiError.badRequest('baseRuleId is required when computationMethod is PERCENTAGE');
      }

      const baseRule = await prisma.salaryRule.findFirst({
        where: { id: newBaseId, salaryStructureId: structureId, isArchived: false },
      });
      if (!baseRule) {
        throw ApiError.badRequest('Referenced base rule does not exist in this salary structure', null, 'BASE_RULE_NOT_FOUND');
      }

      if (baseRule.sequence >= newSeq) {
        throw ApiError.badRequest(
          `Invalid rule sequence: base rule '${baseRule.code}' has sequence ${baseRule.sequence}, which must be strictly less than this rule's sequence (${newSeq})`,
          null,
          'INVALID_RULE_SEQUENCE'
        );
      }
    }

    // Check if new sequence breaks any rules that depend on this rule
    if (data.sequence && existing.dependentRules.length > 0) {
      for (const dep of existing.dependentRules) {
        if (dep.sequence <= newSeq) {
          throw ApiError.badRequest(
            `Cannot change sequence to ${newSeq}: dependent rule '${dep.code}' has sequence ${dep.sequence}, which must remain strictly greater than this base rule`,
            null,
            'INVALID_RULE_SEQUENCE'
          );
        }
      }
    }

    const updated = await prisma.salaryRule.update({
      where: { id: ruleId },
      data: {
        name: data.name ? data.name.trim() : undefined,
        code: data.code ? data.code.trim().toUpperCase() : undefined,
        category: data.category || undefined,
        sequence: data.sequence !== undefined ? data.sequence : undefined,
        computationMethod: newMethod,
        fixedAmount: newMethod === 'FIXED' ? data.fixedAmount : null,
        percentage: newMethod === 'PERCENTAGE' ? data.percentage : null,
        baseRuleId: newMethod === 'PERCENTAGE' ? newBaseId : null,
      },
      include: {
        baseRule: {
          select: { id: true, name: true, code: true, sequence: true },
        },
      },
    });

    await recordAudit({
      actorId: actorUser?.id,
      action: 'SALARY_RULE_UPDATED',
      entity: 'SalaryRule',
      entityId: updated.id,
      metadata: { changes: data },
      ipAddress: reqMeta.ip,
    });

    return this.enrichRule(updated);
  }

  /**
   * Delete / archive Salary Rule
   */
  async deleteSalaryRule(ruleId, actorUser, reqMeta = {}) {
    const existing = await prisma.salaryRule.findFirst({
      where: { id: ruleId, isArchived: false },
      include: {
        dependentRules: { where: { isArchived: false } },
      },
    });
    if (!existing) {
      throw ApiError.notFound('Salary Rule not found', 'SALARY_RULE_NOT_FOUND');
    }

    // If other percentage rules depend on this rule, block deletion
    if (existing.dependentRules.length > 0) {
      const depCodes = existing.dependentRules.map((d) => d.code).join(', ');
      throw ApiError.badRequest(
        `Cannot delete rule '${existing.code}': the following percentage rule(s) depend on it as their base rule: ${depCodes}`,
        null,
        'RULE_HAS_DEPENDENTS'
      );
    }

    const timestamp = Date.now();
    const deleted = await prisma.salaryRule.update({
      where: { id: ruleId },
      data: {
        isArchived: true,
        code: `${existing.code}_ARCHIVED_${timestamp}`,
        sequence: -1 * Math.abs(existing.sequence * 100000 + (timestamp % 100000)),
      },
    });

    await recordAudit({
      actorId: actorUser?.id,
      action: 'SALARY_RULE_DELETED',
      entity: 'SalaryRule',
      entityId: ruleId,
      metadata: { name: existing.name, code: existing.code },
      ipAddress: reqMeta.ip,
    });

    return { id: ruleId, success: true };
  }

  /**
   * Auto-seed standard Indian salary structure if no active structures exist
   */
  async ensureDefaultSeed() {
    const count = await prisma.salaryStructure.count({ where: { isArchived: false } });
    if (count > 0) return;

    const structure = await prisma.salaryStructure.create({
      data: {
        name: 'Standard Indian Payroll Structure',
        isActive: true,
      },
    });

    // 1. Basic Salary (Fixed base from contract wage)
    const basic = await prisma.salaryRule.create({
      data: {
        salaryStructureId: structure.id,
        name: 'Basic Salary',
        code: 'BASIC',
        category: 'BASIC',
        sequence: 10,
        computationMethod: 'FIXED',
        fixedAmount: 30000,
      },
    });

    // 2. House Rent Allowance (40% of Basic)
    await prisma.salaryRule.create({
      data: {
        salaryStructureId: structure.id,
        name: 'House Rent Allowance',
        code: 'HRA',
        category: 'ALLOWANCE',
        sequence: 20,
        computationMethod: 'PERCENTAGE',
        percentage: 40,
        baseRuleId: basic.id,
      },
    });

    // 3. Special Allowance (Fixed allowance)
    await prisma.salaryRule.create({
      data: {
        salaryStructureId: structure.id,
        name: 'Special Allowance',
        code: 'SPL_ALLOWANCE',
        category: 'ALLOWANCE',
        sequence: 30,
        computationMethod: 'FIXED',
        fixedAmount: 8000,
      },
    });

    // 4. Provident Fund (12% of Basic deduction)
    await prisma.salaryRule.create({
      data: {
        salaryStructureId: structure.id,
        name: 'Provident Fund',
        code: 'PF',
        category: 'DEDUCTION',
        sequence: 40,
        computationMethod: 'PERCENTAGE',
        percentage: 12,
        baseRuleId: basic.id,
      },
    });

    // 5. Professional Tax (Fixed deduction)
    await prisma.salaryRule.create({
      data: {
        salaryStructureId: structure.id,
        name: 'Professional Tax',
        code: 'PT',
        category: 'DEDUCTION',
        sequence: 50,
        computationMethod: 'FIXED',
        fixedAmount: 200,
      },
    });

    // 6. Net Salary (Final take-home indicator)
    await prisma.salaryRule.create({
      data: {
        salaryStructureId: structure.id,
        name: 'Net Salary',
        code: 'NET',
        category: 'NET',
        sequence: 100,
        computationMethod: 'FIXED',
        fixedAmount: 0,
      },
    });
  }
}

module.exports = new SalaryService();
