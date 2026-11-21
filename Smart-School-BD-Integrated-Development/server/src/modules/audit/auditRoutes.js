const router = require("express").Router();
const { authenticate } = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/authorizeRoles");
const { listSchoolAuditEvents } = require("./auditController");
router.use(authenticate, authorizeRoles("school_admin"));
router.get("/", listSchoolAuditEvents);
module.exports = router;
