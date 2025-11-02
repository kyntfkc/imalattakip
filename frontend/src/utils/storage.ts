// Güvenli storage utility - Token'ları güvenli şekilde saklar
// Not: Tam güvenlik için backend'de HttpOnly cookies kullanılmalı

interface StorageItem {
  value: string;
  expiresAt?: number; // Timestamp in milliseconds
}

class SecureStorage {
  private memoryStore: Map<string, string> = new Map();
  private useMemory: boolean = false;

  constructor() {
    // Production'da memory storage tercih edilebilir (XSS riskini azaltır)
    // Ancak refresh sonrası veri kaybolur
    this.useMemory = process.env.NODE_ENV === 'production' && 
                     process.env.REACT_APP_USE_MEMORY_STORAGE === 'true';
  }

  // Token'ı güvenli şekilde sakla
  setItem(key: string, value: string, expiresIn?: number): void {
    const item: StorageItem = {
      value,
      expiresAt: expiresIn ? Date.now() + expiresIn : undefined
    };

    if (this.useMemory && key.includes('token')) {
      // Token'ları memory'de sakla (XSS'den korur ama refresh sonrası kaybolur)
      this.memoryStore.set(key, value);
    } else {
      try {
        localStorage.setItem(key, JSON.stringify(item));
      } catch (error) {
        // localStorage doluysa veya erişilemiyorsa memory'ye geç
        console.warn('localStorage erişilemedi, memory storage kullanılıyor');
        this.memoryStore.set(key, value);
      }
    }
  }

  // Token'ı güvenli şekilde oku
  getItem(key: string): string | null {
    if (this.useMemory && key.includes('token')) {
      return this.memoryStore.get(key) || null;
    }

    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const item: StorageItem = JSON.parse(stored);
      
      // Expiry kontrolü
      if (item.expiresAt && Date.now() > item.expiresAt) {
        this.removeItem(key);
        return null;
      }

      return item.value;
    } catch (error) {
      // JSON parse hatası veya localStorage erişilemiyorsa
      return null;
    }
  }

  // Token'ı güvenli şekilde sil
  removeItem(key: string): void {
    if (this.useMemory && key.includes('token')) {
      this.memoryStore.delete(key);
    } else {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        this.memoryStore.delete(key);
      }
    }
  }

  // Tüm storage'ı temizle
  clear(): void {
    this.memoryStore.clear();
    try {
      localStorage.clear();
    } catch (error) {
      // localStorage erişilemiyorsa devam et
    }
  }

  // Token expiry kontrolü
  isTokenExpired(key: string): boolean {
    if (this.useMemory && key.includes('token')) {
      return false; // Memory'de expiry kontrolü yok
    }

    try {
      const stored = localStorage.getItem(key);
      if (!stored) return true;

      const item: StorageItem = JSON.parse(stored);
      if (!item.expiresAt) return false;

      return Date.now() > item.expiresAt;
    } catch {
      return true;
    }
  }

  // Token'ı yenile (expiry'yi güncelle)
  refreshToken(key: string, expiresIn: number): void {
    const value = this.getItem(key);
    if (value) {
      this.setItem(key, value, expiresIn);
    }
  }
}

export const secureStorage = new SecureStorage();

// Convenience methods
export const setAuthToken = (token: string, expiresIn?: number): void => {
  secureStorage.setItem('authToken', token, expiresIn);
};

export const getAuthToken = (): string | null => {
  return secureStorage.getItem('authToken');
};

export const removeAuthToken = (): void => {
  secureStorage.removeItem('authToken');
};

export const isAuthTokenExpired = (): boolean => {
  return secureStorage.isTokenExpired('authToken');
};

// User data için
export const setUserData = (user: any): void => {
  secureStorage.setItem('user', JSON.stringify(user));
};

export const getUserData = (): any | null => {
  const data = secureStorage.getItem('user');
  if (!data) return null;
  
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

export const removeUserData = (): void => {
  secureStorage.removeItem('user');
};

export default secureStorage;

