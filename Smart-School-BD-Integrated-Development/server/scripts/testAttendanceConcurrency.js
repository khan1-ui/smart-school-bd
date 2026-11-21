
require("dotenv").config({ path: ".env.test" });

const mongoose = require("mongoose");

const {
  markClassAttendance,
} = require("../src/modules/attendance/attendanceService");

const Attendance = require("../src/modules/attendance/Attendance");
const AttendanceSession = require("../src/modules/attendance/AttendanceSession");
const Student = require("../src/modules/students/Student");

const TEST_DB = "smart_school_bd_test";

const schoolId = "6ada0299bf7ec1a8a22f300c";
const userId = "6ada0299bf7ec1a8a22f300d";

const studentIds = [
  "6ada029abf7ec1a8a22f300e",
  "6ada029abf7ec1a8a22f300f",
];

const dateString = "2026-10-28";
const testDate = new Date(`${dateString}T00:00:00.000Z`);

async function runConcurrencyTest() {
  try {
    // Safety: only use the isolated test database.
    const uri = process.env.MONGODB_URI;

    if (!uri || new URL(uri).pathname !== `/${TEST_DB}`) {
      throw new Error("Safety stop: incorrect test database URI");
    }

    await mongoose.connect(uri);

    if (mongoose.connection.name !== TEST_DB) {
      throw new Error("Safety stop: connected to wrong database");
    }

    await Attendance.init();
    await AttendanceSession.init();

    // Confirm both students are active in the intended class.
    const activeStudents = await Student.countDocuments({
      _id: { $in: studentIds },
      schoolId,
      className: "Six",
      section: "A",
      academicYear: "2026",
      status: "active",
    });

    if (activeStudents !== 2) {
      throw new Error(
        `Safety stop: expected 2 active students, found ${activeStudents}`
      );
    }

    // The unique attendance index also covers student/date across classes.
    const existingForStudents = await Attendance.countDocuments({
      schoolId,
      studentId: { $in: studentIds },
      academicYear: "2026",
      date: testDate,
    });

    if (existingForStudents !== 0) {
      throw new Error(
        `Safety stop: found ${existingForStudents} existing attendance record(s) for test students/date`
      );
    }

    // Find or create the dedicated session.
    let session = await AttendanceSession.findOne({
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
      throw new Error("Safety stop: session is not writable");
    }

    const targetQuery = {
      schoolId,
      className: "Six",
      section: "A",
      academicYear: "2026",
      date: testDate,
    };

    const initialCount = await Attendance.countDocuments(targetQuery);

    if (initialCount !== 0) {
      throw new Error(
        `Safety stop: target class already has ${initialCount} record(s)`
      );
    }

    const payload = {
      className: "Six",
      section: "A",
      academicYear: "2026",
      date: dateString,
      records: [
        { studentId: studentIds[0], status: "present" },
        { studentId: studentIds[1], status: "absent" },
      ],
    };

    console.log("Test database:", mongoose.connection.name);
    console.log("Test session:", session._id.toString());
    console.log("Test date:", dateString);
    console.log("Sending two simultaneous requests...");

    // Run both submissions concurrently.
    const results = await Promise.allSettled([
      markClassAttendance(schoolId, userId, payload),
      markClassAttendance(schoolId, userId, payload),
    ]);

    const successes = results.filter(
      (result) => result.status === "fulfilled"
    );

    const failures = results.filter(
      (result) => result.status === "rejected"
    );

    // Print each request result exactly once.
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
  console.log(
    `Request ${index + 1}: SUCCESS`,
    "result:",
    result.value
  );
} else {
        console.log(
          `Request ${index + 1}: REJECTED`,
          result.reason?.message ?? "Unknown error",
          "statusCode:",
          result.reason?.statusCode ?? "not provided"
        );
      }
    });

    // Verify persisted data and lock state.
    const finalCount = await Attendance.countDocuments(targetQuery);

    const finalSession = await AttendanceSession.findById(session._id)
      .select("status attendanceWriteLock")
      .lean();

    console.log("Successful requests:", successes.length);
    console.log("Rejected requests:", failures.length);
    console.log("Final attendance count:", finalCount);
    console.log("Session status:", finalSession?.status);
    console.log("Write lock:", finalSession?.attendanceWriteLock);

    if (
      successes.length !== 1 ||
      failures.length !== 1 ||
      finalCount !== 2 ||
      finalSession?.status !== "in_progress" ||
      finalSession?.attendanceWriteLock !== false
    ) {
      throw new Error(
        "CONCURRENCY TEST FAILED: expected one successful request, one rejected request, two attendance records, and a released lock"
      );
    }

    console.log(
      "SUCCESS: concurrent attendance submission protection verified."
    );
  } catch (error) {
    console.error("CONCURRENCY TEST FAILED:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

runConcurrencyTest();
