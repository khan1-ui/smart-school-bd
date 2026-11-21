
require("dotenv").config({ path: ".env.test" });

const mongoose = require("mongoose");
const Student = require("../src/modules/students/Student");
const AttendanceSession = require("../src/modules/attendance/AttendanceSession");
const Attendance = require("../src/modules/attendance/Attendance");

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

    const testDate = "2026-10-30";
    const date = new Date(`${testDate}T00:00:00.000Z`);

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

    const students = await Student.find({
      schoolId,
      className,
      section: normalizedSection,
      academicYear,
      status: "active",
    })
      .select("_id")
      .limit(2)
      .lean();

    if (students.length !== 2) {
      throw new Error(
        "Rollback test requires at least two active test students."
      );
    }

    // নিরাপত্তা: এই তারিখে আগে session বা attendance থাকলে থামবে।
    const existingSession = await AttendanceSession.exists({
      schoolId,
      className,
      section: normalizedSection,
      academicYear,
      date,
    });

    const existingAttendance = await Attendance.exists({
      schoolId,
      className,
      section: normalizedSection,
      academicYear,
      date,
    });

    if (existingSession || existingAttendance) {
      throw new Error(
        "Test date is already in use. Choose a different unused date."
      );
    }

    // Attendance schema-তে প্রয়োজনীয় fields ব্যবহার করে দুটি record বানাই।
    const docs = students.map((student) => ({
      schoolId,
      studentId: student._id,
      className,
      section: normalizedSection,
      academicYear,
      date,
      status: "present",
      markedBy: new mongoose.Types.ObjectId(),
      method: "manual",
    }));

    // দ্বিতীয় record-এর studentId ইচ্ছাকৃতভাবে প্রথমটির সমান।
    // একই transaction-এ unique index conflict হবে।
    docs[1].studentId = docs[0].studentId;

    console.log("Database:", mongoose.connection.name);
    console.log("Test date:", testDate);
    console.log("Intentionally causing duplicate-key failure...");

    const mongoSession = await mongoose.startSession();

    let failureObserved = false;

    try {
      await mongoSession.withTransaction(async () => {
        await Attendance.insertMany(docs, {
          ordered: true,
          session: mongoSession,
        });
      });
    } catch (error) {
      console.log("Expected failure:", error.code, error.message);

      if (error.code === 11000) {
        failureObserved = true;
      } else {
        throw error;
      }
    } finally {
      await mongoSession.endSession();
    }

    const countAfter = await Attendance.countDocuments({
      schoolId,
      className,
      section: normalizedSection,
      academicYear,
      date,
    });

    console.log("Attendance count after failed transaction:", countAfter);

    if (!failureObserved) {
      throw new Error("Expected duplicate-key failure did not occur.");
    }

    if (countAfter !== 0) {
      throw new Error(
        "Rollback verification failed: attendance records were found."
      );
    }

    console.log(
      "SUCCESS: failed transaction left zero attendance records."
    );
  } finally {
    await mongoose.disconnect();
  }
}

runTest().catch((error) => {
  console.error("TEST FAILED:", error.message);
  process.exitCode = 1;
});
