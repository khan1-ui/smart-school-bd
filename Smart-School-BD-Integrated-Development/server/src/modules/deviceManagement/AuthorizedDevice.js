
const mongoose = require("mongoose");

const authorizedDeviceSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },

    deviceName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    deviceTokenHash: {
      type: String,
      default: null,
      select: false,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "revoked"],
      default: "pending",
      required: true,
    },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

authorizedDeviceSchema.index({
  schoolId: 1,
  status: 1,
});

module.exports = mongoose.model(
  "AuthorizedDevice",
  authorizedDeviceSchema
);
