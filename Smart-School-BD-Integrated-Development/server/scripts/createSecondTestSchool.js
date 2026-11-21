
require("dotenv").config({ path: ".env.test" });

const mongoose = require("mongoose");
const School = require("../src/modules/schools/School");

const TEST_SCHOOL_CODE = "SSD-SEC-TEST-002";

async function main() {
  const uri = process.env.MONGODB_URI;

  // Safety checks: never run against the main database.
  if (
    !uri ||
    !uri.includes("/smart_school_bd_test") ||
    !uri.includes("replicaSet=rs0")
  ) {
    throw new Error(
      "Safety check failed: expected smart_school_bd_test with replicaSet=rs0."
    );
  }

  await mongoose.connect(uri);

  if (mongoose.connection.name !== "smart_school_bd_test") {
    throw new Error(
      `Wrong database connected: ${mongoose.connection.name}`
    );
  }

  console.log("Connected database:", mongoose.connection.name);

  // Idempotent: reuse this test school if it already exists.
  let school = await School.findOne({
    schoolCode: TEST_SCHOOL_CODE,
  });

  if (school) {
    console.log("Test school already exists.");
  } else {
    school = await School.create({
      name: "Smart School Security Test Two",
      schoolCode: TEST_SCHOOL_CODE,
      institutionType: "private",
      address: "Test Address, Security Testing",
      district: "Jamalpur",
      upazila: "Jamalpur Sadar",
      status: "pending",
    });

    console.log("Second test school created.");
  }

  console.log("School code:", school.schoolCode);
  console.log("School ID:", school._id.toString());
  console.log("Status:", school.status);
  console.log("No student or attendance records were changed.");
}

main()
  .catch((error) => {
    console.error("Test school setup failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
