
const mongoose = require("mongoose");

const attendanceSessionSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },

    className: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },

    section: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
      maxlength: 20,
    },

    academicYear: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{4}(-\d{4})?$/,
    },

    date: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "in_progress",
        "submitted",
        "finalized",
        "returned",
      ],
      default: "in_progress",
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    finalizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    finalizedAt: {
      type: Date,
      default: null,
    },

    returnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    returnedAt: {
      type: Date,
      default: null,
    },

    returnReason: {
      type: String,
      default: null,
      maxlength: 500,
    },

    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
    attendanceWriteLock: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// একই স্কুল, ক্লাস, সেকশন, শিক্ষাবর্ষ ও দিনে
// একটিই attendance session থাকবে।
attendanceSessionSchema.index(
  {
    schoolId: 1,
    className: 1,
    section: 1,
    academicYear: 1,
    date: 1,
  },
  { unique: true }
);

// School-level monitoring ও daily status lookup।
attendanceSessionSchema.index({
  schoolId: 1,
  date: 1,
  status: 1,
});

module.exports = mongoose.model(
  "AttendanceSession",
  attendanceSessionSchema
);
