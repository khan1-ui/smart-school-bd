
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

const askHidden = (question) =>
  new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    if (
      !stdin.isTTY ||
      typeof stdin.setRawMode !== "function"
    ) {
      reject(
        new Error("Hidden input requires an interactive terminal.")
      );
      return;
    }

    let value = "";
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
        reject(new Error("Password reset cancelled."));
        return;
      }

      if (key === "\r" || key === "\n") {
        cleanup();
        resolve(value);
        return;
      }

      if (key === "\u0008" || key === "\u007f") {
        value = value.slice(0, -1);
        return;
      }

      if (key >= " " && key !== "\u007f") {
        value += key;
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
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from .env");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected.");

    const schoolCode = (await ask("School code: "))
      .trim()
      .toUpperCase();

    const email = (await ask("Admin email: "))
      .trim()
      .toLowerCase();

    const school = await School.findOne({ schoolCode });

    if (!school) {
      throw new Error("School not found.");
    }

    const admin = await User.findOne({
      schoolId: school._id,
      email,
      role: "school_admin",
    });

    if (!admin) {
      throw new Error("Admin account not found for this school.");
    }

    rl.close();

    const password = await askHidden(
      "Enter new password (12+ characters): "
    );

    const confirmation = await askHidden(
      "Confirm new password: "
    );

    if (password.length < 12 || password.length > 128) {
      throw new Error("Password must be 12–128 characters.");
    }

    if (password !== confirmation) {
      throw new Error("Passwords do not match.");
    }

    admin.passwordHash = await bcrypt.hash(password, 12);
    await admin.save();

    console.log("\nAdmin password reset successfully.");
    console.log("School:", school.schoolCode);
    console.log("Admin email:", admin.email);
    console.log("You can now log in with your new password.");
  } catch (error) {
    console.error("\nPassword reset failed:", error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
    await mongoose.disconnect().catch(() => {});
  }
};

run();
