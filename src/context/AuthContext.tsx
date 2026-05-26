import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, db } from '../lib/mockDb';
import { authAPI } from '../lib/api';

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
      const u = db.getUserById(saved);
      if (u) setCurrentUser(u);
    }
  }, []);

  const login = async (dni: string, pass: string) => {
    const result = await authAPI.login(dni, pass);

    if (result.error) {
      throw new Error(result.error);
    }

    const { access_token, user } = result.data!;
    localStorage.setItem('accessToken', access_token);
    setCurrentUser(user);
    return user;
  };

    const logout = async () => {
      await authAPI.logout();
      localStorage.removeItem('accessToken');
      setCurrentUser(null);
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
