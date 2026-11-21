// Normalize Bangla and Arabic-Indic digits to ASCII for numeric identifiers.
// Passwords are intentionally never normalized or modified.
const digitMap = {
  "০":"0","১":"1","২":"2","৩":"3","৪":"4","৫":"5","৬":"6","৭":"7","৮":"8","৯":"9",
  "٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9",
};
const normalizeDigits = (value) =>
  typeof value === "string" ? value.replace(/[০-৯٠-٩]/g, (digit) => digitMap[digit]) : value;

const normalizeBangladeshPhone = (value) => {
  if (typeof value !== "string") return value;
  let phone = normalizeDigits(value).replace(/[\s()-]/g, "");
  if (phone.startsWith("+880")) phone = "0" + phone.slice(4);
  else if (phone.startsWith("880")) phone = "0" + phone.slice(3);
  return phone;
};

const normalizeFields = (data, fields = []) => {
  const result = { ...data };
  for (const field of fields) {
    if (typeof result[field] === "string") result[field] = normalizeDigits(result[field]).trim();
  }
  return result;
};

module.exports = { normalizeDigits, normalizeBangladeshPhone, normalizeFields };
