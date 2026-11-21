
require("dotenv").config({ path: ".env.test" });

const mongoose = require("mongoose");

const {
  markClassAttendance,
} = require("../src/modules/attendance/attendanceService");

const Attendance = require("../src/modules/attendance/Attendance");
const AttendanceSession = require("../src/modules/attendance/AttendanceSession");

const TEST_DB = "smart_school_bd_test";

const schoolId = "6ada0299bf7ec1a8a22f300c";
const userId = "6ada0299bf7ec1a8a22f300d";

const studentOne = "6ada029abf7ec1a8a22f300e";
const studentTwo = "6ada029abf7ec1a8a22f300f";

const testDate = new Date("2026-10-26T00:00:00.000Z");

async function runIntegrationTest() {
  let session;

  try {
    // 1. Safety: connect only to the isolated test database.
    const uri = process.env.MONGODB_URI;

    if (!uri || new URL(uri).pathname !== `/${TEST_DB}`) {
      throw new Error("Safety stop: incorrect test database URI");
    }

    await mongoose.connect(uri);

    if (mongoose.connection.name !== TEST_DB) {
      throw new Error("Safety stop: connected to wrong database");
    }

    await Attendance.init();

    // 2. Find or create a dedicated test session.
    session = await AttendanceSession.findOne({
      schoolId,
      className: "Six",
      section: "A",
      academicYear: "2026",
      date: testDate,
    });

    if (!session) {
      session = await AttendanceSession.create({
        schoolId,
        className: "Six",
        section: "A",
        academicYear: "2026",
        date: testDate,
        status: "in_progress",
        createdBy: userId,
        attendanceWriteLock: false,
      });
    }

    if (
      session.status !== "in_progress" ||
      session.attendanceWriteLock !== false
    ) {
      throw new Error(
        "Safety stop: test session is not writable"
      );
    }

    // 3. Ensure the target class/date has no attendance records.
    const targetQuery = {
      schoolId,
      className: "Six",
      section: "A",
      academicYear: "2026",
      date: testDate,
    };

    const targetCount = await Attendance.countDocuments(targetQuery);

    if (targetCount !== 0) {
      throw new Error(
        `Safety stop: target already has ${targetCount} attendance record(s)`
      );
    }

    // 4. Prepare a unique-index conflict for studentOne.
    // This different class avoids the service's class-specific pre-check.
    const conflictQuery = {
      schoolId,
      studentId: studentOne,
      academicYear: "2026",
      date: testDate,
    };

    const existingConflict = await Attendance.findOne(conflictQuery);

    if (existingConflict) {
      if (
        existingConflict.className !== "Five" ||
        existingConflict.section !== "B" ||
        existingConflict.markedBy.toString() !== userId
      ) {
        throw new Error(
          "Safety stop: an unexpected conflict record exists"
        );
      }
    } else {
      await Attendance.create({
        schoolId,
        studentId: studentOne,
        className: "Five",
        section: "B",
        academicYear: "2026",
        date: testDate,
        status: "present",
        markedBy: userId,
        method: "manual",
      });
    }

    console.log("Test database:", mongoose.connection.name);
    console.log("Test session:", session._id.toString());
    console.log("Target attendance before:", targetCount);
    console.log("Unique-index conflict prepared.");

    // 5. StudentTwo is first, studentOne second.
    // StudentOne should hit the unique index conflict inside insertMany.
    let expectedFailure = false;

    try {
      await markClassAttendance(schoolId, userId, {
        className: "Six",
        section: "A",
        academicYear: "2026",
        date: "2026-10-26",
        records: [
          { studentId: studentTwo, status: "present" },
          { studentId: studentOne, status: "absent" },
        ],
      });
    } catch (error) {
      expectedFailure = true;
      console.log("Expected service error:", error.message);
    }

    if (!expectedFailure) {
      throw new Error(
        "Test failed: expected the attendance write to fail"
      );
    }

    // 6. Verify rollback, lock release, and conflict preservation.
    const finalTargetCount =
      await Attendance.countDocuments(targetQuery);

    const finalSession = await AttendanceSession.findById(session._id)
      .select("status attendanceWriteLock")
      .lean();

    const conflictCount = await Attendance.countDocuments({
      ...conflictQuery,
      className: "Five",
      section: "B",
      markedBy: userId,
    });

    console.log("Target attendance after:", finalTargetCount);
    console.log("Session status:", finalSession?.status);
    console.log("Write lock:", finalSession?.attendanceWriteLock);
    console.log("Conflict record count:", conflictCount);

    if (
      finalTargetCount !== 0 ||
      finalSession?.status !== "in_progress" ||
      finalSession?.attendanceWriteLock !== false ||
      conflictCount !== 1
    ) {
      throw new Error(
        "INTEGRATION TEST FAILED: one or more checks failed"
      );
    }

    console.log(
      "PASS: service failure, rollback, lock release and conflict preservation verified."
    );
  } catch (error) {
    console.error("INTEGRATION TEST FAILED:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

runIntegrationTest();
