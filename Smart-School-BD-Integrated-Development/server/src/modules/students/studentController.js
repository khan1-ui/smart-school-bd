
const {
  validateCreateStudent,
  validateUpdateStudent,
} = require("./studentValidation");

const TeacherClassAssignment = require("../assignments/TeacherClassAssignment");
const {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
} = require("./studentService");

const sendValidationError = (res, error) => {
  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: error.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message,
    })),
  });
};

// Create a student
const createStudentController = async (req, res, next) => {
  try {
    const { error, value } = validateCreateStudent(req.body);

    if (error) {
      return sendValidationError(res, error);
    }

    const student = await createStudent(req.user.schoolId, value);

    return res.status(201).json({
      success: true,
      message: "Student created successfully",
      data: { student },
    });
  } catch (error) {
    next(error);
  }
};

// Get students with pagination and search
const getStudentsController = async (req, res, next) => {
  try {
    const classScopes = req.user.role === "teacher"
      ? await TeacherClassAssignment.find({ schoolId: req.user.schoolId, teacherId: req.user.id, active: true }).select("className section academicYear").lean()
      : null;
    const result = await getStudents(req.user.schoolId, {
      classScopes,
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search || "",
      className: req.query.className || "",
      status: req.query.status || "active",
    });

    return res.status(200).json({
      success: true,
      message: "Students fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Get a single student
const getStudentByIdController = async (req, res, next) => {
  try {
    const student = await getStudentById(
      req.user.schoolId,
      req.params.id
    );
    if (req.user.role === "teacher") {
      const assigned = await TeacherClassAssignment.exists({
        schoolId: req.user.schoolId, teacherId: req.user.id,
        className: student.className, section: student.section || "",
        academicYear: student.academicYear, active: true,
      });
      if (!assigned) return res.status(403).json({ success: false, message: "Student is outside your assigned classes" });
    }

    return res.status(200).json({
      success: true,
      message: "Student fetched successfully",
      data: { student },
    });
  } catch (error) {
    next(error);
  }
};

// Update a student
const updateStudentController = async (req, res, next) => {
  try {
    const { error, value } = validateUpdateStudent(req.body);

    if (error) {
      return sendValidationError(res, error);
    }

    const student = await updateStudent(
      req.user.schoolId,
      req.params.id,
      value
    );

    return res.status(200).json({
      success: true,
      message: "Student updated successfully",
      data: { student },
    });
  } catch (error) {
    next(error);
  }
};

// Soft-delete a student
const deleteStudentController = async (req, res, next) => {
  try {
    const student = await deleteStudent(
      req.user.schoolId,
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message: "Student marked as inactive",
      data: { student },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createStudentController,
  getStudentsController,
  getStudentByIdController,
  updateStudentController,
  deleteStudentController,
};
