const AuditEvent = require("./AuditEvent");

async function recordAuditEvent({ schoolId, actorId, actorRole, action, entityType, entityId, metadata = {} }) {
  // Never accept biometric descriptors, images, tokens, passwords or raw consent documents here.
  return AuditEvent.create({ schoolId, actorId, actorRole, action, entityType, entityId: String(entityId), metadata });
}

module.exports = { recordAuditEvent };
