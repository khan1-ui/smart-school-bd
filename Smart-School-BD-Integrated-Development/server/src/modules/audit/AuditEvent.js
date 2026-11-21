const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  actorRole: { type: String, enum: ["school_admin", "teacher", "central_office"], required: true },
  action: { type: String, required: true, maxlength: 80, index: true },
  entityType: { type: String, required: true, maxlength: 60 },
  entityId: { type: String, required: true, maxlength: 80 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false, strict: true });
schema.index({ schoolId: 1, createdAt: -1 });
module.exports = mongoose.model("AuditEvent", schema);
