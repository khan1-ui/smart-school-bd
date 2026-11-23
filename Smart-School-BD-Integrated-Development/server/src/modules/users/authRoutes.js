const express = require("express");
const { login, me, refresh, logout, teacherRegister, pendingTeachers, activeTeachers, reviewTeacher } = require("./authController");
const { authenticate } = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/authorizeRoles");
const { teacherRegistrationLimiter, loginLimiter } = require("../../middlewares/registrationRateLimit");

const router = express.Router();
router.post("/login", loginLimiter, login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", authenticate, me);
router.post("/teacher-register", teacherRegistrationLimiter, teacherRegister);
router.get("/teachers/pending", authenticate, authorizeRoles("school_admin"), pendingTeachers);
router.get("/teachers/active", authenticate, authorizeRoles("school_admin"), activeTeachers);
router.patch("/teachers/:id/review", authenticate, authorizeRoles("school_admin"), reviewTeacher);

module.exports = router;
