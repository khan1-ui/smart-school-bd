const {
  markAttendance,
  markFaceAttendance,
  getClassAttendanceReport,
  markClassAttendance,
} = require("./attendanceService");
const { findMatchingStudent } = require("../faceRecognition/faceRecognitionService");
const TeacherClassAssignment = require("../assignments/TeacherClassAssignment");
const { recordAuditEvent } = require("../audit/auditService");

const ensureTeacherAssigned = async (req, className, section, academicYear) => {
  if (req.user.role !== "teacher") return;
  const assigned = await TeacherClassAssignment.exists({
    schoolId: req.user.schoolId,
    teacherId: req.user.id,
    className,
    section: (section || "").trim().toUpperCase(),
    academicYear,
    active: true,
  });
  if (!assigned) {
    const error = new Error("You are not assigned to this class and section");
    error.statusCode = 403;
    throw error;
  }
};

const createAttendanceController = async (req, res, next) => {
  try {
    const { studentId, date, status, remark = "" } = req.body;

    if (!studentId || !date || !status) {
      return res.status(400).json({
        success: false,
        message: "Student ID, date and status are required",
      });
    }

    if (!["present", "absent", "late"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance status",
      });
    }
    if (req.user.role === "teacher" && (typeof remark !== "string" || remark.trim().length < 5 || remark.trim().length > 300)) {
      return res.status(400).json({ success: false, message: "Manual attendance requires a 5–300 character reason" });
    }

    if (req.user.role === "teacher") {
      const Student = require("../students/Student");
      const student = await Student.findOne({ _id: studentId, schoolId: req.user.schoolId, status: "active" })
        .select("className section academicYear").lean();
      if (!student) return res.status(404).json({ success: false, message: "Active student not found" });
      await ensureTeacherAssigned(req, student.className, student.section, student.academicYear);
    }
    const attendance = await markAttendance(
      req.user.schoolId,
      req.user.id,
      { studentId, date, status, remark }
    );
    await recordAuditEvent({
      schoolId: req.user.schoolId, actorId: req.user.id, actorRole: req.user.role,
      action: "attendance_recorded", entityType: "attendance", entityId: attendance._id,
      metadata: { studentId: String(studentId), status, method: "manual", date, manualReasonProvided: Boolean(String(remark).trim()) },
    }).catch((error) => console.error("[Audit] attendance event could not be saved:", error.message));

    return res.status(201).json({
      success: true,
      message: "Attendance marked successfully",
      data: { attendance },
    });
  } catch (error) {
    next(error);
  }
};

const getClassAttendanceReportController = async (req, res, next) => {
  try {
    const { className, section, academicYear, date } = req.query;

    await ensureTeacherAssigned(req, String(className || "").trim(), section || "", academicYear);
    const report = await getClassAttendanceReport(
      req.user.schoolId,
      { className, section, academicYear, date }
    );

    return res.status(200).json({
      success: true,
      message: "Attendance report fetched successfully",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

const markFaceAttendanceController = async (req, res, next) => {
  try {
    const { descriptor } = req.body;

    if (
      !Array.isArray(descriptor) ||
      descriptor.length !== 128 ||
      !descriptor.every(
        (value) =>
          typeof value === "number" &&
          Number.isFinite(value)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid 128-value face descriptor is required",
      });
    }

    const result = await findMatchingStudent({
      schoolId: req.user.schoolId,
      descriptor,
    });

    if (!result.matched || !result.student?._id) {
      return res.status(404).json({
        success: false,
        message: "No matching enrolled student found",
        data: {
          matched: false,
          attendanceMarked: false,
        },
      });
    }

    if (req.body.className && req.body.className !== result.student.className) {
      return res.status(409).json({ success: false, message: "Recognized student does not belong to the selected class" });
    }
    if (req.body.section !== undefined && String(req.body.section).trim().toUpperCase() !== String(result.student.section || "").trim().toUpperCase()) {
      return res.status(409).json({ success: false, message: "Recognized student does not belong to the selected section" });
    }
    if (req.body.academicYear && req.body.academicYear !== result.student.academicYear) {
      return res.status(409).json({ success: false, message: "Recognized student does not belong to the selected academic year" });
    }
    await ensureTeacherAssigned(req, result.student.className, result.student.section, result.student.academicYear);
    const attendance = await markFaceAttendance(
      req.user.schoolId,
      req.user.id,
      result.student._id
    );
    await recordAuditEvent({
      schoolId: req.user.schoolId, actorId: req.user.id, actorRole: req.user.role,
      action: "face_attendance_recorded", entityType: "attendance", entityId: attendance._id,
      metadata: { studentId: String(result.student._id), status: "present", method: "face_recognition" },
    }).catch((error) => console.error("[Audit] face attendance event could not be saved:", error.message));

return res.status(201).json({
  success: true,
  message: "Face attendance marked successfully",
  data: {
    attendance,
    student: {
      id: result.student._id,
      admissionNumber: result.student.admissionNumber,
      name: result.student.name,
      className: result.student.className,
      section: result.student.section,
    },
    distance: result.distance,
    attendanceMarked: true,
  },
});

  } catch (error) {
    next(error);
  }
};

const markClassAttendanceController = async (req, res, next) => {
  try {
    await ensureTeacherAssigned(req, String(req.body.className || "").trim(), req.body.section || "", req.body.academicYear);
    const result = await markClassAttendance(
      req.user.schoolId,
      req.user.id,
      req.body
    );

    return res.status(201).json({
      success: true,
      message: "Class attendance saved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAttendanceController,
  getClassAttendanceReportController,
  markClassAttendanceController,
  markFaceAttendanceController,
};
 