const { recordAuditEvent } = require("../audit/auditService");
const mongoose = require("mongoose");
const Student = require("../students/Student");
const StudentFace = require("./StudentFace");
const FaceConsent = require("./FaceConsent");
const TeacherClassAssignment = require("../assignments/TeacherClassAssignment");
const getFaceEnrollmentStatusesController = async (req, res, next) => {
  try {
    const ids = [...new Set(String(req.query.studentIds || "").split(",").map((x) => x.trim()).filter(Boolean))];
    if (!ids.length || ids.length > 100 || ids.some((id) => !mongoose.isValidObjectId(id))) {
      return res.status(400).json({ success: false, message: "Provide 1–100 valid student IDs" });
    }
    const students = await Student.find({ _id: { $in: ids }, schoolId: req.user.schoolId, status: "active" }).select("_id").lean();
    const validIds = students.map((s) => s._id);
    const [consents, faces] = await Promise.all([
      FaceConsent.find({ schoolId: req.user.schoolId, studentId: { $in: validIds } }).select("studentId consentStatus").lean(),
      StudentFace.find({ schoolId: req.user.schoolId, studentId: { $in: validIds } }).select("studentId enrollmentStatus").lean(),
    ]);
    const consentMap = new Map(consents.map((x) => [String(x.studentId), x.consentStatus]));
    const faceMap = new Map(faces.map((x) => [String(x.studentId), x.enrollmentStatus]));
    res.json({ success: true, data: { statuses: students.map((s) => ({
      studentId: String(s._id),
      consentStatus: consentMap.get(String(s._id)) || "missing",
      enrollmentStatus: faceMap.get(String(s._id)) || "not_registered",
    })) } });
  } catch (error) { next(error); }
};

const {
  validateFaceEnrollment,
  enrollStudentFace,
  findMatchingStudent,
} = require("./faceRecognitionService");
// Enrollment-এর আগে যাচাই
const validateFaceEnrollmentController = async (
  req,
  res,
  next
) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }

    const result = await validateFaceEnrollment({
      schoolId: req.user.schoolId,
      userId: req.user.id,
      role: req.user.role,
      studentId,
    });

    return res.status(200).json({
      success: true,
      message: "Face enrollment validation successful",
      data: {
        studentId: result.student._id,
        admissionNumber: result.student.admissionNumber,
        consentId: result.consentId,
        enrollmentAllowed: result.enrollmentAllowed,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Face Descriptor সংরক্ষণ
const enrollStudentFaceController = async (
  req,
  res,
  next
) => {
  try {
    const { studentId, descriptor } = req.body;

    if (!studentId || !Array.isArray(descriptor)) {
      return res.status(400).json({
        success: false,
        message: "Student ID and face descriptor are required",
      });
    }

    const result = await enrollStudentFace({
      schoolId: req.user.schoolId,
      userId: req.user.id,
      role: req.user.role,
      studentId,
      descriptor,
    });
    await recordAuditEvent({
      schoolId: req.user.schoolId, actorId: req.user.id, actorRole: req.user.role,
      action: "student_face_enrolled", entityType: "student_face", entityId: result.faceRecordId,
      metadata: { studentId: String(result.studentId), enrollmentStatus: result.enrollmentStatus },
    }).catch((error) => console.error("[Audit] face enrollment event could not be saved:", error.message));

    return res.status(201).json({
      success: true,
      message: "Face enrollment completed",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const identifyStudentByFaceController = async (req, res, next) => {
  try {
    const { descriptor } = req.body;

    if (!Array.isArray(descriptor)) {
      return res.status(400).json({
        success: false,
        message: "Face descriptor is required",
      });
    }

    const result = await findMatchingStudent({
      schoolId: req.user.schoolId,
      descriptor,
    });

    if (!result.matched) {
      return res.status(404).json({
        success: false,
        message: "No matching enrolled student found",
        data: {
          matched: false,
        },
      });
    }

    if (req.user.role === "teacher") {
      const assigned = await TeacherClassAssignment.exists({
        schoolId: req.user.schoolId,
        teacherId: req.user.id,
        className: result.student.className,
        section: String(result.student.section || "").trim().toUpperCase(),
        academicYear: result.student.academicYear,
        active: true,
      });
      if (!assigned) {
        return res.status(403).json({ success: false, message: "Recognized student is outside your assigned classes" });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Possible face match found. Confirm identity before marking attendance.",
      data: {
        matched: true,
        student: result.student,
        distance: result.distance,
        attendanceMarked: false,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFaceEnrollmentStatusesController,
  validateFaceEnrollmentController,
  enrollStudentFaceController,
  identifyStudentByFaceController,
};
