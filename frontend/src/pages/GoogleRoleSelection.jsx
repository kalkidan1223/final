import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

export default function GoogleRoleSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    try {
      const res = await axiosClient.get('/auth/me');
      setUser(res.data.user);

      // If user already has a role, redirect to appropriate dashboard
      if (res.data.user.role !== 'pending') {
        const roleRoutes = {
          'parent': '/parent/dashboard',
          'instructor': '/instructor/dashboard',
          'admin': '/admin/dashboard',
          'student': '/child'
        };
        navigate(roleRoutes[res.data.user.role] || '/');
        return;
      }
    } catch (err) {
      // Not authenticated, redirect to login
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = async (role) => {
    try {
      // Store selected role temporarily
      sessionStorage.setItem('google_signup_role', role);
      
      // Redirect to appropriate registration form
      if (role === 'instructor') {
        navigate('/signup/instructor');
      } else if (role === 'parent') {
        navigate('/signup/parent');
      }
    } catch (err) {
      console.error('Error selecting role:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400">
        <div className="text-center text-white">
          <div className="text-6xl animate-bounce mb-4">⏳</div>
          <p className="text-xl font-bold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 px-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12 text-center">
          {/* Success Icon */}
          <div className="text-6xl mb-6 animate-bounce">✅</div>
          
          {/* Welcome Message */}
          <h1 className="text-3xl sm:text-4xl font-black text-slate-800 mb-4">
            Welcome, {user?.full_name || 'User'}!
          </h1>
          <p className="text-lg text-slate-600 mb-8">
            You've successfully signed in with Google. Please choose your account type to continue:
          </p>

          {/* Role Selection Cards */}
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Parent Card */}
            <button
              onClick={() => handleRoleSelect('parent')}
              className="group relative p-8 rounded-2xl border-4 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">👨‍👩‍👧</div>
              <h2 className="text-2xl font-black text-purple-700 mb-2">Parent / Guardian</h2>
              <p className="text-slate-600 text-sm mb-4">
                Manage your children's learning journey, track progress, and support their education.
              </p>
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold group-hover:bg-purple-700 transition-colors shadow-lg">
                <span>Continue as Parent</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Instructor Card */}
            <button
              onClick={() => handleRoleSelect('instructor')}
              className="group relative p-8 rounded-2xl border-4 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">👩‍🏫</div>
              <h2 className="text-2xl font-black text-emerald-700 mb-2">Instructor</h2>
              <p className="text-slate-600 text-sm mb-4">
                Create courses, lessons, activities, and quizzes to help children learn and grow.
              </p>
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold group-hover:bg-emerald-700 transition-colors shadow-lg">
                <span>Continue as Instructor</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>

          {/* Info Text */}
          <p className="text-sm text-slate-500 mt-8">
            Your registration will be reviewed by an administrator before access is granted.
          </p>

          {/* Cancel Button */}
          <button
            onClick={() => {
              axiosClient.post('/auth/logout');
              navigate('/login');
            }}
            className="text-slate-500 hover:text-slate-700 font-semibold underline"
          >
            Cancel and go back to login
          </button>
        </div>
      </div>
    </div>
  );
}
