import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../lib/api';

export interface User {
  id: string;
  fullName: string;
  dni: string;
  role: 'MEDICO' | 'FISIOTERAPEUTA' | 'ADMISION';
  active: boolean;
  gender?: string;
}

interface AuthContextType {
  currentUser: User | null;
  isGuest: boolean;
  /**
   * Login persistente (MEDICO / ADMISION): guarda token en localStorage, se restaura al refrescar.
   * Login efímero (FISIOTERAPEUTA): NO guarda en localStorage, solo en memoria para la acción actual.
   */
  login: (dni: string, pass: string) => Promise<{ user: User; ephemeral: boolean }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      authAPI.me().then(result => {
        if (result.data) {
          setCurrentUser(result.data);
        } else {
          localStorage.removeItem('accessToken');
        }
      });
    }
  }, []);

  const login = useCallback(async (dni: string, pass: string) => {
    const result = await authAPI.login(dni, pass);
    if (result.error) throw new Error(result.error);
    const { access_token, user, ephemeral } = result.data!;

    if (ephemeral) {
      // FISIOTERAPEUTA: token en memoria solo para la petición inmediata, no persistir.
      localStorage.setItem('accessToken', access_token);
    } else {
      // MEDICO / ADMISION: persistir 6h.
      localStorage.setItem('accessToken', access_token);
      setCurrentUser(user);
    }

    return { user, ephemeral };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    setCurrentUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, isGuest: currentUser === null, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
