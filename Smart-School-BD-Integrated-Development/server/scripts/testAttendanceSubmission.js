
require("dotenv").config({ path: ".env.test" });

const mongoose = require("mongoose");

// এই import path দুটি তোমার প্রকৃত ফাইলপথ অনুযায়ী মিলিয়ে নিও।
const Student = require("../src/modules/students/Student");
const AttendanceSession = require("../src/modules/attendance/AttendanceSession");
const Attendance = require("../src/modules/attendance/Attendance");

// markClassAttendance যেই ফাইলে export করা হয়েছে,
// সেখান থেকে import করতে হবে।
const {
  markClassAttendance,
} = require("../src/modules/attendance/attendanceService");

const TEST_DATE = "2026-10-29";

async function runTest() {
  const uri = process.env.MONGODB_URI;

  if (
    !uri ||
    !uri.includes("/smart_school_bd_test") ||
    !uri.includes("replicaSet=rs0")
  ) {
    throw new Error(
      "Safety check failed: expected smart_school_bd_test with replicaSet=rs0"
    );
  }

  await mongoose.connect(uri);

  try {
    console.log("Database:", mongoose.connection.name);

    if (mongoose.connection.name !== "smart_school_bd_test") {
      throw new Error("Wrong database. Test stopped.");
    }

    // Test database-এ একটি উপযুক্ত ক্লাসের সক্রিয় শিক্ষার্থী খুঁজি।
    const firstStudent = await Student.findOne({
      status: "active",
    }).lean();

    if (!firstStudent) {
      throw new Error(
        "No active test student found. Seed the test database first."
      );
    }

    const {
      schoolId,
      className,
      section,
      academicYear,
    } = firstStudent;

    const userId = process.env.TEST_USER_ID;

    if (!userId || !mongoose.isValidObjectId(userId)) {
      throw new Error(
        "Set TEST_USER_ID in .env.test to a valid test user ID."
      );
    }

    // ওই ক্লাসের সব সক্রিয় শিক্ষার্থী সংগ্রহ করি।
    const students = await Student.find({
      schoolId,
      className,
      section: section || "",
      academicYear,
      status: "active",
    })
      .select("_id")
      .lean();

    if (!students.length) {
      throw new Error("No active students found for the selected class.");
    }

    const date = new Date(`${TEST_DATE}T00:00:00.000Z`);

    // আগে থেকে session বা attendance থাকলে পরীক্ষা থামবে।
    const existingSession = await AttendanceSession.exists({
      schoolId,
      className,
      section: section || "",
      academicYear,
      date,
    });

    const existingRecords = await Attendance.exists({
      schoolId,
      className,
      section: section || "",
      academicYear,
      date,
    });

    if (existingSession || existingRecords) {
      throw new Error(
        "Test date already has a session or attendance. Choose another date."
      );
    }

    // নতুন test session তৈরি করি।
    const session = await AttendanceSession.create({
      schoolId,
      className,
      section: section || "",
      academicYear,
      date,
      createdBy: userId,
      status: "in_progress",
      lastActivityAt: new Date(),
    });

    console.log("Session created:", String(session._id));

    const records = students.map((student, index) => ({
      studentId: String(student._id),
      status: index === 0 ? "present" : "absent",
    }));

    const result = await markClassAttendance(
      String(schoolId),
      userId,
      {
        className,
        section: section || "",
        academicYear,
        date: TEST_DATE,
        records,
      }
    );

    console.log("createdCount:", result?.createdCount);
    console.log(
      "Returned attendance records:",
      result?.attendance?.length
    );

    const savedCount = await Attendance.countDocuments({
      schoolId,
      className,
      section: section || "",
      academicYear,
      date,
    });

    const finalSession = await AttendanceSession.findById(
      session._id
    ).lean();

    console.log("Saved attendance count:", savedCount);
    console.log(
      "Write lock:",
      finalSession?.attendanceWriteLock
    );

    if (
      result?.createdCount !== students.length ||
      result?.attendance?.length !== students.length ||
      savedCount !== students.length ||
      finalSession?.attendanceWriteLock !== false
    ) {
      throw new Error("Attendance submission verification failed.");
    }

    console.log(
      "SUCCESS: attendance submission verified."
    );
  } finally {
    await mongoose.disconnect();
  }
}

runTest().catch((error) => {
  console.error("TEST FAILED:", error.message);
  process.exitCode = 1;
});
