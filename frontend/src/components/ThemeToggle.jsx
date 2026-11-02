import React from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * ThemeToggle Component
 * A professional, sleek switch for Day / Night mode.
 *
 * Props:
 *  - compact: boolean (icon-only mode for compact headers)
 *  - showLabel: boolean (shows "Night" / "Day" text next to the switch)
 *  - className: string (custom positioning or styling)
 */
export default function ThemeToggle({ compact = false, showLabel = true, className = '' }) {
  const { isDark, toggleTheme } = useTheme();

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Night Mode'}
        title={isDark ? 'Switch to Light Mode (Day)' : 'Switch to Night Mode (Night)'}
        className={`relative inline-flex items-center justify-center p-2 rounded-xl transition-all duration-300 active:scale-95 border ${
          isDark
            ? 'bg-slate-800/90 text-amber-300 border-slate-700 hover:bg-slate-700 hover:border-amber-400/40 shadow-[0_0_12px_rgba(251,191,36,0.2)]'
            : 'bg-white/80 text-slate-700 border-slate-200/90 hover:bg-slate-100 hover:text-indigo-600 shadow-sm'
        } ${className}`}
      >
        <span className="sr-only">Toggle Night Mode</span>
        <div className="relative w-5 h-5 flex items-center justify-center">
          {/* Sun Icon */}
          <svg
            className={`w-5 h-5 transition-all duration-500 transform ${
              isDark ? 'opacity-0 rotate-90 scale-0 absolute' : 'opacity-100 rotate-0 scale-100 text-amber-500'
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="5" fill="currentColor" fillOpacity="0.2" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"
            />
          </svg>

          {/* Moon Icon */}
          <svg
            className={`w-5 h-5 transition-all duration-500 transform ${
              isDark ? 'opacity-100 rotate-0 scale-100 text-amber-300' : 'opacity-0 -rotate-90 scale-0 absolute'
            }`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Night Mode'}
      title={isDark ? 'Currently in Night Mode. Click for Day Mode.' : 'Currently in Day Mode. Click for Night Mode.'}
      className={`group relative inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border transition-all duration-300 backdrop-blur-md active:scale-95 ${
        isDark
          ? 'bg-slate-800/90 border-slate-700/80 text-slate-200 hover:border-amber-400/40 hover:bg-slate-750 shadow-[0_0_15px_rgba(251,191,36,0.15)]'
          : 'bg-white/80 border-slate-200/90 text-slate-700 hover:border-indigo-300 hover:bg-white shadow-sm'
      } ${className}`}
    >
      {/* Sliding Pill Track */}
      <div
        className={`relative w-10 h-5 rounded-full transition-colors duration-300 flex items-center p-0.5 ${
          isDark ? 'bg-indigo-950/80 border border-amber-400/40' : 'bg-slate-200 border border-slate-300/80'
        }`}
      >
        {/* Thumb */}
        <div
          className={`w-4 h-4 rounded-full flex items-center justify-center transition-transform duration-300 shadow-sm ${
            isDark
              ? 'transform translate-x-5 bg-gradient-to-tr from-amber-300 to-yellow-100 text-slate-900'
              : 'transform translate-x-0 bg-white text-amber-500'
          }`}
        >
          {isDark ? (
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          ) : (
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Label */}
      {showLabel && (
        <span className="text-xs font-semibold tracking-wide flex items-center gap-1 select-none">
          {isDark ? (
            <>
              <span className="text-amber-300">Night</span>
              <span className="text-[10px] text-amber-200/70">🌙</span>
            </>
          ) : (
            <>
              <span className="text-slate-600 group-hover:text-slate-900">Day</span>
              <span className="text-[10px] text-amber-500">☀️</span>
            </>
          )}
        </span>
      )}
    </button>
  );
}

