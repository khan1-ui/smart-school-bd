
const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School ID is required"],
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student ID is required"],
    },

    className: {
      type: String,
      required: [true, "Class is required"],
      trim: true,
      maxlength: [30, "Class name cannot exceed 30 characters"],
    },

    section: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
      maxlength: [20, "Section cannot exceed 20 characters"],
    },

    academicYear: {
      type: String,
      required: [true, "Academic year is required"],
      trim: true,
      match: [
        /^\d{4}(-\d{4})?$/,
        "Invalid academic year",
      ],
    },

    date: {
      type: Date,
      required: [true, "Attendance date is required"],
    },

    status: {
      type: String,
      enum: ["present", "absent", "late"],
      required: [true, "Attendance status is required"],
    },

    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Marked by user is required"],
    },

    method: {
      type: String,
      enum: ["manual", "face_recognition"],
      default: "manual",
    },

    remark: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// একজন শিক্ষার্থীর একই স্কুলে একই দিনে
// একই শিক্ষাবর্ষে একটির বেশি রেকর্ড হবে না।
attendanceSchema.index(
  { schoolId: 1, studentId: 1, academicYear: 1, date: 1 },
  { unique: true }
);

// ক্লাসভিত্তিক দৈনিক উপস্থিতির তালিকা দ্রুত পাওয়ার জন্য।
attendanceSchema.index({
  schoolId: 1,
  className: 1,
  section: 1,
  academicYear: 1,
  date: 1,
});

const Attendance = mongoose.model("Attendance", attendanceSchema);

module.exports = Attendance;
