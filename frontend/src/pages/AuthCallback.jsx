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

      if (error) {
        navigate(`/login?error=${encodeURIComponent(error)}`);
        return;
      }

      if (token && refreshToken) {
        try {
          // Store tokens
          localStorage.setItem('token', token);
          localStorage.setItem('refreshToken', refreshToken);
          
          // Set auth token in axios
          setAuthToken(token);
          
          // Fetch user data
          const user = await fetchUser();
          
          // Redirect to appropriate dashboard
          navigate(ROLE_HOME[user.role] || '/');
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
