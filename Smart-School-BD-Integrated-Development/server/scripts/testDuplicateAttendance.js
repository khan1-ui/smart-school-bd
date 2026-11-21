
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

    const testDate = "2026-10-29";
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

    const normalizedSection = section || "";
    const attendanceDate = new Date(`${testDate}T00:00:00.000Z`);

    const session = await AttendanceSession.findOne({
      schoolId,
      className,
      section: normalizedSection,
      academicYear,
      date: attendanceDate,
      status: "in_progress",
    }).lean();

    if (!session) {
      throw new Error(
        "No matching in-progress session found. Check the test date and class."
      );
    }

    const activeStudents = await Student.find({
      schoolId,
      className,
      section: normalizedSection,
      academicYear,
      status: "active",
    })
      .select("_id")
      .lean();

    const existingCount = await Attendance.countDocuments({
      schoolId,
      className,
      section: normalizedSection,
      academicYear,
      date: attendanceDate,
    });

    if (
      activeStudents.length === 0 ||
      existingCount !== activeStudents.length
    ) {
      throw new Error(
        "Precondition failed: expected attendance for every active student."
      );
    }

    const records = activeStudents.map((student) => ({
      studentId: String(student._id),
      status: "present",
    }));

    console.log("Database:", mongoose.connection.name);
    console.log("Session:", String(session._id));
    console.log("Existing attendance:", existingCount);
    console.log("Submitting duplicate attendance...");

    let rejectedAsExpected = false;

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
      console.log("Rejected status:", error.statusCode);
      console.log("Message:", error.message);

      if (error.statusCode === 409) {
        rejectedAsExpected = true;
      } else {
        throw error;
      }
    }

    const finalCount = await Attendance.countDocuments({
      schoolId,
      className,
      section: normalizedSection,
      academicYear,
      date: attendanceDate,
    });

    const finalSession = await AttendanceSession.findById(
      session._id
    ).lean();

    console.log("Attendance count after retry:", finalCount);
    console.log("Write lock:", finalSession?.attendanceWriteLock);

    if (
      !rejectedAsExpected ||
      finalCount !== existingCount ||
      finalSession?.attendanceWriteLock !== false
    ) {
      throw new Error("Duplicate submission test failed.");
    }

    console.log(
      "SUCCESS: duplicate submission was rejected; existing records remain unchanged."
    );
  } finally {
    await mongoose.disconnect();
  }
}

runTest().catch((error) => {
  console.error("TEST FAILED:", error.message);
  process.exitCode = 1;
});
