import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../lib/types';
import { apiService } from '../lib/api';

interface AuthContextType {
  currentUser: User | null;
  login: (dni: string, pass: string) => Promise<User | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('activeUserId');
    if (saved) {
      apiService.getUserById(saved).then((u) => {
        if (u) {
          setCurrentUser(u);
          apiService.setCurrentUser(u);
        }
      });
    }
  }, []);

  const login = async (dni: string, pass: string): Promise<User | null> => {
    try {
      const u = await apiService.login(dni, pass);
      setCurrentUser(u);
      localStorage.setItem('activeUserId', u.id);
      apiService.setCurrentUser(u);
      return u;
    } catch (error) {
      console.error('Login failed:', error);
      return null;
    }
  };

  const logout = async () => {
    await apiService.logout();
    setCurrentUser(null);
    localStorage.removeItem('activeUserId');
    apiService.setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
