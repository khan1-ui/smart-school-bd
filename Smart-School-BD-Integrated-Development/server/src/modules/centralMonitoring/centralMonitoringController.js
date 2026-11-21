const School = require("../schools/School");
const AttendanceSession = require("../attendance/AttendanceSession");
const Attendance = require("../attendance/Attendance");
const Student = require("../students/Student");
const AuditEvent = require("../audit/AuditEvent");

const dateStart = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date;
};

const overview = async (req, res, next) => {
  try {
    const todayString = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const today = dateStart(req.query.date || todayString);
    if (!today) return res.status(400).json({ success: false, message: "Date must use YYYY-MM-DD format" });
    const [schoolCount, activeStudents, sessions, schools] = await Promise.all([
      School.countDocuments({ status: "active" }),
      Student.countDocuments({ status: "active" }),
      AttendanceSession.find({ date: today }).select("schoolId className section status submittedAt").lean(),
      School.find({ status: "active" }).select("name schoolCode division district upazila institutionType").lean(),
    ]);
    const schoolIds = schools.map((s) => s._id);
    const records = await Attendance.aggregate([
      { $match: { date: today, schoolId: { $in: schoolIds } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const attendanceCounts = { present: 0, absent: 0, late: 0 };
    records.forEach((r) => { attendanceCounts[r._id] = r.count; });
    const submitted = sessions.filter((s) => ["submitted", "finalized"].includes(s.status)).length;
    const finalized = sessions.filter((s) => s.status === "finalized").length;
    const schoolsWithSessions = new Set(sessions.map((s) => String(s.schoolId))).size;
    const schoolRows = schools.map((school) => {
      const schoolSessions = sessions.filter((s) => String(s.schoolId) === String(school._id));
      return {
        id: String(school._id), name: school.name, schoolCode: school.schoolCode,
        division: school.division, district: school.district, upazila: school.upazila,
        institutionType: school.institutionType,
        sessionCount: schoolSessions.length,
        submittedCount: schoolSessions.filter((s) => ["submitted", "finalized"].includes(s.status)).length,
        finalizedCount: schoolSessions.filter((s) => s.status === "finalized").length,
        status: schoolSessions.length === 0 ? "not_started" :
          schoolSessions.every((s) => ["submitted", "finalized"].includes(s.status)) ? "submitted" : "in_progress",
      };
    });
    res.json({ success: true, data: {
      date: req.query.date || todayString,
      summary: { schoolCount, activeStudents, sessionCount: sessions.length, schoolsWithSessions, submittedSessions: submitted, finalizedSessions: finalized, ...attendanceCounts },
      schools: schoolRows,
    }});
  } catch (error) { next(error); }
};

const schoolDetail = async (req, res, next) => {
  try {
    const school = await School.findById(req.params.schoolId).select("name schoolCode division district upazila institutionType status").lean();
    if (!school) return res.status(404).json({ success: false, message: "School not found" });
    const filter = { schoolId: school._id };
    if (req.query.date) {
      const parsed = dateStart(req.query.date);
      if (!parsed) return res.status(400).json({ success: false, message: "Date must use YYYY-MM-DD format" });
      filter.date = parsed;
    }
    const sessions = await AttendanceSession.find(filter).sort({ date: -1 }).lean();
    const attendanceFilter = { schoolId: school._id };
    if (filter.date) attendanceFilter.date = filter.date;
    const attendance = await Attendance.aggregate([
      { $match: attendanceFilter },
      { $group: { _id: { className: "$className", section: "$section", status: "$status" }, count: { $sum: 1 } } },
    ]);
    res.json({ success: true, data: { school, sessions, attendance } });
  } catch (error) { next(error); }
};

const auditEvents = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const filter = {};
    if (req.query.schoolId) filter.schoolId = req.query.schoolId;
    if (req.query.action) filter.action = String(req.query.action).slice(0, 80);
    const [events, total] = await Promise.all([
      AuditEvent.find(filter)
        .populate("actorId", "name email")
        .populate("schoolId", "name schoolCode division district upazila")
        .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AuditEvent.countDocuments(filter),
    ]);
    res.json({ success: true, data: { events, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } });
  } catch (error) { next(error); }
};

module.exports = { overview, schoolDetail, auditEvents };
