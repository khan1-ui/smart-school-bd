
const express = require("express");
const { rateLimit } = require("express-rate-limit");
const { authenticate } = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/authorizeRoles");
const {
  createAttendanceSessionController,
  listSchoolAttendanceSessionsController,
  validateAttendanceSessionController,
  submitAttendanceSessionController,
  returnAttendanceSessionController,
  finalizeAttendanceSessionController,
  reopenReturnedAttendanceSessionController
} = require("./attendanceSessionController");
const {
  createAttendanceController,
  getClassAttendanceReportController,
  markClassAttendanceController,
  markFaceAttendanceController,
} = require("./attendanceController");


const router = express.Router();
const faceAttendanceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many face attendance attempts. Try again later." },
});

// সব Attendance route-এ লগইন বাধ্যতামূলক।
router.use(authenticate);

router.get(
  "/report",
  authorizeRoles("school_admin", "teacher"),
  getClassAttendanceReportController
);
router.post(
  "/class",
  authorizeRoles("school_admin", "teacher"),
  markClassAttendanceController
);
// Teacher attendance is restricted to the teacher's active class assignment.
router.post(
  "/",
  authorizeRoles("school_admin", "teacher"),
  createAttendanceController
);

router.post(
  "/face",
  faceAttendanceLimiter,
  authorizeRoles("school_admin", "teacher"),
  markFaceAttendanceController
);
// School admin review queue.
router.get("/sessions", authorizeRoles("school_admin", "teacher"), listSchoolAttendanceSessionsController);

// Create a session for a class attendance day.
router.post(
  "/sessions",
  authorizeRoles("school_admin", "teacher"),
  createAttendanceSessionController
);

// Validate completeness before submission.
router.get(
  "/sessions/:sessionId/validation",
  authorizeRoles("school_admin"),
  validateAttendanceSessionController
);
router.post(
  "/sessions/:sessionId/submit",
  authorizeRoles("school_admin"),
  submitAttendanceSessionController
);

router.post(
  "/sessions/:sessionId/return",
  authorizeRoles("school_admin"),
  returnAttendanceSessionController
);

router.post(
  "/sessions/:sessionId/finalize",
  authorizeRoles("school_admin"),
  finalizeAttendanceSessionController
);
router.post(
  "/sessions/:sessionId/reopen",
  authorizeRoles("school_admin"),
  reopenReturnedAttendanceSessionController
);
module.exports = router;
