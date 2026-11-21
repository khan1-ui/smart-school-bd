
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
const sessionId = "6ada029abf7ec1a8a22f3010";

const studentIds = [
  "6ada029abf7ec1a8a22f300e",
  "6ada029abf7ec1a8a22f300f",
];

async function runTest() {
  try {
    const uri = process.env.MONGODB_URI;

    if (!uri || new URL(uri).pathname !== `/${TEST_DB}`) {
      throw new Error("Safety check failed: unexpected database URI");
    }

    await mongoose.connect(uri);

    if (mongoose.connection.name !== TEST_DB) {
      throw new Error("Connected to an unexpected database");
    }

    const session = await AttendanceSession.findOne({
      _id: sessionId,
      schoolId,
      status: "in_progress",
      attendanceWriteLock: false,
      className: "Six",
      section: "A",
      academicYear: "2026",
      date: new Date("2026-10-23T00:00:00.000Z"),
    });

    if (!session) {
      throw new Error(
        "Expected test session not found or not writable"
      );
    }

    const existingCount = await Attendance.countDocuments({
      schoolId,
      className: "Six",
      section: "A",
      academicYear: "2026",
      date: new Date("2026-10-23T00:00:00.000Z"),
    });

    if (existingCount !== 0) {
      throw new Error(
        `Safety stop: found ${existingCount} existing attendance records`
      );
    }

    const result = await markClassAttendance(
      schoolId,
      userId,
      {
        className: "Six",
        section: "A",
        academicYear: "2026",
        date: "2026-10-23",
        records: [
          { studentId: studentIds[0], status: "present" },
          { studentId: studentIds[1], status: "absent" },
        ],
      }
    );

    const savedCount = await Attendance.countDocuments({
      schoolId,
      className: "Six",
      section: "A",
      academicYear: "2026",
      date: new Date("2026-10-23T00:00:00.000Z"),
    });

    const finalSession = await AttendanceSession.findById(sessionId)
      .select("status attendanceWriteLock")
      .lean();

    console.log("Transaction result:", result.createdCount);
    console.log("Saved attendance count:", savedCount);
    console.log("Session status:", finalSession?.status);
    console.log("Write lock:", finalSession?.attendanceWriteLock);

    if (
      result.createdCount !== 2 ||
      savedCount !== 2 ||
      finalSession?.attendanceWriteLock !== false
    ) {
      throw new Error("Transaction verification failed");
    }

    console.log("SUCCESS: transaction and lock verification passed.");
  } catch (error) {
    console.error("TEST FAILED:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

runTest();
