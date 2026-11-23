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
    const todayString = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
    const requestedDate = req.query.date || todayString;
    const selectedDate = dateStart(requestedDate);
    if (!selectedDate) {
      return res.status(400).json({ success: false, message: "Date must use YYYY-MM-DD format" });
    }

    const [schools, studentCounts, sessions] = await Promise.all([
      School.find({ status: "active" })
        .select("name schoolCode division district upazila institutionType")
        .lean(),
      Student.aggregate([
        { $match: { status: "active" } },
        { $group: { _id: "$schoolId", count: { $sum: 1 } } },
      ]),
      AttendanceSession.find({ date: selectedDate })
        .select("schoolId className section academicYear status submittedAt")
        .lean(),
    ]);

    const schoolIds = schools.map((school) => school._id);
    const studentCountBySchool = new Map(
      studentCounts.map((item) => [String(item._id), item.count])
    );
    const eligibleSessions = sessions.filter((session) =>
      ["submitted", "finalized"].includes(session.status)
    );

    // Only count records belonging to sessions that have actually been submitted.
    // In-progress and returned sessions must never appear as final attendance.
    const submittedScopes = eligibleSessions.map((session) => ({
      schoolId: session.schoolId,
      className: session.className,
      section: session.section || "",
      academicYear: session.academicYear,
      date: selectedDate,
    }));
    const attendanceRows = submittedScopes.length
      ? await Attendance.aggregate([
          { $match: { $or: submittedScopes, status: { $in: ["present", "absent"] } } },
          { $group: { _id: { schoolId: "$schoolId", status: "$status" }, count: { $sum: 1 } } },
        ])
      : [];

    const attendanceBySchool = new Map();
    attendanceRows.forEach((row) => {
      const schoolId = String(row._id.schoolId);
      const counts = attendanceBySchool.get(schoolId) || { present: 0, absent: 0 };
      counts[row._id.status] = row.count;
      attendanceBySchool.set(schoolId, counts);
    });

    const sessionsBySchool = new Map();
    sessions.forEach((session) => {
      const key = String(session.schoolId);
      const rows = sessionsBySchool.get(key) || [];
      rows.push(session);
      sessionsBySchool.set(key, rows);
    });

    const schoolRows = schools.map((school) => {
      const key = String(school._id);
      const schoolSessions = sessionsBySchool.get(key) || [];
      const submittedSchoolSessions = schoolSessions.filter((session) =>
        ["submitted", "finalized"].includes(session.status)
      );
      const attendance = attendanceBySchool.get(key);
      const hasSubmittedAttendance = submittedSchoolSessions.length > 0;
      return {
        id: key,
        name: school.name,
        schoolCode: school.schoolCode,
        division: school.division,
        district: school.district,
        upazila: school.upazila,
        institutionType: school.institutionType,
        registeredStudents: studentCountBySchool.get(key) || 0,
        present: hasSubmittedAttendance ? (attendance?.present || 0) : null,
        absent: hasSubmittedAttendance ? (attendance?.absent || 0) : null,
        attendanceAvailable: hasSubmittedAttendance,
        sessionCount: schoolSessions.length,
        submittedCount: submittedSchoolSessions.length,
        finalizedCount: schoolSessions.filter((session) => session.status === "finalized").length,
        pendingCount: schoolSessions.filter((session) => !["submitted", "finalized"].includes(session.status)).length,
        status: schoolSessions.length === 0 ? "not_started" :
          schoolSessions.every((session) => ["submitted", "finalized"].includes(session.status)) ? "submitted" : "in_progress",
      };
    });

    const attendanceTotals = schoolRows.reduce((totals, school) => {
      if (!school.attendanceAvailable) return totals;
      totals.present += school.present;
      totals.absent += school.absent;
      return totals;
    }, { present: 0, absent: 0 });
    const submittedSessions = eligibleSessions.length;
    const schoolsWithSessions = new Set(sessions.map((session) => String(session.schoolId))).size;

    res.json({
      success: true,
      data: {
        date: requestedDate,
        summary: {
          schoolCount: schools.length,
          activeStudents: schoolRows.reduce((total, school) => total + school.registeredStudents, 0),
          sessionCount: sessions.length,
          schoolsWithSessions,
          submittedSessions,
          finalizedSessions: sessions.filter((session) => session.status === "finalized").length,
          pendingSessions: sessions.filter((session) => !["submitted", "finalized"].includes(session.status)).length,
          ...attendanceTotals,
        },
        schools: schoolRows,
      },
    });
  } catch (error) {
    next(error);
  }
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
