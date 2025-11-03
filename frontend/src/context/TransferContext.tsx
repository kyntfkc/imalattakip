import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { Transfer, UnitSummary } from '../types';
import { calculateUnitSummaries } from '../utils/fireCalculations';
import { apiService } from '../services/apiService';
import socketService from '../services/socketService';
import { useAuth } from './AuthContext';

interface TransferContextType {
  transfers: Transfer[];
  unitSummaries: UnitSummary[];
  addNewTransfer: (transfer: Omit<Transfer, 'id' | 'date'>) => Promise<void>;
  deleteTransfer: (id: string) => Promise<void>;
  updateTransfer: (id: string, transfer: Omit<Transfer, 'id' | 'date'>) => Promise<void>;
  clearAllTransfers: () => Promise<void>;
  isLoading: boolean;
}

const TransferContext = createContext<TransferContextType | undefined>(undefined);

export const useTransfers = () => {
  const context = useContext(TransferContext);
  if (!context) {
    throw new Error('useTransfers must be used within TransferProvider');
  }
  return context;
};

interface TransferProviderProps {
  children: ReactNode;
}

export const TransferProvider: React.FC<TransferProviderProps> = ({ children }) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Backend'den transfer verilerini yükle ve periyodik olarak güncelle (Socket.io yerine)
  useEffect(() => {
    // Authentication tamamlanana kadar bekle
    if (authLoading || !isAuthenticated) {
      setIsLoading(authLoading);
      return;
    }

    const loadTransfers = async () => {
      try {
        setIsLoading(true);
        
        // Sadece backend'den yükle
        const backendTransfers = await apiService.getTransfers();
        
        // Backend formatını frontend formatına çevir
        const formattedTransfers: Transfer[] = backendTransfers.map((t: any) => {
          return {
            id: t.id.toString(),
            fromUnit: t.from_unit,
            toUnit: t.to_unit,
            amount: t.amount,
            karat: `${t.karat}K` as any,
            notes: t.notes || '',
            date: new Date(t.created_at).toISOString(),
            user: t.user_name || 'Bilinmeyen',
            cinsi: (t.cinsi && t.cinsi.trim()) ? t.cinsi.trim() : undefined
          };
        });
        
        setTransfers(formattedTransfers);
        
      } catch (error) {
        console.error('Backend\'den veri yüklenemedi:', error);
        // Backend çalışmıyorsa boş array set et
        setTransfers([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadTransfers();

    // Socket.io çalışmıyorsa periyodik polling ile güncelle (fallback)
    // Socket.io bağlantısı kontrol edilecek, bağlıysa polling yapılmayacak
    const pollingInterval = setInterval(() => {
      if (!socketService.isConnected() && isAuthenticated) {
        loadTransfers();
      }
    }, 5000);

    return () => {
      clearInterval(pollingInterval);
    };
  }, [isAuthenticated, authLoading]);

  // Real-time socket event listeners
  useEffect(() => {
    // Socket bağlı değilse listener kurma
    if (!socketService.isConnected()) {
      return;
    }

    // Transfer oluşturuldu
    const handleTransferCreated = (data: any) => {
      const formattedTransfer: Transfer = {
        id: data.id.toString(),
        fromUnit: data.from_unit,
        toUnit: data.to_unit,
        amount: data.amount,
        karat: `${data.karat}K` as any,
        notes: data.notes || '',
        date: new Date(data.created_at).toISOString(),
        user: data.user_name || 'Bilinmeyen',
        cinsi: data.cinsi || undefined
      };

      setTransfers(prev => {
        // Zaten varsa ekleme (duplicate kontrolü)
        const exists = prev.find(t => t.id === formattedTransfer.id);
        if (exists) return prev;
        return [formattedTransfer, ...prev];
      });
    };

    // Transfer güncellendi
    const handleTransferUpdated = (data: any) => {
      const formattedTransfer: Transfer = {
        id: data.id.toString(),
        fromUnit: data.from_unit,
        toUnit: data.to_unit,
        amount: data.amount,
        karat: `${data.karat}K` as any,
        notes: data.notes || '',
        date: new Date(data.created_at).toISOString(),
        user: data.user_name || 'Bilinmeyen',
        cinsi: data.cinsi || undefined
      };

      setTransfers(prev => prev.map(t => 
        t.id === formattedTransfer.id ? formattedTransfer : t
      ));
    };

    // Transfer silindi
    const handleTransferDeleted = (data: { id: number }) => {
      setTransfers(prev => prev.filter(t => t.id !== data.id.toString()));
    };

    // Listener'ları kur
    socketService.onTransferCreated(handleTransferCreated);
    socketService.onTransferUpdated(handleTransferUpdated);
    socketService.onTransferDeleted(handleTransferDeleted);

    return () => {
      // Cleanup: listener'ları kaldır
      socketService.off('transfer:created');
      socketService.off('transfer:updated');
      socketService.off('transfer:deleted');
    };
  }, [socketService.isConnected()]); // Socket bağlantı durumunu dependency'ye ekle

  // Transfer değiştiğinde özetleri hesapla
  const unitSummaries = useMemo(() => {
    return calculateUnitSummaries(transfers);
  }, [transfers]);

  // Backend'e yeni transfer ekle
  const addNewTransfer = useCallback(async (transfer: Omit<Transfer, 'id' | 'date'>) => {
    try {
      console.log('📤 Transfer gönderiliyor:', {
        fromUnit: transfer.fromUnit,
        toUnit: transfer.toUnit,
        amount: transfer.amount,
        karat: transfer.karat,
        cinsi: transfer.cinsi,
        notes: transfer.notes
      });
      
      // Karat kontrolü
      if (!transfer.karat || typeof transfer.karat !== 'string') {
        throw new Error('Geçersiz karat değeri');
      }

      const response = await apiService.createTransfer({
        fromUnit: transfer.fromUnit,
        toUnit: transfer.toUnit,
        amount: transfer.amount,
        karat: parseInt(transfer.karat.replace('K', '')),
        notes: transfer.notes,
        cinsi: transfer.cinsi || undefined
      });

      // Socket event ile otomatik eklenecek, burada sadece optimistic update yapabiliriz
      // Ya da backend'den güncel veriyi çek
      const backendTransfers = await apiService.getTransfers();
      const formattedTransfers: Transfer[] = backendTransfers.map((t: any) => {
        return {
          id: t.id.toString(),
          fromUnit: t.from_unit,
          toUnit: t.to_unit,
          amount: t.amount,
          karat: `${t.karat}K` as any,
          notes: t.notes || '',
          date: new Date(t.created_at).toISOString(),
          user: t.user_name || 'Bilinmeyen',
          cinsi: (t.cinsi && String(t.cinsi).trim()) ? String(t.cinsi).trim() : undefined
        };
      });
      setTransfers(formattedTransfers);
    } catch (error) {
      console.error('Transfer eklenemedi:', error);
      throw error;
    }
  }, []);

  // Backend'den transfer sil
  const deleteTransfer = useCallback(async (id: string) => {
    try {
      await apiService.deleteTransfer(parseInt(id));
      setTransfers(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Transfer silinemedi:', error);
      throw error;
    }
  }, []);

  // Backend'de transfer güncelle
  const updateTransfer = useCallback(async (id: string, transfer: Omit<Transfer, 'id' | 'date'>) => {
    // Orijinal transfer'i sakla (hata durumunda geri almak için)
    const originalTransfer = transfers.find(t => t.id === id);
    if (!originalTransfer) {
      throw new Error('Transfer bulunamadı');
    }

    // Karat kontrolü
    if (!transfer.karat || typeof transfer.karat !== 'string') {
      throw new Error('Geçersiz karat değeri');
    }

    try {
      // Optimistik update
      setTransfers(prev => prev.map(t => 
        t.id === id 
          ? { ...t, ...transfer, user: 'Mevcut Kullanıcı' }
          : t
      ));

      await apiService.updateTransfer(parseInt(id), {
        fromUnit: transfer.fromUnit,
        toUnit: transfer.toUnit,
        amount: transfer.amount,
        karat: parseInt(transfer.karat.replace('K', '')),
        notes: transfer.notes
      });

      // Backend'den güncel veriyi çek (socket event ile otomatik güncellenir)
      const backendTransfers = await apiService.getTransfers();
      const formattedTransfers: Transfer[] = backendTransfers.map((t: any) => ({
        id: t.id.toString(),
        fromUnit: t.from_unit,
        toUnit: t.to_unit,
        amount: t.amount,
        karat: `${t.karat}K` as any,
        notes: t.notes || '',
        date: new Date(t.created_at).toISOString(),
        user: t.user_name || 'Bilinmeyen',
        cinsi: (t.cinsi && String(t.cinsi).trim()) ? String(t.cinsi).trim() : undefined
      }));
      setTransfers(formattedTransfers);
    } catch (error) {
      console.error('Transfer güncellenemedi:', error);
      // Hata durumunda orijinal transfer'i geri yükle
      if (originalTransfer) {
        setTransfers(prev => prev.map(t => 
          t.id === id ? originalTransfer : t
        ));
      }
      throw error;
    }
  }, [transfers]);

  // Tüm transferleri temizle
  const clearAllTransfers = useCallback(async () => {
    const originalTransfers = [...transfers]; // Yedekle (hata durumunda geri almak için)
    
    try {
      // Backend'de tek tek sil (bulk delete endpoint'i yok)
      const deletePromises = transfers.map(transfer => 
        apiService.deleteTransfer(parseInt(transfer.id)).catch(error => {
          console.error(`Transfer ${transfer.id} silinemedi:`, error);
          return { failed: true, id: transfer.id };
        })
      );
      
      const results = await Promise.all(deletePromises);
      const failedDeletes = results.filter((r: any) => r?.failed);
      
      if (failedDeletes.length > 0) {
        // Bazı transferler silinemediyse hata ver
        const failedIds = failedDeletes.map((r: any) => r.id).join(', ');
        throw new Error(`${failedDeletes.length} transfer silinemedi (ID: ${failedIds})`);
      }
      
      // Tüm transferler başarıyla silindi
      setTransfers([]);
    } catch (error) {
      console.error('Transferler temizlenemedi:', error);
      // Hata durumunda orijinal listeyi geri yükle
      setTransfers(originalTransfers);
      throw error;
    }
  }, [transfers]);

  const contextValue = useMemo(() => ({
    transfers,
    unitSummaries,
    addNewTransfer,
    deleteTransfer,
    updateTransfer,
    clearAllTransfers,
    isLoading
  }), [transfers, unitSummaries, addNewTransfer, deleteTransfer, updateTransfer, clearAllTransfers, isLoading]);

  return (
    <TransferContext.Provider value={contextValue}>
      {children}
    </TransferContext.Provider>
  );
};