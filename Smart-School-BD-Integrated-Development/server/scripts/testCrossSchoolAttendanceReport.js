
require("dotenv").config({ path: ".env.test" });

const jwt = require("jsonwebtoken");

const API_URL =
  process.env.TEST_API_URL || "http://localhost:5000";

const SCHOOL_1_ID = process.env.TEST_SCHOOL_ID;
const SCHOOL_2_ID = process.env.TEST_OTHER_SCHOOL_ID;
const OTHER_ADMIN_ID = process.env.TEST_OTHER_ADMIN_ID;
const SCHOOL_1_STUDENT_ID = process.env.TEST_STUDENT_ID;

const reportQuery = {
  className: process.env.TEST_REPORT_CLASS,
  section: process.env.TEST_REPORT_SECTION ?? "",
  academicYear: process.env.TEST_REPORT_ACADEMIC_YEAR,
  date: process.env.TEST_REPORT_DATE,
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }

  console.log(`PASS: ${message}`);
}

async function main() {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_ACCESS_SECRET is missing or too short.");
  }

  if (
    !SCHOOL_1_ID ||
    !SCHOOL_2_ID ||
    !OTHER_ADMIN_ID ||
    !SCHOOL_1_STUDENT_ID ||
    SCHOOL_1_ID === SCHOOL_2_ID
  ) {
    throw new Error("School/admin/student test configuration is invalid.");
  }

  for (const [key, value] of Object.entries(reportQuery)) {
    if (typeof value !== "string" || !value.trim()) {
      if (key === "section" && value === "") continue;
      throw new Error(`${key} is missing in .env.test`);
    }
  }

  const api = new URL(API_URL);

  if (
    api.protocol !== "http:" ||
    !["localhost", "127.0.0.1"].includes(api.hostname)
  ) {
    throw new Error("Safety check failed: use local test API only.");
  }

  const token = jwt.sign(
    {
      sub: OTHER_ADMIN_ID,
      schoolId: SCHOOL_2_ID,
      role: "school_admin",
    },
    secret,
    {
      algorithm: "HS256",
      expiresIn: "5m",
    }
  );

  const endpoint = new URL("/api/attendance/report", API_URL);

  for (const [key, value] of Object.entries(reportQuery)) {
    endpoint.searchParams.set(key, value);
  }

  console.log("Request: GET", endpoint.toString());
  console.log("JWT school context: School 2");
  console.log("Known School 1 student ID:", SCHOOL_1_STUDENT_ID);

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const body = await response.json().catch(() => null);

  console.log("HTTP status:", response.status);

  if (response.status !== 200) {
    console.log("Response:", body);
    throw new Error(
      `Report request failed with HTTP ${response.status}.`
    );
  }

  assert(body?.success === true, "API reports success");
  assert(
    Array.isArray(body?.data?.students),
    "Report contains a students array"
  );

  const students = body.data.students;
  const summary = body.data.summary;

  assert(
    summary && typeof summary === "object",
    "Report contains a summary object"
  );

  assert(
    students.every(
      (student) =>
        String(student._id) !== SCHOOL_1_STUDENT_ID &&
        String(student.id) !== SCHOOL_1_STUDENT_ID
    ),
    "Known School 1 student is absent from School 2 report"
  );

  assert(
    summary.totalStudents === students.length,
    "Summary totalStudents matches the returned student count"
  );

  const statusTotal =
    summary.present +
    summary.absent +
    summary.late +
    summary.notMarked;

  assert(
    statusTotal === summary.totalStudents,
    "Attendance status totals match totalStudents"
  );

  console.log("Returned students:", students.length);
  console.log("Report summary:", summary);

  if (students.length === 0) {
    console.log(
      "NOTE: Empty report is consistent with no matching School 2 students; " +
      "this alone does not prove every report query is isolated."
    );
  }

  console.log(
    "\nSUCCESS: report response consistency and known-student isolation checks passed."
  );
  console.log("GET only. No write requests were sent.");
}

main().catch((error) => {
  console.error("\nREPORT SECURITY TEST FAILED:", error.message);
  process.exitCode = 1;
});
