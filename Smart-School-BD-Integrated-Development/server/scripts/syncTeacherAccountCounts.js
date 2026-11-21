require("dotenv").config();
const mongoose = require("mongoose");
const School = require("../src/modules/schools/School");
const User = require("../src/modules/users/User");

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  await mongoose.connect(process.env.MONGODB_URI);
  const schools = await School.find({}).select("_id name schoolCode").lean();
  for (const school of schools) {
    const count = await User.countDocuments({
      schoolId: school._id,
      role: "teacher",
      status: { $in: ["pending", "active"] },
    });
    await School.updateOne({ _id: school._id }, { $set: { teacherAccountCount: Math.min(count, 10) } });
    console.log(`${school.schoolCode} ${school.name}: ${count} pending/active teacher account(s)`);
  }
  await mongoose.disconnect();
}
main().catch(async (error) => { console.error(error.message); await mongoose.disconnect().catch(() => {}); process.exit(1); });
