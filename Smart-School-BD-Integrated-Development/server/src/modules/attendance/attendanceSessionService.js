const mongoose = require("mongoose");
const AttendanceSession = require("./AttendanceSession");
const Student = require("../students/Student");
const Attendance = require("./Attendance");
const TeacherClassAssignment = require("../assignments/TeacherClassAssignment");
class AttendanceSessionError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "AttendanceSessionError";
    this.statusCode = statusCode;
  }
}

const validateObjectId = (value, message) => {
  if (!mongoose.isValidObjectId(value)) {
    throw new AttendanceSessionError(message, 400);
  }
};

const normalizeDate = (dateString) => {
  if (
    typeof dateString !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dateString)
  ) {
    throw new AttendanceSessionError(
      "Date must use YYYY-MM-DD format"
    );
  }

  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new AttendanceSessionError("Invalid attendance date");
  }

  return date;
};

const createAttendanceSession = async ({
  schoolId,
  userId,
  className,
  section = "",
  academicYear,
  date,
  role = "school_admin",
}) => {
  validateObjectId(schoolId, "Invalid school ID");
  validateObjectId(userId, "Invalid user ID");

  if (
    typeof className !== "string" ||
    !className.trim() ||
    typeof section !== "string" ||
    typeof academicYear !== "string" ||
    !/^\d{4}(-\d{4})?$/.test(academicYear)
  ) {
    throw new AttendanceSessionError(
      "Valid class, section and academic year are required"
    );
  }

  const normalizedClass = className.trim();
  const normalizedSection = section.trim().toUpperCase();
  const sessionDate = normalizeDate(date);

  if (role === "teacher") {
    const assigned = await TeacherClassAssignment.exists({
      schoolId, teacherId: userId, className: normalizedClass,
      section: normalizedSection, academicYear, active: true,
    });
    if (!assigned) throw new AttendanceSessionError("You are not assigned to this class and section", 403);
  }

  const studentExists = await Student.exists({
    schoolId,
    className: normalizedClass,
    section: normalizedSection,
    academicYear,
    status: "active",
  });

  if (!studentExists) {
    throw new AttendanceSessionError(
      "No active students found for this class and academic year",
      404
    );
  }

  try {
    return await AttendanceSession.create({
      schoolId,
      className: normalizedClass,
      section: normalizedSection,
      academicYear,
      date: sessionDate,
      createdBy: userId,
      status: "in_progress",
      lastActivityAt: new Date(),
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new AttendanceSessionError(
        "An attendance session already exists for this class and date",
        409
      );
    }

    throw error;
  }
};

const validateSessionForSubmission = async ({
  schoolId,
  sessionId,
}) => {
  validateObjectId(schoolId, "Invalid school ID");
  validateObjectId(sessionId, "Invalid attendance session ID");

  const session = await AttendanceSession.findOne({
    _id: sessionId,
    schoolId,
  });

  if (!session) {
    throw new AttendanceSessionError(
      "Attendance session not found",
      404
    );
  }

  if (session.status !== "in_progress") {
    throw new AttendanceSessionError(
      "Only an in-progress session can be submitted",
      409
    );
  }

  const activeStudents = await Student.find({
    schoolId,
    className: session.className,
    section: session.section,
    academicYear: session.academicYear,
    status: "active",
  })
    .select("_id")
    .lean();

  if (activeStudents.length === 0) {
    throw new AttendanceSessionError(
      "No active students found in this session",
      400
    );
  }

  const Attendance = require("./Attendance");

  const attendanceRecords = await Attendance.find({
    schoolId,
    className: session.className,
    section: session.section,
    academicYear: session.academicYear,
    date: session.date,
  })
    .select("studentId status")
    .lean();

  const attendanceByStudent = new Map(
    attendanceRecords.map((record) => [
      String(record.studentId),
      record.status,
    ])
  );

  const missingStudentIds = activeStudents
    .filter((student) => !attendanceByStudent.has(String(student._id)))
    .map((student) => String(student._id));

  return {
    sessionId: String(session._id),
    totalStudents: activeStudents.length,
    recordedStudents: activeStudents.length - missingStudentIds.length,
    missingCount: missingStudentIds.length,
    readyForSubmission: missingStudentIds.length === 0,
  };
};

const acquireAttendanceWriteLock = async ({ schoolId, sessionId }) => {
  validateObjectId(schoolId, "Invalid school ID");
  validateObjectId(sessionId, "Invalid attendance session ID");

  const session = await AttendanceSession.findOneAndUpdate(
    {
      _id: sessionId,
      schoolId,
      status: "in_progress",
      attendanceWriteLock: false,
    },
    {
      $set: {
        attendanceWriteLock: true,
        lastActivityAt: new Date(),
      },
    },
    {
      
      returnDocument: "after",
      runValidators: true,

    }
  );

  if (!session) {
    throw new AttendanceSessionError(
      "Attendance session is unavailable or another attendance operation is in progress",
      409
    );
  }

  return session;
};

const releaseAttendanceWriteLock = async ({ schoolId, sessionId }) => {
  await AttendanceSession.updateOne(
    {
      _id: sessionId,
      schoolId,
      attendanceWriteLock: true,
    },
    {
      $set: {
        attendanceWriteLock: false,
        lastActivityAt: new Date(),
      },
    }
  );
};


const returnAttendanceSession = async ({
  schoolId,
  userId,
  sessionId,
  returnReason,
}) => {
  validateObjectId(schoolId, "Invalid school ID");
  validateObjectId(userId, "Invalid user ID");
  validateObjectId(sessionId, "Invalid attendance session ID");

  if (
    typeof returnReason !== "string" ||
    !returnReason.trim() ||
    returnReason.trim().length > 500
  ) {
    throw new AttendanceSessionError(
      "A return reason of 1–500 characters is required"
    );
  }

  const session = await AttendanceSession.findOneAndUpdate(
    {
      _id: sessionId,
      schoolId,
      status: "submitted",
      attendanceWriteLock: false,
    },
    {
      $set: {
        status: "returned",
        returnedBy: userId,
        returnedAt: new Date(),
        returnReason: returnReason.trim(),
        lastActivityAt: new Date(),
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  );

  if (!session) {
    throw new AttendanceSessionError(
      "Only an unlocked submitted session can be returned",
      409
    );
  }

  return session;
};

const reopenReturnedAttendanceSession = async ({
  schoolId,
  userId,
  sessionId,
}) => {
  validateObjectId(schoolId, "Invalid school ID");
  validateObjectId(userId, "Invalid user ID");
  validateObjectId(sessionId, "Invalid attendance session ID");

  const session = await AttendanceSession.findOneAndUpdate(
    {
      _id: sessionId,
      schoolId,
      status: "returned",
      attendanceWriteLock: false,
    },
    {
      $set: {
        status: "in_progress",
        submittedBy: null,
        submittedAt: null,
        returnedBy: null,
        returnedAt: null,
        returnReason: null,
        lastActivityAt: new Date(),
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  );

  if (!session) {
    throw new AttendanceSessionError(
      "Only an unlocked returned session can be reopened",
      409
    );
  }

  return session;
};

const finalizeAttendanceSession = async ({
  schoolId,
  userId,
  sessionId,
}) => {
  validateObjectId(schoolId, "Invalid school ID");
  validateObjectId(userId, "Invalid user ID");
  validateObjectId(sessionId, "Invalid attendance session ID");

  const session = await AttendanceSession.findOneAndUpdate(
    {
      _id: sessionId,
      schoolId,
      status: "submitted",
      attendanceWriteLock: false,
    },
    {
      $set: {
        status: "finalized",
        finalizedBy: userId,
        finalizedAt: new Date(),
        lastActivityAt: new Date(),
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  );

  if (!session) {
    throw new AttendanceSessionError(
      "Only an unlocked submitted session can be finalized",
      409
    );
  }

  return session;
};

const submitAttendanceSession = async ({
  schoolId,
  userId,
  sessionId,
}) => {
  validateObjectId(schoolId, "Invalid school ID");
  validateObjectId(userId, "Invalid user ID");
  validateObjectId(sessionId, "Invalid attendance session ID");

  // প্রথমে Session আছে কি না যাচাই করি।
  const existingSession = await AttendanceSession.findOne({
    _id: sessionId,
    schoolId,
  }).select("_id status attendanceWriteLock");

  if (!existingSession) {
    throw new AttendanceSessionError(
      "Attendance session not found",
      404
    );
  }

  // Atomicভাবে write lock নেওয়ার চেষ্টা।
  await acquireAttendanceWriteLock({
    schoolId,
    sessionId,
  });

  try {
    // Lock নেওয়ার পরে আবার সব Attendance যাচাই।
    const validation = await validateSessionForSubmission({
      schoolId,
      sessionId,
    });

    if (!validation.readyForSubmission) {
      throw new AttendanceSessionError(
        `Attendance is incomplete: ${validation.missingCount} student records are missing`,
        409
      );
    }

    const submittedAt = new Date();

    const updatedSession = await AttendanceSession.findOneAndUpdate(
      {
        _id: sessionId,
        schoolId,
        status: "in_progress",
        attendanceWriteLock: true,
      },
      {
        $set: {
          status: "submitted",
          submittedBy: userId,
          submittedAt,
          lastActivityAt: submittedAt,
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    if (!updatedSession) {
      throw new AttendanceSessionError(
        "Session status changed before submission",
        409
      );
    }

    return {
      sessionId: String(updatedSession._id),
      status: updatedSession.status,
      submittedBy: String(updatedSession.submittedBy),
      submittedAt: updatedSession.submittedAt,
      totalStudents: validation.totalStudents,
      recordedStudents: validation.recordedStudents,
    };
  } finally {
    // সফল বা ব্যর্থ—দুই অবস্থাতেই lock ছাড়ার চেষ্টা।
    await releaseAttendanceWriteLock({
      schoolId,
      sessionId,
    });
  }
};


const listSchoolAttendanceSessions = async ({ schoolId, date, teacherId = null }) => {
  validateObjectId(schoolId, "Invalid school ID");
  const filter = { schoolId };
  if (date) filter.date = normalizeDate(date);
  if (teacherId) {
    validateObjectId(teacherId, "Invalid teacher ID");
    const assignments = await TeacherClassAssignment.find({ schoolId, teacherId, active: true })
      .select("className section academicYear").lean();
    if (!assignments.length) return [];
    filter.$or = assignments.map((a) => ({ className: a.className, section: a.section, academicYear: a.academicYear }));
  }
  const sessions = await AttendanceSession.find(filter)
    .populate("createdBy", "name")
    .populate("submittedBy", "name")
    .sort({ date: -1, className: 1, section: 1 }).lean();
  const enriched = await Promise.all(sessions.map(async (session) => {
    const validation = await validateSessionForSubmission({ schoolId, sessionId: session._id }).catch(() => null);
    return { ...session, validation };
  }));
  return enriched;
};

module.exports = {
  AttendanceSessionError,
  listSchoolAttendanceSessions,
  createAttendanceSession,
  validateSessionForSubmission,
  submitAttendanceSession,
  acquireAttendanceWriteLock,
  releaseAttendanceWriteLock,
  returnAttendanceSession,
  finalizeAttendanceSession,
  reopenReturnedAttendanceSession,
};
