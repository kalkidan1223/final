// Conversions between the Ethiopian (Ge'ez) calendar and the Gregorian
// calendar. The Ethiopian year has 12 months of 30 days plus Pagume, a
// 13th month of 5 days (6 in a leap year).
//
// All conversions go through the Julian Day Number so they stay exact for
// any date, including leap years around century boundaries.

const ETHIOPIC_JDN_EPOCH = 1723856; // 1 Meskerem 1 EC (Amete Mihret)

export const ETHIOPIAN_MONTHS = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
  'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume',
];

function mod(a, b) {
  return ((a % b) + b) % b;
}

function gregorianToJdn(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

function jdnToGregorian(jdn) {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    year: 100 * b + d - 4800 + Math.floor(m / 10),
    month: m + 3 - 12 * Math.floor(m / 10),
    day: e - Math.floor((153 * m + 2) / 5) + 1,
  };
}

function ethiopianToJdn(year, month, day) {
  return ETHIOPIC_JDN_EPOCH + 365 + 365 * (year - 1) + Math.floor(year / 4) + 30 * (month - 1) + day - 1;
}

function jdnToEthiopian(jdn) {
  const r = mod(jdn - ETHIOPIC_JDN_EPOCH, 1461);
  const n = mod(r, 365) + 365 * Math.floor(r / 1460);
  return {
    year: 4 * Math.floor((jdn - ETHIOPIC_JDN_EPOCH) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460),
    month: Math.floor(n / 30) + 1,
    day: mod(n, 30) + 1,
  };
}

export function isEthiopianLeapYear(year) {
  return mod(year, 4) === 3;
}

// Pagume (month 13) has 5 days, or 6 in a leap year.
export function ethiopianMonthLength(year, month) {
  if (month === 13) return isEthiopianLeapYear(year) ? 6 : 5;
  return 30;
}

export function isValidEthiopianDate(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 1 || month < 1 || month > 13 || day < 1) return false;
  return day <= ethiopianMonthLength(year, month);
}

// { year, month, day } in the Ethiopian calendar -> 'YYYY-MM-DD' Gregorian
export function ethiopianToGregorianISO(year, month, day) {
  if (!isValidEthiopianDate(year, month, day)) return '';
  const g = jdnToGregorian(ethiopianToJdn(year, month, day));
  return `${String(g.year).padStart(4, '0')}-${String(g.month).padStart(2, '0')}-${String(g.day).padStart(2, '0')}`;
}

// 'YYYY-MM-DD' Gregorian -> { year, month, day } in the Ethiopian calendar
export function gregorianISOToEthiopian(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!match) return null;
  const [, y, m, d] = match;
  return jdnToEthiopian(gregorianToJdn(Number(y), Number(m), Number(d)));
}

export function formatEthiopianDate(iso) {
  const et = gregorianISOToEthiopian(iso);
  if (!et) return '';
  return `${ETHIOPIAN_MONTHS[et.month - 1]} ${et.day}, ${et.year} E.C.`;
}
