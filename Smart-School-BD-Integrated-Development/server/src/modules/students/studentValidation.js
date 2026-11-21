
const Joi = require("joi");

const createStudentSchema = Joi.object({
  admissionNumber: Joi.string()
    .trim()
    .uppercase()
    .min(1)
    .max(30)
    .pattern(/^[A-Z0-9-]+$/)
    .required(),

  name: Joi.string().trim().min(2).max(100).required(),

  gender: Joi.string()
    .valid("male", "female", "other")
    .optional(),

  dateOfBirth: Joi.date()
    .iso()
    .max("now")
    .allow(null)
    .optional(),

  className: Joi.string().trim().min(1).max(30).required(),

  section: Joi.string()
    .trim()
    .uppercase()
    .max(20)
    .allow("")
    .default(""),

  rollNumber: Joi.number().integer().min(1).max(10000).required(),

  academicYear: Joi.string()
    .trim()
    .pattern(/^\d{4}(-\d{4})?$/)
    .required(),

  guardianRelation: Joi.string().valid("father", "mother", "other").default("father"),
  guardianName: Joi.string().trim().min(2).max(100).required(),

  guardianPhone: Joi.string().trim().min(7).max(20).required(),

  address: Joi.string().trim().max(300).allow("").default(""),
});

const updateStudentSchema = Joi.object({
  admissionNumber: Joi.string()
    .trim()
    .uppercase()
    .min(1)
    .max(30)
    .pattern(/^[A-Z0-9-]+$/),

  name: Joi.string().trim().min(2).max(100),

  gender: Joi.string().valid("male", "female", "other"),

  dateOfBirth: Joi.date().iso().max("now").allow(null),

  className: Joi.string().trim().min(1).max(30),

  section: Joi.string().trim().uppercase().max(20).allow(""),

  rollNumber: Joi.number().integer().min(1).max(10000),

  academicYear: Joi.string()
    .trim()
    .pattern(/^\d{4}(-\d{4})?$/),

  guardianRelation: Joi.string().valid("father", "mother", "other"),
  guardianName: Joi.string().trim().min(2).max(100),

  guardianPhone: Joi.string().trim().min(7).max(20),

  address: Joi.string().trim().max(300).allow(""),

  status: Joi.string().valid(
    "active",
    "inactive",
    "transferred",
    "graduated"
  ),
})
  .min(1)
  .unknown(false);

const validateCreateStudent = (data) =>
  createStudentSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

const validateUpdateStudent = (data) =>
  updateStudentSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

module.exports = {
  validateCreateStudent,
  validateUpdateStudent,
};
