
require("dotenv").config({ path: ".env.test" });

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

    const userId = process.env.TEST_USER_ID;

    if (!mongoose.isValidObjectId(userId)) {
      throw new Error("Valid TEST_USER_ID is required.");
    }

    // Use a future test date, but never reuse a date already in use.
    const school = await Student.findOne({
      status: "active",
    }).lean();

    if (!school) {
      throw new Error("No active test student found.");
    }

    const { schoolId, className, section, academicYear } = school;
    const normalizedSection = (section || "").trim().toUpperCase();

    const students = await Student.find({
      schoolId,
      className,
      section: section || "",
      academicYear,
      status: "active",
    })
      .select("_id")
      .limit(2)
      .lean();

    if (students.length !== 2) {
      throw new Error(
        "Two active students are required for the rollback test."
      );
    }

    // Try unused dates only; never delete or overwrite existing records.
    let testDate;
    let date;
    let session;

    for (let day = 3; day <= 31; day++) {
      const candidate = `2026-11-${String(day).padStart(2, "0")}`;
      const candidateDate = new Date(`${candidate}T00:00:00.000Z`);

      const existingSession = await AttendanceSession.exists({
        schoolId,
        className,
        section: normalizedSection,
        academicYear,
        date: candidateDate,
      });

      const existingAttendance = await Attendance.exists({
        schoolId,
        className,
        section: normalizedSection,
        academicYear,
        date: candidateDate,
      });

      if (!existingSession && !existingAttendance) {
        testDate = candidate;
        date = candidateDate;
        break;
      }
    }

    if (!testDate) {
      throw new Error(
        "No unused test date found in November 2026. No data was changed."
      );
    }

    session = await AttendanceSession.create({
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

    const filter = {
      schoolId,
      className,
      section: normalizedSection,
      academicYear,
      date,
    };

    const beforeCount = await Attendance.countDocuments(filter);

    if (beforeCount !== 0) {
      throw new Error(
        "Safety check failed: attendance already exists for test date."
      );
    }

    const records = students.map((student, index) => ({
      studentId: String(student._id),
      status: index === 0 ? "present" : "absent",
    }));

    console.log("Database:", mongoose.connection.name);
    console.log("Test date:", testDate);
    console.log("Session:", String(session._id));
    console.log("Records before:", beforeCount);
    console.log("Triggering rollback through the real service...");

    let expectedErrorCaught = false;

    try {
      await markClassAttendance(String(schoolId), userId, {
        className,
        section: normalizedSection,
        academicYear,
        date: testDate,
        records,
      });
    } catch (error) {
      console.log("Expected test error:", error.message);

      if (
        error.message === "INTENTIONAL_ATTENDANCE_ROLLBACK_TEST"
      ) {
        expectedErrorCaught = true;
      } else {
        throw error;
      }
    }

    // Read after the transaction has ended.
    const afterCount = await Attendance.countDocuments(filter);

    const finalSession = await AttendanceSession.findById(
      session._id
    ).lean();

    console.log("Records after:", afterCount);
    console.log("Write lock:", finalSession?.attendanceWriteLock);

    if (!expectedErrorCaught) {
      throw new Error(
        "Rollback hook was not triggered. Check its location inside withTransaction()."
      );
    }

    if (afterCount !== 0) {
      throw new Error(
        "ROLLBACK FAILED: attendance records remain after transaction error."
      );
    }

    if (finalSession?.attendanceWriteLock !== false) {
      throw new Error("FAIL: attendance write lock was not released.");
    }

    console.log(
      "SUCCESS: service transaction rolled back and released the lock."
    );
  } finally {
    delete process.env.ATTENDANCE_TEST_FORCE_ROLLBACK;
    await mongoose.disconnect();
  }
}

runTest().catch((error) => {
  console.error("TEST FAILED:", error.message);
  delete process.env.ATTENDANCE_TEST_FORCE_ROLLBACK;
  process.exitCode = 1;
});
