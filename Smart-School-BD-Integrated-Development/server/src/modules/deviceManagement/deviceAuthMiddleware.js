
const crypto = require("crypto");
const AuthorizedDevice = require("./AuthorizedDevice");

const deviceAuthMiddleware = async (req, res, next) => {
  try {
    const deviceToken = req.get("X-Device-Token");

    if (
      typeof deviceToken !== "string" ||
      !/^[a-f\d]{64}$/i.test(deviceToken)
    ) {
      return res.status(401).json({
        success: false,
        message: "Valid device token is required",
      });
    }

    if (!req.user?.schoolId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated school context is required",
      });
    }

    const deviceTokenHash = crypto
      .createHash("sha256")
      .update(deviceToken)
      .digest("hex");

    const device = await AuthorizedDevice.findOne({
      schoolId: req.user.schoolId,
      deviceTokenHash,
      status: "approved",
    });

    if (!device) {
      return res.status(403).json({
        success: false,
        message: "Device is not approved for this school",
      });
    }

    req.authorizedDevice = {
      id: device._id,
      deviceName: device.deviceName,
    };

    device.lastUsedAt = new Date();
    await device.save();

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { deviceAuthMiddleware };
