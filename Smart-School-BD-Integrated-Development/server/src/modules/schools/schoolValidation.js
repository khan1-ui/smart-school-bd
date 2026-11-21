const Joi = require("joi");
const { normalizeFields, normalizeBangladeshPhone } = require("../../utils/banglaInput");

const phoneSchema = Joi.string().custom((value, helpers) => {
  const phone = normalizeBangladeshPhone(value);
  return /^01[3-9]\d{8}$/.test(phone) ? phone : helpers.error("string.pattern.base");
}).messages({ "string.pattern.base": "সঠিক ১১ সংখ্যার বাংলাদেশি মোবাইল নম্বর দিন" });

const schoolRegistrationSchema = Joi.object({
  name: Joi.string().trim().min(3).max(150).required(),
  schoolCode: Joi.string().trim().uppercase().min(3).max(30).pattern(/^[\p{L}\p{N}-]+$/u).required(),
  institutionType: Joi.string().valid("government", "private").required(),
  address: Joi.string().trim().max(300).required(),
  division: Joi.string().trim().min(2).max(100).required(),
  district: Joi.string().trim().min(2).max(100).required(),
  upazila: Joi.string().trim().min(2).max(100).required(),
  principalName: Joi.string().trim().min(2).max(100).required(),
  principalDesignation: Joi.string().trim().min(2).max(100).required(),
  principalIndexNumber: Joi.string().trim().max(40).allow("").default(""),
  principalEmail: Joi.string().trim().email().max(254).lowercase().required(),
  principalPhone: phoneSchema.required(),
  password: Joi.string().min(12).max(128).required(),
  contactPhone: Joi.string().custom((value, helpers) => {
    if (!value) return "";
    const phone = normalizeBangladeshPhone(value);
    return /^01[3-9]\d{8}$/.test(phone) ? phone : helpers.error("string.pattern.base");
  }).allow("").default("").messages({ "string.pattern.base": "সঠিক ১১ সংখ্যার বাংলাদেশি ফোন নম্বর দিন" }),
  contactEmail: Joi.string().trim().email().max(254).allow("").default(""),
});

const validateSchoolRegistration = (data) => {
  const normalized = normalizeFields(data, ["schoolCode", "principalIndexNumber"]);
  normalized.principalPhone = normalizeBangladeshPhone(normalized.principalPhone);
  normalized.contactPhone = normalizeBangladeshPhone(normalized.contactPhone);
  return schoolRegistrationSchema.validate(normalized, { abortEarly: false, stripUnknown: true });
};

module.exports = { validateSchoolRegistration };
