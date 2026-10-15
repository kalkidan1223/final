import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_HOME } from '../utils/roles';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthToken, fetchUser } = useAuth();

  useEffect(() => {
    async function handleCallback() {
      const token = searchParams.get('token');
      const refreshToken = searchParams.get('refreshToken');
      const error = searchParams.get('error');
      const redirectParam = searchParams.get('redirect');

      if (error) {
        navigate(`/login?error=${encodeURIComponent(error)}`);
        return;
      }

      if (token) {
        try {
          // Store tokens
          localStorage.setItem('token', token);
          if (refreshToken) {
            localStorage.setItem('refreshToken', refreshToken);
          }
          
          // Set auth token in axios client
          setAuthToken(token);
          
          // Fetch user data
          const user = await fetchUser();

          // If redirect param is provided (e.g. /auth/role-selection)
          if (redirectParam) {
            navigate(redirectParam, { replace: true });
            return;
          }

          // If user role is pending, redirect to role selection
          if (user?.role === 'pending') {
            navigate('/auth/role-selection', { replace: true });
            return;
          }
          
          // Redirect to appropriate dashboard
          navigate(user ? (ROLE_HOME[user.role] || '/') : '/', { replace: true });
        } catch (err) {
          console.error('Auth callback error:', err);
          navigate('/login?error=authentication_failed');
        }
      } else {
        navigate('/login?error=missing_tokens');
      }
    }

    handleCallback();
  }, [searchParams, navigate, setAuthToken, fetchUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-600 via-sky-500 to-pink-500">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold text-white mb-2">Completing Sign In...</h2>
        <p className="text-white/80">Please wait while we set up your account</p>
      </div>
    </div>
  );
}
