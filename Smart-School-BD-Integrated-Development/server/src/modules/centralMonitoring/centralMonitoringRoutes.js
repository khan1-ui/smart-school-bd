const router = require("express").Router();
const { authenticate } = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/authorizeRoles");
const { overview, schoolDetail, auditEvents } = require("./centralMonitoringController");
router.use(authenticate, authorizeRoles("central_office"));
router.get("/overview", overview);
router.get("/audit", auditEvents);
router.get("/schools/:schoolId", schoolDetail);
module.exports = router;
