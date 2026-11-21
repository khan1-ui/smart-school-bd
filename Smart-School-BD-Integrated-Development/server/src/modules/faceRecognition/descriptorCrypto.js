const crypto = require("crypto");
const ALGORITHM = "aes-256-gcm";

function encryptionKey() {
  const raw = process.env.FACE_DESCRIPTOR_ENCRYPTION_KEY;
  if (!raw) {
    const error = new Error("FACE_DESCRIPTOR_ENCRYPTION_KEY is required");
    error.statusCode = 503;
    throw error;
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    const error = new Error("FACE_DESCRIPTOR_ENCRYPTION_KEY must decode to exactly 32 bytes");
    error.statusCode = 500;
    throw error;
  }
  return key;
}

function encryptDescriptor(descriptor) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(JSON.stringify(descriptor), "utf8")),
    cipher.final(),
  ]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(":");
}

function decryptDescriptor(payload) {
  if (typeof payload !== "string") throw new Error("Encrypted descriptor missing");
  const [version, iv, tag, data] = payload.split(":");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Unsupported encrypted descriptor format");
  const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(data, "base64")),
    decipher.final(),
  ]);
  const result = JSON.parse(plaintext.toString("utf8"));
  if (!Array.isArray(result) || result.length !== 128 || !result.every(Number.isFinite)) {
    throw new Error("Decrypted descriptor is invalid");
  }
  return result;
}

module.exports = { encryptDescriptor, decryptDescriptor };
