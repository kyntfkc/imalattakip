import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UnitType } from '../types';
import { apiService } from '../services/apiService';
import { useAuth } from './AuthContext';

interface DashboardSettings {
  unitOrder: UnitType[];
  hiddenUnits: UnitType[];
  showFire: boolean;
  showHas: boolean;
  showLastUpdate: boolean;
}

interface DashboardSettingsContextType {
  settings: DashboardSettings;
  updateUnitOrder: (newOrder: UnitType[]) => Promise<void>;
  toggleUnitVisibility: (unitId: UnitType) => Promise<void>;
  updateSetting: (key: keyof DashboardSettings, value: any) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  isLoading: boolean;
}

const defaultSettings: DashboardSettings = {
  unitOrder: ['ana-kasa', 'yarimamul', 'lazer-kesim', 'tezgah', 'cila', 'dokum', 'tedarik', 'satis', 'dis-kasa'],
  hiddenUnits: [],
  showFire: true,
  showHas: true,
  showLastUpdate: true
};

const DashboardSettingsContext = createContext<DashboardSettingsContextType | undefined>(undefined);

export const useDashboardSettings = () => {
  const context = useContext(DashboardSettingsContext);
  if (!context) {
    throw new Error('useDashboardSettings must be used within DashboardSettingsProvider');
  }
  return context;
};

interface DashboardSettingsProviderProps {
  children: ReactNode;
}

export const DashboardSettingsProvider: React.FC<DashboardSettingsProviderProps> = ({ children }) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [settings, setSettings] = useState<DashboardSettings>(defaultSettings);
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
        const response = await apiService.getDashboardSettings();
        setSettings(response.settings);
      } catch (error) {
        console.error('Dashboard ayarları yüklenemedi:', error);
        // Backend hatası durumunda localStorage'dan yükle
        const saved = localStorage.getItem('dashboard-settings');
        if (saved) {
          try {
            const parsedSettings = JSON.parse(saved);
            // Eksik birimleri varsayılan ayarlardan ekle
            const allUnits = ['ana-kasa', 'yarimamul', 'lazer-kesim', 'tezgah', 'cila', 'dokum', 'tedarik', 'satis', 'dis-kasa'];
            const missingUnits = allUnits.filter(unit => !parsedSettings.unitOrder.includes(unit));
            if (missingUnits.length > 0) {
              parsedSettings.unitOrder = [...parsedSettings.unitOrder, ...missingUnits];
            }
            setSettings(parsedSettings);
          } catch (parseError) {
            console.error('localStorage parse hatası:', parseError);
            setSettings(defaultSettings);
          }
        } else {
          setSettings(defaultSettings);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [isAuthenticated, authLoading]);

  // LocalStorage'a da kaydet (backup olarak)
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('dashboard-settings', JSON.stringify(settings));
    }
  }, [settings, isLoading]);

  const updateUnitOrder = async (newOrder: UnitType[]) => {
    const newSettings = { ...settings, unitOrder: newOrder };
    setSettings(newSettings);
    
    try {
      await apiService.saveDashboardSettings(newSettings);
    } catch (error) {
      console.error('Dashboard ayarları kaydedilemedi:', error);
    }
  };

  const toggleUnitVisibility = async (unitId: UnitType) => {
    const newSettings = {
      ...settings,
      hiddenUnits: settings.hiddenUnits.includes(unitId)
        ? settings.hiddenUnits.filter(id => id !== unitId)
        : [...settings.hiddenUnits, unitId]
    };
    setSettings(newSettings);
    
    try {
      await apiService.saveDashboardSettings(newSettings);
    } catch (error) {
      console.error('Dashboard ayarları kaydedilemedi:', error);
    }
  };

  const updateSetting = async (key: keyof DashboardSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    try {
      await apiService.saveDashboardSettings(newSettings);
    } catch (error) {
      console.error('Dashboard ayarları kaydedilemedi:', error);
    }
  };

  const resetToDefaults = async () => {
    setSettings(defaultSettings);
    
    try {
      await apiService.resetDashboardSettings();
    } catch (error) {
      console.error('Dashboard ayarları sıfırlanamadı:', error);
    }
  };

  return (
    <DashboardSettingsContext.Provider
      value={{
        settings,
        updateUnitOrder,
        toggleUnitVisibility,
        updateSetting,
        resetToDefaults,
        isLoading
      }}
    >
      {children}
    </DashboardSettingsContext.Provider>
  );
};

