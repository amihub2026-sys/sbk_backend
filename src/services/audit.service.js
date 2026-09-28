import { AuditLog } from "../models/index.js";
export async function audit(req, action, entity, entityId, metadata = {}) {
  try {
    await AuditLog.create({
      actorUserId: req.session?.userId || null,
      actorRole: req.session?.role || "public",
      action,
      entity,
      entityId: String(entityId || ""),
      metadata,
      requestId: req.id || req.get("X-Request-ID") || "",
    });
  } catch (err) {
    req.log?.warn({ err }, "audit write failed");
  }
}
