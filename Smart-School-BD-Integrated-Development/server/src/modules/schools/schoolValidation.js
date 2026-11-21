const Joi = require("joi");

const schoolRegistrationSchema = Joi.object({
  name: Joi.string().trim().min(3).max(150).required(),
  schoolCode: Joi.string().trim().uppercase().min(3).max(30).pattern(/^[A-Z0-9-]+$/).required(),
  institutionType: Joi.string().valid("government", "private").required(),
  address: Joi.string().trim().max(300).required(),
  division: Joi.string().trim().min(2).max(100).required(),
  district: Joi.string().trim().min(2).max(100).required(),
  upazila: Joi.string().trim().min(2).max(100).required(),
  principalName: Joi.string().trim().min(2).max(100).required(),
  principalDesignation: Joi.string().trim().min(2).max(100).required(),
  principalIndexNumber: Joi.string().trim().max(40).allow("").default(""),
  principalEmail: Joi.string().trim().email().max(254).lowercase().required(),
  principalPhone: Joi.string().trim().min(7).max(20).required(),
  password: Joi.string().min(12).max(128).required(),
  contactPhone: Joi.string().trim().max(20).allow("").default(""),
  contactEmail: Joi.string().trim().email().max(254).allow("").default(""),
});

const validateSchoolRegistration = (data) =>
  schoolRegistrationSchema.validate(data, { abortEarly: false, stripUnknown: true });

module.exports = { validateSchoolRegistration };
