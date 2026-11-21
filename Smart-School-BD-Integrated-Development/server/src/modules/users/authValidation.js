const Joi = require("joi");
const { normalizeFields, normalizeBangladeshPhone } = require("../../utils/banglaInput");

const phoneSchema = Joi.string().custom((value, helpers) => {
  const normalized = normalizeBangladeshPhone(value);
  if (!/^01[3-9]\d{8}$/.test(normalized)) {
    return helpers.error("string.pattern.base");
  }
  return normalized;
}).messages({ "string.pattern.base": "সঠিক ১১ সংখ্যার বাংলাদেশি মোবাইল নম্বর দিন (যেমন ০১৭১২৩৪৫৬৭৮)" });

const codePattern = /^[\p{L}\p{N}-]+$/u;

const teacherRegisterSchema = Joi.object({
  schoolCode: Joi.string().trim().uppercase().pattern(codePattern).min(3).max(30).required(),
  name: Joi.string().trim().min(2).max(100).required(),
  designation: Joi.string().trim().min(2).max(100).required(),
  indexNumber: Joi.string().trim().max(40).allow("").default(""),
  teacherCode: Joi.string().trim().uppercase().max(40).pattern(codePattern).allow("").default(""),
  email: Joi.string().trim().email().max(254).lowercase().required(),
  phone: phoneSchema.required(),
  password: Joi.string().min(12).max(128).required(),
});

const loginSchema = Joi.object({
  schoolCode: Joi.string().trim().uppercase().pattern(codePattern).min(3).max(30).allow("").default(""),
  email: Joi.string().trim().email().max(254).lowercase().required(),
  password: Joi.string().max(128).required(),
  centralOffice: Joi.boolean().default(false),
});

module.exports = {
  validateTeacherRegister: (data) => {
    const normalized = normalizeFields(data, ["schoolCode", "indexNumber", "teacherCode"]);
    normalized.phone = normalizeBangladeshPhone(normalized.phone);
    return teacherRegisterSchema.validate(normalized, { abortEarly: false, stripUnknown: true });
  },
  validateLogin: (data) => loginSchema.validate(normalizeFields(data, ["schoolCode"]), { abortEarly: false, stripUnknown: true }),
};
