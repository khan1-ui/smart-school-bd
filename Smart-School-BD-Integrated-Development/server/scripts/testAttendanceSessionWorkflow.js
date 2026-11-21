
require("dotenv").config({ path: ".env.test" });

const mongoose = require("mongoose");
const Student = require("../src/modules/students/Student");
const Attendance = require("../src/modules/attendance/Attendance");
const AttendanceSession = require("../src/modules/attendance/AttendanceSession");

const {
  createAttendanceSession,
  validateSessionForSubmission,
  submitAttendanceSession,
  finalizeAttendanceSession,
} = require("../src/modules/attendance/attendanceSessionService");

const {
  markClassAttendance,
} = require("../src/modules/attendance/attendanceService");

async function runTest() {
  const uri = process.env.MONGODB_URI;

  if (
    !uri ||
    !uri.includes("/smart_school_bd_test") ||
    !uri.includes("replicaSet=rs0")
  ) {
    throw new Error("Safety check failed: test database required.");
  }

  await mongoose.connect(uri);

  try {
    if (mongoose.connection.name !== "smart_school_bd_test") {
      throw new Error("Wrong database. Test stopped.");
    }

    const userId = process.env.TEST_USER_ID;

    if (!mongoose.isValidObjectId(userId)) {
      throw new Error("Valid TEST_USER_ID is required.");
    }

    // Find a class with active students.
    const firstStudent = await Student.findOne({
      status: "active",
      schoolId: { $exists: true },
    }).lean();

    if (!firstStudent) {
      throw new Error("No active test student found.");
    }

    const schoolId = String(firstStudent.schoolId);
    const className = firstStudent.className;
    const section = (firstStudent.section || "").trim().toUpperCase();
    const academicYear = firstStudent.academicYear;

    const students = await Student.find({
      schoolId,
      className,
      section,
      academicYear,
      status: "active",
    })
      .select("_id")
      .limit(200)
      .lean();

    if (students.length === 0) {
      throw new Error("No active students found for the selected class.");
    }

    // Use an unused date; never overwrite existing test data.
    let testDate;

    for (let day = 5; day <= 28; day++) {
      const candidate = `2026-11-${String(day).padStart(2, "0")}`;
      const date = new Date(`${candidate}T00:00:00.000Z`);

      const sessionExists = await AttendanceSession.exists({
        schoolId,
        className,
        section,
        academicYear,
        date,
      });

      const attendanceExists = await Attendance.exists({
        schoolId,
        className,
        section,
        academicYear,
        date,
      });

      if (!sessionExists && !attendanceExists) {
        testDate = candidate;
        break;
      }
    }

    if (!testDate) {
      throw new Error(
        "No unused November test date found. No data was changed."
      );
    }

    console.log("Database:", mongoose.connection.name);
    console.log("Class:", className);
    console.log("Section:", section);
    console.log("Academic year:", academicYear);
    console.log("Test date:", testDate);
    console.log("Active students:", students.length);

    // 1. Create a fresh session through the service.
    const session = await createAttendanceSession({
      schoolId,
      userId,
      className,
      section,
      academicYear,
      date: testDate,
    });

    console.log("Created status:", session.status);

    if (session.status !== "in_progress") {
      throw new Error("New session did not start in_progress.");
    }

    // 2. Record attendance for every active student.
    const records = students.map((student, index) => ({
      studentId: String(student._id),
      status: index === 0 ? "present" : "absent",
    }));

    const attendanceResult = await markClassAttendance(
      schoolId,
      userId,
      {
        className,
        section,
        academicYear,
        date: testDate,
        records,
      }
    );

    console.log(
      "Attendance created:",
      attendanceResult.createdCount
    );

    if (attendanceResult.createdCount !== students.length) {
      throw new Error("Attendance record count does not match.");
    }

    // 3. Validate before submission.
    const validation = await validateSessionForSubmission({
      schoolId,
      sessionId: String(session._id),
    });

    console.log("Ready for submission:", validation.readyForSubmission);
    console.log("Missing students:", validation.missingCount);

    if (!validation.readyForSubmission) {
      throw new Error("Session unexpectedly failed validation.");
    }

    // 4. Submit through the real service.
    const submitted = await submitAttendanceSession({
      schoolId,
      userId,
      sessionId: String(session._id),
    });

    console.log("Submitted status:", submitted.status);

    if (submitted.status !== "submitted") {
      throw new Error("Session submission failed.");
    }

    const submittedSession = await AttendanceSession.findById(
      session._id
    ).lean();

    if (submittedSession.attendanceWriteLock !== false) {
      throw new Error("Write lock remained active after submission.");
    }

    console.log("PASS: submit workflow and lock release");

    // 5. Finalize through the real service.
    const finalized = await finalizeAttendanceSession({
      schoolId,
      userId,
      sessionId: String(session._id),
    });

    console.log("Finalized status:", finalized.status);

    if (finalized.status !== "finalized") {
      throw new Error("Session finalization failed.");
    }

    // 6. Finalization should not be repeatable.
    let repeatFinalizeRejected = false;

    try {
      await finalizeAttendanceSession({
        schoolId,
        userId,
        sessionId: String(session._id),
      });
    } catch (error) {
      console.log("Repeat finalize rejected:", error.message);

      if (error.statusCode === 409) {
        repeatFinalizeRejected = true;
      } else {
        throw error;
      }
    }

    const finalSession = await AttendanceSession.findById(
      session._id
    ).lean();

    const finalAttendanceCount = await Attendance.countDocuments({
      schoolId,
      className,
      section,
      academicYear,
      date: new Date(`${testDate}T00:00:00.000Z`),
    });

    if (!repeatFinalizeRejected) {
      throw new Error("Repeated finalization was not rejected.");
    }

    if (finalSession.status !== "finalized") {
      throw new Error("Finalized session status changed unexpectedly.");
    }

    if (finalSession.attendanceWriteLock !== false) {
      throw new Error("Finalized session has an unexpected write lock.");
    }

    if (finalAttendanceCount !== students.length) {
      throw new Error("Attendance records changed unexpectedly.");
    }

    console.log("Final status:", finalSession.status);
    console.log("Final attendance count:", finalAttendanceCount);
    console.log("Write lock:", finalSession.attendanceWriteLock);
    console.log("PASS: repeated finalization protection");
    console.log("SUCCESS: session workflow tests passed.");
    console.log(
      "NOTE: test session and attendance records were retained."
    );
  } finally {
    await mongoose.disconnect();
  }
}

runTest().catch((error) => {
  console.error("SESSION WORKFLOW TEST FAILED:", error.message);
  process.exitCode = 1;
});
