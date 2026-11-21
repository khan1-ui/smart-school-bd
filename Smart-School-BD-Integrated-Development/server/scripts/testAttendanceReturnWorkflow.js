
require("dotenv").config({ path: ".env.test" });

const mongoose = require("mongoose");
const Student = require("../src/modules/students/Student");
const Attendance = require("../src/modules/attendance/Attendance");
const AttendanceSession = require("../src/modules/attendance/AttendanceSession");

const {
  createAttendanceSession,
  submitAttendanceSession,
  returnAttendanceSession,
  reopenReturnedAttendanceSession,
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

    const firstStudent = await Student.findOne({
      status: "active",
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
      throw new Error("No active students found.");
    }

    // Find a date with neither an existing session nor attendance.
    let testDate;

    for (let day = 6; day <= 28; day++) {
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
        "No unused test date found. No data was changed."
      );
    }

    console.log("Database:", mongoose.connection.name);
    console.log("Class:", className);
    console.log("Section:", section);
    console.log("Academic year:", academicYear);
    console.log("Test date:", testDate);

    // 1. Create a fresh session.
    const session = await createAttendanceSession({
      schoolId,
      userId,
      className,
      section,
      academicYear,
      date: testDate,
    });

    console.log("Created status:", session.status);

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

    console.log("Attendance created:", attendanceResult.createdCount);

    if (attendanceResult.createdCount !== students.length) {
      throw new Error("Attendance record count mismatch.");
    }

    // 3. Submit the session.
    const submitted = await submitAttendanceSession({
      schoolId,
      userId,
      sessionId: String(session._id),
    });

    console.log("Submitted status:", submitted.status);

    if (submitted.status !== "submitted") {
      throw new Error("Session submission failed.");
    }

    // 4. Return the submitted session for correction.
    const returned = await returnAttendanceSession({
      schoolId,
      userId,
      sessionId: String(session._id),
      returnReason: "Automated test: correction workflow verification",
    });

    console.log("Returned status:", returned.status);
    console.log("Return reason:", returned.returnReason);

    if (
      returned.status !== "returned" ||
      returned.returnReason !==
        "Automated test: correction workflow verification"
    ) {
      throw new Error("Session return workflow failed.");
    }

    // 5. Reopen the returned session.
    const reopened = await reopenReturnedAttendanceSession({
      schoolId,
      userId,
      sessionId: String(session._id),
    });

    console.log("Reopened status:", reopened.status);

    if (reopened.status !== "in_progress") {
      throw new Error("Returned session was not reopened.");
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

    if (finalSession.attendanceWriteLock !== false) {
      throw new Error("Write lock remained active.");
    }

    if (finalAttendanceCount !== students.length) {
      throw new Error("Attendance records changed unexpectedly.");
    }

    if (finalSession.submittedAt !== null ||
        finalSession.submittedBy !== null) {
      throw new Error("Submission metadata was not reset on reopen.");
    }

    console.log("Final status:", finalSession.status);
    console.log("Final attendance count:", finalAttendanceCount);
    console.log("Write lock:", finalSession.attendanceWriteLock);
    console.log("PASS: return and reopen workflow");
    console.log("SUCCESS: all return workflow checks passed.");
    console.log("NOTE: test records were retained.");
  } finally {
    await mongoose.disconnect();
  }
}

runTest().catch((error) => {
  console.error("RETURN WORKFLOW TEST FAILED:", error.message);
  process.exitCode = 1;
});
