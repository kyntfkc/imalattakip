import { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

export const useBackendStatus = () => {
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        setIsChecking(true);
        await apiService.healthCheck();
        setIsBackendOnline(true);
      } catch (error) {
        console.error('Backend bağlantı hatası:', error);
        setIsBackendOnline(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkBackendStatus();
    
    // Her 30 saniyede bir kontrol et
    const interval = setInterval(checkBackendStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return { isBackendOnline, isChecking };
};
