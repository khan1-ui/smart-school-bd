
require("dotenv").config({ path: ".env.test" });

const mongoose = require("mongoose");

const School = require("../src/modules/schools/School");
const Student = require("../src/modules/students/Student");
const User = require("../src/modules/users/User");
const AttendanceSession = require("../src/modules/attendance/AttendanceSession");

const TEST_DB = "smart_school_bd_test";
const TEST_CODE = "TXN-TEST-001";
const TEST_EMAIL = "txn-test-admin@example.test";

async function setup() {
  try {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      throw new Error("Test MONGODB_URI is missing");
    }

    const parsedUri = new URL(uri);
    const dbName = parsedUri.pathname.replace("/", "");

    if (dbName !== TEST_DB) {
      throw new Error(`Refusing unexpected database: ${dbName}`);
    }

    await mongoose.connect(uri);

    if (mongoose.connection.name !== TEST_DB) {
      throw new Error("Connected to an unexpected database");
    }

    const existingSchool = await School.findOne({
      schoolCode: TEST_CODE,
    }).select("_id");

    if (existingSchool) {
      throw new Error(
        "Test school already exists. No data was changed. Inspect the test database before retrying."
      );
    }

    const school = await School.create({
      name: "Transaction Test School",
      schoolCode: TEST_CODE,
      institutionType: "private",
      address: "Test Address",
      district: "Jamalpur",
      status: "active",
    });

    const user = await User.create({
      schoolId: school._id,
      name: "Transaction Test Admin",
      email: TEST_EMAIL,
      passwordHash: "TEST_ONLY_NOT_A_REAL_PASSWORD_HASH",
      role: "school_admin",
      status: "active",
    });

    const students = await Student.create([
      {
        schoolId: school._id,
        admissionNumber: "TXN-TEST-STU-001",
        name: "Test Student One",
        className: "Six",
        section: "A",
        rollNumber: 1,
        academicYear: "2026",
        guardianName: "Test Guardian One",
        guardianPhone: "01700000001",
        status: "active",
      },
      {
        schoolId: school._id,
        admissionNumber: "TXN-TEST-STU-002",
        name: "Test Student Two",
        className: "Six",
        section: "A",
        rollNumber: 2,
        academicYear: "2026",
        guardianName: "Test Guardian Two",
        guardianPhone: "01700000002",
        status: "active",
      },
    ]);

    const attendanceSession = await AttendanceSession.create({
      schoolId: school._id,
      className: "Six",
      section: "A",
      academicYear: "2026",
      date: new Date("2026-10-23T00:00:00.000Z"),
      status: "in_progress",
      createdBy: user._id,
      attendanceWriteLock: false,
    });

    console.log("Test fixtures created successfully.");
    console.log("Database:", mongoose.connection.name);
    console.log("School ID:", String(school._id));
    console.log("User ID:", String(user._id));
    console.log(
      "Student IDs:",
      students.map((student) => String(student._id))
    );
    console.log("Session ID:", String(attendanceSession._id));
  } catch (error) {
    console.error("Test setup failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

setup();
