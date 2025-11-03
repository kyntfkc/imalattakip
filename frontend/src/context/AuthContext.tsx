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

// Rol normalleştirme fonksiyonu: Backend'den 'normal_user' gelebilir, frontend'de 'user' olarak normalize edilir
const normalizeRole = (role: string): 'admin' | 'user' => {
  if (role === 'admin') return 'admin';
  if (role === 'normal_user' || role === 'user') return 'user';
  // Varsayılan olarak 'user' döndür
  return 'user';
};

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
            role: normalizeRole(verification.user.role)
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
              // Rolü normalize et
              setUser({
                ...parsedUser,
                role: normalizeRole(parsedUser.role || 'user')
              });
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
            // Rolü normalize et
            setUser({
              ...parsedUser,
              role: normalizeRole(parsedUser.role || 'user')
            });
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
      const normalizedRole = normalizeRole(response.user.role);
      const newUser = {
        id: response.user.id,
        username: response.user.username,
        role: normalizedRole
      };
      setUser(newUser);
      
      // localStorage'a normalize edilmiş rolü kaydet
      localStorage.setItem('user', JSON.stringify(newUser));
      
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
