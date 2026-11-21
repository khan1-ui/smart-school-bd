
const mongoose = require("mongoose");

const Student = require("../students/Student");
const FaceConsent = require("./FaceConsent");
const User = require("../users/User");

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

const validateConsentRecord = async ({
  schoolId,
  userId,
  role,
  studentId,
}) => {
  if (role !== "school_admin") {
    throw new AppError(
      "Only a school administrator can verify consent records",
      403
    );
  }

  if (
    !mongoose.isValidObjectId(schoolId) ||
    !mongoose.isValidObjectId(userId) ||
    !mongoose.isValidObjectId(studentId)
  ) {
    throw new AppError(
      "Invalid school, user or student ID",
      400
    );
  }

  const admin = await User.findOne({
    _id: userId,
    schoolId,
    role: "school_admin",
    status: "active",
  })
    .select("_id")
    .lean();

  if (!admin) {
    throw new AppError(
      "Active school administrator not found",
      403
    );
  }

  const student = await Student.findOne({
    _id: studentId,
    schoolId,
    status: "active",
  })
    .select("_id schoolId admissionNumber name status")
    .lean();

  if (!student) {
    throw new AppError(
      "Active student not found in this school",
      404
    );
  }

  const consent = await FaceConsent.findOne({
    schoolId,
    studentId,
  }).lean();

  if (!consent) {
    throw new AppError(
      "Face recognition consent record not found",
      404
    );
  }

  if (consent.consentStatus !== "granted") {
    throw new AppError(
      "Valid face recognition consent is required",
      403
    );
  }

  if (
    !consent.grantedAt ||
    !consent.recordedBy ||
    !consent.consentMethod ||
    !consent.consentGivenBy
  ) {
    throw new AppError(
      "Consent record is incomplete",
      403
    );
  }

  if (
    consent.consentGivenBy === "guardian" &&
    (
      !consent.guardianName ||
      !consent.relationshipToStudent
    )
  ) {
    throw new AppError(
      "Guardian details are required",
      403
    );
  }

  return {
    student,
    consentId: consent._id,
    consentStatus: consent.consentStatus,
  };
};

module.exports = {
  AppError,
  validateConsentRecord,
};
