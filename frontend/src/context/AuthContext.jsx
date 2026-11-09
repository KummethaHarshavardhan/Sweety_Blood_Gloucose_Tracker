import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { authAPI } from '../services/authAPI.js';
import { setAccessToken, setSessionExpiredHandler } from '../services/api.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // loading stays true until we know whether a session exists
  const [loading, setLoading] = useState(true);

  // If a refresh fails later (for example after the 7-day session ends), clear the user
  // so ProtectedRoute sends them back to login
  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null));
  }, []);

  // On page load, the refresh cookie (if any) restores the session without a password
  useEffect(() => {
    let active = true;
    authAPI
      .refresh()
      .then((data) => {
        if (active) setUser(data.user);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authAPI.login({ email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback((payload) => authAPI.register(payload), []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch {
      // Even if the request fails, the local session must still end
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, isAuthenticated: Boolean(user), login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
