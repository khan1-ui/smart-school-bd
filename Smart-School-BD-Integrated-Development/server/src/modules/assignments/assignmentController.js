const mongoose = require("mongoose");
const Assignment = require("./TeacherClassAssignment");
const User = require("../users/User");
const Student = require("../students/Student");
const { recordAuditEvent } = require("../audit/auditService");

const listAssignments = async (req, res, next) => {
  try {
    const filter = { schoolId: req.user.schoolId, active: true };
    if (req.user.role === "teacher") filter.teacherId = req.user.id;
    const rows = await Assignment.find(filter)
      .populate("teacherId", "name email designation indexNumber teacherCode")
      .sort({ className: 1, section: 1 }).lean();
    res.json({ success: true, data: { assignments: rows } });
  } catch (error) { next(error); }
};

const createAssignment = async (req, res, next) => {
  try {
    const { teacherId, className, section = "", academicYear } = req.body;
    if (!mongoose.isValidObjectId(teacherId) || typeof className !== "string" ||
        !className.trim() || typeof section !== "string" ||
        typeof academicYear !== "string" || !/^\d{4}(-\d{4})?$/.test(academicYear)) {
      return res.status(400).json({ success: false, message: "Valid teacher, class, section and academic year are required" });
    }
    const teacher = await User.findOne({ _id: teacherId, schoolId: req.user.schoolId, role: "teacher", status: "active" }).select("_id");
    if (!teacher) return res.status(404).json({ success: false, message: "Active teacher not found in this school" });
    const hasStudents = await Student.exists({ schoolId: req.user.schoolId, className: className.trim(), section: section.trim().toUpperCase(), academicYear, status: "active" });
    if (!hasStudents) return res.status(409).json({ success: false, message: "No active students exist in this class, section and academic year" });
    const assignment = await Assignment.findOneAndUpdate(
      { schoolId: req.user.schoolId, teacherId, className: className.trim(), section: section.trim().toUpperCase(), academicYear },
      { $set: { active: true, assignedBy: req.user.id } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    await recordAuditEvent({
      schoolId: req.user.schoolId, actorId: req.user.id, actorRole: req.user.role,
      action: "teacher_class_assigned", entityType: "teacher_class_assignment", entityId: assignment._id,
      metadata: { teacherId: String(teacherId), className: assignment.className, section: assignment.section, academicYear },
    }).catch((error) => console.error("[Audit] assignment event could not be saved:", error.message));
    res.status(201).json({ success: true, data: { assignment } });
  } catch (error) { next(error); }
};

const revokeAssignment = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid assignment ID" });
    const row = await Assignment.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.user.schoolId, active: true },
      { $set: { active: false } }, { new: true }
    );
    if (!row) return res.status(404).json({ success: false, message: "Active assignment not found" });
    await recordAuditEvent({
      schoolId: req.user.schoolId, actorId: req.user.id, actorRole: req.user.role,
      action: "teacher_class_assignment_revoked", entityType: "teacher_class_assignment", entityId: row._id,
      metadata: { teacherId: String(row.teacherId), className: row.className, section: row.section, academicYear: row.academicYear },
    }).catch((error) => console.error("[Audit] assignment revoke event could not be saved:", error.message));
    res.json({ success: true, data: { assignment: row } });
  } catch (error) { next(error); }
};

module.exports = { listAssignments, createAssignment, revokeAssignment };
