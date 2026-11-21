
require("dotenv").config({ path: ".env.test" });

const mongoose = require("mongoose");
const School = require("../src/modules/schools/School");
const User = require("../src/modules/users/User");

async function main() {
  const uri = process.env.MONGODB_URI;

  if (
    !uri ||
    !uri.includes("/smart_school_bd_test") ||
    !uri.includes("replicaSet=rs0")
  ) {
    throw new Error("Safety check failed: test database required.");
  }

  await mongoose.connect(uri);

  if (mongoose.connection.name !== "smart_school_bd_test") {
    throw new Error(`Wrong database: ${mongoose.connection.name}`);
  }

  const school = await School.findOne({
    schoolCode: "SSD-SEC-TEST-002",
  }).select("_id schoolCode name status");

  if (!school) {
    throw new Error("Second test school was not found.");
  }

  const admins = await User.find({
    schoolId: school._id,
    role: "school_admin",
  }).select("_id name email status role schoolId");

  console.log("Database:", mongoose.connection.name);
  console.log("School:", school.schoolCode);
  console.log("School ID:", school._id.toString());
  console.log("School status:", school.status);
  console.log("Existing test admins:", admins.length);

  admins.forEach((admin) => {
    console.log({
      id: admin._id.toString(),
      name: admin.name,
      email: admin.email,
      status: admin.status,
      role: admin.role,
    });
  });

  console.log("Read-only check complete. No records changed.");
}

main()
  .catch((error) => {
    console.error("Check failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
