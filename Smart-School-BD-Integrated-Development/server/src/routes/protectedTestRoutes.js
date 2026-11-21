
const express = require("express");
const { authenticate } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/authorizeRoles");

const router = express.Router();

router.get("/me", authenticate, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Authentication successful",
    data: {
      userId: req.user.id,
      schoolId: req.user.schoolId,
      role: req.user.role,
    },
  });
});
router.get(
  "/admin-only",
  authenticate,
  authorizeRoles("school_admin"),
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "Admin authorization successful",
      data: {
        userId: req.user.id,
        schoolId: req.user.schoolId,
        role: req.user.role,
      },
    });
  }
);

module.exports = router;
