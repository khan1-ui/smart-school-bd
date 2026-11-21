
require("dotenv").config({ path: ".env.test" });

const mongoose = require("mongoose");
const Attendance = require("../src/modules/attendance/Attendance");
const AttendanceSession = require("../src/modules/attendance/AttendanceSession");

const {
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

    const date = new Date("2026-11-05T00:00:00.000Z");

    const session = await AttendanceSession.findOne({
      date,
      className: "Six",
      section: "A",
      academicYear: "2026",
      status: "finalized",
    }).lean();

    if (!session) {
      throw new Error(
        "Expected finalized test session not found. No data was changed."
      );
    }

    const userId = process.env.TEST_USER_ID;

    if (!mongoose.isValidObjectId(userId)) {
      throw new Error("Valid TEST_USER_ID is required.");
    }

    const filter = {
      schoolId: session.schoolId,
      className: session.className,
      section: session.section,
      academicYear: session.academicYear,
      date: session.date,
    };

    const beforeCount = await Attendance.countDocuments(filter);

    console.log("Database:", mongoose.connection.name);
    console.log("Session:", String(session._id));
    console.log("Status:", session.status);
    console.log("Attendance before:", beforeCount);

    // Test 1: another school context must not access this session.
    let wrongSchoolRejected = false;

    try {
      await finalizeAttendanceSession({
        schoolId: new mongoose.Types.ObjectId().toString(),
        userId,
        sessionId: String(session._id),
      });
    } catch (error) {
      console.log("Wrong-school attempt:", error.message);

      if (error.statusCode === 404 || error.statusCode === 409) {
        wrongSchoolRejected = true;
      } else {
        throw error;
      }
    }

    if (!wrongSchoolRejected) {
      throw new Error("Wrong-school context was not rejected.");
    }

    console.log("PASS: wrong school context rejected");

    // Test 2: malformed user ID must fail validation.
    let invalidUserRejected = false;

    try {
      await finalizeAttendanceSession({
        schoolId: String(session.schoolId),
        userId: "not-a-valid-object-id",
        sessionId: String(session._id),
      });
    } catch (error) {
      console.log("Invalid-user attempt:", error.message);

      if (error.statusCode === 400) {
        invalidUserRejected = true;
      } else {
        throw error;
      }
    }

    if (!invalidUserRejected) {
      throw new Error("Invalid user ID was not rejected.");
    }

    console.log("PASS: invalid user ID rejected");

    // Test 3: finalized session must reject attendance changes.
    const existingRecords = await Attendance.find(filter)
      .select("studentId status")
      .lean();

    if (existingRecords.length === 0) {
      throw new Error("No existing attendance records found.");
    }

    let finalizedWriteRejected = false;

    try {
      await markClassAttendance(
        String(session.schoolId),
        userId,
        {
          className: session.className,
          section: session.section,
          academicYear: session.academicYear,
          date: "2026-11-05",
          records: existingRecords.map((record) => ({
            studentId: String(record.studentId),
            status: record.status,
          })),
        }
      );
    } catch (error) {
      console.log("Finalized-write attempt:", error.message);

      if (error.statusCode === 409) {
        finalizedWriteRejected = true;
      } else {
        throw error;
      }
    }

    if (!finalizedWriteRejected) {
      throw new Error("Finalized session accepted an attendance write.");
    }

    console.log("PASS: finalized session write rejected");

    // Verify records and session state were unchanged.
    const afterCount = await Attendance.countDocuments(filter);
    const finalSession = await AttendanceSession.findById(
      session._id
    ).lean();

    console.log("Attendance after:", afterCount);
    console.log("Final session status:", finalSession.status);
    console.log("Write lock:", finalSession.attendanceWriteLock);

    if (afterCount !== beforeCount) {
      throw new Error("Attendance count changed unexpectedly.");
    }

    if (finalSession.status !== "finalized") {
      throw new Error("Session status changed unexpectedly.");
    }

    if (finalSession.attendanceWriteLock !== false) {
      throw new Error("Unexpected write lock state.");
    }

    console.log("PASS: existing data remained unchanged");
    console.log("SUCCESS: security negative tests passed.");
    console.log(
      "NOTE: this tests service-level guards, not full API authorization."
    );
  } finally {
    await mongoose.disconnect();
  }
}

runTest().catch((error) => {
  console.error("SECURITY TEST FAILED:", error.message);
  process.exitCode = 1;
});
