
require("dotenv").config({ path: ".env.test" });

const mongoose = require("mongoose");
const Attendance = require("../src/modules/attendance/Attendance");

async function runTest() {
  const uri = process.env.MONGODB_URI;

  if (
    !uri ||
    !uri.includes("/smart_school_bd_test") ||
    !uri.includes("replicaSet=rs0")
  ) {
    throw new Error("Safety check failed: test database required.");
  }

  await mongoose.connect(uri);

  try {
    if (mongoose.connection.name !== "smart_school_bd_test") {
      throw new Error("Wrong database. Test stopped.");
    }

    const schoolId = new mongoose.Types.ObjectId(
      "6ada0299bf7ec1a8a22f300c"
    );
    const studentId = new mongoose.Types.ObjectId(
      "6ada029abf7ec1a8a22f300e"
    );
    const markedBy = new mongoose.Types.ObjectId(
      "6ada0299bf7ec1a8a22f300d"
    );

    // শুধু আলাদা test date; কোনো existing record পরিবর্তন করা হবে না।
    const date = new Date("2026-11-02T00:00:00.000Z");

    const existing = await Attendance.countDocuments({
      schoolId,
      date,
    });

    if (existing !== 0) {
      throw new Error(
        "Test date already contains attendance. Choose another unused date."
      );
    }

    const mongoSession = await mongoose.startSession();
    let intentionalErrorCaught = false;

    try {
      await mongoSession.withTransaction(async () => {
        await Attendance.create(
          [{
            schoolId,
            studentId,
            className: "RollbackTest",
            section: "ZZ",
            academicYear: "2026",
            date,
            status: "present",
            markedBy,
            method: "manual",
          }],
          { session: mongoSession }
        );

        throw new Error("INTENTIONAL_ROLLBACK_TEST");
      });
    } catch (error) {
      if (error.message === "INTENTIONAL_ROLLBACK_TEST") {
        intentionalErrorCaught = true;
        console.log("Expected transaction error caught.");
      } else {
        throw error;
      }
    } finally {
      await mongoSession.endSession();
    }

    const after = await Attendance.countDocuments({
      schoolId,
      date,
    });

    console.log("Database:", mongoose.connection.name);
    console.log("Records before:", existing);
    console.log("Records after:", after);

    if (!intentionalErrorCaught || after !== 0) {
      throw new Error("Transaction rollback verification failed.");
    }

    console.log("SUCCESS: standalone transaction rollback verified.");
  } finally {
    await mongoose.disconnect();
  }
}

runTest().catch((error) => {
  console.error("TEST FAILED:", error.message);
  process.exitCode = 1;
});
