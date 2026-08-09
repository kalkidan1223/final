export default function FormField({
  label,
  required,
  error,
  hint,
  children,
  className = '',
}) {
  return (
    <div className={className}>
      {label && (
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

export const inputClass = (hasError) =>
  `w-full rounded-xl border-2 py-3 px-4 text-base transition-all duration-200 focus:outline-none focus:ring-4 ${
    hasError
      ? 'border-rose-300 bg-rose-50/50 focus:border-rose-400 focus:ring-rose-100'
      : 'border-slate-200 bg-white focus:border-violet-400 focus:ring-violet-100 hover:border-slate-300'
  }`;
