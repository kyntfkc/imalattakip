import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { KaratType, KARAT_HAS_RATIOS } from '../types';
import { apiService } from '../services/apiService';
import { useAuth } from './AuthContext';

export interface ExternalVaultTransaction {
  id: string;
  type: 'input' | 'output';
  karat: KaratType;
  amount: number;
  companyId?: string;
  companyName?: string;
  notes?: string;
  date: string;
}

interface ExternalVaultStock {
  karat: KaratType;
  totalInput: number;
  totalOutput: number;
  currentStock: number;
  fire: number;
  hasEquivalent: number;
}

interface ExternalVaultContextType {
  transactions: ExternalVaultTransaction[];
  stockByKarat: { [key in KaratType]: ExternalVaultStock };
  totalStock: number;
  totalHas: number;
  isLoading?: boolean;
  addTransaction: (transaction: Omit<ExternalVaultTransaction, 'id' | 'date'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  clearAllTransactions: () => Promise<void>;
  clearAllStock: () => Promise<void>;
  syncStock: () => Promise<void>;
}

const ExternalVaultContext = createContext<ExternalVaultContextType | undefined>(undefined);

export const useExternalVault = () => {
  const context = useContext(ExternalVaultContext);
  if (!context) {
    throw new Error('useExternalVault must be used within ExternalVaultProvider');
  }
  return context;
};

interface ExternalVaultProviderProps {
  children: ReactNode;
}

export const ExternalVaultProvider: React.FC<ExternalVaultProviderProps> = ({ children }) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<ExternalVaultTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Stokları hesapla
  const [stockByKarat, setStockByKarat] = useState<{ [key in KaratType]: ExternalVaultStock }>({
    '14K': { karat: '14K', totalInput: 0, totalOutput: 0, currentStock: 0, fire: 0, hasEquivalent: 0 },
    '18K': { karat: '18K', totalInput: 0, totalOutput: 0, currentStock: 0, fire: 0, hasEquivalent: 0 },
    '22K': { karat: '22K', totalInput: 0, totalOutput: 0, currentStock: 0, fire: 0, hasEquivalent: 0 },
    '24K': { karat: '24K', totalInput: 0, totalOutput: 0, currentStock: 0, fire: 0, hasEquivalent: 0 }
  });

  const [totalStock, setTotalStock] = useState(0);
  const [totalHas, setTotalHas] = useState(0);

  // Backend'den verileri yükle - sadece authenticated olduğunda
  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      setIsLoading(authLoading);
      return;
    }

    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Backend'den işlemleri ve stokları paralel olarak yükle
        const [backendTransactions, backendStock] = await Promise.all([
          apiService.getExternalVaultTransactions(),
          apiService.getExternalVaultStock()
        ]);
        
        // Backend formatını frontend formatına çevir
        const formattedTransactions: ExternalVaultTransaction[] = backendTransactions.map((t: any) => ({
          id: t.id.toString(),
          type: t.type === 'deposit' ? 'input' : 'output',
          karat: `${t.karat}K` as KaratType,
          amount: t.amount,
          notes: t.notes,
          date: t.created_at
        }));
        
        setTransactions(formattedTransactions);
        
        // Backend stoklarını frontend formatına çevir
        const newStock: { [key in KaratType]: ExternalVaultStock } = {
          '14K': { karat: '14K', totalInput: 0, totalOutput: 0, currentStock: 0, fire: 0, hasEquivalent: 0 },
          '18K': { karat: '18K', totalInput: 0, totalOutput: 0, currentStock: 0, fire: 0, hasEquivalent: 0 },
          '22K': { karat: '22K', totalInput: 0, totalOutput: 0, currentStock: 0, fire: 0, hasEquivalent: 0 },
          '24K': { karat: '24K', totalInput: 0, totalOutput: 0, currentStock: 0, fire: 0, hasEquivalent: 0 }
        };
        
        // Backend stoklarını kullan
        backendStock.forEach((stock: any) => {
          const karat = `${stock.karat}K` as KaratType;
          if (newStock[karat]) {
            newStock[karat].currentStock = stock.amount;
            newStock[karat].hasEquivalent = stock.amount * KARAT_HAS_RATIOS[karat];
          }
        });
        
        // İşlemlerden toplam giriş/çıkış hesapla
        formattedTransactions.forEach(transaction => {
          if (transaction.type === 'input') {
            newStock[transaction.karat].totalInput += transaction.amount;
          } else {
            newStock[transaction.karat].totalOutput += transaction.amount;
          }
        });
        
        setStockByKarat(newStock);
        
        // Toplamları hesapla
        const total = Object.values(newStock).reduce((sum, stock) => sum + stock.currentStock, 0);
        const totalHasValue = Object.values(newStock).reduce((sum, stock) => sum + stock.hasEquivalent, 0);
        
        setTotalStock(total);
        setTotalHas(totalHasValue);
        
      } catch (error) {
        console.error('Dış kasa verileri yüklenemedi:', error);
        // Backend hatası durumunda localStorage'dan yükle
        const saved = localStorage.getItem('external-vault-transactions');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setTransactions(parsed);
          } catch (parseError) {
            console.error('localStorage parse hatası:', parseError);
            setTransactions([]);
          }
        } else {
          setTransactions([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated, authLoading]);

  // Transaction değiştiğinde stokları güncelle
  useEffect(() => {
    const newStock: { [key in KaratType]: ExternalVaultStock } = {
      '14K': { karat: '14K', totalInput: 0, totalOutput: 0, currentStock: 0, fire: 0, hasEquivalent: 0 },
      '18K': { karat: '18K', totalInput: 0, totalOutput: 0, currentStock: 0, fire: 0, hasEquivalent: 0 },
      '22K': { karat: '22K', totalInput: 0, totalOutput: 0, currentStock: 0, fire: 0, hasEquivalent: 0 },
      '24K': { karat: '24K', totalInput: 0, totalOutput: 0, currentStock: 0, fire: 0, hasEquivalent: 0 }
    };

    transactions.forEach(transaction => {
      if (transaction.type === 'input') {
        newStock[transaction.karat].totalInput += transaction.amount;
      } else {
        newStock[transaction.karat].totalOutput += transaction.amount;
      }
    });

    // Her ayar için mevcut stok ve has karşılığını hesapla
    Object.keys(newStock).forEach(karat => {
      const k = karat as KaratType;
      newStock[k].currentStock = newStock[k].totalInput - newStock[k].totalOutput;
      newStock[k].hasEquivalent = newStock[k].currentStock * KARAT_HAS_RATIOS[k];
    });

    setStockByKarat(newStock);

    // Toplamları hesapla
    const total = Object.values(newStock).reduce((sum, stock) => sum + stock.currentStock, 0);
    const totalHasValue = Object.values(newStock).reduce((sum, stock) => sum + stock.hasEquivalent, 0);
    
    setTotalStock(total);
    setTotalHas(totalHasValue);
  }, [transactions]);

  // LocalStorage'a da kaydet (backup olarak)
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('external-vault-transactions', JSON.stringify(transactions));
    }
  }, [transactions, isLoading]);

  const addTransaction = async (transaction: Omit<ExternalVaultTransaction, 'id' | 'date'>) => {
    try {
      // Backend'e gönder
      await apiService.createExternalVaultTransaction({
        type: transaction.type === 'input' ? 'deposit' : 'withdrawal',
        amount: transaction.amount,
        karat: parseInt(transaction.karat.replace('K', '')),
        notes: transaction.notes
      });
      
      // Backend'den güncel veriyi yükle
      const backendTransactions = await apiService.getExternalVaultTransactions();
      const formattedTransactions: ExternalVaultTransaction[] = backendTransactions.map((t: any) => ({
        id: t.id.toString(),
        type: t.type === 'deposit' ? 'input' : 'output',
        karat: `${t.karat}K` as KaratType,
        amount: t.amount,
        notes: t.notes,
        date: t.created_at
      }));
      
      setTransactions(formattedTransactions);
    } catch (error) {
      console.error('Dış kasa işlemi eklenemedi:', error);
      // Backend hatası durumunda localStorage'a ekle
      const newTransaction: ExternalVaultTransaction = {
        ...transaction,
        id: `EV${Date.now()}`,
        date: new Date().toISOString()
      };
      setTransactions(prev => [...prev, newTransaction]);
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      // Backend'den sil
      await apiService.deleteExternalVaultTransaction(parseInt(id));
      
      // Backend'den güncel veriyi yükle
      const backendTransactions = await apiService.getExternalVaultTransactions();
      const formattedTransactions: ExternalVaultTransaction[] = backendTransactions.map((t: any) => ({
        id: t.id.toString(),
        type: t.type === 'deposit' ? 'input' : 'output',
        karat: `${t.karat}K` as KaratType,
        amount: t.amount,
        notes: t.notes,
        date: t.created_at
      }));
      
      setTransactions(formattedTransactions);
    } catch (error) {
      console.error('Dış kasa işlemi silinemedi:', error);
      // Backend hatası durumunda localStorage'dan sil
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const clearAllTransactions = async () => {
    try {
      // Backend'deki tüm işlemleri sil (her birini tek tek sil)
      for (const transaction of transactions) {
        await apiService.deleteExternalVaultTransaction(parseInt(transaction.id));
      }
      
      setTransactions([]);
    } catch (error) {
      console.error('Dış kasa işlemleri temizlenemedi:', error);
      // Backend hatası durumunda localStorage'ı temizle
      setTransactions([]);
      localStorage.removeItem('external-vault-transactions');
    }
  };

  const clearAllStock = async () => {
    try {
      // Stok verilerini sıfırla
      const emptyStock: { [key in KaratType]: ExternalVaultStock } = {
        '14K': { karat: '14K', totalInput: 0, totalOutput: 0, currentStock: 0, fire: 0, hasEquivalent: 0 },
        '18K': { karat: '18K', totalInput: 0, totalOutput: 0, currentStock: 0, fire: 0, hasEquivalent: 0 },
        '22K': { karat: '22K', totalInput: 0, totalOutput: 0, currentStock: 0, fire: 0, hasEquivalent: 0 },
        '24K': { karat: '24K', totalInput: 0, totalOutput: 0, currentStock: 0, fire: 0, hasEquivalent: 0 }
      };
      
      setStockByKarat(emptyStock);
    } catch (error) {
      console.error('Dış kasa stokları temizlenemedi:', error);
    }
  };

  const syncStock = async () => {
    try {
      await apiService.syncExternalVaultStock();
      
      // Backend'den güncel stokları yükle
      const backendStock = await apiService.getExternalVaultStock();
      
      const newStock: { [key in KaratType]: ExternalVaultStock } = {
        '14K': { karat: '14K', totalInput: 0, totalOutput: 0, currentStock: 0, fire: 0, hasEquivalent: 0 },
        '18K': { karat: '18K', totalInput: 0, totalOutput: 0, currentStock: 0, fire: 0, hasEquivalent: 0 },
        '22K': { karat: '22K', totalInput: 0, totalOutput: 0, currentStock: 0, fire: 0, hasEquivalent: 0 },
        '24K': { karat: '24K', totalInput: 0, totalOutput: 0, currentStock: 0, fire: 0, hasEquivalent: 0 }
      };
      
      // Backend stoklarını kullan
      backendStock.forEach((stock: any) => {
        const karat = `${stock.karat}K` as KaratType;
        if (newStock[karat]) {
          newStock[karat].currentStock = stock.amount;
          newStock[karat].hasEquivalent = stock.amount * KARAT_HAS_RATIOS[karat];
        }
      });
      
      // İşlemlerden toplam giriş/çıkış hesapla
      transactions.forEach(transaction => {
        if (transaction.type === 'input') {
          newStock[transaction.karat].totalInput += transaction.amount;
        } else {
          newStock[transaction.karat].totalOutput += transaction.amount;
        }
      });
      
      setStockByKarat(newStock);
      
      // Toplamları hesapla
      const total = Object.values(newStock).reduce((sum, stock) => sum + stock.currentStock, 0);
      const totalHasValue = Object.values(newStock).reduce((sum, stock) => sum + stock.hasEquivalent, 0);
      
      setTotalStock(total);
      setTotalHas(totalHasValue);
      
    } catch (error) {
      console.error('Stok senkronizasyonu başarısız:', error);
    }
  };

  return (
    <ExternalVaultContext.Provider
      value={{
        transactions,
        stockByKarat,
        totalStock,
        totalHas,
        isLoading,
        addTransaction,
        deleteTransaction,
        clearAllTransactions,
        clearAllStock,
        syncStock
      }}
    >
      {children}
    </ExternalVaultContext.Provider>
  );
};