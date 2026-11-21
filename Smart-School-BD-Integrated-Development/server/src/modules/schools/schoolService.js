const bcrypt = require("bcryptjs");
const School = require("./School");
const User = require("../users/User");

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError";
  }
}

const createSchool = async (schoolData) => {
  let school;
  try {
    const schoolCode = schoolData.schoolCode.trim().toUpperCase();
    const principalEmail = schoolData.principalEmail.trim().toLowerCase();

    const existingPrincipal = await User.findOne({ email: principalEmail, role: "central_office" }).lean();
    if (existingPrincipal) throw new AppError("এই ইমেইলটি কেন্দ্রীয় অ্যাকাউন্টে ব্যবহৃত হয়েছে", 409);

    school = await School.create({
      name: schoolData.name,
      schoolCode,
      institutionType: schoolData.institutionType,
      address: schoolData.address,
      division: schoolData.division,
      district: schoolData.district,
      upazila: schoolData.upazila,
      principalName: schoolData.principalName,
      principalDesignation: schoolData.principalDesignation,
      principalIndexNumber: schoolData.principalIndexNumber || "",
      contactPhone: schoolData.contactPhone || schoolData.principalPhone,
      contactEmail: schoolData.contactEmail || principalEmail,
      status: "pending",
    });

    const passwordHash = await bcrypt.hash(schoolData.password, 12);
    const principal = await User.create({
      schoolId: school._id,
      name: schoolData.principalName,
      email: principalEmail,
      passwordHash,
      phone: schoolData.principalPhone,
      designation: schoolData.principalDesignation,
      indexNumber: schoolData.principalIndexNumber || "",
      role: "school_admin",
      status: "pending",
    });

    return { school, principal };
  } catch (error) {
    if (school?._id) await School.deleteOne({ _id: school._id }).catch(() => {});
    if (error.code === 11000) {
      throw new AppError("স্কুল কোড, ইমেইল বা ইনডেক্স নম্বর আগে থেকেই নিবন্ধিত", 409);
    }
    if (error instanceof AppError) throw error;
    throw error;
  }
};

const listPendingSchools = async () =>
  School.find({ status: "pending" })
    .select("name schoolCode institutionType division district upazila principalName principalDesignation principalIndexNumber contactPhone contactEmail createdAt")
    .sort({ createdAt: 1 })
    .lean();

const reviewSchool = async ({ schoolId, decision, reviewerId, reason = "" }) => {
  const school = await School.findById(schoolId);
  if (!school) throw new AppError("স্কুল পাওয়া যায়নি", 404);
  if (school.status !== "pending") throw new AppError("শুধু Pending আবেদন পর্যালোচনা করা যাবে", 409);

  const principal = await User.findOne({ schoolId: school._id, role: "school_admin" });
  if (!principal) throw new AppError("স্কুলের প্রধান শিক্ষকের অ্যাকাউন্ট পাওয়া যায়নি", 409);

  if (decision === "approve") {
    school.status = "active";
    school.approvedBy = reviewerId;
    school.approvedAt = new Date();
    principal.status = "active";
    principal.approvedBy = reviewerId;
    principal.approvedAt = new Date();
    await Promise.all([school.save(), principal.save()]);
  } else {
    school.status = "suspended";
    principal.status = "rejected";
    principal.rejectionReason = reason;
    await Promise.all([school.save(), principal.save()]);
  }

  return { school, principal };
};

module.exports = { createSchool, listPendingSchools, reviewSchool, AppError };
