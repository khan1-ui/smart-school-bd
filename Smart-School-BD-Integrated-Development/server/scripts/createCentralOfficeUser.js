require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../src/modules/users/User");

async function main() {
  const { MONGODB_URI, CENTRAL_OFFICE_NAME, CENTRAL_OFFICE_EMAIL, CENTRAL_OFFICE_PASSWORD } = process.env;
  if (!MONGODB_URI || !CENTRAL_OFFICE_NAME || !CENTRAL_OFFICE_EMAIL || !CENTRAL_OFFICE_PASSWORD) {
    throw new Error("Set MONGODB_URI, CENTRAL_OFFICE_NAME, CENTRAL_OFFICE_EMAIL and CENTRAL_OFFICE_PASSWORD in .env before running this script.");
  }
  if (CENTRAL_OFFICE_PASSWORD.length < 12) throw new Error("CENTRAL_OFFICE_PASSWORD must be at least 12 characters.");
  await mongoose.connect(MONGODB_URI);
  const email = CENTRAL_OFFICE_EMAIL.trim().toLowerCase();
  const existing = await User.findOne({ role: "central_office", email });
  if (existing) throw new Error("A central office account with this email already exists. Do not create a duplicate.");
  const passwordHash = await bcrypt.hash(CENTRAL_OFFICE_PASSWORD, 12);
  await User.create({ name: CENTRAL_OFFICE_NAME, email, passwordHash, role: "central_office", status: "active" });
  console.log("Central office account created successfully.");
  await mongoose.disconnect();
}
main().catch(async (error) => { console.error(error.message); await mongoose.disconnect().catch(() => {}); process.exit(1); });
