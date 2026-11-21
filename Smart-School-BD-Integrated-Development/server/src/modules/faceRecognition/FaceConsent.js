
const mongoose = require("mongoose");

const faceConsentSchema = new mongoose.Schema(
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

    // সম্মতি কে দিয়েছেন: guardian বা adult student
    consentGivenBy: {
      type: String,
      enum: ["guardian", "adult_student"],
      required: [true, "Consent giver type is required"],
    },

    guardianName: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    relationshipToStudent: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "",
    },

    // সম্মতি কীভাবে নথিভুক্ত হয়েছে
    consentMethod: {
      type: String,
      enum: ["paper_form", "verified_digital"],
      required: [true, "Consent method is required"],
    },

    // স্কুলে রাখা সম্মতিপত্রের নিরাপদ রেফারেন্স
    evidenceReference: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    consentStatus: {
      type: String,
      enum: ["pending", "granted", "revoked"],
      default: "pending",
      required: true,
    },

    purpose: {
      type: String,
      default: "School attendance using face recognition",
      maxlength: 200,
    },

    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recording administrator is required"],
    },

    grantedAt: {
      type: Date,
      default: null,
    },

    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// প্রতিটি স্কুলে একজন শিক্ষার্থীর জন্য একটি বর্তমান সম্মতি রেকর্ড।
faceConsentSchema.index(
  { schoolId: 1, studentId: 1 },
  { unique: true }
);

faceConsentSchema.index({
  schoolId: 1,
  consentStatus: 1,
});

const FaceConsent = mongoose.model(
  "FaceConsent",
  faceConsentSchema
);

module.exports = FaceConsent;
