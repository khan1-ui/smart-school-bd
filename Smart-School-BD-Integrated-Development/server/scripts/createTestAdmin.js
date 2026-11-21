
require("dotenv").config({ path: ".env.test" });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const School = require("../src/modules/schools/School");
const User = require("../src/modules/users/User");

const SCHOOL_CODE = "SSD-SEC-TEST-002";
const TEST_EMAIL = "cross-school-admin@example.invalid";

async function main() {
  const uri = process.env.MONGODB_URI;
  const secret = process.env.JWT_ACCESS_SECRET;

  // Validate test database configuration before connecting.
  if (!uri) {
    throw new Error("MONGODB_URI is missing from .env.test");
  }

  let parsedUri;

  try {
    parsedUri = new URL(uri);
  } catch {
    throw new Error("Invalid MongoDB URI.");
  }

  if (
    parsedUri.pathname.replace(/^\/+/, "") !==
      "smart_school_bd_test" ||
    parsedUri.searchParams.get("replicaSet") !== "rs0" ||
    !["127.0.0.1", "localhost"].includes(parsedUri.hostname)
  ) {
    throw new Error(
      "Safety check failed: local smart_school_bd_test is required."
    );
  }

  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_ACCESS_SECRET must be at least 32 characters in .env.test"
    );
  }

  await mongoose.connect(uri);

  if (mongoose.connection.name !== "smart_school_bd_test") {
    throw new Error("Connected to the wrong database.");
  }

  console.log("Connected database:", mongoose.connection.name);

  const school = await School.findOne({
    schoolCode: SCHOOL_CODE,
  });

  if (!school) {
    throw new Error("Second test school was not found.");
  }

  // Keep the test school's existing status unchanged.
  if (school.status !== "pending") {
    throw new Error(
      `Expected pending school, found: ${school.status}. Aborting.`
    );
  }

  const existingAdmin = await User.findOne({
    schoolId: school._id,
    role: "school_admin",
  });

  if (existingAdmin) {
    throw new Error(
      "A test school admin already exists. No changes made."
    );
  }

  // This random password is not displayed or used for login.
  // Authentication for this isolated test uses a short-lived JWT.
  const temporaryPassword = crypto.randomBytes(32).toString("hex");
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  const admin = await User.create({
    schoolId: school._id,
    name: "Cross School Security Test Admin",
    email: TEST_EMAIL,
    passwordHash,
    role: "school_admin",
    status: "active",
  });

  const accessToken = jwt.sign(
    {
      sub: admin._id.toString(),
      schoolId: school._id.toString(),
      role: "school_admin",
    },
    secret,
    {
      algorithm: "HS256",
      expiresIn: "15m",
    }
  );

  console.log("\nTest admin created successfully.");
  console.log("School:", school.schoolCode);
  console.log("School status remains:", school.status);
  console.log("Admin ID:", admin._id.toString());
  console.log("Admin email:", admin.email);
  console.log("Admin status:", admin.status);
  console.log("JWT expires in: 15 minutes");
  console.log("\nTEST ACCESS TOKEN (keep private):\n");
  console.log(accessToken);
  console.log("\nNo student or attendance records were changed.");
}

main()
  .catch((error) => {
    console.error("Test admin setup failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
