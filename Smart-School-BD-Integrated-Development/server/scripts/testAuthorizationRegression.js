
require("dotenv").config({ path: ".env.test" });

const jwt = require("jsonwebtoken");

const API_URL = process.env.TEST_API_URL || "http://localhost:5000";
const SECRET = process.env.JWT_ACCESS_SECRET;

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

function makeToken(role, schoolId) {
  return jwt.sign(
    {
      sub: String(process.env.TEST_USER_ID),
      schoolId: String(schoolId),
      role,
    },
    SECRET,
    { algorithm: "HS256", expiresIn: "5m" }
  );
}

async function request(path, { token, method = "GET", body } = {}) {
  const headers = {};

  if (token) headers.Authorization = `Bearer ${token}`;

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const raw = await response.text();

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = raw;
  }

  return { status: response.status, data };
}

async function run() {
  if (
    !SECRET ||
    SECRET.length < 32 ||
    !process.env.TEST_USER_ID ||
    !process.env.TEST_SCHOOL_ID ||
    !process.env.TEST_OTHER_SCHOOL_ID ||
    !process.env.TEST_STUDENT_ID ||
    !process.env.MONGODB_URI ||
    !process.env.MONGODB_URI.includes("/smart_school_bd_test") ||
    !process.env.MONGODB_URI.includes("replicaSet=rs0")
  ) {
    throw new Error(
      "Safety check failed: verify .env.test and all TEST_* variables."
    );
  }

  const api = new URL(API_URL);

  if (!["localhost", "127.0.0.1"].includes(api.hostname)) {
    throw new Error("Safety check failed: tests are limited to localhost.");
  }

  if (process.env.TEST_SCHOOL_ID === process.env.TEST_OTHER_SCHOOL_ID) {
    throw new Error("The two test school IDs must be different.");
  }

  const studentId = process.env.TEST_STUDENT_ID;

  if (!/^[a-f\d]{24}$/i.test(studentId)) {
    throw new Error("TEST_STUDENT_ID must be a valid ObjectId.");
  }

  const teacherToken = makeToken(
    "teacher",
    process.env.TEST_SCHOOL_ID
  );

  const otherSchoolAdminToken = makeToken(
    "school_admin",
    process.env.TEST_OTHER_SCHOOL_ID
  );

  console.log("API:", API_URL);
  console.log("Running non-mutating authorization regression tests...\n");

  // Role middleware should reject these before controllers run.
  const createAttempt = await request("/api/students", {
    method: "POST",
    token: teacherToken,
    body: {},
  });

  assert(
    createAttempt.status === 403,
    `teacher cannot create students (HTTP ${createAttempt.status})`
  );

  const updateAttempt = await request(`/api/students/${studentId}`, {
    method: "PATCH",
    token: teacherToken,
    body: {},
  });

  assert(
    updateAttempt.status === 403,
    `teacher cannot update students (HTTP ${updateAttempt.status})`
  );

  const deleteAttempt = await request(`/api/students/${studentId}`, {
    method: "DELETE",
    token: teacherToken,
  });

  assert(
    deleteAttempt.status === 403,
    `teacher cannot deactivate students (HTTP ${deleteAttempt.status})`
  );

  // Read-only report request under a different school context.
  const report = await request(
    "/api/attendance/report?className=Six&section=A&academicYear=2026&date=2026-11-04",
    { token: otherSchoolAdminToken }
  );

  assert(
    report.status === 200,
    `other-school attendance report request handled (HTTP ${report.status})`
  );

  const responseText = JSON.stringify(report.data);

  assert(
    !responseText.includes(studentId),
    "attendance report does not expose the known student ID"
  );

  console.log(
    "\nSUCCESS: role regression and basic report isolation checks passed."
  );
  console.log(
    "NOTE: Cross-school attendance creation has not been tested by this script."
  );
}

run().catch((error) => {
  console.error("\nAUTHORIZATION TEST FAILED:", error.message);
  process.exitCode = 1;
});
