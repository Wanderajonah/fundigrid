const AuditLog = require("../models/AuditLog");

// Append-only trail helpers. Every write is fire-and-forget: an audit row
// failing must never break the action it describes.

function firstNameOf(user) {
  return String((user && (user.firstName || user.name)) || "").trim();
}

function nameOf(user) {
  if (!user) return "";
  const full = [user.firstName, user.lastName].map((p) => String(p || "").trim()).filter(Boolean).join(" ");
  return full || user.name || user.email || user.phone || "";
}

function requestMeta(req) {
  const forwarded = req && req.headers ? req.headers["x-forwarded-for"] : null;
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const ip = (first ? String(first).split(",")[0] : "") || (req && req.ip) || "";
  const userAgent = String((req && req.headers && req.headers["user-agent"]) || "").slice(0, 250);
  return { ipAddress: ip.trim(), userAgent };
}

/**
 * Record one audit event.
 * @param {object|null} req  express request (source of actor + ip); may be null
 * @param {object} entry
 * @param {object|null} [entry.actor]  explicit actor override {id, name, role}
 * @param {string} entry.action        dotted code, e.g. "auth.login"
 * @param {string} entry.category      auth|users|verifications|jobs|bookings|settings
 * @param {string} [entry.entityType]  e.g. "user", "booking"
 * @param {string} [entry.entityId]
 * @param {string} entry.summary       human sentence shown in the trail
 * @param {object} [entry.meta]        extra structured detail
 */
async function recordAudit(req, entry = {}) {
  const actor = entry.actor || (req && req.user) || null;
  const meta = requestMeta(req || {});
  await AuditLog.create({
    actorId: actor ? (actor.id || actor._id || null) : null,
    actorName: actor ? nameOf(actor) || firstNameOf(actor) || String(actor.phone || "") : (entry.actorName || ""),
    actorRole: actor ? String(actor.role || "").toLowerCase() : String(entry.actorRole || ""),
    action: String(entry.action || "unknown"),
    category: String(entry.category || "users"),
    entityType: String(entry.entityType || ""),
    entityId: String(entry.entityId || ""),
    summary: String(entry.summary || ""),
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    meta: entry.meta || {},
  });
}

/** Fire-and-forget wrapper — never throws, never blocks the response. */
function audit(req, entry) {
  recordAudit(req, entry).catch((err) => {
    console.error("[audit] failed to record", entry && entry.action, err.message);
  });
}

module.exports = { audit, recordAudit, nameOf };
