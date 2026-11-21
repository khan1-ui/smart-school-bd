
const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    // School ownership: retain this for future expansion.
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School ID is required"],
    },

    admissionNumber: {
      type: String,
      required: [true, "Admission number is required"],
      trim: true,
      uppercase: true,
      minlength: [1, "Admission number cannot be empty"],
      maxlength: [30, "Admission number cannot exceed 30 characters"],
    },

    name: {
      type: String,
      required: [true, "Student name is required"],
      trim: true,
      minlength: [2, "Student name must be at least 2 characters"],
      maxlength: [100, "Student name cannot exceed 100 characters"],
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: undefined,
    },

    dateOfBirth: {
      type: Date,
      default: null,
      validate: {
        validator: (value) => !value || value <= new Date(),
        message: "Date of birth cannot be in the future",
      },
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

    rollNumber: {
      type: Number,
      required: [true, "Roll number is required"],
      min: [1, "Roll number must be at least 1"],
      max: [10000, "Roll number is too large"],
      validate: {
        validator: Number.isInteger,
        message: "Roll number must be an integer",
      },
    },

    academicYear: {
      type: String,
      required: [true, "Academic year is required"],
      trim: true,
      match: [
        /^\d{4}(-\d{4})?$/,
        "Use an academic year such as 2026 or 2026-2027",
      ],
    },

    guardianRelation: { type: String, enum: ["father", "mother", "other"], default: "father" },

    guardianName: {
      type: String,
      required: [true, "Guardian name is required"],
      trim: true,
      minlength: [2, "Guardian name must be at least 2 characters"],
      maxlength: [100, "Guardian name cannot exceed 100 characters"],
    },

    guardianPhone: {
      type: String,
      required: [true, "Guardian phone is required"],
      trim: true,
      minlength: [7, "Guardian phone is too short"],
      maxlength: [20, "Guardian phone cannot exceed 20 characters"],
    },

    address: {
      type: String,
      trim: true,
      default: "",
      maxlength: [300, "Address cannot exceed 300 characters"],
    },

    status: {
      type: String,
      enum: ["active", "inactive", "transferred", "graduated"],
      default: "active",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Admission number must be unique within a school.
studentSchema.index(
  { schoolId: 1, admissionNumber: 1 },
  { unique: true }
);

// Roll number must be unique within a class, section and academic year.
studentSchema.index(
  {
    schoolId: 1,
    academicYear: 1,
    className: 1,
    section: 1,
    rollNumber: 1,
  },
  { unique: true }
);

const Student = mongoose.model("Student", studentSchema);

module.exports = Student;
