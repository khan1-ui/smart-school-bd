
const mongoose = require("mongoose");

const studentFaceSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School ID is required"],
      index: true,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student ID is required"],
    },

    // New enrollments use authenticated encryption at rest.
    encryptedDescriptor: { type: String, select: false },

    // Legacy plaintext field: read only during migration; never write new values here.
    descriptor: {
      type: [Number],
      required: false,
      default: undefined,
      validate: {
        validator(value) {
          if (value === undefined || value === null) return true;
          return (
            Array.isArray(value) &&
            value.length === 128 &&
            value.every(
              (number) =>
                typeof number === "number" &&
                Number.isFinite(number)
            )
          );
        },
        message: "Face descriptor must contain 128 finite numbers",
      },
      select: false,
    },

    enrollmentStatus: {
      type: String,
      enum: ["pending", "active", "revoked"],
      default: "pending",
      required: true,
    },

    // অনুমতি যাচাইয়ের রেফারেন্স; raw consent document নয়
    consentStatus: {
      type: String,
      enum: ["pending", "granted", "revoked"],
      default: "pending",
      required: true,
    },

    consentRecordedAt: {
      type: Date,
      default: null,
    },

    enrolledAt: {
      type: Date,
      default: null,
    },

    enrolledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// একটি স্কুলে একজন শিক্ষার্থীর জন্য একটি face enrollment record।
studentFaceSchema.index(
  { schoolId: 1, studentId: 1 },
  { unique: true }
);
studentFaceSchema.index({ schoolId: 1, enrollmentStatus: 1, consentStatus: 1 });

const StudentFace = mongoose.model(
  "StudentFace",
  studentFaceSchema
);

module.exports = StudentFace;
