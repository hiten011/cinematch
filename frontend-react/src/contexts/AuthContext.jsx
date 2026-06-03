import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API } from '../config/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isLogin, setIsLogin]       = useState(false);
  const [user, setUser]             = useState(null);
  const [isDark, setIsDark]         = useState(true);
  const [isLoading, setIsLoading]   = useState(true); // true until first auth check done

  const applyTheme = useCallback((dark) => {
    document.body.classList.toggle('dark', dark);
    document.body.classList.toggle('light', !dark);
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      await axios.get(API.AUTH.STATUS);
      const { data } = await axios.get(API.USERS.ME);
      const dark = data.theme === 'dark';
      setIsLogin(true);
      setUser(data);
      setIsDark(dark);
      applyTheme(dark);
      document.cookie = `theme=${dark ? 'dark' : 'light'}; path=/; max-age=31536000`;
    } catch {
      setIsLogin(false);
      setUser(null);
      applyTheme(isDark);
    } finally {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line

  const toggleTheme = useCallback(async () => {
    const next = !isDark;
    setIsDark(next);
    applyTheme(next);
    document.body.classList.add('theme-transition');
    setTimeout(() => document.body.classList.remove('theme-transition'), 700);
    document.cookie = `theme=${next ? 'dark' : 'light'}; path=/; max-age=31536000`;
    if (isLogin) {
      try { await axios.post(API.USERS.THEME, { theme: next ? 'dark' : 'light' }); } catch {}
    }
  }, [isDark, isLogin, applyTheme]);

  const logout = useCallback(async () => {
    try { await axios.post(API.AUTH.LOGOUT); } catch {}
    setIsLogin(false);
    setUser(null);
  }, []);

  // Read theme from cookie before first render to avoid flash
  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)theme=([^;]*)/);
    const savedDark = match ? match[1] === 'dark' : true;
    setIsDark(savedDark);
    applyTheme(savedDark);
    checkAuth();
  }, []); // eslint-disable-line

  return (
    <AuthContext.Provider value={{ isLogin, user, isDark, isLoading, checkAuth, toggleTheme, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
