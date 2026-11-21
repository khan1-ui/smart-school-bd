
const mongoose = require("mongoose");

const schoolSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "School name is required"],
      trim: true,
      minlength: [3, "School name must be at least 3 characters"],
      maxlength: [150, "School name cannot exceed 150 characters"],
    },

    schoolCode: {
      type: String,
      required: [true, "School code is required"],
      trim: true,
      uppercase: true,
      minlength: 3,
      maxlength: 30,
      match: [
        /^[A-Z0-9-]+$/,
        "School code can contain only letters, numbers and hyphens",
      ],
    },

    institutionType: {
      type: String,
      enum: ["government", "private"],
      required: [true, "Institution type is required"],
    },

    address: {
      type: String,
      required: [true, "School address is required"],
      trim: true,
      maxlength: 300,
    },

    division: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    district: {
      type: String,
      required: [true, "District is required"],
      trim: true,
      maxlength: 100,
    },

    upazila: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    principalName: {
      type: String,
      trim: true,
      default: "",
      minlength: 2,
      maxlength: 100,
    },

    principalDesignation: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    principalIndexNumber: {
      type: String,
      trim: true,
      default: "",
      maxlength: 40,
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

    teacherAccountCount: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },

    contactPhone: {
      type: String,
      trim: true,
      default: "",
      maxlength: 20,
    },

    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
      maxlength: 254,
    },

    timezone: {
      type: String,
      default: "Asia/Dhaka",
      immutable: true,
    },

    status: {
      type: String,
      enum: ["pending", "active", "suspended"],
      default: "pending",
      
    },

    settings: {
      attendanceStartTime: {
        type: String,
        default: "09:00",
        match: /^([01]\d|2[0-3]):[0-5]\d$/,
      },

      lateAfterMinutes: {
        type: Number,
        default: 10,
        min: 0,
        max: 180,
      },

      faceAttendanceEnabled: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// School code lookup
schoolSchema.index({ schoolCode: 1 }, { unique: true });

const School = mongoose.model("School", schoolSchema);

module.exports = School;
