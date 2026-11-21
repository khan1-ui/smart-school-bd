require("dotenv").config({ path: ".env.test" });

const mongoose = require("mongoose");

async function inspect() {
  try {
    const uri = process.env.MONGODB_URI;

    if (
      !uri ||
      new URL(uri).pathname !== "/smart_school_bd_test"
    ) {
      throw new Error("Unexpected database; inspection stopped");
    }

    await mongoose.connect(uri);
const AttendanceSession = require(
  "../src/modules/attendance/AttendanceSession"
);

console.log("Model collection:", AttendanceSession.collection.name);
console.log("Model database:", AttendanceSession.db.name);

const sessions = await AttendanceSession.find({})
  .select("_id schoolId className section academicYear date status attendanceWriteLock")
  .lean();

console.log("Sessions found:", sessions);
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();

    console.log("Database:", mongoose.connection.name);
    console.log("Collections and counts:");

    for (const collection of collections) {
      const count = await mongoose.connection.db
        .collection(collection.name)
        .countDocuments();

      console.log(`${collection.name}: ${count}`);
    }
  } catch (error) {
    console.error("Inspection failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
const AttendanceSession = require(
  "../src/modules/attendance/AttendanceSession"
);

console.log(
  "Model collection:",
  AttendanceSession.collection.name
);

console.log(
  "Model database:",
  AttendanceSession.db.name
);
inspect();