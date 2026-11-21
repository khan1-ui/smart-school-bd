
require("dotenv").config({ path: ".env.test" });

const mongoose = require("mongoose");
const AttendanceSession = require("../src/modules/attendance/AttendanceSession");

async function main() {
  const uri = process.env.MONGODB_URI;
  const schoolId = process.env.TEST_SCHOOL_ID;

  if (!uri || !schoolId || !mongoose.isValidObjectId(schoolId)) {
    throw new Error("Missing or invalid test configuration.");
  }

  const parsedUri = new URL(uri);

  if (
    !["localhost", "127.0.0.1"].includes(parsedUri.hostname) ||
    parsedUri.pathname.replace(/^\/+/, "") !== "smart_school_bd_test" ||
    parsedUri.searchParams.get("replicaSet") !== "rs0"
  ) {
    throw new Error("Safety check failed: test database required.");
  }

  await mongoose.connect(uri);

  try {
    if (mongoose.connection.name !== "smart_school_bd_test") {
      throw new Error("Connected to an unexpected database.");
    }

    const sessions = await AttendanceSession.find({ schoolId })
      .select("_id schoolId className section academicYear date status")
      .sort({ date: -1 })
      .limit(10)
      .lean();

    console.log(`School 1 sessions found: ${sessions.length}`);

    for (const session of sessions) {
      console.log({
        sessionId: String(session._id),
        schoolId: String(session.schoolId),
        className: session.className,
        section: session.section,
        academicYear: session.academicYear,
        date: session.date,
        status: session.status,
      });
    }

    console.log("Read-only operation completed. No records changed.");
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error("Session listing failed:", error.message);
  process.exitCode = 1;
});
