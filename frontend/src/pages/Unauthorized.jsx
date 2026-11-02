import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

export default function Unauthorized() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4">
      <div className="absolute top-5 right-6 z-20">
        <ThemeToggle />
      </div>
      <div className="mx-auto max-w-md text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Not Authorized</h1>
        <p className="text-slate-500">You do not have permission to access this page.</p>
        <Link to="/login" className="mt-6 inline-block rounded-xl bg-indigo-600 text-white px-6 py-2.5 font-semibold hover:bg-indigo-700 transition shadow-sm">
          Back to Login
        </Link>
      </div>
    </div>
  );
}
