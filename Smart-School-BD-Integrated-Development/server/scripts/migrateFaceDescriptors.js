require("dotenv").config();
const mongoose = require("mongoose");
const StudentFace = require("../src/modules/faceRecognition/StudentFace");
const { encryptDescriptor } = require("../src/modules/faceRecognition/descriptorCrypto");

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  await mongoose.connect(process.env.MONGODB_URI);
  const apply = process.argv.includes("--apply");
  const cursor = StudentFace.find({
    encryptedDescriptor: { $exists: false },
    descriptor: { $exists: true, $type: "array" },
  }).select("+descriptor").lean().cursor();

  let scanned = 0;
  let migrated = 0;
  for await (const record of cursor) {
    scanned += 1;
    if (!Array.isArray(record.descriptor) || record.descriptor.length !== 128 ||
        !record.descriptor.every(Number.isFinite)) {
      console.warn("Skipping invalid legacy descriptor:", String(record._id));
      continue;
    }
    if (apply) {
      const encryptedDescriptor = encryptDescriptor(record.descriptor);
      await StudentFace.updateOne(
        { _id: record._id, encryptedDescriptor: { $exists: false } },
        { $set: { encryptedDescriptor }, $unset: { descriptor: "" } }
      );
      migrated += 1;
    }
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", scanned, migrated }, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Descriptor migration failed:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
