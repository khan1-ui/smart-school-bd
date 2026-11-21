
require("dotenv").config({ path: ".env.test" });

const mongoose = require("mongoose");
const Attendance = require("../src/modules/attendance/Attendance");

const TEST_DB = "smart_school_bd_test";

const schoolId = "6ada0299bf7ec1a8a22f300c";
const userId = "6ada0299bf7ec1a8a22f300d";
const studentId = "6ada029abf7ec1a8a22f300f";

const testDate = new Date("2026-10-25T00:00:00.000Z");

async function run() {
  let session;

  try {
    const uri = process.env.MONGODB_URI;

    if (!uri || new URL(uri).pathname !== `/${TEST_DB}`) {
      throw new Error("Safety stop: wrong test database URI");
    }

    await mongoose.connect(uri);

    if (mongoose.connection.name !== TEST_DB) {
      throw new Error("Safety stop: connected to wrong database");
    }

    await Attendance.init();

    // Stop if this test's target record already exists.
    const query = {
      schoolId,
      studentId,
      academicYear: "2026",
      date: testDate,
    };

    const existing = await Attendance.countDocuments(query);

    if (existing !== 0) {
      throw new Error(
        `Safety stop: ${existing} matching record(s) already exist`
      );
    }

    session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        await Attendance.create(
          [
            {
              schoolId,
              studentId,
              className: "Six",
              section: "A",
              academicYear: "2026",
              date: testDate,
              status: "present",
              markedBy: userId,
              method: "manual",
            },
          ],
          { session }
        );

        // Deliberately fail after the insert.
        throw new Error("INTENTIONAL_ROLLBACK_TEST");
      });
    } catch (error) {
      if (error.message !== "INTENTIONAL_ROLLBACK_TEST") {
        throw error;
      }

      console.log("Expected error triggered inside transaction.");
    }

    const finalCount = await Attendance.countDocuments(query);

    console.log("Database:", mongoose.connection.name);
    console.log("Records remaining after rollback:", finalCount);

    if (finalCount !== 0) {
      throw new Error("ROLLBACK FAILED: record still exists");
    }

    console.log("SUCCESS: MongoDB transaction rollback verified.");
  } catch (error) {
    console.error("TEST FAILED:", error.message);
    process.exitCode = 1;
  } finally {
    if (session) {
      await session.endSession();
    }

    await mongoose.disconnect();
  }
}

run();
