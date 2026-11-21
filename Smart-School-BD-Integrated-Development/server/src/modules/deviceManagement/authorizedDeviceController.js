
const crypto = require("crypto");
const AuthorizedDevice = require("./AuthorizedDevice");

const registerDeviceController = async (req, res, next) => {
  try {
    const { deviceName } = req.body;

    if (
      typeof deviceName !== "string" ||
      !deviceName.trim() ||
      deviceName.trim().length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid device name is required",
      });
    }

    const deviceToken = crypto.randomBytes(32).toString("hex");

    const device = await AuthorizedDevice.create({
      schoolId: req.user.schoolId,
      deviceName: deviceName.trim(),
      deviceTokenHash: crypto
        .createHash("sha256")
        .update(deviceToken)
        .digest("hex"),
      status: "pending",
      requestedBy: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Device registered and awaiting approval",
      data: {
        deviceId: device._id,
        deviceName: device.deviceName,
        status: device.status,
        deviceToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getDevicesController = async (req, res, next) => {
  try {
    const devices = await AuthorizedDevice.find({
      schoolId: req.user.schoolId,
    })
      .select("-deviceTokenHash")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { devices },
    });
  } catch (error) {
    next(error);
  }
};

const approveDeviceController = async (req, res, next) => {
  try {
    const { deviceId } = req.params;

    if (!/^[a-f\d]{24}$/i.test(deviceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid device ID",
      });
    }

    const device = await AuthorizedDevice.findOneAndUpdate(
      {
        _id: deviceId,
        schoolId: req.user.schoolId,
        status: "pending",
      },
      {
        $set: {
          status: "approved",
          approvedBy: req.user.id,
          approvedAt: new Date(),
        },
      },
      { returnDocument: "after", runValidators: true }
    ).select("-deviceTokenHash");

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Pending device not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Device approved successfully",
      data: { device },
    });
  } catch (error) {
    next(error);
  }
};

const revokeDeviceController = async (req, res, next) => {
  try {
    const { deviceId } = req.params;

    if (!/^[a-f\d]{24}$/i.test(deviceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid device ID",
      });
    }

    const device = await AuthorizedDevice.findOneAndUpdate(
      {
        _id: deviceId,
        schoolId: req.user.schoolId,
        status: "approved",
      },
      {
        $set: { status: "revoked" },
      },
      { returnDocument: "after", runValidators: true }
    ).select("-deviceTokenHash");

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Approved device not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Device access revoked successfully",
      data: { device },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerDeviceController,
  getDevicesController,
  approveDeviceController,
  revokeDeviceController,
};
