const { validateSchoolRegistration } = require("./schoolValidation");
const School = require("./School");
const { createSchool, listPendingSchools, reviewSchool } = require("./schoolService");

const registerSchool = async (req, res, next) => {
  try {
    const { error, value } = validateSchoolRegistration(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.details.map((d) => ({ field: d.path.join("."), message: d.message })),
      });
    }

    const { school, principal } = await createSchool(value);
    return res.status(201).json({
      success: true,
      message: "স্কুল নিবন্ধনের আবেদন জমা হয়েছে। কেন্দ্রীয় অনুমোদনের পর প্রধান শিক্ষক লগইন করতে পারবেন।",
      data: {
        school: { id: school._id, name: school.name, schoolCode: school.schoolCode, division: school.division, district: school.district, upazila: school.upazila, status: school.status },
        principal: { id: principal._id, name: principal.name, email: principal.email, status: principal.status },
      },
    });
  } catch (error) { next(error); }
};

const getPendingSchools = async (req, res, next) => {
  try {
    const schools = await listPendingSchools();
    res.json({ success: true, data: { schools } });
  } catch (error) { next(error); }
};

const reviewSchoolApplication = async (req, res, next) => {
  try {
    const { decision, reason = "" } = req.body;
    if (!["approve", "reject"].includes(decision)) {
      return res.status(400).json({ success: false, message: "decision must be approve or reject" });
    }
    if (decision === "reject" && !String(reason).trim()) {
      return res.status(400).json({ success: false, message: "প্রত্যাখ্যানের কারণ দিতে হবে" });
    }
    const result = await reviewSchool({ schoolId: req.params.id, decision, reviewerId: req.user.id, reason });
    res.json({ success: true, message: decision === "approve" ? "স্কুল অনুমোদিত হয়েছে" : "স্কুল আবেদন প্রত্যাখ্যান করা হয়েছে", data: { schoolId: result.school._id, status: result.school.status } });
  } catch (error) { next(error); }
};


const getCentralSchoolOptions = async (req, res, next) => {
  try {
    const [divisions, schools] = await Promise.all([
      School.distinct("division", { status: "active", division: { $ne: "" } }),
      School.find({ status: "active" })
        .select("name schoolCode division district upazila institutionType")
        .sort({ division: 1, district: 1, upazila: 1, name: 1 })
        .lean(),
    ]);
    const geography = {};
    for (const school of schools) {
      if (!geography[school.division]) geography[school.division] = {};
      if (!geography[school.division][school.district]) geography[school.division][school.district] = [];
      if (school.upazila && !geography[school.division][school.district].includes(school.upazila)) {
        geography[school.division][school.district].push(school.upazila);
      }
    }
    res.json({ success: true, data: { divisions: divisions.sort(), geography, schools } });
  } catch (error) { next(error); }
};

const getCentralSchools = async (req, res, next) => {
  try {
    const filter = { status: "active" };
    for (const key of ["division", "district", "upazila", "schoolCode"]) {
      if (typeof req.query[key] === "string" && req.query[key].trim()) filter[key] = req.query[key].trim();
    }
    const schools = await School.find(filter)
      .select("name schoolCode division district upazila institutionType status")
      .sort({ division: 1, district: 1, upazila: 1, name: 1 })
      .lean();
    res.json({ success: true, data: { schools, total: schools.length } });
  } catch (error) { next(error); }
};

module.exports = {
  registerSchool,
  getPendingSchools,
  reviewSchoolApplication,
  getCentralSchoolOptions,
  getCentralSchools,
};

