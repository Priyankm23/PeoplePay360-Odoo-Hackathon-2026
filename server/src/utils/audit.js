const prisma = require('../config/prisma');

async function recordAudit({ actorId, action, entity, entityId, metadata, ipAddress, client = prisma }) {
  try {
    return await client.auditLog.create({
      data: {
        actorId: actorId || null,
        action,
        entity,
        entityId: entityId || null,
        metadata: metadata || undefined,
        ipAddress: ipAddress || null,
      },
    });
  } catch (error) {
    console.error('[AUDIT_LOG_FAILED]', error.message);
    return null;
  }
}

module.exports = { recordAudit };
