
require("dotenv").config({ path: ".env.test" });

process.env.NODE_ENV = "test";
process.env.ATTENDANCE_TEST_FORCE_ROLLBACK = "true";

const mongoose = require("mongoose");
const Student = require("../src/modules/students/Student");
const AttendanceSession = require("../src/modules/attendance/AttendanceSession");
const Attendance = require("../src/modules/attendance/Attendance");

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

    const testDate = "2026-11-01";
    const date = new Date(`${testDate}T00:00:00.000Z`);
    const userId = process.env.TEST_USER_ID;

    if (!mongoose.isValidObjectId(userId)) {
      throw new Error("Valid TEST_USER_ID is required.");
    }

    const firstStudent = await Student.findOne({
      status: "active",
    }).lean();

    if (!firstStudent) {
      throw new Error("No active test student found.");
    }

    const {
      schoolId,
      className,
      section,
      academicYear,
    } = firstStudent;

    const normalizedSection = (section || "").trim().toUpperCase();

    const students = await Student.find({
      schoolId,
      className,
      section: normalizedSection,
      academicYear,
      status: "active",
    })
      .select("_id")
      .lean();

    if (students.length < 2) {
      throw new Error("At least two active test students are required.");
    }

    const existingSession = await AttendanceSession.exists({
      schoolId,
      className,
      section: normalizedSection,
      academicYear,
      date,
    });

    const existingRecords = await Attendance.exists({
      schoolId,
      className,
      section: normalizedSection,
      academicYear,
      date,
    });

    if (existingSession || existingRecords) {
      throw new Error(
        "Test date already in use. Choose another unused date."
      );
    }

    const session = await AttendanceSession.create({
      schoolId,
      className,
      section: normalizedSection,
      academicYear,
      date,
      createdBy: userId,
      status: "in_progress",
      attendanceWriteLock: false,
      lastActivityAt: new Date(),
    });

    const records = students.map((student, index) => ({
      studentId: String(student._id),
      status: index === 0 ? "present" : "absent",
    }));

    console.log("Database:", mongoose.connection.name);
    console.log("Session:", String(session._id));
    console.log("Date:", testDate);
    console.log("Triggering intentional rollback...");

    let expectedError = false;

    try {
      await markClassAttendance(
        String(schoolId),
        userId,
        {
          className,
          section: normalizedSection,
          academicYear,
          date: testDate,
          records,
        }
      );
    } catch (error) {
      console.log("Service error:", error.message);

      if (
        error.message === "INTENTIONAL_ATTENDANCE_ROLLBACK_TEST"
      ) {
        expectedError = true;
      } else {
        throw error;
      }
    }

    const finalCount = await Attendance.countDocuments({
      schoolId,
      className,
      section: normalizedSection,
      academicYear,
      date,
    });

    const finalSession = await AttendanceSession.findById(
      session._id
    ).lean();

    console.log("Attendance count after rollback:", finalCount);
    console.log("Write lock:", finalSession?.attendanceWriteLock);

    if (!expectedError) {
      throw new Error("Expected intentional rollback was not triggered.");
    }

    if (finalCount !== 0) {
      throw new Error("Rollback failed: attendance records remain.");
    }

    if (finalSession?.attendanceWriteLock !== false) {
      throw new Error("Write lock was not released.");
    }

    console.log(
      "SUCCESS: service transaction rolled back and write lock was released."
    );
  } finally {
    await mongoose.disconnect();
  }
}

runTest().catch((error) => {
  console.error("TEST FAILED:", error.message);
  process.exitCode = 1;
});
