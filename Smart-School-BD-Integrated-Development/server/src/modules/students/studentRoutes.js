
const express = require("express");

const { authenticate } = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/authorizeRoles");

const {
  createStudentController,
  getStudentsController,
  getStudentByIdController,
  updateStudentController,
  deleteStudentController,
} = require("./studentController");

const router = express.Router();

// All student routes require authentication.
router.use(authenticate);

// List students
router.get(
  "/",
  authorizeRoles("school_admin", "teacher"),
  getStudentsController
);

// Create a student
router.post(
  "/",
  authorizeRoles("school_admin"),
  createStudentController
);

// Get one student
router.get(
  "/:id",
  authorizeRoles("school_admin", "teacher"),
  getStudentByIdController
);

// Update a student
router.patch(
  "/:id",
  authorizeRoles("school_admin"),
  updateStudentController
);

// Mark a student inactive
router.delete(
  "/:id",
  authorizeRoles("school_admin"),
  deleteStudentController
);

module.exports = router;
