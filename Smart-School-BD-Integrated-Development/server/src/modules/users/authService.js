const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./User");
const School = require("../schools/School");
const crypto = require("crypto");
const RefreshSession = require("./RefreshSession");

class AppError extends Error {
  constructor(message, statusCode) { super(message); this.name = "AppError"; this.statusCode = statusCode; }
}

const createAccessToken = (user) => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret || secret.length < 32) throw new Error("JWT_ACCESS_SECRET must be at least 32 characters");
  const payload = { sub: user._id.toString(), role: user.role };
  if (user.schoolId) payload.schoolId = user.schoolId.toString();
  return jwt.sign(payload, secret, { expiresIn: "15m" });
};

const REFRESH_TOKEN_TTL_DAYS = 30;
const hashRefreshToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const createRefreshSession = async (user, metadata = {}) => {
  const rawToken = crypto.randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await RefreshSession.create({
    userId: user._id,
    tokenHash: hashRefreshToken(rawToken),
    expiresAt,
    userAgent: String(metadata.userAgent || "").slice(0, 300),
  });
  return { refreshToken: rawToken, expiresAt };
};

const rotateRefreshSession = async (rawToken, metadata = {}) => {
  if (!rawToken || typeof rawToken !== "string" || rawToken.length > 256) {
    throw new AppError("সেশন মেয়াদ শেষ হয়েছে। আবার লগইন করুন।", 401);
  }
  const tokenHash = hashRefreshToken(rawToken);
  const session = await RefreshSession.findOne({ tokenHash }).select("+tokenHash");
  if (!session || session.expiresAt <= new Date()) {
    if (session) await RefreshSession.deleteOne({ _id: session._id });
    throw new AppError("সেশন মেয়াদ শেষ হয়েছে। আবার লগইন করুন।", 401);
  }

  const user = await User.findOne({ _id: session.userId, status: "active" });
  if (!user) {
    await RefreshSession.deleteOne({ _id: session._id });
    throw new AppError("অ্যাকাউন্টটি সক্রিয় নেই। আবার লগইন করুন।", 401);
  }

  // Consume the old refresh token before issuing a replacement.
  await RefreshSession.deleteOne({ _id: session._id });
  const replacement = await createRefreshSession(user, metadata);
  return {
    accessToken: createAccessToken(user),
    refreshToken: replacement.refreshToken,
    refreshExpiresAt: replacement.expiresAt,
  };
};

const revokeRefreshSession = async (rawToken) => {
  if (!rawToken || typeof rawToken !== "string") return;
  await RefreshSession.deleteOne({ tokenHash: hashRefreshToken(rawToken) });
};


const applyForTeacherAccount = async (data) => {
  const school = await School.findOneAndUpdate(
    { schoolCode: data.schoolCode, status: "active", teacherAccountCount: { $lt: 10 } },
    { $inc: { teacherAccountCount: 1 } },
    { new: true }
  ).select("_id schoolCode");

  if (!school) {
    const existingSchool = await School.findOne({ schoolCode: data.schoolCode }).select("status teacherAccountCount");
    if (!existingSchool || existingSchool.status !== "active") {
      throw new AppError("স্কুল কোড পাওয়া যায়নি অথবা স্কুল এখনো অনুমোদিত নয়", 404);
    }
    throw new AppError("এই স্কুলে সর্বোচ্চ ১০টি শিক্ষক আবেদন/সক্রিয় অ্যাকাউন্টের সীমা পূর্ণ হয়েছে", 409);
  }

  try {
    if (!data.indexNumber && !data.teacherCode) {
      throw new AppError("ইনডেক্স নম্বর অথবা শিক্ষক কোডের অন্তত একটি দিতে হবে", 400);
    }
    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await User.create({
      schoolId: school._id,
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash,
      phone: data.phone,
      designation: data.designation,
      indexNumber: data.indexNumber || "",
      teacherCode: data.teacherCode || "",
      role: "teacher",
      status: "pending",
    });
    return {
      id: user._id, schoolId: school._id, name: user.name, email: user.email,
      designation: user.designation, indexNumber: user.indexNumber,
      teacherCode: user.teacherCode, status: user.status,
    };
  } catch (error) {
    await School.updateOne({ _id: school._id, teacherAccountCount: { $gt: 0 } }, { $inc: { teacherAccountCount: -1 } });
    if (error.code === 11000) throw new AppError("ইমেইল, ইনডেক্স নম্বর বা শিক্ষক কোড আগে থেকেই ব্যবহৃত হয়েছে", 409);
    throw error;
  }
};

const listPendingTeachers = async (schoolId) =>
  User.find({ schoolId, role: "teacher", status: "pending" })
    .select("name email phone designation indexNumber teacherCode createdAt")
    .sort({ createdAt: 1 })
    .lean();


const reviewTeacherApplication = async ({ schoolId, teacherId, decision, principalId, reason = "" }) => {
  const update = decision === "approve"
    ? { $set: { status: "active", approvedBy: principalId, approvedAt: new Date(), rejectionReason: "" } }
    : { $set: { status: "rejected", rejectionReason: reason } };

  const teacher = await User.findOneAndUpdate(
    { _id: teacherId, schoolId, role: "teacher", status: "pending" },
    update,
    { new: true, runValidators: true }
  );
  if (!teacher) throw new AppError("Pending শিক্ষক আবেদন পাওয়া যায়নি", 404);

  if (decision === "reject") {
    await School.updateOne(
      { _id: schoolId, teacherAccountCount: { $gt: 0 } },
      { $inc: { teacherAccountCount: -1 } }
    );
  }
  return teacher;
};

const loginUser = async ({ schoolCode = "", email, password, centralOffice = false }) => {
  const normalizedEmail = email.trim().toLowerCase();
  let user;

  if (centralOffice) {
    user = await User.findOne({ role: "central_office", email: normalizedEmail }).select("+passwordHash");
  } else {
    const normalizedSchoolCode = schoolCode.trim().toUpperCase();
    const school = await School.findOne({ schoolCode: normalizedSchoolCode, status: "active" }).select("_id");
    if (!school) throw new AppError("স্কুল কোড বা লগইন তথ্য সঠিক নয়", 401);
    user = await User.findOne({ schoolId: school._id, email: normalizedEmail }).select("+passwordHash");
  }
  if (!user) throw new AppError("লগইন তথ্য সঠিক নয়", 401);
  if (user.status !== "active") throw new AppError("আপনার অ্যাকাউন্ট এখনো অনুমোদিত হয়নি অথবা নিষ্ক্রিয়", 403);

  const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) throw new AppError("লগইন তথ্য সঠিক নয়", 401);

  user.lastLoginAt = new Date();
  await user.save();
  const accessToken = createAccessToken(user);
  const refreshSession = await createRefreshSession(user);
  const school = user.schoolId ? await School.findById(user.schoolId).select("name schoolCode division district upazila").lean() : null;

  return {
    accessToken,
    refreshToken: refreshSession.refreshToken,
    refreshExpiresAt: refreshSession.expiresAt,
    user: {
      id: user._id, name: user.name, email: user.email, schoolId: user.schoolId || null,
      role: user.role, designation: user.designation, indexNumber: user.indexNumber, teacherCode: user.teacherCode,
      school: school ? { name: school.name, schoolCode: school.schoolCode, division: school.division, district: school.district, upazila: school.upazila } : null,
    },
  };
};

const listActiveTeachers = async (schoolId) => {
  return User.find({ schoolId, role: "teacher", status: "active" })
    .select("_id name email designation indexNumber teacherCode")
    .sort({ name: 1 }).lean();
};

module.exports = {
  AppError, applyForTeacherAccount, listPendingTeachers, listActiveTeachers,
  reviewTeacherApplication, loginUser, rotateRefreshSession, revokeRefreshSession,
};
