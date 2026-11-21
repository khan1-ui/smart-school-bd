
require("dotenv").config({ path: ".env.test" });

const mongoose = require("mongoose");
const Student = require("../src/modules/students/Student");
const {
  validateUpdateStudent,
} = require("../src/modules/students/studentValidation");

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
    throw new Error("The two school IDs must be different.");
  }

  await mongoose.connect(uri);

  try {
    assert(
      mongoose.connection.name === "smart_school_bd_test",
      "Connected to the dedicated test database"
    );

    // Read the known student without modifying it.
    const student = await Student.findById(STUDENT_ID)
      .select("_id schoolId status")
      .lean();

    assert(student !== null, "Test student exists");

    assert(
      String(student.schoolId) === SCHOOL_1_ID,
      "Test student belongs to School 1"
    );

    // Reproduce the school-scoped lookup used by updateStudent.
    const crossSchoolMatch = await Student.findOne({
      _id: STUDENT_ID,
      schoolId: SCHOOL_2_ID,
      status: "active",
    })
      .select("_id")
      .lean();

    assert(
      crossSchoolMatch === null,
      "School 2 scoped query cannot find School 1's student"
    );

    // Verify that protected tenant fields are rejected by validation.
    const validation = validateUpdateStudent({
      schoolId: SCHOOL_2_ID,
    });

    assert(
      Boolean(validation.error),
      "Update validation rejects schoolId as an unknown field"
    );

    console.log(
      "\nSUCCESS: read-only update-isolation checks passed."
    );
    console.log("No create, update or delete operation was performed.");
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error("\nREAD-ONLY VERIFICATION FAILED:", error.message);
  process.exitCode = 1;
});
