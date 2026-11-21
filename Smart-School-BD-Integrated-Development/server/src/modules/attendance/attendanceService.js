const mongoose = require("mongoose");
const Student = require("../students/Student");
const Attendance = require("./Attendance");
const AttendanceSession = require("./AttendanceSession");
const {
  acquireAttendanceWriteLock,
  releaseAttendanceWriteLock,
} = require("./attendanceSessionService");

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}



const markAttendance = async (schoolId, userId, data) => {
  if (!mongoose.isValidObjectId(schoolId)) {
    throw new AppError("Invalid school context", 400);
  }

  if (!mongoose.isValidObjectId(userId)) {
    throw new AppError("Invalid user context", 400);
  }

  if (!mongoose.isValidObjectId(data.studentId)) {
    throw new AppError("Invalid student ID", 400);
  }

  if (!["present", "absent", "late"].includes(data.status)) {
    throw new AppError("Invalid attendance status", 400);
  }
  if (data.remark !== undefined && (typeof data.remark !== "string" || data.remark.trim().length > 300)) {
    throw new AppError("Attendance remark must be 300 characters or fewer", 400);
  }

  if (
    typeof data.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data.date)
  ) {
    throw new AppError(
      "Attendance date must use YYYY-MM-DD format",
      400
    );
  }

  const [year, month, day] = data.date.split("-").map(Number);
  const localDate = new Date(Date.UTC(year, month - 1, day));

  if (
    localDate.getUTCFullYear() !== year ||
    localDate.getUTCMonth() !== month - 1 ||
    localDate.getUTCDate() !== day
  ) {
    throw new AppError("Invalid attendance date", 400);
  }

  const student = await Student.findOne({
    _id: data.studentId,
    schoolId,
    status: "active",
  }).lean();

  if (!student) {
    throw new AppError("Active student not found", 404);
  }

  const session = await AttendanceSession.findOne({
    schoolId,
    className: student.className,
    section: (student.section || "").trim().toUpperCase(),
    academicYear: student.academicYear,
    date: localDate,
  }).select("_id status");

  if (!session) {
    throw new AppError(
      "Create an attendance session before marking attendance",
      409
    );
  }

  let lockAcquired = false;

  try {
   
await acquireAttendanceWriteLock({
  schoolId,
  sessionId: session._id,
});

lockAcquired = true;

// Lock নেওয়ার পর session-এর বর্তমান state পুনরায় যাচাই।
const writableSession = await AttendanceSession.findOne({
  _id: session._id,
  schoolId,
  className: student.className,
  section: (student.section || "").trim().toUpperCase(),
  academicYear: student.academicYear,
  date: localDate,
  status: "in_progress",
  attendanceWriteLock: true,
}).select("_id");

if (!writableSession) {
  throw new AppError(
    "Attendance session is no longer available for writing",
    409
  );
}

return await Attendance.create({
  schoolId,
  studentId: student._id,
  className: student.className,
  section: (student.section || "").trim().toUpperCase(),
  academicYear: student.academicYear,
  date: localDate,
  status: data.status,
  markedBy: userId,
  method: data.method || "manual",
  remark: data.remark ? data.remark.trim() : "",
});

  } catch (error) {
    if (error.code === 11000) {
      throw new AppError(
        "Attendance already marked for this student and date",
        409
      );
    }

    throw error;
  } finally {
    if (lockAcquired) {
      await releaseAttendanceWriteLock({
        schoolId,
        sessionId: session._id,
      });
    }
  }
};

const getClassAttendanceReport = async (
  schoolId,
  { className, section = "", academicYear, date }
) => {
  if (!mongoose.isValidObjectId(schoolId)) {
    throw new AppError("Invalid school context", 400);
  }

  if (
    typeof className !== "string" ||
    !className.trim() ||
    typeof academicYear !== "string" ||
    !/^\d{4}(-\d{4})?$/.test(academicYear) ||
    typeof date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    typeof section !== "string"
  ) {
    throw new AppError(
      "Valid class, section, academic year and date are required",
      400
    );
  }

  const [year, month, day] = date.split("-").map(Number);
  const attendanceDate = new Date(
    Date.UTC(year, month - 1, day)
  );

  if (
    attendanceDate.getUTCFullYear() !== year ||
    attendanceDate.getUTCMonth() !== month - 1 ||
    attendanceDate.getUTCDate() !== day
  ) {
    throw new AppError("Invalid attendance date", 400);
  }

  const filter = {
    schoolId,
    className: className.trim(),
    section: section.trim().toUpperCase(),
    academicYear,
    status: "active",
  };

  const students = await Student.find(filter)
    .select("_id admissionNumber name className section rollNumber")
    .sort({ rollNumber: 1 })
    .lean();

  const attendanceRecords = await Attendance.find({
    schoolId,
    className: className.trim(),
    section: section.trim().toUpperCase(),
    academicYear,
    date: attendanceDate,
  })
    .select("studentId status")
    .lean();

  const attendanceMap = new Map(
    attendanceRecords.map((record) => [
      String(record.studentId),
      record.status,
    ])
  );

  const studentList = students.map((student) => ({
    ...student,
    attendanceStatus:
      attendanceMap.get(String(student._id)) || "not_marked",
  }));

  const summary = {
    totalStudents: studentList.length,
    present: 0,
    absent: 0,
    late: 0,
    notMarked: 0,
  };

  for (const student of studentList) {
    if (student.attendanceStatus === "present") {
      summary.present++;
    } else if (student.attendanceStatus === "absent") {
      summary.absent++;
    } else if (student.attendanceStatus === "late") {
      summary.late++;
    } else {
      summary.notMarked++;
    }
  }

  return { students: studentList, summary };
};
const markFaceAttendance = async (
  schoolId,
  userId,
  studentId
) => {
  if (!mongoose.isValidObjectId(studentId)) {
    throw new AppError("Invalid student ID", 400);
  }

  // বাংলাদেশের স্থানীয় তারিখ নির্ধারণ
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return markAttendance(schoolId, userId, {
    studentId,
    date,
    status: "present",
    method: "face_recognition",
  });
};

const markClassAttendance = async (
  schoolId,
  userId,
  { className, section = "", academicYear, date, records }
) => {
  if (!mongoose.isValidObjectId(schoolId)) {
    throw new AppError("Invalid school context", 400);
  }

  if (!mongoose.isValidObjectId(userId)) {
    throw new AppError("Invalid user context", 400);
  }

  if (
    typeof className !== "string" ||
    !className.trim() ||
    typeof academicYear !== "string" ||
    !/^\d{4}(-\d{4})?$/.test(academicYear) ||
    typeof section !== "string" ||
    typeof date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Array.isArray(records) ||
    records.length === 0
  ) {
    throw new AppError(
      "Valid class, section, academic year, date and records are required",
      400
    );
  }

  if (records.length > 200) {
    throw new AppError(
      "A maximum of 200 students can be submitted at once",
      400
    );
  }

  const [year, month, day] = date.split("-").map(Number);
  const attendanceDate = new Date(
    Date.UTC(year, month - 1, day)
  );

  if (
    attendanceDate.getUTCFullYear() !== year ||
    attendanceDate.getUTCMonth() !== month - 1 ||
    attendanceDate.getUTCDate() !== day
  ) {
    throw new AppError("Invalid attendance date", 400);
  }

  const normalizedClass = className.trim();
  const normalizedSection = section.trim().toUpperCase();

  const attendanceSession = await AttendanceSession.findOne({
    schoolId,
    className: normalizedClass,
    section: normalizedSection,
    academicYear,
    date: attendanceDate,
  });

  if (!attendanceSession) {
    throw new AppError(
      "Create an attendance session before marking class attendance",
      409
    );
  }

  if (attendanceSession.status !== "in_progress") {
    throw new AppError(
      "Class attendance cannot be changed because the session is not in progress",
      409
    );
  }

  const seenIds = new Set();

  for (const record of records) {
    if (
      !record ||
      !mongoose.isValidObjectId(record.studentId) ||
      !["present", "absent", "late"].includes(record.status)
    ) {
      throw new AppError(
        "Each record requires a valid student ID and attendance status",
        400
      );
    }

    const studentId = String(record.studentId);

    if (seenIds.has(studentId)) {
      throw new AppError(
        "Duplicate student IDs are not allowed in one request",
        400
      );
    }

    seenIds.add(studentId);
  }

  const studentIds = [...seenIds];

  const students = await Student.find({
    _id: { $in: studentIds },
    schoolId,
    className: normalizedClass,
    section: normalizedSection,
    academicYear,
    status: "active",
  })
    .select("_id")
    .lean();

  if (students.length !== studentIds.length) {
    throw new AppError(
      "One or more students are inactive or do not belong to this class, section and academic year",
      400
    );
  }

  const activeStudents = await Student.find({
    schoolId,
    className: normalizedClass,
    section: normalizedSection,
    academicYear,
    status: "active",
  })
    .select("_id")
    .lean();

  if (activeStudents.length !== records.length) {
    throw new AppError(
      "Attendance must include every active student in the class",
      400
    );
  }

  const documents = records.map((record) => ({
    schoolId,
    studentId: record.studentId,
    className: normalizedClass,
    section: normalizedSection,
    academicYear,
    date: attendanceDate,
    status: record.status,
    markedBy: userId,
    method: "manual",
  }));

  let lockAcquired = false;
  let mongoSession;

  try {
    await acquireAttendanceWriteLock({
      schoolId,
      sessionId: attendanceSession._id,
    });

    lockAcquired = true;

    // Verify that the session remains writable after acquiring the lock.
    const writableSession = await AttendanceSession.findOne({
      _id: attendanceSession._id,
      schoolId,
      className: normalizedClass,
      section: normalizedSection,
      academicYear,
      date: attendanceDate,
      status: "in_progress",
      attendanceWriteLock: true,
    }).select("_id");

    if (!writableSession) {
      throw new AppError(
        "Attendance session is no longer available for writing",
        409
      );
    }

    // Reject an already submitted class attendance.
    const existingAttendance = await Attendance.exists({
      schoolId,
      className: normalizedClass,
      section: normalizedSection,
      academicYear,
      date: attendanceDate,
    });

    if (existingAttendance) {
      throw new AppError(
        "Attendance records already exist for this class and date",
        409
      );
    }

    mongoSession = await mongoose.startSession();

    let createdAttendance = [];

    await mongoSession.withTransaction(async () => {
      // Recheck inside the transaction to protect against duplicate submission.
      const existingInTransaction = await Attendance.exists({
        schoolId,
        className: normalizedClass,
        section: normalizedSection,
        academicYear,
        date: attendanceDate,
      }).session(mongoSession);

      if (existingInTransaction) {
        throw new AppError(
          "Attendance records already exist for this class and date",
          409
        );
      }

      createdAttendance = await Attendance.insertMany(
        documents,
        {
          ordered: true,
          session: mongoSession,
        }
      );
      });

    return {
      createdCount: createdAttendance.length,
      attendance: createdAttendance,
    };
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError(
        "Some attendance records already exist for this class and date.",
        409
      );
    }

    throw error;
  } finally {
    // Always attempt session cleanup and then release the write lock.
    try {
      if (mongoSession) {
        await mongoSession.endSession();
      }
    } finally {
      if (lockAcquired) {
        await releaseAttendanceWriteLock({
          schoolId,
          sessionId: attendanceSession._id,
        });
      }
    }
  }
};

module.exports = {
  AppError,
  markAttendance,
  markFaceAttendance,
  getClassAttendanceReport,
  markClassAttendance,
};
