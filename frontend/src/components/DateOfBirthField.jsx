import { useEffect, useState } from 'react';
import {
  ETHIOPIAN_MONTHS,
  ethiopianMonthLength,
  ethiopianToGregorianISO,
  gregorianISOToEthiopian,
  isValidEthiopianDate,
} from '../utils/ethiopianDate';

// Date of birth entry that accepts either the Ethiopian (Ge'ez) calendar or
// the Gregorian one. Whichever calendar the user picks, `onChange` always
// receives a Gregorian 'YYYY-MM-DD' string so the API contract is unchanged.
export default function DateOfBirthField({ value, onChange, label = 'Date of Birth', required = false }) {
  const [calendar, setCalendar] = useState('ethiopian');
  const [et, setEt] = useState({ year: '', month: '', day: '' });

  // Keep the Ethiopian inputs in sync when the value changes elsewhere
  // (initial load, switching calendars, resetting the form).
  useEffect(() => {
    const parsed = gregorianISOToEthiopian(value);
    if (parsed) setEt({ year: String(parsed.year), month: String(parsed.month), day: String(parsed.day) });
    else if (!value) setEt({ year: '', month: '', day: '' });
  }, [value]);

  function updateEthiopian(part) {
    return (e) => {
      const next = { ...et, [part]: e.target.value };
      setEt(next);
      const year = Number(next.year);
      const month = Number(next.month);
      const day = Number(next.day);
      if (isValidEthiopianDate(year, month, day)) onChange(ethiopianToGregorianISO(year, month, day));
      else onChange('');
    };
  }

  const selectedEtYear = Number(et.year);
  const selectedEtMonth = Number(et.month);
  const maxDay =
    Number.isInteger(selectedEtYear) && selectedEtYear > 0 && selectedEtMonth >= 1 && selectedEtMonth <= 13
      ? ethiopianMonthLength(selectedEtYear, selectedEtMonth)
      : 30;

  const gregorianPreview = value
    ? new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const ethiopianPreview = (() => {
    const parsed = gregorianISOToEthiopian(value);
    return parsed ? `${ETHIOPIAN_MONTHS[parsed.month - 1]} ${parsed.day}, ${parsed.year} E.C.` : '';
  })();

  const fieldClass =
    'rounded-xl border-2 border-slate-200 py-3 px-4 focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100';

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="text-sm font-bold text-slate-700">
          {label} {required && '*'}
        </label>
        <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs font-semibold">
          {[
            { key: 'ethiopian', label: 'Ethiopian' },
            { key: 'gregorian', label: 'Gregorian' },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setCalendar(option.key)}
              className={`rounded-full px-3 py-1 transition ${
                calendar === option.key ? 'bg-emerald-500 text-white shadow' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {calendar === 'ethiopian' ? (
        <div className="grid grid-cols-3 gap-3">
          <select value={et.month} onChange={updateEthiopian('month')} className={fieldClass} aria-label="Ethiopian month">
            <option value="">Month</option>
            {ETHIOPIAN_MONTHS.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
          <select value={et.day} onChange={updateEthiopian('day')} className={fieldClass} aria-label="Ethiopian day">
            <option value="">Day</option>
            {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <input
            type="number"
            inputMode="numeric"
            min="1900"
            max="2100"
            placeholder="Year (E.C.)"
            value={et.year}
            onChange={updateEthiopian('year')}
            className={fieldClass}
            aria-label="Ethiopian year"
          />
        </div>
      ) : (
        <input
          type="date"
          required={required}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full ${fieldClass}`}
          aria-label="Date of birth"
        />
      )}

      {value && (
        <p className="mt-2 text-xs text-slate-500">
          {calendar === 'ethiopian' ? `Gregorian: ${gregorianPreview}` : `Ethiopian: ${ethiopianPreview}`}
        </p>
      )}
    </div>
  );
}
