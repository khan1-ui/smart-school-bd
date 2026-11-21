const crypto = require("crypto");
process.env.FACE_DESCRIPTOR_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
const { encryptDescriptor, decryptDescriptor } = require("../src/modules/faceRecognition/descriptorCrypto");

const descriptor = Array.from({ length: 128 }, (_, index) => Math.sin(index / 7));
const encrypted = encryptDescriptor(descriptor);
const decrypted = decryptDescriptor(encrypted);
if (descriptor.some((value, index) => Math.abs(value - decrypted[index]) > 1e-12)) {
  throw new Error("Descriptor round-trip test failed");
}
const parts = encrypted.split(":");
parts[3] = Buffer.from("tampered payload").toString("base64");
let tamperRejected = false;
try { decryptDescriptor(parts.join(":")); } catch { tamperRejected = true; }
if (!tamperRejected) throw new Error("Tampered descriptor was accepted");
console.log("PASS: AES-256-GCM descriptor round-trip and authentication-tag tamper test");
