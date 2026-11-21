
require("dotenv").config({ path: ".env.test" });

const mongoose = require("mongoose");
const Student = require("../src/modules/students/Student");
const Attendance = require("../src/modules/attendance/Attendance");

const STUDENT_ID = process.env.TEST_STUDENT_ID;
const SCHOOL_1_ID = process.env.TEST_SCHOOL_ID;
const SCHOOL_2_ID = process.env.TEST_OTHER_SCHOOL_ID;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }

  console.log(`PASS: ${message}`);
}

async function main() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is missing.");
  }

  const parsedUri = new URL(uri);

  if (
    !["localhost", "127.0.0.1"].includes(parsedUri.hostname) ||
    parsedUri.pathname.replace(/^\/+/, "") !==
      "smart_school_bd_test" ||
    parsedUri.searchParams.get("replicaSet") !== "rs0"
  ) {
    throw new Error(
      "Safety check failed: local smart_school_bd_test required."
    );
  }

  for (const [name, value] of [
    ["TEST_STUDENT_ID", STUDENT_ID],
    ["TEST_SCHOOL_ID", SCHOOL_1_ID],
    ["TEST_OTHER_SCHOOL_ID", SCHOOL_2_ID],
  ]) {
    if (!value || !mongoose.isValidObjectId(value)) {
      throw new Error(`${name} must be a valid ObjectId.`);
    }
  }

  if (SCHOOL_1_ID === SCHOOL_2_ID) {
    throw new Error("The school IDs must be different.");
  }

  await mongoose.connect(uri);

  try {
    assert(
      mongoose.connection.name === "smart_school_bd_test",
      "Connected to the dedicated test database"
    );

    // Confirm the test student belongs to School 1.
    const student = await Student.findOne({
      _id: STUDENT_ID,
      schoolId: SCHOOL_1_ID,
    })
      .select("_id schoolId")
      .lean();

    assert(student !== null, "Test student belongs to School 1");

    // Read-only: inspect this student's attendance records.
    const school1Records = await Attendance.find({
      studentId: STUDENT_ID,
      schoolId: SCHOOL_1_ID,
    })
      .select("_id schoolId studentId date status")
      .lean();

    console.log(
      `School 1 attendance records for test student: ${school1Records.length}`
    );

    // Read-only: check whether School 2 can match those records
    // using the same student ID and its own school scope.
    const school2Match = await Attendance.findOne({
      studentId: STUDENT_ID,
      schoolId: SCHOOL_2_ID,
    })
      .select("_id")
      .lean();

    assert(
      school2Match === null,
      "School 2 scoped query cannot find School 1 student's attendance"
    );

    // Every record found under School 1 must have School 1's scope.
    assert(
      school1Records.every(
        (record) =>
          String(record.schoolId) === SCHOOL_1_ID &&
          String(record.studentId) === STUDENT_ID
      ),
      "School 1 attendance results match the expected school and student"
    );

    // Read-only: search School 2 for attendance records belonging
    // to the School 1 student. This should return no results.
    const crossSchoolRecords = await Attendance.find({
      schoolId: SCHOOL_2_ID,
      studentId: STUDENT_ID,
    })
      .select("_id")
      .lean();

    assert(
      crossSchoolRecords.length === 0,
      "No School 1 student attendance records are exposed by School 2 scoped query"
    );

    console.log(
      "\nSUCCESS: read-only attendance isolation checks passed."
    );
    console.log(
      "No attendance records were created, updated or deleted."
    );
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(
    "\nREAD-ONLY ATTENDANCE VERIFICATION FAILED:",
    error.message
  );
  process.exitCode = 1;
});
