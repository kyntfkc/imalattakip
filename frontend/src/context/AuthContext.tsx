import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/apiService';

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
  name?: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  register: (username: string, password: string, role?: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Backend API kullanımı için varsayılan kullanıcılar kaldırıldı

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Backend'den kullanıcı bilgilerini yükle
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Token doğrulama
        const verification = await apiService.verifyToken();
        if (verification && verification.valid) {
          setUser({
            id: verification.user.id,
            username: verification.user.username,
            role: verification.user.role as 'admin' | 'user'
          });
        } else {
          // Fallback: localStorage'dan yükle
          const savedUser = localStorage.getItem('user');
          if (savedUser) {
            setUser(JSON.parse(savedUser));
          }
        }
      } catch (error) {
        console.error('Kullanıcı bilgileri yüklenemedi:', error);
        // Fallback: localStorage'dan yükle
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []);

  // Backend API kullanımı için localStorage varsayılan kullanıcıları kaldırıldı

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await apiService.login(username, password);
      setUser({
        id: response.user.id,
        username: response.user.username,
        role: response.user.role as 'admin' | 'user'
      });
      return true;
    } catch (error) {
      console.error('Giriş hatası:', error);
      return false;
    }
  };

  const register = async (username: string, password: string, role: string = 'user'): Promise<boolean> => {
    try {
      await apiService.register(username, password, role);
      return true;
    } catch (error) {
      console.error('Kayıt hatası:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    apiService.logout();
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      login,
      logout,
      isLoading,
      register
    }}>
      {children}
    </AuthContext.Provider>
  );
};
