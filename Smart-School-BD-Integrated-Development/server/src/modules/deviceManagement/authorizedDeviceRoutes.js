const express = require("express");

const {
  authenticate,
} = require("../../middlewares/authMiddleware");

const {
  authorizeRoles,
} = require("../../middlewares/authorizeRoles");
const {
  deviceAuthMiddleware,
} = require("./deviceAuthMiddleware");

const {
  registerDeviceController,
  getDevicesController,
  approveDeviceController,
  revokeDeviceController,
} = require("./authorizedDeviceController");

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("school_admin"));

router.post("/register", registerDeviceController);
router.get("/", getDevicesController);
router.patch("/:deviceId/approve", approveDeviceController);
router.patch("/:deviceId/revoke", revokeDeviceController);
router.get("/verify", deviceAuthMiddleware, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Authorized device verified successfully",
    data: {
      deviceId: req.authorizedDevice.id,
      deviceName: req.authorizedDevice.deviceName,
      status: "approved",
    },
  });
});

module.exports = router;
