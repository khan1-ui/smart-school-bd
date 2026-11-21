
require("dotenv").config({ path: ".env.test" });

const mongoose = require("mongoose");
const Attendance = require("../src/modules/attendance/Attendance");

const {
  getClassAttendanceReport,
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

    // Reuse an existing test record; do not create or modify data.
    const sample = await Attendance.findOne({
      date: new Date("2026-11-04T00:00:00.000Z"),
    }).lean();

    if (!sample) {
      throw new Error(
        "No attendance found for 2026-11-04. No data was changed."
      );
    }

    console.log("Database:", mongoose.connection.name);
    console.log("Test date: 2026-11-04");
    console.log("Class:", sample.className);
    console.log("Section:", sample.section);
    console.log("Academic year:", sample.academicYear);
    console.log("Calling getClassAttendanceReport...");

    const report = await getClassAttendanceReport(
      String(sample.schoolId),
      {
        className: sample.className,
        section: sample.section,
        academicYear: sample.academicYear,
        date: "2026-11-04",
      }
    );

    if (report == null) {
      throw new Error("Report returned no result.");
    }

    console.log("Report result:");
    console.dir(report, { depth: 5 });

    console.log("SUCCESS: report function returned a result.");
    console.log("READ-ONLY TEST: no records were created or modified.");
  } finally {
    await mongoose.disconnect();
  }
}

runTest().catch((error) => {
  console.error("REPORT TEST FAILED:", error.message);
  process.exitCode = 1;
});
