const { validateLogin, validateTeacherRegister } = require("./authValidation");
const { loginUser, applyForTeacherAccount, listPendingTeachers, listActiveTeachers, reviewTeacherApplication } = require("./authService");

const login = async (req, res, next) => {
  try {
    const { error, value } = validateLogin(req.body);
    if (error) return res.status(400).json({ success: false, message: "Validation failed", errors: error.details.map((d) => ({ field: d.path.join("."), message: d.message })) });
    if (!value.centralOffice && !value.schoolCode) return res.status(400).json({ success: false, message: "স্কুল কোড দিতে হবে" });
    const result = await loginUser(value);
    res.json({ success: true, message: "Login successful", data: result });
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

module.exports = { login, teacherRegister, pendingTeachers, activeTeachers, reviewTeacher };
