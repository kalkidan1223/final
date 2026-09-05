import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import axiosClient, { setAccessToken } from '../api/axiosClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On first load, try to silently refresh — if the httpOnly cookie is
  // still valid this restores the session without asking the user to log in.
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axiosClient.post('/auth/refresh');
        setAccessToken(data.access_token);
        setUser(data.user);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await axiosClient.post('/auth/login', { email, password });
    setAccessToken(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const registerParent = useCallback(async (payload) => {
    const { data } = await axiosClient.post('/auth/register/parent', payload);
    if (data.access_token) {
      setAccessToken(data.access_token);
      setUser(data.user);
    }
    return data;
  }, []);

  const registerInstructor = useCallback(async (payload) => {
    const { data } = await axiosClient.post('/auth/register/instructor', payload);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await axiosClient.post('/auth/logout');
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, registerParent, registerInstructor, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
