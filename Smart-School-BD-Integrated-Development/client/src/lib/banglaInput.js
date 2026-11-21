const DIGITS = { "০":"0","১":"1","২":"2","৩":"3","৪":"4","৫":"5","৬":"6","৭":"7","৮":"8","৯":"9" };
export const normalizeBanglaDigits = (value) =>
  String(value ?? "").replace(/[০-৯]/g, (digit) => DIGITS[digit]);
export const parseBanglaInteger = (value) => {
  const normalized = normalizeBanglaDigits(value).trim();
  if (!/^\d+$/.test(normalized)) return NaN;
  return Number(normalized);
};
