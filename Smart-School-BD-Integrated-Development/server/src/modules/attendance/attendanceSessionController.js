const { recordAuditEvent } = require("../audit/auditService");
const listSchoolAttendanceSessionsController = async (req, res, next) => {
  try {
    const sessions = await listSchoolAttendanceSessions({
      schoolId: req.user.schoolId,
      date: req.query.date,
      teacherId: req.user.role === "teacher" ? req.user.id : null,
    });
    res.json({ success: true, data: { sessions } });
  } catch (error) { next(error); }
};


const {
  createAttendanceSession,
  listSchoolAttendanceSessions,
  validateSessionForSubmission,
  submitAttendanceSession,
  returnAttendanceSession,
  finalizeAttendanceSession,
  reopenReturnedAttendanceSession,
} = require("./attendanceSessionService");

const createAttendanceSessionController = async (
  req,
  res,
  next
) => {
  try {
    const session = await createAttendanceSession({
      schoolId: req.user.schoolId,
      userId: req.user.id,
      className: req.body.className,
      section: req.body.section,
      academicYear: req.body.academicYear,
      date: req.body.date,
      role: req.user.role,
    });

    return res.status(201).json({
      success: true,
      message: "Attendance session created successfully",
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

const validateAttendanceSessionController = async (
  req,
  res,
  next
) => {
  try {
    const result = await validateSessionForSubmission({
      schoolId: req.user.schoolId,
      sessionId: req.params.sessionId,
    });

    return res.status(200).json({
      success: true,
      message: "Attendance session validation completed",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const submitAttendanceSessionController = async (
  req,
  res,
  next
) => {
  try {
    if (req.body?.confirmed !== true) {
      return res.status(400).json({ success: false, message: "Principal verification confirmation is required before submission" });
    }
    const result = await submitAttendanceSession({
      schoolId: req.user.schoolId,
      userId: req.user.id,
      sessionId: req.params.sessionId,
    });
    await recordAuditEvent({
      schoolId: req.user.schoolId, actorId: req.user.id, actorRole: req.user.role,
      action: "daily_attendance_submitted", entityType: "attendance_session", entityId: result.sessionId,
      metadata: { status: result.status, totalStudents: result.totalStudents, recordedStudents: result.recordedStudents },
    }).catch((error) => console.error("[Audit] attendance submission event could not be saved:", error.message));

    return res.status(200).json({
      success: true,
      message: "Attendance session submitted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const returnAttendanceSessionController = async (req, res, next) => {
  try {
    const result = await returnAttendanceSession({
      schoolId: req.user.schoolId,
      userId: req.user.id,
      sessionId: req.params.sessionId,
      returnReason: req.body.returnReason,
    });

    return res.status(200).json({
      success: true,
      message: "Attendance session returned for correction",
      data: { session: result },
    });
  } catch (error) {
    next(error);
  }
};

const finalizeAttendanceSessionController = async (req, res, next) => {
  try {
    const result = await finalizeAttendanceSession({
      schoolId: req.user.schoolId,
      userId: req.user.id,
      sessionId: req.params.sessionId,
    });

    return res.status(200).json({
      success: true,
      message: "Attendance session finalized successfully",
      data: { session: result },
    });
  } catch (error) {
    next(error);
  }
};

const reopenReturnedAttendanceSessionController = async (
  req,
  res,
  next
) => {
  try {
    const session = await reopenReturnedAttendanceSession({
      schoolId: req.user.schoolId,
      userId: req.user.id,
      sessionId: req.params.sessionId,
    });

    return res.status(200).json({
      success: true,
      message: "Returned attendance session reopened successfully",
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
   listSchoolAttendanceSessionsController,
   createAttendanceSessionController,
   validateAttendanceSessionController,
   submitAttendanceSessionController,
   returnAttendanceSessionController,
   finalizeAttendanceSessionController,
   reopenReturnedAttendanceSessionController,
};
