import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/apiService';
import socketService from '../services/socketService';

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

  // Backend'den kullanıcı bilgilerini yükle ve socket bağlantısını başlat
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Token doğrulama
        const verification = await apiService.verifyToken();
        if (verification && verification.valid) {
          const loadedUser = {
            id: verification.user.id,
            username: verification.user.username,
            role: verification.user.role as 'admin' | 'user'
          };
          setUser(loadedUser);
          
          // Socket bağlantısını başlat
          const token = localStorage.getItem('authToken');
          if (token) {
            socketService.connect(token);
          }
        } else {
          // Fallback: localStorage'dan yükle
          const savedUser = localStorage.getItem('user');
          if (savedUser) {
            try {
              const parsedUser = JSON.parse(savedUser);
              setUser(parsedUser);
              const token = localStorage.getItem('authToken');
              if (token) {
                socketService.connect(token);
              }
            } catch (parseError) {
              console.error('User JSON parse hatası:', parseError);
              // Geçersiz JSON varsa temizle
              localStorage.removeItem('user');
              localStorage.removeItem('authToken');
            }
          }
        }
      } catch (error) {
        console.error('Kullanıcı bilgileri yüklenemedi:', error);
        // Fallback: localStorage'dan yükle
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);
            const token = localStorage.getItem('authToken');
            if (token) {
              socketService.connect(token);
            }
          } catch (parseError) {
            console.error('User JSON parse hatası:', parseError);
            // Geçersiz JSON varsa temizle
            localStorage.removeItem('user');
            localStorage.removeItem('authToken');
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();

    // Cleanup: component unmount'ta socket bağlantısını kapat
    return () => {
      socketService.disconnect();
    };
  }, []);

  // Backend API kullanımı için localStorage varsayılan kullanıcıları kaldırıldı

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await apiService.login(username, password);
      const newUser = {
        id: response.user.id,
        username: response.user.username,
        role: response.user.role as 'admin' | 'user'
      };
      setUser(newUser);
      
      // Socket bağlantısını başlat
      const token = localStorage.getItem('authToken');
      if (token) {
        socketService.connect(token);
      }
      
      return true;
    } catch (error: any) {
      console.error('Giriş hatası:', error);
      // Hata mesajını throw et ki Login.tsx'te gösterilebilsin
      throw error;
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
    // Socket bağlantısını kapat
    socketService.disconnect();
    
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
