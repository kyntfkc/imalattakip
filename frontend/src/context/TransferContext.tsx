import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { Transfer, UnitSummary } from '../types';
import { calculateUnitSummaries } from '../utils/fireCalculations';
import { apiService } from '../services/apiService';

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
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Backend'den transfer verilerini yükle
  useEffect(() => {
    const loadTransfers = async () => {
      try {
        setIsLoading(true);
        
        // Sadece backend'den yükle
        const backendTransfers = await apiService.getTransfers();
        
        // Backend formatını frontend formatına çevir
        const formattedTransfers: Transfer[] = backendTransfers.map((t: any) => ({
          id: t.id.toString(),
          fromUnit: t.from_unit,
          toUnit: t.to_unit,
          amount: t.amount,
          karat: `${t.karat}K` as any,
          notes: t.notes || '',
          date: new Date(t.created_at).toISOString(),
          user: t.user_name || 'Bilinmeyen'
        }));
        
        setTransfers(formattedTransfers);
        console.log('✅ Backend\'den transfer verileri yüklendi:', formattedTransfers.length, 'transfer');
        
      } catch (error) {
        console.error('❌ Backend\'den veri yüklenemedi:', error);
        // Backend çalışmıyorsa boş array set et
        setTransfers([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadTransfers();
  }, []);

  // Transfer değiştiğinde özetleri hesapla
  const unitSummaries = useMemo(() => {
    return calculateUnitSummaries(transfers);
  }, [transfers]);

  // Backend'e yeni transfer ekle
  const addNewTransfer = useCallback(async (transfer: Omit<Transfer, 'id' | 'date'>) => {
    try {
      const response = await apiService.createTransfer({
        fromUnit: transfer.fromUnit,
        toUnit: transfer.toUnit,
        amount: transfer.amount,
        karat: parseInt(transfer.karat.replace('K', '')),
        notes: transfer.notes
      });

      // Yeni transfer'i listeye ekle
      const newTransfer: Transfer = {
        ...transfer,
        id: response.transferId.toString(),
        date: new Date().toISOString(),
        user: 'Mevcut Kullanıcı'
      };

      setTransfers(prev => [newTransfer, ...prev]);
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
    try {
      await apiService.updateTransfer(parseInt(id), {
        fromUnit: transfer.fromUnit,
        toUnit: transfer.toUnit,
        amount: transfer.amount,
        karat: parseInt(transfer.karat.replace('K', '')),
        notes: transfer.notes
      });

      setTransfers(prev => prev.map(t => 
        t.id === id 
          ? { ...t, ...transfer, user: 'Mevcut Kullanıcı' }
          : t
      ));
    } catch (error) {
      console.error('Transfer güncellenemedi:', error);
      throw error;
    }
  }, []);

  // Tüm transferleri temizle
  const clearAllTransfers = useCallback(async () => {
    try {
      // Backend'de tek tek sil (bulk delete endpoint'i yok)
      for (const transfer of transfers) {
        await apiService.deleteTransfer(parseInt(transfer.id));
      }
      setTransfers([]);
    } catch (error) {
      console.error('Transferler temizlenemedi:', error);
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