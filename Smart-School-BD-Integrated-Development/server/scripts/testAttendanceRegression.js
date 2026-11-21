
require("dotenv").config({ path: ".env.test" });

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
      section: section || "",
      academicYear,
      status: "active",
    })
      .select("_id")
      .limit(2)
      .lean();

    if (students.length !== 2) {
      throw new Error("Two active test students are required.");
    }

    // Find a date with no existing session or attendance.
    let testDate;
    let date;

    for (let day = 4; day <= 31; day++) {
      const candidate = `2026-11-${String(day).padStart(2, "0")}`;
      const candidateDate = new Date(`${candidate}T00:00:00.000Z`);

      const sessionExists = await AttendanceSession.exists({
        schoolId,
        className,
        section: normalizedSection,
        academicYear,
        date: candidateDate,
      });

      const attendanceExists = await Attendance.exists({
        schoolId,
        className,
        section: normalizedSection,
        academicYear,
        date: candidateDate,
      });

      if (!sessionExists && !attendanceExists) {
        testDate = candidate;
        date = candidateDate;
        break;
      }
    }

    if (!testDate) {
      throw new Error("No unused test date found. No data was changed.");
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

    const filter = {
      schoolId,
      className,
      section: normalizedSection,
      academicYear,
      date,
    };

    const records = students.map((student, index) => ({
      studentId: String(student._id),
      status: index === 0 ? "present" : "absent",
    }));

    console.log("Database:", mongoose.connection.name);
    console.log("Test date:", testDate);
    console.log("Session:", String(session._id));

    // Test 1: normal submission
    const result = await markClassAttendance(
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

    const savedCount = await Attendance.countDocuments(filter);
    const afterFirstSubmission = await AttendanceSession.findById(
      session._id
    ).lean();

    console.log("Created count:", result.createdCount);
    console.log("Saved count:", savedCount);
    console.log(
      "Write lock after success:",
      afterFirstSubmission?.attendanceWriteLock
    );

    if (result.createdCount !== 2 || savedCount !== 2) {
      throw new Error("Normal attendance submission failed.");
    }

    if (afterFirstSubmission?.attendanceWriteLock !== false) {
      throw new Error("Write lock was not released after success.");
    }

    console.log("PASS: normal submission");

    // Test 2: duplicate submission must be rejected.
    let duplicateRejected = false;

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
      console.log("Duplicate rejection:", error.message);

      if (error.statusCode === 409 || error.code === 11000) {
        duplicateRejected = true;
      } else {
        throw error;
      }
    }

    const countAfterRetry = await Attendance.countDocuments(filter);
    const afterRetrySession = await AttendanceSession.findById(
      session._id
    ).lean();

    console.log("Count after duplicate attempt:", countAfterRetry);
    console.log(
      "Write lock after duplicate attempt:",
      afterRetrySession?.attendanceWriteLock
    );

    if (!duplicateRejected) {
      throw new Error("Duplicate submission was not rejected.");
    }

    if (countAfterRetry !== 2) {
      throw new Error("Existing attendance records changed unexpectedly.");
    }

    if (afterRetrySession?.attendanceWriteLock !== false) {
      throw new Error("Write lock was not released after duplicate rejection.");
    }

    console.log("PASS: duplicate submission protection");
    console.log("PASS: lock cleanup");
    console.log("SUCCESS: all regression checks passed.");
  } finally {
    await mongoose.disconnect();
  }
}

runTest().catch((error) => {
  console.error("REGRESSION TEST FAILED:", error.message);
  process.exitCode = 1;
});
