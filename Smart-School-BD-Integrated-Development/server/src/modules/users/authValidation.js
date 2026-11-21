const Joi = require("joi");

const teacherRegisterSchema = Joi.object({
  schoolCode: Joi.string().trim().uppercase().pattern(/^[A-Z0-9-]+$/).min(3).max(30).required(),
  name: Joi.string().trim().min(2).max(100).required(),
  designation: Joi.string().trim().min(2).max(100).required(),
  indexNumber: Joi.string().trim().max(40).allow("").default(""),
  teacherCode: Joi.string().trim().uppercase().max(40).allow("").default(""),
  email: Joi.string().trim().email().max(254).lowercase().required(),
  phone: Joi.string().trim().min(7).max(20).required(),
  password: Joi.string().min(12).max(128).required(),
});

const loginSchema = Joi.object({
  schoolCode: Joi.string().trim().uppercase().pattern(/^[A-Z0-9-]+$/).min(3).max(30).allow("").default(""),
  email: Joi.string().trim().email().max(254).lowercase().required(),
  password: Joi.string().max(128).required(),
  centralOffice: Joi.boolean().default(false),
});

module.exports = {
  validateTeacherRegister: (data) => teacherRegisterSchema.validate(data, { abortEarly: false, stripUnknown: true }),
  validateLogin: (data) => loginSchema.validate(data, { abortEarly: false, stripUnknown: true }),
};
