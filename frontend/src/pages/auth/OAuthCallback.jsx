import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLE_HOME } from '../../utils/roles';

/**
 * OAuth Callback Handler
 * Handles the redirect from Google OAuth with tokens in query params.
 * Works for both login and sign-up (pending → role-selection) flows.
 */
export default function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuthToken, fetchUser } = useAuth();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const token = searchParams.get('token');
      const refreshToken = searchParams.get('refreshToken');
      const redirect = searchParams.get('redirect');
      const error = searchParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        navigate('/login?error=' + encodeURIComponent(error));
        return;
      }

      if (!token) {
        navigate('/login?error=No authentication token received');
        return;
      }

      try {
        // Persist tokens so axiosClient picks them up
        localStorage.setItem('token', token);
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }

        // Register token in axios default headers
        setAuthToken(token);

        // Fetch authenticated user via axiosClient (uses the token we just set)
        const user = await fetchUser();

        // If backend sent an explicit redirect (e.g. /auth/role-selection for new Google users)
        if (redirect) {
          navigate(redirect, { replace: true });
          return;
        }

        // New user whose role is still 'pending' — send to role selection
        if (user?.role === 'pending') {
          navigate('/auth/role-selection', { replace: true });
          return;
        }

        // Existing user — go straight to their dashboard
        navigate(user ? (ROLE_HOME[user.role] || '/') : '/', { replace: true });
      } catch (err) {
        console.error('OAuth callback error:', err);
        navigate('/login?error=Authentication failed');
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate, setAuthToken, fetchUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-600 via-sky-500 to-pink-500">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold text-white mb-2">Completing Sign In…</h2>
        <p className="text-white/80">Please wait while we set up your account</p>
      </div>
    </div>
  );
}
