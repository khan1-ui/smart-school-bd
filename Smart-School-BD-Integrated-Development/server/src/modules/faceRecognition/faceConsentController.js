
const mongoose = require("mongoose");
const Student = require("../students/Student");
const FaceConsent = require("./FaceConsent");
const User = require("../users/User");
const StudentFace = require("./StudentFace");
const { recordAuditEvent } = require("../audit/auditService");

const createFaceConsentController = async (req, res, next) => {
  try {
    const {
      studentId,
      consentGivenBy,
      guardianName,
      relationshipToStudent,
      consentMethod,
      evidenceReference,
    } = req.body;

    if (req.user.role !== "school_admin") {
      return res.status(403).json({
        success: false,
        message: "Only school administrators can record consent",
      });
    }

    if (
      !mongoose.isValidObjectId(req.user.schoolId) ||
      !mongoose.isValidObjectId(req.user.id) ||
      !mongoose.isValidObjectId(studentId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid school, user or student ID",
      });
    }

    if (
      !["guardian", "adult_student"].includes(consentGivenBy) ||
      !["paper_form", "verified_digital"].includes(consentMethod)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid consent giver and consent method are required",
      });
    }

    if (
      consentGivenBy === "guardian" &&
      (
        typeof guardianName !== "string" ||
        !guardianName.trim() ||
        typeof relationshipToStudent !== "string" ||
        !relationshipToStudent.trim()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Guardian name and relationship are required",
      });
    }

    // Evidence must refer to a real, verified consent record.
    if (
      typeof evidenceReference !== "string" ||
      !evidenceReference.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Verified consent evidence reference is required",
      });
    }

    const [admin, student] = await Promise.all([
      User.findOne({
        _id: req.user.id,
        schoolId: req.user.schoolId,
        role: "school_admin",
        status: "active",
      }).select("_id").lean(),

      Student.findOne({
        _id: studentId,
        schoolId: req.user.schoolId,
        status: "active",
      }).select("_id").lean(),
    ]);

    if (!admin) {
      return res.status(403).json({
        success: false,
        message: "Active school administrator not found",
      });
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Active student not found in this school",
      });
    }

    const consentPayload = {
      consentGivenBy,
      guardianName: consentGivenBy === "guardian" ? guardianName.trim() : "",
      relationshipToStudent: consentGivenBy === "guardian" ? relationshipToStudent.trim() : "",
      consentMethod,
      evidenceReference: evidenceReference.trim(),
      consentStatus: "granted",
      recordedBy: admin._id,
      grantedAt: new Date(),
      revokedAt: null,
    };
    const existingConsent = await FaceConsent.findOne({ schoolId: req.user.schoolId, studentId: student._id }).select("consentStatus");
    let consent;
    if (existingConsent) {
      if (existingConsent.consentStatus !== "revoked") {
        return res.status(409).json({ success: false, message: "An active consent record already exists for this student" });
      }
      consent = await FaceConsent.findOneAndUpdate(
        { _id: existingConsent._id, schoolId: req.user.schoolId, consentStatus: "revoked" },
        { $set: consentPayload },
        { new: true, runValidators: true }
      );
    } else {
      consent = await FaceConsent.create({
        schoolId: req.user.schoolId,
        studentId: student._id,
        ...consentPayload,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Consent record created",
      data: {
        consentId: consent._id,
        studentId: consent.studentId,
        consentStatus: consent.consentStatus,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A consent record already exists for this student",
      });
    }

    next(error);
  }
};

const revokeFaceConsentController = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.studentId)) {
      return res.status(400).json({ success: false, message: "Invalid student ID" });
    }
    const consent = await FaceConsent.findOneAndUpdate(
      { schoolId: req.user.schoolId, studentId: req.params.studentId, consentStatus: "granted" },
      { $set: { consentStatus: "revoked", revokedAt: new Date() } },
      { new: true }
    );
    if (!consent) return res.status(404).json({ success: false, message: "Active consent record not found" });

    await StudentFace.updateOne(
      { schoolId: req.user.schoolId, studentId: req.params.studentId },
      { $set: { enrollmentStatus: "revoked", consentStatus: "revoked" }, $unset: { encryptedDescriptor: "", descriptor: "" } }
    );
    await recordAuditEvent({
      schoolId: req.user.schoolId, actorId: req.user.id, actorRole: req.user.role,
      action: "student_face_consent_revoked", entityType: "student_face_consent", entityId: consent._id,
      metadata: { studentId: String(req.params.studentId), biometricDescriptorDeleted: true },
    }).catch((error) => console.error("[Audit] consent revocation event could not be saved:", error.message));

    res.json({ success: true, message: "Consent revoked and stored face descriptor deleted" });
  } catch (error) { next(error); }
};

module.exports = {
  createFaceConsentController,
  revokeFaceConsentController,
};
