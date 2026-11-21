
const express = require("express");
const { rateLimit } = require("express-rate-limit");

const { authenticate } = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/authorizeRoles");

const {
  getFaceEnrollmentStatusesController,
  validateFaceEnrollmentController,
  enrollStudentFaceController,
  identifyStudentByFaceController,
} = require("./faceRecognitionController");

const { createFaceConsentController, revokeFaceConsentController } = require("./faceConsentController");

const router = express.Router();
const faceOperationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many face operations. Please try again later." },
});

// সব Face API-তে authentication বাধ্যতামূলক
router.use(authenticate);

// School-scoped enrollment status; biometric descriptors are never returned.
router.get("/status", authorizeRoles("school_admin"), getFaceEnrollmentStatusesController);

// Consent
router.post(
  "/consent",
  authorizeRoles("school_admin"),
  createFaceConsentController
);
router.patch(
  "/consent/:studentId/revoke",
  authorizeRoles("school_admin"),
  revokeFaceConsentController
);

// Enrollment validation
router.post(
  "/enroll/validate",
  authorizeRoles("school_admin"),
  validateFaceEnrollmentController
);

// Save face enrollment
router.post(
  "/enroll",
  faceOperationLimiter,
  authorizeRoles("school_admin"),
  enrollStudentFaceController
);

// Identify a student from a face descriptor
router.post(
  "/identify",
  faceOperationLimiter,
  authorizeRoles("school_admin", "teacher"),
  identifyStudentByFaceController
);

module.exports = router;
