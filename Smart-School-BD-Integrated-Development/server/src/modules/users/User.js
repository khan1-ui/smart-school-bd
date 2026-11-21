const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: function () { return this.role !== "central_office"; },
      index: true,
    },
    name: {
      type: String,
      required: [true, "User name is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
      select: false,
    },
    role: {
      type: String,
      enum: ["school_admin", "teacher", "central_office"],
      required: true,
      default: "teacher",
    },
    status: {
      type: String,
      enum: ["pending", "active", "disabled", "rejected"],
      default: "pending",
      index: true,
    },
    phone: { type: String, trim: true, default: "", maxlength: 20 },
    designation: { type: String, trim: true, default: "", maxlength: 100 },
    indexNumber: { type: String, trim: true, default: "", maxlength: 40 },
    teacherCode: { type: String, trim: true, uppercase: true, default: "", maxlength: 40 },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, default: "", maxlength: 500 },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

// School email uniqueness. Central-office emails are globally unique via a partial index.
userSchema.index({ schoolId: 1, email: 1 }, { unique: true });
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { role: "central_office" } }
);
userSchema.index(
  { schoolId: 1, indexNumber: 1 },
  { unique: true, partialFilterExpression: { indexNumber: { $type: "string", $gt: "" } } }
);
userSchema.index(
  { schoolId: 1, teacherCode: 1 },
  { unique: true, partialFilterExpression: { teacherCode: { $type: "string", $gt: "" } } }
);

module.exports = mongoose.model("User", userSchema);
