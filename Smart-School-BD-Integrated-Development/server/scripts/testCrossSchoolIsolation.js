
require("dotenv").config({ path: ".env.test" });

const jwt = require("jsonwebtoken");

const API_URL = process.env.TEST_API_URL || "http://localhost:5000";
const SECRET = process.env.JWT_ACCESS_SECRET;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }

  console.log(`PASS: ${message}`);
}

function isObjectId(value) {
  return typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
}

function makeToken(adminId, schoolId) {
  return jwt.sign(
    {
      sub: adminId,
      schoolId,
      role: "school_admin",
    },
    SECRET,
    {
      algorithm: "HS256",
      expiresIn: "5m",
    }
  );
}

async function get(path, token) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const raw = await response.text();
  let data;

  try {
    data = JSON.parse(raw);
  } catch {
    data = raw;
  }

  return {
    status: response.status,
    data,
  };
}

async function run() {
  const uri = process.env.MONGODB_URI;
  const school1Id = process.env.TEST_SCHOOL_ID;
  const school2Id = process.env.TEST_OTHER_SCHOOL_ID;
  const admin2Id = process.env.TEST_OTHER_ADMIN_ID;
  const student1Id = process.env.TEST_STUDENT_ID;

  // Require the dedicated local test database.
  if (!uri || !SECRET || SECRET.length < 32) {
    throw new Error("Missing test database URI or valid JWT secret.");
  }

  let parsedUri;

  try {
    parsedUri = new URL(uri);
  } catch {
    throw new Error("Invalid test MongoDB URI.");
  }

  if (
    parsedUri.hostname !== "127.0.0.1" &&
    parsedUri.hostname !== "localhost"
  ) {
    throw new Error("Only a local MongoDB test database is allowed.");
  }

  if (
    parsedUri.pathname.replace(/^\/+/, "") !== "smart_school_bd_test" ||
    parsedUri.searchParams.get("replicaSet") !== "rs0"
  ) {
    throw new Error("Expected smart_school_bd_test with replicaSet=rs0.");
  }

  const api = new URL(API_URL);

  if (!["localhost", "127.0.0.1"].includes(api.hostname)) {
    throw new Error("Only a localhost test API is allowed.");
  }

  for (const [label, id] of [
    ["TEST_SCHOOL_ID", school1Id],
    ["TEST_OTHER_SCHOOL_ID", school2Id],
    ["TEST_OTHER_ADMIN_ID", admin2Id],
    ["TEST_STUDENT_ID", student1Id],
  ]) {
    if (!isObjectId(id)) {
      throw new Error(`${label} must be a valid MongoDB ObjectId.`);
    }
  }

  if (school1Id === school2Id) {
    throw new Error("The two school IDs must be different.");
  }

  // Confirm the configured admin is assigned to School 2.
  // The admin ID is taken from the dedicated test setup.
  const token = makeToken(admin2Id, school2Id);

  console.log("API:", API_URL);
  console.log("Database configured:", "smart_school_bd_test");
  console.log("Request school:", school2Id);
  console.log("Student owner school:", school1Id);
  console.log("\nTesting read-only cross-school access...\n");

  // Test 1: School 2 admin must not read School 1's student.
  const detail = await get(`/api/students/${student1Id}`, token);

  console.log("Student detail status:", detail.status);
  console.log("Student detail response:", detail.data);

  assert(
    detail.status === 404,
    `another school's student detail is denied (HTTP ${detail.status})`
  );

  // Test 2: School 2's student list must not contain School 1's student.
  const list = await get("/api/students?limit=100", token);

  console.log("Student list status:", list.status);

  assert(
    list.status === 200,
    `student list request succeeds (HTTP ${list.status})`
  );

  const students = list.data?.data?.students;

  assert(
    Array.isArray(students),
    "student list has the expected data.students array"
  );

  assert(
    !students.some((student) => String(student._id) === student1Id),
    "School 1 student is absent from School 2's student list"
  );

  console.log("\nSUCCESS: read-only cross-school checks passed.");
  console.log("No write requests were sent.");
}

run().catch((error) => {
  console.error("\nCROSS-SCHOOL TEST FAILED:", error.message);
  process.exitCode = 1;
});
