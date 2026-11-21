const AuditEvent = require("./AuditEvent");

const listSchoolAuditEvents = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const filter = { schoolId: req.user.schoolId };
    if (req.query.action) filter.action = String(req.query.action).slice(0, 80);
    const [events, total] = await Promise.all([
      AuditEvent.find(filter).populate("actorId", "name email").sort({ createdAt: -1 })
        .skip((page - 1) * limit).limit(limit).lean(),
      AuditEvent.countDocuments(filter),
    ]);
    res.json({ success: true, data: { events, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } });
  } catch (error) { next(error); }
};

module.exports = { listSchoolAuditEvents };
