const rateLimit = require("express-rate-limit");

const schoolRegistrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "একই নেটওয়ার্ক থেকে অনেকগুলো আবেদন এসেছে। এক ঘণ্টা পরে আবার চেষ্টা করুন।" },
});

const teacherRegistrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "অনেকগুলো আবেদন করা হয়েছে। এক ঘণ্টা পরে আবার চেষ্টা করুন।" },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "অনেকবার লগইন চেষ্টা হয়েছে। ১৫ মিনিট পরে আবার চেষ্টা করুন।" },
});

module.exports = { schoolRegistrationLimiter, teacherRegistrationLimiter, loginLimiter };
