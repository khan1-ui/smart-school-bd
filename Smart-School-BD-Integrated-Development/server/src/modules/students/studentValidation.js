const Joi = require("joi");
const { normalizeFields, normalizeBangladeshPhone } = require("../../utils/banglaInput");

const codePattern = /^[\p{L}\p{N}-]+$/u;
const phoneSchema = Joi.string().custom((value, helpers) => {
  const phone = normalizeBangladeshPhone(value);
  return /^01[3-9]\d{8}$/.test(phone) ? phone : helpers.error("string.pattern.base");
}).messages({ "string.pattern.base": "সঠিক ১১ সংখ্যার বাংলাদেশি মোবাইল নম্বর দিন" });

const createStudentSchema = Joi.object({
  admissionNumber: Joi.string().trim().uppercase().min(1).max(30).pattern(codePattern).required(),
  name: Joi.string().trim().min(2).max(100).required(),
  gender: Joi.string().valid("male", "female", "other").optional(),
  dateOfBirth: Joi.date().iso().max("now").allow(null).optional(),
  className: Joi.string().trim().min(1).max(30).required(),
  section: Joi.string().trim().uppercase().max(20).allow("").default(""),
  rollNumber: Joi.number().integer().min(1).max(10000).required(),
  academicYear: Joi.string().trim().pattern(/^\d{4}(-\d{4})?$/).required(),
  guardianRelation: Joi.string().valid("father", "mother", "other").default("father"),
  guardianName: Joi.string().trim().min(2).max(100).required(),
  guardianPhone: phoneSchema.required(),
  address: Joi.string().trim().max(300).allow("").default(""),
});

const updateStudentSchema = Joi.object({
  admissionNumber: Joi.string().trim().uppercase().min(1).max(30).pattern(codePattern),
  name: Joi.string().trim().min(2).max(100),
  gender: Joi.string().valid("male", "female", "other"),
  dateOfBirth: Joi.date().iso().max("now").allow(null),
  className: Joi.string().trim().min(1).max(30),
  section: Joi.string().trim().uppercase().max(20).allow(""),
  rollNumber: Joi.number().integer().min(1).max(10000),
  academicYear: Joi.string().trim().pattern(/^\d{4}(-\d{4})?$/),
  guardianRelation: Joi.string().valid("father", "mother", "other"),
  guardianName: Joi.string().trim().min(2).max(100),
  guardianPhone: phoneSchema,
  address: Joi.string().trim().max(300).allow(""),
  status: Joi.string().valid("active", "inactive", "transferred", "graduated"),
}).min(1).unknown(false);

const normalizeStudent = (data) => {
  const value = normalizeFields(data, ["admissionNumber", "rollNumber", "academicYear"]);
  if (value.guardianPhone) value.guardianPhone = normalizeBangladeshPhone(value.guardianPhone);
  return value;
};

const validateCreateStudent = (data) => createStudentSchema.validate(normalizeStudent(data), { abortEarly: false, stripUnknown: true });
const validateUpdateStudent = (data) => updateStudentSchema.validate(normalizeStudent(data), { abortEarly: false, stripUnknown: true });

module.exports = { validateCreateStudent, validateUpdateStudent };
