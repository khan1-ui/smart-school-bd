
const mongoose = require("mongoose");

const Student = require("../students/Student");
const StudentFace = require("./StudentFace");
const User = require("../users/User");
const {
  validateConsentRecord,
} = require("./faceConsentService");
const { encryptDescriptor, decryptDescriptor } = require("./descriptorCrypto");

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

const validateFaceEnrollment = async ({
  schoolId,
  userId,
  role,
  studentId,
}) => {
  if (role !== "school_admin") {
    throw new AppError(
      "Only a school administrator can authorize face enrollment",
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

  const { student, consentId } = await validateConsentRecord({
    schoolId,
    userId,
    role,
    studentId,
  });

  const existingFace = await StudentFace.findOne({
    schoolId,
    studentId,
  })
    .select("_id enrollmentStatus consentStatus")
    .lean();

  if (existingFace && existingFace.enrollmentStatus !== "revoked") {
    throw new AppError(
      "A face enrollment record already exists for this student",
      409
    );
  }

  return {
    student,
    consentId,
    authorizedBy: userId,
    enrollmentAllowed: true,
  };
};

const enrollStudentFace = async ({
  schoolId,
  userId,
  role,
  studentId,
  descriptor,
}) => {
  // Enrollment-এর আগে সব অনুমতি আবার যাচাই
  const validation = await validateFaceEnrollment({
    schoolId,
    userId,
    role,
    studentId,
  });

  // Descriptor-এর কাঠামো যাচাই
  if (
    !Array.isArray(descriptor) ||
    descriptor.length !== 128 ||
    !descriptor.every(
      (value) =>
        typeof value === "number" &&
        Number.isFinite(value)
    )
  ) {
    throw new AppError(
      "Face descriptor must contain exactly 128 finite numbers",
      400
    );
  }

  const encryptedDescriptor = encryptDescriptor(descriptor);
  const existingRevokedFace = await StudentFace.findOne({
    schoolId, studentId: validation.student._id, enrollmentStatus: "revoked",
  }).select("_id").lean();

  const faceRecord = existingRevokedFace
    ? await StudentFace.findOneAndUpdate(
        { _id: existingRevokedFace._id, schoolId, enrollmentStatus: "revoked" },
        { $set: {
          encryptedDescriptor,
          enrollmentStatus: "active",
          consentStatus: "granted",
          consentRecordedAt: new Date(),
          enrolledAt: new Date(),
          enrolledBy: userId,
        }, $unset: { descriptor: "" } },
        { new: true, runValidators: true }
      )
    : await StudentFace.create({
        schoolId,
        studentId: validation.student._id,
        encryptedDescriptor,
        enrollmentStatus: "active",
        consentStatus: "granted",
        consentRecordedAt: new Date(),
        enrolledAt: new Date(),
        enrolledBy: userId,
      });

  return {
    studentId: validation.student._id,
    admissionNumber: validation.student.admissionNumber,
    faceRecordId: faceRecord._id,
    enrollmentStatus: faceRecord.enrollmentStatus,
  };
};

const findMatchingStudent = async ({
  schoolId,
  descriptor,
  threshold = 0.60,
}) => {
  if (!mongoose.isValidObjectId(schoolId)) {
    throw new AppError("Invalid school ID", 400);
  }

  if (
    !Array.isArray(descriptor) ||
    descriptor.length !== 128 ||
    !descriptor.every(
      (value) =>
        typeof value === "number" &&
        Number.isFinite(value)
    )
  ) {
    throw new AppError(
      "Face descriptor must contain exactly 128 finite numbers",
      400
    );
  }

  if (
    typeof threshold !== "number" ||
    !Number.isFinite(threshold) ||
    threshold <= 0 ||
    threshold > 1
  ) {
    throw new AppError("Invalid matching threshold", 400);
  }

  const enrolledFaces = await StudentFace.find({
    schoolId,
    enrollmentStatus: "active",
    consentStatus: "granted",
  })
    .select("+encryptedDescriptor +descriptor studentId")
    .lean();

  let bestMatch = null;
  let bestDistance = Infinity;

  for (const face of enrolledFaces) {
    let storedDescriptor;
    try {
      // New encrypted data first. Legacy plaintext records are supported only
      // to allow a controlled migration; new enrollment never writes plaintext.
      storedDescriptor = face.encryptedDescriptor
        ? decryptDescriptor(face.encryptedDescriptor)
        : face.descriptor;
    } catch {
      // Fail closed: unreadable or unauthenticated biometric data is not matched.
      continue;
    }

    if (!Array.isArray(storedDescriptor) ||
        storedDescriptor.length !== 128 ||
        !storedDescriptor.every(Number.isFinite)) continue;

    let sum = 0;
    for (let i = 0; i < 128; i += 1) {
      const delta = descriptor[i] - storedDescriptor[i];
      sum += delta * delta;
    }
    const distance = Math.sqrt(sum);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = face;
    }
  }

  if (!bestMatch || bestDistance > threshold) {
    return {
      matched: false,
      student: null,
      distance: null,
    };
  }

  const student = await Student.findOne({
    _id: bestMatch.studentId,
    schoolId,
    status: "active",
  })
    .select(
      "_id admissionNumber name className section rollNumber academicYear"
    )
    .lean();

  if (!student) {
    return {
      matched: false,
      student: null,
      distance: null,
    };
  }

  return {
    matched: true,
    student,
    distance: Number(bestDistance.toFixed(4)),
  };
};

module.exports = {
  AppError,
  validateFaceEnrollment,
  enrollStudentFace,
  findMatchingStudent,
};
