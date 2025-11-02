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

// Rol bazlı varsayılan ayarlar
const defaultSettingsByRole: Record<'admin' | 'user', MenuSettings> = {
  admin: {
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
  },
  user: {
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
      'logs': false, // User için varsayılan olarak gizli
      'settings': true,
      'user-management': false, // User için varsayılan olarak gizli
    },
  },
};

const defaultSettings: MenuSettings = defaultSettingsByRole.admin;

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
  // Rol bazlı varsayılan ayarları kullan
  const getDefaultSettings = (role?: 'admin' | 'user'): MenuSettings => {
    return defaultSettingsByRole[role || 'user'];
  };
  const [settings, setSettings] = useState<MenuSettings>(getDefaultSettings(user?.role));
  const [isLoading, setIsLoading] = useState(true);
  const [roleDefaultsFromBackend, setRoleDefaultsFromBackend] = useState<MenuSettings | null>(null);

  // Backend'den verileri yükle - sadece authenticated olduğunda
  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      setIsLoading(authLoading);
      return;
    }

    const loadSettings = async () => {
      try {
        setIsLoading(true);
        
        // Önce rol varsayılanlarını backend'den yükle (eğer kullanıcı rolü varsa)
        let effectiveRoleDefaults = getDefaultSettings(user?.role);
        if (user?.role) {
          try {
            const roleDefaultsResponse = await apiService.getRoleMenuDefaults(user.role);
            if (roleDefaultsResponse) {
              let backendDefaults: any = null;
              if ('defaults' in roleDefaultsResponse && roleDefaultsResponse.defaults) {
                backendDefaults = roleDefaultsResponse.defaults;
              } else if ('settings' in roleDefaultsResponse && roleDefaultsResponse.settings) {
                backendDefaults = roleDefaultsResponse.settings;
              }
              
              if (backendDefaults && backendDefaults.visibleMenus) {
                effectiveRoleDefaults = {
                  visibleMenus: {
                    ...effectiveRoleDefaults.visibleMenus,
                    ...backendDefaults.visibleMenus
                  }
                };
                setRoleDefaultsFromBackend(effectiveRoleDefaults);
              }
            }
          } catch (roleDefaultsError) {
            console.log('Rol varsayılanları yüklenemedi, kod içi varsayılanlar kullanılıyor:', roleDefaultsError);
          }
        }
        
        // Sonra kullanıcı özel ayarlarını backend'den yükle
        try {
          const response = await apiService.getMenuSettings();
          if (response && response.settings && response.settings.visibleMenus && typeof response.settings.visibleMenus === 'object') {
            // Kullanıcı ayarları varsa, rol varsayılanlarını üzerine yaz
            const allMenus = Object.keys(effectiveRoleDefaults.visibleMenus);
            const mergedMenus: any = { ...effectiveRoleDefaults.visibleMenus }; // Önce rol varsayılanlarını kopyala
            // Backend'den gelen kullanıcı ayarlarını üzerine yaz
            allMenus.forEach((menuKey) => {
              if (response.settings.visibleMenus && response.settings.visibleMenus[menuKey] !== undefined) {
                mergedMenus[menuKey] = response.settings.visibleMenus[menuKey];
              }
            });
            setSettings({ visibleMenus: mergedMenus });
            setIsLoading(false);
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
            // Parsed settings'in doğru formatta olduğunu kontrol et
            if (parsedSettings && parsedSettings.visibleMenus && typeof parsedSettings.visibleMenus === 'object') {
              // Rol varsayılanlarını (backend'den yüklenen veya kod içi) kullan
              const allMenus = Object.keys(effectiveRoleDefaults.visibleMenus);
              const mergedMenus: any = { ...effectiveRoleDefaults.visibleMenus }; // Önce rol varsayılanlarını kopyala
              // localStorage'dan gelen ayarları üzerine yaz
              allMenus.forEach((menuKey) => {
                if (menuKey in parsedSettings.visibleMenus) {
                  mergedMenus[menuKey] = parsedSettings.visibleMenus[menuKey];
                }
              });
              setSettings({ visibleMenus: mergedMenus });
            } else {
              // Geçersiz format, rol varsayılanlarını kullan
              setSettings(effectiveRoleDefaults);
            }
          } catch (parseError) {
            console.error('localStorage parse hatası:', parseError);
            setSettings(effectiveRoleDefaults);
          }
        } else {
          // Kullanıcı ayarları yoksa, rol varsayılanlarını kullan
          setSettings(effectiveRoleDefaults);
        }
      } catch (error) {
        console.error('Menü ayarları yüklenemedi:', error);
        // Hata durumunda kod içi varsayılanları kullan
        setSettings(getDefaultSettings(user?.role));
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [isAuthenticated, authLoading, user?.id, user?.role]);

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
    // Backend'den yüklenen rol varsayılanlarını kullan (yoksa kod içi varsayılanlar)
    const roleBasedDefaults = roleDefaultsFromBackend || getDefaultSettings(user?.role);
    setSettings(roleBasedDefaults);
    
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
        localStorage.setItem(userSpecificKey, JSON.stringify(roleBasedDefaults));
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

