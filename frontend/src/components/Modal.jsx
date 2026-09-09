export default function Modal({ open, onClose, title, subtitle, children, size = 'md', footer, contentRef }) {
  if (!open) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div ref={contentRef} className={`relative w-full ${sizes[size]} max-h-[88vh] overflow-y-auto rounded-2xl bg-white shadow-2xl`}>
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
              {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-lg leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="sticky bottom-0 border-t border-slate-100 bg-white px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}