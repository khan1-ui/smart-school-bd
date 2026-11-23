const User = require("./User");
const School = require("../schools/School");
const { validateLogin, validateTeacherRegister } = require("./authValidation");
const {
  loginUser, applyForTeacherAccount, listPendingTeachers, listActiveTeachers,
  reviewTeacherApplication, rotateRefreshSession, revokeRefreshSession,
} = require("./authService");

const REFRESH_COOKIE = "ssbd_refresh_token";
const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/api/auth",
  maxAge: 30 * 24 * 60 * 60 * 1000,
});

const readCookie = (req, name) => {
  const header = req.headers.cookie || "";
  const part = header.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : "";
};

const assertAllowedOrigin = (req) => {
  const origin = req.get("origin");
  if (!origin) {
    const error = new Error("Origin header is required for session refresh");
    error.statusCode = 403;
    throw error;
  }
  const allowed = (process.env.CLIENT_URLS || process.env.CLIENT_URL || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",").map((item) => item.trim()).filter(Boolean);
  if (!allowed.includes(origin)) {
    const error = new Error("Origin is not allowed");
    error.statusCode = 403;
    throw error;
  }
};

const login = async (req, res, next) => {
  try {
    const { error, value } = validateLogin(req.body);
    if (error) return res.status(400).json({ success: false, message: "Validation failed", errors: error.details.map((d) => ({ field: d.path.join("."), message: d.message })) });
    if (!value.centralOffice && !value.schoolCode) return res.status(400).json({ success: false, message: "স্কুল কোড দিতে হবে" });
    const result = await loginUser(value);
    res.cookie(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions());
    const { refreshToken, refreshExpiresAt, ...publicResult } = result;
    res.json({ success: true, message: "Login successful", data: publicResult });
  } catch (error) { next(error); }
};


const me = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.user.id, status: "active" }).select("name email role schoolId designation indexNumber teacherCode").lean();
    if (!user) return res.status(401).json({ success: false, message: "সেশনটি আর বৈধ নেই। আবার লগইন করুন।" });
    const school = user.schoolId ? await School.findById(user.schoolId).select("name schoolCode division district upazila").lean() : null;
    res.json({ success: true, data: { user: { id: user._id, name: user.name, email: user.email, schoolId: user.schoolId || null, role: user.role, designation: user.designation, indexNumber: user.indexNumber, teacherCode: user.teacherCode, school: school ? { name: school.name, schoolCode: school.schoolCode, division: school.division, district: school.district, upazila: school.upazila } : null } } });
  } catch (error) { next(error); }
};

const refresh = async (req, res, next) => {
  try {
    assertAllowedOrigin(req);
    const result = await rotateRefreshSession(readCookie(req, REFRESH_COOKIE), {
      userAgent: req.get("user-agent"),
    });
    res.cookie(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions());
    res.json({ success: true, data: { accessToken: result.accessToken } });
  } catch (error) {
    if (error.statusCode === 401) {
      res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
    }
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    await revokeRefreshSession(readCookie(req, REFRESH_COOKIE));
    res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
    res.json({ success: true, message: "লগআউট সফল হয়েছে" });
  } catch (error) { next(error); }
};

const teacherRegister = async (req, res, next) => {
  try {
    const { error, value } = validateTeacherRegister(req.body);
    if (error) return res.status(400).json({ success: false, message: "Validation failed", errors: error.details.map((d) => ({ field: d.path.join("."), message: d.message })) });
    const teacher = await applyForTeacherAccount(value);
    res.status(201).json({ success: true, message: "শিক্ষক নিবন্ধনের আবেদন প্রধান শিক্ষকের কাছে পাঠানো হয়েছে", data: { teacher } });
  } catch (error) { next(error); }
};

const pendingTeachers = async (req, res, next) => {
  try {
    const teachers = await listPendingTeachers(req.user.schoolId);
    res.json({ success: true, data: { teachers, limit: 10 } });
  } catch (error) { next(error); }
};

const activeTeachers = async (req, res, next) => {
  try {
    const teachers = await listActiveTeachers(req.user.schoolId);
    res.json({ success: true, data: { teachers } });
  } catch (error) { next(error); }
};

const reviewTeacher = async (req, res, next) => {
  try {
    const { decision, reason = "" } = req.body;
    if (!["approve", "reject"].includes(decision)) return res.status(400).json({ success: false, message: "decision must be approve or reject" });
    if (decision === "reject" && !String(reason).trim()) return res.status(400).json({ success: false, message: "প্রত্যাখ্যানের কারণ দিতে হবে" });
    const teacher = await reviewTeacherApplication({ schoolId: req.user.schoolId, teacherId: req.params.id, decision, principalId: req.user.id, reason });
    res.json({ success: true, message: decision === "approve" ? "শিক্ষক অনুমোদিত হয়েছেন" : "শিক্ষক আবেদন প্রত্যাখ্যাত হয়েছে", data: { teacher: { id: teacher._id, status: teacher.status } } });
  } catch (error) { next(error); }
};

module.exports = { login, me, refresh, logout, teacherRegister, pendingTeachers, activeTeachers, reviewTeacher };
