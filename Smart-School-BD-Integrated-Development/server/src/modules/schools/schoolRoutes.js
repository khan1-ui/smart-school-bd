const express = require("express");
const { authenticate } = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/authorizeRoles");
const { schoolRegistrationLimiter } = require("../../middlewares/registrationRateLimit");
const {
  registerSchool, getPendingSchools, reviewSchoolApplication,
  getCentralSchoolOptions, getCentralSchools,
} = require("./schoolController");

const router = express.Router();

router.post("/register", schoolRegistrationLimiter, registerSchool);
router.get("/pending", authenticate, authorizeRoles("central_office"), getPendingSchools);
router.get("/central/options", authenticate, authorizeRoles("central_office"), getCentralSchoolOptions);
router.get("/central/list", authenticate, authorizeRoles("central_office"), getCentralSchools);
router.patch("/:id/review", authenticate, authorizeRoles("central_office"), reviewSchoolApplication);

module.exports = router;
