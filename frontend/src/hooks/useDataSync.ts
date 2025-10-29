import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';

interface DataSyncStatus {
  lastSaved: Date | null;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  dataSize: number;
  autoSaveEnabled: boolean;
}

export const useDataSync = () => {
  const [syncStatus, setSyncStatus] = useState<DataSyncStatus>({
    lastSaved: null,
    isSaving: false,
    hasUnsavedChanges: false,
    dataSize: 0,
    autoSaveEnabled: true
  });

  // LocalStorage boyutunu hesapla
  const calculateStorageSize = useCallback(() => {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total / 1024; // KB cinsinden
  }, []);

  // Veri değişikliklerini dinle
  useEffect(() => {
    let lastSize = 0;
    let saveTimeout: NodeJS.Timeout | null = null;

    const checkDataChanges = () => {
      const size = calculateStorageSize();
      
      // Boyut değişmişse kaydedilme zamanını güncelle
      if (size !== lastSize) {
        lastSize = size;
        
        // Debounce: 1 saniye içinde birden fazla değişiklik varsa tek bir kayıt işlemi yap
        if (saveTimeout) {
          clearTimeout(saveTimeout);
        }
        
        saveTimeout = setTimeout(() => {
          setSyncStatus(prev => ({
            ...prev,
            dataSize: size,
            lastSaved: new Date(),
            hasUnsavedChanges: false
          }));
        }, 1000);
      } else {
        // Sadece boyutu güncelle
        setSyncStatus(prev => ({
          ...prev,
          dataSize: size
        }));
      }
    };

    // İlk yüklemede boyutu hesapla ve lastSaved'ı set et
    const initialSize = calculateStorageSize();
    lastSize = initialSize;
    setSyncStatus(prev => ({
      ...prev,
      dataSize: initialSize,
      lastSaved: prev.lastSaved || new Date()
    }));

    // Storage değişikliklerini dinle (farklı tab'dan yapılan değişiklikler için)
    window.addEventListener('storage', checkDataChanges);
    
    // Periyodik olarak kontrol et (aynı tab'dan yapılan değişiklikler için)
    const interval = setInterval(checkDataChanges, 2000);

    return () => {
      window.removeEventListener('storage', checkDataChanges);
      clearInterval(interval);
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [calculateStorageSize]);

  // Son kaydedilme zamanını güncelle
  const updateLastSaved = useCallback(() => {
    setSyncStatus(prev => ({
      ...prev,
      lastSaved: new Date(),
      hasUnsavedChanges: false
    }));
  }, []);

  // Kaydetme durumunu güncelle
  const setIsSaving = useCallback((saving: boolean) => {
    setSyncStatus(prev => ({
      ...prev,
      isSaving: saving
    }));
  }, []);

  // Kaydedilmemiş değişiklik durumunu güncelle
  const setHasUnsavedChanges = useCallback((hasChanges: boolean) => {
    setSyncStatus(prev => ({
      ...prev,
      hasUnsavedChanges: hasChanges
    }));
  }, []);

  // Otomatik kaydetmeyi aç/kapat
  const toggleAutoSave = useCallback(() => {
    setSyncStatus(prev => {
      const newAutoSave = !prev.autoSaveEnabled;
      message.success(newAutoSave ? 'Otomatik kaydetme açıldı' : 'Otomatik kaydetme kapatıldı');
      return {
        ...prev,
        autoSaveEnabled: newAutoSave
      };
    });
  }, []);

  // Manuel kaydetme
  const manualSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // LocalStorage zaten otomatik kaydediyor, burada simüle ediyoruz
      await new Promise(resolve => setTimeout(resolve, 500));
      updateLastSaved();
      message.success('Veriler kaydedildi');
    } catch (error) {
      message.error('Kaydetme sırasında hata oluştu');
    } finally {
      setIsSaving(false);
    }
  }, [setIsSaving, updateLastSaved]);

  // Verileri yedekle (JSON olarak indir)
  const exportBackup = useCallback(() => {
    try {
      const backup = {
        timestamp: new Date().toISOString(),
        data: {
          transfers: localStorage.getItem('transfers'),
          'external-vault-transactions': localStorage.getItem('external-vault-transactions'),
          companies: localStorage.getItem('companies'),
          'dashboard-settings': localStorage.getItem('dashboard-settings'),
          'cinsi-settings': localStorage.getItem('cinsi-settings'),
          'system-logs': localStorage.getItem('system-logs'),
          'authToken': localStorage.getItem('authToken'),
          'user': localStorage.getItem('user')
        }
      };

      const dataStr = JSON.stringify(backup, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `imalat-takip-yedek-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      message.success('Yedek başarıyla indirildi');
    } catch (error) {
      message.error('Yedekleme sırasında hata oluştu');
    }
  }, []);

  // Yedeği geri yükle
  const importBackup = useCallback((file: File) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const backup = JSON.parse(e.target?.result as string);
          
          if (backup.data) {
            Object.entries(backup.data).forEach(([key, value]) => {
              if (value) {
                localStorage.setItem(key, value as string);
              }
            });
            
            message.success('Yedek başarıyla geri yüklendi');
            updateLastSaved();
            
            // Sayfayı yenile
            setTimeout(() => {
              window.location.reload();
            }, 1000);
            
            resolve(true);
          } else {
            throw new Error('Geçersiz yedek dosyası');
          }
        } catch (error) {
          message.error('Yedek dosyası okunamadı');
          reject(error);
        }
      };
      
      reader.onerror = () => {
        message.error('Dosya okunamadı');
        reject(new Error('File read error'));
      };
      
      reader.readAsText(file);
    });
  }, [updateLastSaved]);

  // Tüm verileri temizle
  const clearAllData = useCallback(() => {
    try {
      const keysToRemove = [
        'transfers',
        'external-vault-transactions',
        'companies',
        'dashboard-settings',
        'cinsi-settings',
        'system-logs'
      ];
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      message.success('Tüm veriler temizlendi');
      
      // Sayfayı yenile
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      message.error('Veri temizleme sırasında hata oluştu');
    }
  }, []);

  return {
    syncStatus,
    updateLastSaved,
    setIsSaving,
    setHasUnsavedChanges,
    toggleAutoSave,
    manualSave,
    exportBackup,
    importBackup,
    clearAllData
  };
};

