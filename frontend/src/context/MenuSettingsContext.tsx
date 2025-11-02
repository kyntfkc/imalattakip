import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { apiService } from '../services/apiService';
import { useAuth } from './AuthContext';

export interface MenuSettings {
  visibleMenus: {
    dashboard: boolean;
    'ana-kasa': boolean;
    'yarimamul': boolean;
    'lazer-kesim': boolean;
    'tezgah': boolean;
    'cila': boolean;
    'external-vault': boolean;
    'dokum': boolean;
    'tedarik': boolean;
    'satis': boolean;
    'required-has': boolean;
    'reports': boolean;
    'companies': boolean;
    'logs': boolean;
    'settings': boolean;
    'user-management': boolean;
  };
}

interface MenuSettingsContextType {
  // Aktif menü ayarları (rol varsayılanları + kullanıcı override'ları)
  settings: MenuSettings;
  // Rol varsayılanları (sadece admin görebilir)
  roleDefaults: MenuSettings | null;
  // Ayarları yükleme durumu
  isLoading: boolean;
  // Menü görünürlüğünü değiştir (kullanıcı override)
  toggleMenuVisibility: (menuKey: keyof MenuSettings['visibleMenus']) => Promise<void>;
  // Kullanıcı ayarlarını rol varsayılanlarına sıfırla
  resetToRoleDefaults: () => Promise<void>;
  // Rol varsayılanlarını güncelle (sadece admin)
  updateRoleDefaults: (role: 'admin' | 'user', newDefaults: MenuSettings) => Promise<void>;
  // Rol varsayılanlarını yükle (sadece admin)
  loadRoleDefaults: (role: 'admin' | 'user') => Promise<MenuSettings | null>;
}

const MenuSettingsContext = createContext<MenuSettingsContextType | undefined>(undefined);

export const useMenuSettings = () => {
  const context = useContext(MenuSettingsContext);
  if (!context) {
    throw new Error('useMenuSettings must be used within MenuSettingsProvider');
  }
  return context;
};

interface MenuSettingsProviderProps {
  children: ReactNode;
}

export const MenuSettingsProvider: React.FC<MenuSettingsProviderProps> = ({ children }) => {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [settings, setSettings] = useState<MenuSettings | null>(null);
  const [roleDefaults, setRoleDefaults] = useState<MenuSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rol varsayılanlarını backend'den yükle (sadece admin için)
  const loadRoleDefaultsFromBackend = useCallback(async (role: 'admin' | 'user', isAdmin: boolean): Promise<MenuSettings | null> => {
    // Normal kullanıcılar için backend'den rol varsayılanlarını yükleme
    // (endpoint sadece admin'lere açık)
    if (!isAdmin) {
      return null;
    }
    
    try {
      const response = await apiService.getRoleMenuDefaults(role);
      
      if ('defaults' in response && response.defaults?.visibleMenus) {
        return response.defaults as MenuSettings;
      } else if ('settings' in response && response.settings?.visibleMenus) {
        return response.settings as MenuSettings;
      }
      
      return null;
    } catch (error) {
      // 403 hatası normal kullanıcılar için beklenen bir durum
      console.log(`Rol varsayılanları yüklenemedi (${role}):`, error);
      return null;
    }
  }, []);

  // Kullanıcı override ayarlarını backend'den yükle
  const loadUserOverrides = useCallback(async (): Promise<MenuSettings | null> => {
    try {
      const response = await apiService.getMenuSettings();
      if (response?.settings?.visibleMenus) {
        return response.settings as MenuSettings;
      }
      return null;
    } catch (error) {
      console.log('Kullanıcı ayarları yüklenemedi:', error);
      return null;
    }
  }, []);

  // Ayarları yükle: Rol varsayılanları + Kullanıcı override'ları
  const loadSettings = useCallback(async () => {
    if (!user?.role) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Normalize role: Backend'de 'normal_user', frontend'de 'user' olarak kullanılıyor
      // user.role type is 'admin' | 'user' but backend can return 'normal_user'
      const userRole = user.role as 'admin' | 'user' | 'normal_user';
      const normalizedRole = userRole === 'normal_user' ? 'user' : (userRole === 'admin' ? 'admin' : 'user');
      const isAdmin = userRole === 'admin';

      // 1. Rol varsayılanlarını yükle (sadece admin için backend'den, normal kullanıcılar için kod içi varsayılanlar)
      const roleDefaultsData = await loadRoleDefaultsFromBackend(normalizedRole as 'admin' | 'user', isAdmin);
      
      // Eğer backend'de yoksa, kod içi varsayılanları kullan
      const defaultRoleSettings: MenuSettings = {
        visibleMenus: {
          dashboard: true,
          'ana-kasa': true,
          'yarimamul': true,
          'lazer-kesim': true,
          'tezgah': true,
          'cila': true,
          'external-vault': true,
          'dokum': true,
          'tedarik': true,
          'satis': true,
          'required-has': true,
          'reports': true,
          'companies': true,
          'logs': user.role === 'admin',
          'settings': true,
          'user-management': user.role === 'admin',
        },
      };

      const effectiveRoleDefaults = roleDefaultsData || defaultRoleSettings;
      setRoleDefaults(effectiveRoleDefaults);

      // 2. Kullanıcı override ayarlarını yükle
      const userOverrides = await loadUserOverrides();

      // 3. Birleştir: Rol varsayılanları + Kullanıcı override'ları
      if (userOverrides) {
        // Kullanıcı override'ları varsa, bunları rol varsayılanlarının üzerine yaz
        const mergedSettings: MenuSettings = {
          visibleMenus: {
            ...effectiveRoleDefaults.visibleMenus,
            ...userOverrides.visibleMenus,
          },
        };
        console.log('📋 Menü ayarları yüklendi (Rol varsayılanları + Kullanıcı override\'ları):', mergedSettings);
        setSettings(mergedSettings);
      } else {
        // Kullanıcı override'ları yoksa, sadece rol varsayılanlarını kullan
        console.log('📋 Menü ayarları yüklendi (Sadece rol varsayılanları):', effectiveRoleDefaults);
        setSettings(effectiveRoleDefaults);
      }

      // 4. localStorage'a backup olarak kaydet
      if (user?.id) {
        const currentSettings = userOverrides 
          ? { visibleMenus: { ...effectiveRoleDefaults.visibleMenus, ...userOverrides.visibleMenus } }
          : effectiveRoleDefaults;
        localStorage.setItem(`menu-settings-${user.id}`, JSON.stringify(currentSettings));
      }
    } catch (error) {
      console.error('Ayarlar yüklenemedi:', error);
      // Hata durumunda varsayılan ayarları kullan
      const fallbackSettings: MenuSettings = {
        visibleMenus: {
          dashboard: true,
          'ana-kasa': true,
          'yarimamul': true,
          'lazer-kesim': true,
          'tezgah': true,
          'cila': true,
          'external-vault': true,
          'dokum': true,
          'tedarik': true,
          'satis': true,
          'required-has': true,
          'reports': true,
          'companies': true,
          'logs': user?.role === 'admin',
          'settings': true,
          'user-management': user?.role === 'admin',
        },
      };
      setSettings(fallbackSettings);
      setRoleDefaults(fallbackSettings);
    } finally {
      setIsLoading(false);
    }
  }, [user?.role, user?.id, loadRoleDefaultsFromBackend, loadUserOverrides]);

  // Kullanıcı giriş yaptığında ayarları yükle
  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      setIsLoading(authLoading);
      return;
    }

    loadSettings();
  }, [authLoading, isAuthenticated, loadSettings]);

  // Menü görünürlüğünü değiştir (kullanıcı override)
  const toggleMenuVisibility = useCallback(async (menuKey: keyof MenuSettings['visibleMenus']) => {
    if (!settings) {
      // Eğer settings yoksa, önce ayarları yükle
      await loadSettings();
      return;
    }

    const newSettings: MenuSettings = {
      visibleMenus: {
        ...settings.visibleMenus,
        [menuKey]: !settings.visibleMenus[menuKey],
      },
    };

    setSettings(newSettings);

    try {
      // Backend'e kaydet
      await apiService.saveMenuSettings(newSettings);
      
      // localStorage'a backup olarak kaydet
      if (user?.id) {
        localStorage.setItem(`menu-settings-${user.id}`, JSON.stringify(newSettings));
      }
    } catch (error) {
      console.error('Menü ayarı kaydedilemedi:', error);
      // Hata durumunda geri al
      setSettings(settings);
    }
  }, [settings, user?.id, loadSettings]);

  // Kullanıcı ayarlarını rol varsayılanlarına sıfırla
  const resetToRoleDefaults = useCallback(async () => {
    if (!roleDefaults) {
      await loadSettings();
      return;
    }

    setSettings(roleDefaults);

    try {
      // Backend'deki kullanıcı ayarlarını sil (reset endpoint'i ile)
      await apiService.resetMenuSettings();
      
      // localStorage'dan da temizle
      if (user?.id) {
        localStorage.removeItem(`menu-settings-${user.id}`);
      }
    } catch (error) {
      console.error('Ayarlar sıfırlanamadı:', error);
    }
  }, [roleDefaults, user?.id, loadSettings]);

  // Rol varsayılanlarını güncelle (sadece admin)
  const updateRoleDefaults = useCallback(async (role: 'admin' | 'user', newDefaults: MenuSettings) => {
    try {
      await apiService.saveRoleMenuDefaults(role, newDefaults);
      
      // Eğer mevcut kullanıcının rolü güncelleniyorsa, ayarları yeniden yükle
      if (user?.role === role) {
        await loadSettings();
      }
      
      setRoleDefaults(newDefaults);
    } catch (error) {
      console.error('Rol varsayılanları güncellenemedi:', error);
      throw error;
    }
  }, [user?.role, loadSettings]);

  // Rol varsayılanlarını yükle (sadece admin)
  const loadRoleDefaults = useCallback(async (role: 'admin' | 'user'): Promise<MenuSettings | null> => {
    return await loadRoleDefaultsFromBackend(role);
  }, [loadRoleDefaultsFromBackend]);

  // settings varsa onu kullan, yoksa ve loading bitmişse roleDefaults kullan
  // Loading bitmemişse null döndür (menüler görünmesin)
  const effectiveSettings: MenuSettings | null = settings || (!isLoading && roleDefaults) || null;

  return (
    <MenuSettingsContext.Provider
      value={{
        settings: effectiveSettings || {
          // Bu fallback sadece TypeScript tip hatası için - asla kullanılmamalı
          // çünkü App.tsx'te isMenuVisible null kontrolü yapıyor
          visibleMenus: {
            dashboard: false,
            'ana-kasa': false,
            'yarimamul': false,
            'lazer-kesim': false,
            'tezgah': false,
            'cila': false,
            'external-vault': false,
            'dokum': false,
            'tedarik': false,
            'satis': false,
            'required-has': false,
            'reports': false,
            'companies': false,
            'logs': false,
            'settings': false,
            'user-management': false,
          },
        },
        roleDefaults,
        isLoading,
        toggleMenuVisibility,
        resetToRoleDefaults,
        updateRoleDefaults,
        loadRoleDefaults,
      }}
    >
      {children}
    </MenuSettingsContext.Provider>
  );
};
