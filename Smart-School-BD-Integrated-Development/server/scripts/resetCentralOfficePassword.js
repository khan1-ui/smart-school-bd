
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../src/modules/users/User");

async function main() {
  const {
    MONGODB_URI,
    CENTRAL_OFFICE_EMAIL,
    CENTRAL_OFFICE_PASSWORD,
  } = process.env;

  if (!MONGODB_URI || !CENTRAL_OFFICE_EMAIL || !CENTRAL_OFFICE_PASSWORD) {
    throw new Error("Required environment variables are missing.");
  }

  if (CENTRAL_OFFICE_PASSWORD.length < 12) {
    throw new Error("Password must be at least 12 characters.");
  }

  await mongoose.connect(MONGODB_URI);

  const email = CENTRAL_OFFICE_EMAIL.trim().toLowerCase();

  const user = await User.findOne({
    role: "central_office",
    email,
  }).select("+passwordHash");

  if (!user) {
    throw new Error("Central Office account not found.");
  }

  const passwordHash = await bcrypt.hash(
    CENTRAL_OFFICE_PASSWORD,
    12
  );

  user.passwordHash = passwordHash;
  await user.save();

  const verified = await bcrypt.compare(
    CENTRAL_OFFICE_PASSWORD,
    user.passwordHash
  );

  console.log("Password reset successful:", verified);

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
