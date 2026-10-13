import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { apiClient, setAuthToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  googleLogin: (idToken: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  role?: string;
  specialization?: string;
  licenseNumber?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /**
   * Set the in-memory access token and update the user state.
   * No localStorage — token lives only in JS memory.
   */
  const setSession = (loggedInUser: User, accessToken: string) => {
    setUser(loggedInUser);
    setAuthToken(accessToken);
  };

  const clearSession = () => {
    setUser(null);
    setAuthToken(null);
  };

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiClient.get('/auth/me');
      if (res.data?.data?.user) {
        setUser(res.data.data.user);
      }
    } catch {
      clearSession();
    }
  }, []);

  /**
   * On mount: try to restore session via refresh token (httpOnly cookie).
   * No localStorage read needed — the cookie is sent automatically.
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Try to get a new access token using the httpOnly refresh cookie
        const refreshRes = await apiClient.post('/auth/refresh-token');
        if (refreshRes.data?.accessToken) {
          setAuthToken(refreshRes.data.accessToken);
          const meRes = await apiClient.get('/auth/me');
          if (meRes.data?.data?.user) {
            setUser(meRes.data.data.user);
          } else {
            clearSession();
          }
        } else {
          clearSession();
        }
      } catch {
        // No valid session — user needs to log in
        clearSession();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const res = await apiClient.post('/auth/login', { email, password });
    // If 2FA is required, throw special error so LoginPage can handle it
    if (res.data.requiresTwoFactor) {
      const err: any = new Error('2FA_REQUIRED');
      err.requiresTwoFactor = true;
      err.twoFactorToken = res.data.twoFactorToken;
      throw err;
    }
    const { user: loggedInUser, accessToken } = res.data.data;
    setSession(loggedInUser, accessToken);
  };

  const register = async (data: RegisterData): Promise<void> => {
    const res = await apiClient.post('/auth/register', data);
    const { user: registeredUser, accessToken } = res.data.data;
    setSession(registeredUser, accessToken);
  };

  const googleLogin = async (idToken: string, role?: string): Promise<void> => {
    const res = await apiClient.post('/auth/google', { idToken, role });
    const { user: loggedInUser, accessToken } = res.data.data;
    setSession(loggedInUser, accessToken);
  };

  const logout = async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Continue even if request fails — clear client state regardless
    }
    clearSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        googleLogin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
