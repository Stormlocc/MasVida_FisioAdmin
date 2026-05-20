import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, db } from '../lib/mockDb';

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
    // In a real app this would be a secure API call
    return new Promise<User | null>((resolve) => {
      setTimeout(() => {
        const u = db.getUserByDni(dni);
        if (u && u.passwordHash === pass && u.active) {
          setCurrentUser(u);
          localStorage.setItem('activeUserId', u.id);
          resolve(u);
        } else {
          resolve(null);
        }
      }, 500); // simulate network delay
    });
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('activeUserId');
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
