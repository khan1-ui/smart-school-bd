const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  className: { type: String, required: true, trim: true, maxlength: 30 },
  section: { type: String, trim: true, uppercase: true, default: "", maxlength: 20 },
  academicYear: { type: String, required: true, match: /^\d{4}(-\d{4})?$/ },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true, versionKey: false });

schema.index({ schoolId: 1, teacherId: 1, className: 1, section: 1, academicYear: 1 }, { unique: true });
module.exports = mongoose.model("TeacherClassAssignment", schema);
