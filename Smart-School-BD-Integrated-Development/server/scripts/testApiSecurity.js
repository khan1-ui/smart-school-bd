
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

function createTestToken(role, options = {}) {
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    sub: process.env.TEST_USER_ID || "6ada0299bf7ec1a8a22f300d",
    schoolId: process.env.TEST_SCHOOL_ID || "6ada0299bf7ec1a8a22f300c",
    role,
    iat: now,
    ...options,
  };

  return jwt.sign(payload, SECRET, { algorithm: "HS256" });
}

async function request(path, { token, method = "GET", body } = {}) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: response.status, data };
}

async function runTests() {
  if (!SECRET || SECRET.length < 32) {
    throw new Error(
      "JWT_ACCESS_SECRET missing or shorter than 32 characters in .env.test"
    );
  }

  if (
    !process.env.MONGODB_URI ||
    !process.env.MONGODB_URI.includes("/smart_school_bd_test") ||
    !process.env.MONGODB_URI.includes("replicaSet=rs0")
  ) {
    throw new Error(
      "Safety check failed: .env.test must target smart_school_bd_test with replicaSet=rs0"
    );
  }

  console.log("API:", API_URL);
  console.log("Running non-mutating API security tests...\n");

  // 1. No token must be rejected.
  const noToken = await request("/api/attendance/report");

  assert(
    noToken.status === 401,
    `missing token rejected (HTTP ${noToken.status})`
  );

  // 2. Invalid token must be rejected.
  const invalidToken = await request("/api/attendance/report", {
    token: "invalid.test.token",
  });

  assert(
    invalidToken.status === 401,
    `invalid token rejected (HTTP ${invalidToken.status})`
  );

  // 3. Expired token must be rejected.
  const now = Math.floor(Date.now() / 1000);

  const expiredToken = createTestToken("school_admin", {
    iat: now - 120,
    exp: now - 60,
  });

  const expired = await request("/api/attendance/report", {
    token: expiredToken,
  });

  assert(
    expired.status === 401,
    `expired token rejected (HTTP ${expired.status})`
  );

  // 4. A teacher must not access the admin-only class attendance route.
  const teacherToken = createTestToken("teacher");

  const teacherAttempt = await request("/api/attendance/class", {
    method: "POST",
    token: teacherToken,
    body: {},
  });

  assert(
    teacherAttempt.status === 403,
    `teacher denied admin-only route (HTTP ${teacherAttempt.status})`
  );

  console.log("\nSUCCESS: API authentication/role tests passed.");
}

runTests().catch((error) => {
  console.error("\nSECURITY TEST FAILED:", error.message);
  process.exitCode = 1;
});
