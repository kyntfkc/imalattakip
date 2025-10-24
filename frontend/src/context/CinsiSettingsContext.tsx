import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/apiService';

export interface CinsiOption {
  id: string;
  value: string;
  label: string;
}

interface CinsiSettingsContextType {
  cinsiOptions: CinsiOption[];
  addCinsi: (value: string, label: string) => void;
  updateCinsi: (id: string, value: string, label: string) => void;
  deleteCinsi: (id: string) => void;
  reorderCinsi: (fromIndex: number, toIndex: number) => void;
  resetToDefaults: () => void;
  isLoading?: boolean;
}

const CinsiSettingsContext = createContext<CinsiSettingsContextType | undefined>(undefined);

const DEFAULT_CINSI_OPTIONS: CinsiOption[] = [
  { id: '1', value: 'bilezik', label: 'Bilezik' },
  { id: '2', value: 'kolye', label: 'Kolye' },
  { id: '3', value: 'yuzuk', label: 'Yüzük' },
  { id: '4', value: 'kupeler', label: 'Küpeler' },
  { id: '5', value: 'saat', label: 'Saat' },
  { id: '6', value: 'ham', label: 'Ham Altın' },
  { id: '7', value: 'diger', label: 'Diğer' }
];

export const CinsiSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cinsiOptions, setCinsiOptions] = useState<CinsiOption[]>(DEFAULT_CINSI_OPTIONS);
  const [isLoading, setIsLoading] = useState(true);

  // Backend'den verileri yükle
  useEffect(() => {
    const loadCinsiOptions = async () => {
      try {
        setIsLoading(true);
        const options = await apiService.getCinsiOptions();
        
        // Backend'den gelen veriyi frontend formatına çevir
        const formattedOptions = options.map((option: any) => ({
          id: option.id.toString(),
          value: option.value,
          label: option.label
        }));
        
        setCinsiOptions(formattedOptions);
      } catch (error) {
        console.error('Cinsi ayarları yüklenemedi:', error);
        // Backend hatası durumunda localStorage'dan yükle
        const saved = localStorage.getItem('cinsi-settings');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setCinsiOptions(parsed);
          } catch (parseError) {
            console.error('localStorage parse hatası:', parseError);
            setCinsiOptions(DEFAULT_CINSI_OPTIONS);
          }
        } else {
          setCinsiOptions(DEFAULT_CINSI_OPTIONS);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadCinsiOptions();
  }, []);

  // LocalStorage'a da kaydet (backup olarak)
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('cinsi-settings', JSON.stringify(cinsiOptions));
    }
  }, [cinsiOptions, isLoading]);

  const addCinsi = async (value: string, label: string) => {
    try {
      const response = await apiService.createCinsi({ value, label });
      
      // Backend'den dönen veriyi frontend formatına çevir
      const newCinsi: CinsiOption = {
        id: response.cinsi.id.toString(),
        value: response.cinsi.value,
        label: response.cinsi.label
      };
      
      setCinsiOptions(prev => [...prev, newCinsi]);
    } catch (error) {
      console.error('Cinsi eklenemedi:', error);
      // Backend hatası durumunda localStorage'a ekle
      const newId = Date.now().toString();
      const newCinsi: CinsiOption = {
        id: newId,
        value: value.toLowerCase().replace(/\s+/g, '-'),
        label: label.trim()
      };
      setCinsiOptions(prev => [...prev, newCinsi]);
    }
  };

  const updateCinsi = async (id: string, value: string, label: string) => {
    try {
      await apiService.updateCinsi(parseInt(id), { value, label });
      
      setCinsiOptions(prev => 
        prev.map(cinsi => 
          cinsi.id === id 
            ? { ...cinsi, value: value.toLowerCase().replace(/\s+/g, '-'), label: label.trim() }
            : cinsi
        )
      );
    } catch (error) {
      console.error('Cinsi güncellenemedi:', error);
      // Backend hatası durumunda localStorage'da güncelle
      setCinsiOptions(prev => 
        prev.map(cinsi => 
          cinsi.id === id 
            ? { ...cinsi, value: value.toLowerCase().replace(/\s+/g, '-'), label: label.trim() }
            : cinsi
        )
      );
    }
  };

  const deleteCinsi = async (id: string) => {
    try {
      await apiService.deleteCinsi(parseInt(id));
      setCinsiOptions(prev => prev.filter(cinsi => cinsi.id !== id));
    } catch (error) {
      console.error('Cinsi silinemedi:', error);
      // Backend hatası durumunda localStorage'dan sil
      setCinsiOptions(prev => prev.filter(cinsi => cinsi.id !== id));
    }
  };

  const reorderCinsi = async (fromIndex: number, toIndex: number) => {
    try {
      // Yerel olarak sıralamayı güncelle
      setCinsiOptions(prev => {
        const newOptions = [...prev];
        const [movedItem] = newOptions.splice(fromIndex, 1);
        newOptions.splice(toIndex, 0, movedItem);
        return newOptions;
      });
      
      // Backend'e sıralamayı kaydet (opsiyonel - şimdilik sadece yerel)
      // TODO: Backend'e sıralama bilgisini kaydetmek için API endpoint eklenebilir
      
    } catch (error) {
      console.error('Cinsi sıralaması güncellenemedi:', error);
    }
  };

  const resetToDefaults = async () => {
    try {
      await apiService.resetCinsiToDefaults();
      
      // Backend'den güncel veriyi yükle
      const options = await apiService.getCinsiOptions();
      const formattedOptions = options.map((option: any) => ({
        id: option.id.toString(),
        value: option.value,
        label: option.label
      }));
      
      setCinsiOptions(formattedOptions);
    } catch (error) {
      console.error('Cinsi sıfırlanamadı:', error);
      // Backend hatası durumunda localStorage'da sıfırla
      setCinsiOptions(DEFAULT_CINSI_OPTIONS);
    }
  };

  const contextValue: CinsiSettingsContextType = {
    cinsiOptions,
    addCinsi,
    updateCinsi,
    deleteCinsi,
    reorderCinsi,
    resetToDefaults,
    isLoading
  };

  return (
    <CinsiSettingsContext.Provider value={contextValue}>
      {children}
    </CinsiSettingsContext.Provider>
  );
};

export const useCinsiSettings = (): CinsiSettingsContextType => {
  const context = useContext(CinsiSettingsContext);
  if (!context) {
    throw new Error('useCinsiSettings must be used within a CinsiSettingsProvider');
  }
  return context;
};