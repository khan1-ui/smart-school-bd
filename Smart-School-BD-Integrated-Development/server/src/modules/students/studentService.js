
const mongoose = require("mongoose");
const Student = require("./Student");

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

const ensureValidSchoolId = (schoolId) => {
  if (!mongoose.isValidObjectId(schoolId)) {
    throw new AppError("Invalid school context", 400);
  }
};

const handleDuplicateError = (error) => {
  if (error.code === 11000) {
    const fields = Object.keys(error.keyPattern || {});

    if (fields.includes("admissionNumber")) {
      throw new AppError(
        "This admission number already exists",
        409
      );
    }

    if (fields.includes("rollNumber")) {
      throw new AppError(
        "This roll number already exists in this class and academic year",
        409
      );
    }

    throw new AppError("Duplicate student information", 409);
  }

  throw error;
};

const createStudent = async (schoolId, data) => {
  ensureValidSchoolId(schoolId);

  try {
    const student = await Student.create({
      ...data,
      schoolId,
    });

    return student;
  } catch (error) {
    return handleDuplicateError(error);
  }
};

const getStudents = async (
  schoolId,
  { page = 1, limit = 10, search = "", className = "", status = "active", classScopes = null } = {}
) => {
  ensureValidSchoolId(schoolId);

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));

  const filter = { schoolId };
  if (status === "archived") filter.status = { $in: ["inactive", "transferred"] };
  else if (["active", "inactive", "transferred", "graduated"].includes(status)) filter.status = status;
  else throw new AppError("Invalid student status filter", 400);

  if (className.trim()) {
    filter.className = className.trim();
  }

  const andFilters = [];

  if (classScopes) {
    if (!classScopes.length) {
      return { students: [], pagination: { page: safePage, limit: safeLimit, total: 0, totalPages: 0 } };
    }
    andFilters.push({
      $or: classScopes.map((scope) => ({
        className: scope.className,
        section: scope.section || "",
        academicYear: scope.academicYear,
      })),
    });
  }

  if (search.trim()) {
    const escapedSearch = search.trim().replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");
    const regex = new RegExp(escapedSearch, "i");
    andFilters.push({ $or: [
      { name: regex },
      { admissionNumber: regex },
      { guardianPhone: regex },
    ] });
  }

  if (andFilters.length) filter.$and = andFilters;

  const [students, total] = await Promise.all([
    Student.find(filter)
      .sort({ className: 1, rollNumber: 1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),

    Student.countDocuments(filter),
  ]);

  return {
    students,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

const getStudentById = async (schoolId, studentId) => {
  ensureValidSchoolId(schoolId);

  if (!mongoose.isValidObjectId(studentId)) {
    throw new AppError("Invalid student ID", 400);
  }

  const student = await Student.findOne({
    _id: studentId,
    schoolId,
  });

  if (!student) {
    throw new AppError("Student not found", 404);
  }

  return student;
};

const updateStudent = async (schoolId, studentId, data) => {
  ensureValidSchoolId(schoolId);

  if (!mongoose.isValidObjectId(studentId)) {
    throw new AppError("Invalid student ID", 400);
  }

  try {
    const student = await Student.findOneAndUpdate(
  { _id: studentId, schoolId, status: "active" },
  { $set: data },
  {
    returnDocument: "after",
    runValidators: true,
  }
);
    if (!student) {
      throw new AppError("Student not found", 404);
    }

    return student;
  } catch (error) {
    if (error instanceof AppError) throw error;
    return handleDuplicateError(error);
  }
};

const deleteStudent = async (schoolId, studentId) => {
  ensureValidSchoolId(schoolId);

  if (!mongoose.isValidObjectId(studentId)) {
    throw new AppError("Invalid student ID", 400);
  }

  const student = await Student.findOneAndUpdate(
    { _id: studentId, schoolId },
    { $set: { status: "inactive" } },
    {
      returnDocument: "after",
      runValidators: true,
    }
  );

  if (!student) {
    throw new AppError("Student not found", 404);
  }

  return student;
};

module.exports = {
  AppError,
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
};
