import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold text-slate-800">Not authorized</h1>
      <p className="mt-2 text-slate-500">You don't have access to this page.</p>
      <Link to="/login" className="mt-6 inline-block text-sky-600 hover:underline">
        Back to login
      </Link>
    </div>
  );
}
