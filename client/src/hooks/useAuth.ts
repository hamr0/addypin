import { useState, useEffect } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  sessionToken: string | null;
  email: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    sessionToken: null,
    email: null,
  });

  // Load auth state from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('addypin_session_token');
    const savedEmail = localStorage.getItem('addypin_user_email');
    
    if (savedToken && savedEmail) {
      setAuthState({
        isAuthenticated: true,
        sessionToken: savedToken,
        email: savedEmail,
      });
    }
  }, []);

  const login = (sessionToken: string, email: string) => {
    localStorage.setItem('addypin_session_token', sessionToken);
    localStorage.setItem('addypin_user_email', email);
    setAuthState({
      isAuthenticated: true,
      sessionToken,
      email,
    });
  };

  const logout = () => {
    localStorage.removeItem('addypin_session_token');
    localStorage.removeItem('addypin_user_email');
    setAuthState({
      isAuthenticated: false,
      sessionToken: null,
      email: null,
    });
  };

  return {
    ...authState,
    login,
    logout,
  };
}