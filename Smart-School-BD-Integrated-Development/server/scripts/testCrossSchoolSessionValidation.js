
require("dotenv").config({ path: ".env.test" });

const jwt = require("jsonwebtoken");

const API_URL =
  process.env.TEST_API_URL || "http://localhost:5000";

const SCHOOL_1_ID = process.env.TEST_SCHOOL_ID;
const SCHOOL_2_ID = process.env.TEST_OTHER_SCHOOL_ID;
const OTHER_ADMIN_ID = process.env.TEST_OTHER_ADMIN_ID;

// Existing School 1 session, obtained by the read-only listing script.
const SCHOOL_1_SESSION_ID = "6ada3d54d047ffb1559d962b";

async function main() {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_ACCESS_SECRET is missing or too short.");
  }

  if (
    !SCHOOL_1_ID ||
    !SCHOOL_2_ID ||
    !OTHER_ADMIN_ID ||
    SCHOOL_1_ID === SCHOOL_2_ID
  ) {
    throw new Error("Test school/admin configuration is invalid.");
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

  const endpoint =
    `${API_URL}/api/attendance/sessions/` +
    `${SCHOOL_1_SESSION_ID}/validation`;

  console.log("Request: GET", endpoint);
  console.log("JWT school context: School 2");
  console.log("Target session belongs to: School 1");

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const body = await response.json().catch(() => null);

  console.log("HTTP status:", response.status);
  console.log("Response:", body);

  if (response.status === 404) {
    console.log(
      "PASS: School 2 cannot access School 1 session validation."
    );
    console.log("Read-only GET only; no write request was sent.");
    return;
  }

  if (response.status === 200) {
    throw new Error(
      "FAIL: School 2 received HTTP 200 for School 1 session. " +
      "Inspect the response immediately."
    );
  }

  throw new Error(
    `INCONCLUSIVE: expected HTTP 404, received ${response.status}.`
  );
}

main().catch((error) => {
  console.error("TEST FAILED:", error.message);
  process.exitCode = 1;
});
