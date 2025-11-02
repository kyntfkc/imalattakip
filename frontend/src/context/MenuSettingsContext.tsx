import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/apiService';
import { useAuth } from './AuthContext';

interface MenuSettings {
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
  settings: MenuSettings;
  toggleMenuVisibility: (menuKey: keyof MenuSettings['visibleMenus']) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  isLoading: boolean;
}

const defaultSettings: MenuSettings = {
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
    'logs': true,
    'settings': true,
    'user-management': true,
  },
};

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
  const [settings, setSettings] = useState<MenuSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Backend'den verileri yükle - sadece authenticated olduğunda
  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      setIsLoading(authLoading);
      return;
    }

    const loadSettings = async () => {
      try {
        setIsLoading(true);
        // Önce backend'den yükle (kullanıcı bazlı)
        try {
          const response = await apiService.getMenuSettings();
          if (response.settings && response.settings.visibleMenus) {
            // Eksik menü öğelerini varsayılan ayarlardan ekle
            const allMenus = Object.keys(defaultSettings.visibleMenus);
            const mergedMenus: any = { ...defaultSettings.visibleMenus };
            allMenus.forEach((menuKey) => {
              if (response.settings.visibleMenus[menuKey] !== undefined) {
                mergedMenus[menuKey] = response.settings.visibleMenus[menuKey];
              }
            });
            setSettings({ visibleMenus: mergedMenus });
            return;
          }
        } catch (backendError) {
          console.log('Backend\'den menü ayarları yüklenemedi, localStorage\'dan yükleniyor...', backendError);
        }
        
        // Backend yoksa veya hata varsa, kullanıcı bazlı localStorage'dan yükle
        const userSpecificKey = `menu-settings-${user?.id || 'guest'}`;
        const saved = localStorage.getItem(userSpecificKey);
        if (saved) {
          try {
            const parsedSettings = JSON.parse(saved);
            const allMenus = Object.keys(defaultSettings.visibleMenus);
            const mergedMenus: any = { ...defaultSettings.visibleMenus };
            allMenus.forEach((menuKey) => {
              if (parsedSettings.visibleMenus && menuKey in parsedSettings.visibleMenus) {
                mergedMenus[menuKey] = parsedSettings.visibleMenus[menuKey];
              }
            });
            setSettings({ visibleMenus: mergedMenus });
          } catch (parseError) {
            console.error('localStorage parse hatası:', parseError);
            setSettings(defaultSettings);
          }
        } else {
          setSettings(defaultSettings);
        }
      } catch (error) {
        console.error('Menü ayarları yüklenemedi:', error);
        setSettings(defaultSettings);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [isAuthenticated, authLoading, user?.id]);

  // LocalStorage'a da kaydet (backup olarak) - kullanıcı bazlı
  useEffect(() => {
    if (!isLoading && user?.id) {
      const userSpecificKey = `menu-settings-${user.id}`;
      localStorage.setItem(userSpecificKey, JSON.stringify(settings));
    }
  }, [settings, isLoading, user?.id]);

  const toggleMenuVisibility = async (menuKey: keyof MenuSettings['visibleMenus']) => {
    const newSettings = {
      ...settings,
      visibleMenus: {
        ...settings.visibleMenus,
        [menuKey]: !settings.visibleMenus[menuKey],
      },
    };
    setSettings(newSettings);
    
    try {
      // Önce backend'e kaydet (kullanıcı bazlı)
      try {
        await apiService.saveMenuSettings(newSettings);
      } catch (backendError) {
        console.log('Backend\'e kaydedilemedi, localStorage\'a kaydediliyor...', backendError);
      }
      
      // Kullanıcı bazlı localStorage'a kaydet (backup)
      if (user?.id) {
        const userSpecificKey = `menu-settings-${user.id}`;
        localStorage.setItem(userSpecificKey, JSON.stringify(newSettings));
      }
    } catch (error) {
      console.error('Menü ayarları kaydedilemedi:', error);
    }
  };

  const resetToDefaults = async () => {
    setSettings(defaultSettings);
    
    try {
      // Backend'e sıfırla
      try {
        await apiService.resetMenuSettings();
      } catch (backendError) {
        console.log('Backend\'e sıfırlanamadı, localStorage\'dan sıfırlanıyor...', backendError);
      }
      
      // Kullanıcı bazlı localStorage'a kaydet
      if (user?.id) {
        const userSpecificKey = `menu-settings-${user.id}`;
        localStorage.setItem(userSpecificKey, JSON.stringify(defaultSettings));
      }
    } catch (error) {
      console.error('Menü ayarları sıfırlanamadı:', error);
    }
  };

  return (
    <MenuSettingsContext.Provider
      value={{
        settings,
        toggleMenuVisibility,
        resetToDefaults,
        isLoading
      }}
    >
      {children}
    </MenuSettingsContext.Provider>
  );
};

