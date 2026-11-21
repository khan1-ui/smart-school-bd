
require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const readline = require("readline");

const School = require("../src/modules/schools/School");
const User = require("../src/modules/users/User");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (question) =>
  new Promise((resolve) => rl.question(question, resolve));

// Read a password without displaying its characters.
const askHidden = (question) =>
  new Promise((resolve, reject) => {
    if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
      reject(
        new Error("Hidden password input requires an interactive terminal.")
      );
      return;
    }

    // Close readline before switching stdin to raw mode.
    rl.close();

    const stdin = process.stdin;
    const stdout = process.stdout;
    let password = "";
    let finished = false;

    const cleanup = () => {
      if (finished) return;
      finished = true;

      stdin.removeListener("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
    };

    const onData = (key) => {
      if (key === "\u0003") {
        cleanup();
        reject(new Error("Password input cancelled."));
        return;
      }

      if (key === "\r" || key === "\n") {
        cleanup();
        resolve(password);
        return;
      }

      if (key === "\u0008" || key === "\u007f") {
        password = password.slice(0, -1);
        return;
      }

      if (key >= " " && key !== "\u007f") {
        password += key;
      }
    };

    try {
      stdout.write(question);
      stdin.setRawMode(true);
      stdin.setEncoding("utf8");
      stdin.resume();
      stdin.on("data", onData);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });

const run = async () => {
  let school = null;
  let originalSchoolStatus = null;

  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from .env");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected.");

    const schoolCode = (await ask("School code (e.g. SSD-001): "))
      .trim()
      .toUpperCase();

    school = await School.findOne({ schoolCode });

    if (!school) {
      throw new Error("School not found. Check the school code.");
    }

    originalSchoolStatus = school.status;

    const existingAdmin = await User.findOne({
      schoolId: school._id,
      role: "school_admin",
    });

    if (existingAdmin) {
      throw new Error(
        "A school admin already exists. Bootstrap cancelled."
      );
    }

    const name = (await ask("Principal's full name: ")).trim();
    const email = (await ask("Principal's email: "))
      .trim()
      .toLowerCase();
    const phone = (await ask("Phone (optional): ")).trim();

    const password = await askHidden(
      "Set a strong password (12+ characters): "
    );

    if (name.length < 3 || name.length > 100) {
      throw new Error("Name must be 3–100 characters.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Enter a valid email address.");
    }

    if (phone.length > 20) {
      throw new Error("Phone cannot exceed 20 characters.");
    }

    if (password.length < 12 || password.length > 128) {
      throw new Error("Password must be 12–128 characters.");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Activate the school and create its first admin.
    school.status = "active";
    await school.save();

    try {
      const admin = await User.create({
        schoolId: school._id,
        name,
        email,
        phone,
        passwordHash,
        role: "school_admin",
        status: "active",
      });

      console.log("\nBootstrap completed successfully.");
      console.log("School:", school.schoolCode);
      console.log("Admin email:", admin.email);
      console.log("Keep the password private.");
    } catch (error) {
      // Restore the school's original status if creation fails.
      school.status = originalSchoolStatus;
      await school.save();
      throw error;
    }
  } catch (error) {
    console.error("\nBootstrap failed:", error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
    await mongoose.disconnect().catch(() => {});
  }
};

run();
