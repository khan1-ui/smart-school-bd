
require("dotenv").config({ path: ".env.test" });

const mongoose = require("mongoose");
const Attendance = require("../src/modules/attendance/Attendance");
const AttendanceSession = require("../src/modules/attendance/AttendanceSession");

const TEST_DB = "smart_school_bd_test";
const schoolId = "6ada0299bf7ec1a8a22f300c";

const studentIds = [
  "6ada029abf7ec1a8a22f300e",
  "6ada029abf7ec1a8a22f300f",
];

const date = new Date("2026-10-27T00:00:00.000Z");

async function inspect() {
  try {
    const uri = process.env.MONGODB_URI;

    if (!uri || new URL(uri).pathname !== `/${TEST_DB}`) {
      throw new Error("Safety stop: incorrect test database URI");
    }

    await mongoose.connect(uri);

    if (mongoose.connection.name !== TEST_DB) {
      throw new Error("Safety stop: connected to wrong database");
    }

    const records = await Attendance.find({
      schoolId,
      studentId: { $in: studentIds },
      academicYear: "2026",
      date,
    })
      .select("studentId className section status date")
      .lean();

    const session = await AttendanceSession.findOne({
      schoolId,
      className: "Six",
      section: "A",
      academicYear: "2026",
      date,
    })
      .select("status attendanceWriteLock")
      .lean();

    console.log("Database:", mongoose.connection.name);
    console.log("Attendance records:", records.length);
    console.log("Records:", records);
    console.log("Session:", session);
  } catch (error) {
    console.error("INSPECTION FAILED:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

inspect();
