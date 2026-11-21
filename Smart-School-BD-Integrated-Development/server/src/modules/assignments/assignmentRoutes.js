const router = require("express").Router();
const { authenticate } = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/authorizeRoles");
const { listAssignments, createAssignment, revokeAssignment } = require("./assignmentController");
router.use(authenticate);
router.get("/", authorizeRoles("school_admin", "teacher"), listAssignments);
router.post("/", authorizeRoles("school_admin"), createAssignment);
router.delete("/:id", authorizeRoles("school_admin"), revokeAssignment);
module.exports = router;
