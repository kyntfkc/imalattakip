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
        const formattedTransactions: ExternalVaultTransaction[] = backendTransactions.map((t: any) => {
          const amount = typeof t.amount === 'number' ? t.amount : (parseFloat(String(t.amount)) || 0);
          const karatValue = typeof t.karat === 'number' ? t.karat : parseInt(String(t.karat)) || 0;
          
          return {
            id: t.id.toString(),
            type: t.type === 'deposit' ? 'input' : 'output',
            karat: `${karatValue}K` as KaratType,
            amount: isNaN(amount) ? 0 : amount,
            notes: t.notes,
            date: t.created_at
          };
        });
        
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
          const karatValue = typeof stock.karat === 'number' ? stock.karat : parseInt(stock.karat) || 0;
          const karat = `${karatValue}K` as KaratType;
          const stockAmount = typeof stock.amount === 'number' ? stock.amount : (parseFloat(stock.amount) || 0);
          
          if (newStock[karat] && !isNaN(stockAmount)) {
            newStock[karat].currentStock = stockAmount;
            const ratio = KARAT_HAS_RATIOS[karat] || 0;
            newStock[karat].hasEquivalent = stockAmount * ratio;
          }
        });
        
        // İşlemlerden toplam giriş/çıkış hesapla
        formattedTransactions.forEach(transaction => {
          const karat = transaction.karat;
          const amount = typeof transaction.amount === 'number' ? transaction.amount : (parseFloat(String(transaction.amount)) || 0);
          
          if (newStock[karat] && !isNaN(amount)) {
            if (transaction.type === 'input') {
              newStock[karat].totalInput += amount;
            } else {
              newStock[karat].totalOutput += amount;
            }
          }
        });
        
        setStockByKarat(newStock);
        
        // Toplamları hesapla
        const total = Object.values(newStock).reduce((sum, stock) => {
          const stockValue = typeof stock.currentStock === 'number' ? stock.currentStock : (parseFloat(String(stock.currentStock)) || 0);
          return sum + (isNaN(stockValue) ? 0 : stockValue);
        }, 0);
        const totalHasValue = Object.values(newStock).reduce((sum, stock) => {
          const hasValue = typeof stock.hasEquivalent === 'number' ? stock.hasEquivalent : (parseFloat(String(stock.hasEquivalent)) || 0);
          return sum + (isNaN(hasValue) ? 0 : hasValue);
        }, 0);
        
        setTotalStock(isNaN(total) ? 0 : total);
        setTotalHas(isNaN(totalHasValue) ? 0 : totalHasValue);
        
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

  // Transaction değiştiğinde backend'den güncel stock verilerini yükle
  useEffect(() => {
    if (!isAuthenticated || isLoading || transactions.length === 0) {
      return;
    }

    const updateStock = async () => {
      try {
        // Backend'den güncel stokları yükle
        const backendStock = await apiService.getExternalVaultStock();
        
        // Mevcut stock'u koru ve sadece backend stock ile güncelle
        setStockByKarat(prevStock => {
          const newStock = { ...prevStock };
          
          // Backend stoklarını kullan
          backendStock.forEach((stock: any) => {
            const karatValue = typeof stock.karat === 'number' ? stock.karat : parseInt(stock.karat) || 0;
            const karat = `${karatValue}K` as KaratType;
            const stockAmount = typeof stock.amount === 'number' ? stock.amount : (parseFloat(stock.amount) || 0);
            
            if (newStock[karat] && !isNaN(stockAmount)) {
              newStock[karat].currentStock = stockAmount;
              const ratio = KARAT_HAS_RATIOS[karat] || 0;
              newStock[karat].hasEquivalent = stockAmount * ratio;
            }
          });
          
          // İşlemlerden toplam giriş/çıkış hesapla (sıfırdan)
          transactions.forEach(transaction => {
            const karat = transaction.karat;
            const amount = typeof transaction.amount === 'number' ? transaction.amount : (parseFloat(String(transaction.amount)) || 0);
            
            if (newStock[karat] && !isNaN(amount)) {
              if (transaction.type === 'input') {
                newStock[karat].totalInput += amount;
              } else {
                newStock[karat].totalOutput += amount;
              }
            }
          });
          
          return newStock;
        });
        
        // Toplamları hesapla
        const backendStockMap: { [key: string]: number } = {};
        backendStock.forEach((stock: any) => {
          const karatValue = typeof stock.karat === 'number' ? stock.karat : parseInt(stock.karat) || 0;
          const karat = `${karatValue}K`;
          const stockAmount = typeof stock.amount === 'number' ? stock.amount : (parseFloat(stock.amount) || 0);
          if (!isNaN(stockAmount)) {
            backendStockMap[karat] = stockAmount;
          }
        });
        
        const total = Object.values(backendStockMap).reduce((sum, stockAmount) => sum + (isNaN(stockAmount) ? 0 : stockAmount), 0);
        const totalHasValue = Object.entries(backendStockMap).reduce((sum, [karat, stockAmount]) => {
          const karatType = karat as KaratType;
          const ratio = KARAT_HAS_RATIOS[karatType] || 0;
          return sum + (stockAmount * ratio);
        }, 0);
        
        setTotalStock(isNaN(total) ? 0 : total);
        setTotalHas(isNaN(totalHasValue) ? 0 : totalHasValue);
      } catch (error) {
        console.error('Stock güncelleme hatası:', error);
      }
    };

    updateStock();
  }, [transactions, isAuthenticated, isLoading]);

  // LocalStorage'a da kaydet (backup olarak)
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('external-vault-transactions', JSON.stringify(transactions));
    }
  }, [transactions, isLoading]);

  const addTransaction = async (transaction: Omit<ExternalVaultTransaction, 'id' | 'date'>) => {
    try {
      // Backend'e gönder
      const transactionPayload: {
        type: 'deposit' | 'withdrawal';
        amount: number;
        karat: number;
        notes?: string;
        company_id?: number;
      } = {
        type: transaction.type === 'input' ? 'deposit' : 'withdrawal',
        amount: transaction.amount,
        karat: parseInt(transaction.karat.replace('K', '')),
        notes: transaction.notes
      };
      
      // company_id varsa ekle
      if (transaction.companyId) {
        transactionPayload.company_id = parseInt(transaction.companyId);
      }
      
      await apiService.createExternalVaultTransaction(transactionPayload);
      
      // Backend'den güncel veriyi yükle (hem transactions hem de stock)
      const [backendTransactions, backendStock] = await Promise.all([
        apiService.getExternalVaultTransactions(),
        apiService.getExternalVaultStock()
      ]);
      
      const formattedTransactions: ExternalVaultTransaction[] = backendTransactions.map((t: any) => {
        const amount = typeof t.amount === 'number' ? t.amount : (parseFloat(String(t.amount)) || 0);
        const karatValue = typeof t.karat === 'number' ? t.karat : parseInt(String(t.karat)) || 0;
        
        return {
          id: t.id.toString(),
          type: t.type === 'deposit' ? 'input' : 'output',
          karat: `${karatValue}K` as KaratType,
          amount: isNaN(amount) ? 0 : amount,
          notes: t.notes,
          date: t.created_at,
          companyId: t.company_id ? t.company_id.toString() : undefined,
          companyName: t.company_name || t.companyName
        };
      });
      
      setTransactions(formattedTransactions);
      
      // Stock'u güncelle
      setStockByKarat(prevStock => {
        const newStock: { [key in KaratType]: ExternalVaultStock } = {
          '14K': { karat: '14K', totalInput: 0, totalOutput: 0, currentStock: 0, fire: 0, hasEquivalent: 0 },
          '18K': { karat: '18K', totalInput: 0, totalOutput: 0, currentStock: 0, fire: 0, hasEquivalent: 0 },
          '22K': { karat: '22K', totalInput: 0, totalOutput: 0, currentStock: 0, fire: 0, hasEquivalent: 0 },
          '24K': { karat: '24K', totalInput: 0, totalOutput: 0, currentStock: 0, fire: 0, hasEquivalent: 0 }
        };
        
        // Backend stoklarını kullan
        backendStock.forEach((stock: any) => {
          const karatValue = typeof stock.karat === 'number' ? stock.karat : parseInt(stock.karat) || 0;
          const karat = `${karatValue}K` as KaratType;
          const stockAmount = typeof stock.amount === 'number' ? stock.amount : (parseFloat(stock.amount) || 0);
          
          if (newStock[karat] && !isNaN(stockAmount)) {
            newStock[karat].currentStock = stockAmount;
            const ratio = KARAT_HAS_RATIOS[karat] || 0;
            newStock[karat].hasEquivalent = stockAmount * ratio;
          }
        });
        
        // İşlemlerden toplam giriş/çıkış hesapla (sıfırdan)
        formattedTransactions.forEach(transaction => {
          const karat = transaction.karat;
          const amount = typeof transaction.amount === 'number' ? transaction.amount : (parseFloat(String(transaction.amount)) || 0);
          
          if (newStock[karat] && !isNaN(amount)) {
            if (transaction.type === 'input') {
              newStock[karat].totalInput += amount;
            } else {
              newStock[karat].totalOutput += amount;
            }
          }
        });
        
        return newStock;
      });
      
      // Toplamları hesapla
      const backendStockMap: { [key: string]: number } = {};
      backendStock.forEach((stock: any) => {
        const karatValue = typeof stock.karat === 'number' ? stock.karat : parseInt(stock.karat) || 0;
        const karat = `${karatValue}K`;
        const stockAmount = typeof stock.amount === 'number' ? stock.amount : (parseFloat(stock.amount) || 0);
        if (!isNaN(stockAmount)) {
          backendStockMap[karat] = stockAmount;
        }
      });
      
      const total = Object.values(backendStockMap).reduce((sum, stockAmount) => sum + (isNaN(stockAmount) ? 0 : stockAmount), 0);
      const totalHasValue = Object.entries(backendStockMap).reduce((sum, [karat, stockAmount]) => {
        const karatType = karat as KaratType;
        const ratio = KARAT_HAS_RATIOS[karatType] || 0;
        return sum + (stockAmount * ratio);
      }, 0);
      
      setTotalStock(isNaN(total) ? 0 : total);
      setTotalHas(isNaN(totalHasValue) ? 0 : totalHasValue);
    } catch (error: any) {
      console.error('❌ Dış kasa işlemi eklenemedi:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        transaction
      });
      
      // Backend hatası durumunda localStorage'a ekle (fallback)
      const newTransaction: ExternalVaultTransaction = {
        ...transaction,
        id: `EV${Date.now()}`,
        date: new Date().toISOString()
      };
      setTransactions(prev => [...prev, newTransaction]);
      
      // Hatayı tekrar throw et ki UI'da gösterilebilsin
      throw error;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      // Backend'den sil
      await apiService.deleteExternalVaultTransaction(parseInt(id));
      
      // Backend'den güncel veriyi yükle (hem transactions hem de stock)
      const [backendTransactions, backendStock] = await Promise.all([
        apiService.getExternalVaultTransactions(),
        apiService.getExternalVaultStock()
      ]);
      
      const formattedTransactions: ExternalVaultTransaction[] = backendTransactions.map((t: any) => {
        const amount = typeof t.amount === 'number' ? t.amount : (parseFloat(String(t.amount)) || 0);
        const karatValue = typeof t.karat === 'number' ? t.karat : parseInt(String(t.karat)) || 0;
        
        return {
          id: t.id.toString(),
          type: t.type === 'deposit' ? 'input' : 'output',
          karat: `${karatValue}K` as KaratType,
          amount: isNaN(amount) ? 0 : amount,
          notes: t.notes,
          date: t.created_at
        };
      });
      
      setTransactions(formattedTransactions);
      
      // Stock'u güncelle
      setStockByKarat(prevStock => {
        const newStock = { ...prevStock };
        
        // Backend stoklarını kullan
        backendStock.forEach((stock: any) => {
          const karatValue = typeof stock.karat === 'number' ? stock.karat : parseInt(stock.karat) || 0;
          const karat = `${karatValue}K` as KaratType;
          const stockAmount = typeof stock.amount === 'number' ? stock.amount : (parseFloat(stock.amount) || 0);
          
          if (newStock[karat] && !isNaN(stockAmount)) {
            newStock[karat].currentStock = stockAmount;
            const ratio = KARAT_HAS_RATIOS[karat] || 0;
            newStock[karat].hasEquivalent = stockAmount * ratio;
          }
        });
        
        // İşlemlerden toplam giriş/çıkış hesapla
        formattedTransactions.forEach(transaction => {
          const karat = transaction.karat;
          const amount = typeof transaction.amount === 'number' ? transaction.amount : (parseFloat(String(transaction.amount)) || 0);
          
          if (newStock[karat] && !isNaN(amount)) {
            if (transaction.type === 'input') {
              newStock[karat].totalInput = (newStock[karat].totalInput || 0) + amount;
            } else {
              newStock[karat].totalOutput = (newStock[karat].totalOutput || 0) + amount;
            }
          }
        });
        
        return newStock;
      });
      
      // Toplamları hesapla
      const backendStockMap: { [key: string]: number } = {};
      backendStock.forEach((stock: any) => {
        const karatValue = typeof stock.karat === 'number' ? stock.karat : parseInt(stock.karat) || 0;
        const karat = `${karatValue}K`;
        const stockAmount = typeof stock.amount === 'number' ? stock.amount : (parseFloat(stock.amount) || 0);
        if (!isNaN(stockAmount)) {
          backendStockMap[karat] = stockAmount;
        }
      });
      
      const total = Object.values(backendStockMap).reduce((sum, stockAmount) => sum + (isNaN(stockAmount) ? 0 : stockAmount), 0);
      const totalHasValue = Object.entries(backendStockMap).reduce((sum, [karat, stockAmount]) => {
        const karatType = karat as KaratType;
        const ratio = KARAT_HAS_RATIOS[karatType] || 0;
        return sum + (stockAmount * ratio);
      }, 0);
      
      setTotalStock(isNaN(total) ? 0 : total);
      setTotalHas(isNaN(totalHasValue) ? 0 : totalHasValue);
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
        const karatValue = typeof stock.karat === 'number' ? stock.karat : parseInt(stock.karat) || 0;
        const karat = `${karatValue}K` as KaratType;
        const stockAmount = typeof stock.amount === 'number' ? stock.amount : (parseFloat(stock.amount) || 0);
        
        if (newStock[karat] && !isNaN(stockAmount)) {
          newStock[karat].currentStock = stockAmount;
          const ratio = KARAT_HAS_RATIOS[karat] || 0;
          newStock[karat].hasEquivalent = stockAmount * ratio;
        }
      });
      
      // İşlemlerden toplam giriş/çıkış hesapla
      transactions.forEach(transaction => {
        const karat = transaction.karat;
        const amount = typeof transaction.amount === 'number' ? transaction.amount : (parseFloat(String(transaction.amount)) || 0);
        
        if (newStock[karat] && !isNaN(amount)) {
          if (transaction.type === 'input') {
            newStock[karat].totalInput += amount;
          } else {
            newStock[karat].totalOutput += amount;
          }
        }
      });
      
      setStockByKarat(newStock);
      
      // Toplamları hesapla
      const total = Object.values(newStock).reduce((sum, stock) => {
        const stockValue = typeof stock.currentStock === 'number' ? stock.currentStock : (parseFloat(String(stock.currentStock)) || 0);
        return sum + (isNaN(stockValue) ? 0 : stockValue);
      }, 0);
      const totalHasValue = Object.values(newStock).reduce((sum, stock) => {
        const hasValue = typeof stock.hasEquivalent === 'number' ? stock.hasEquivalent : (parseFloat(String(stock.hasEquivalent)) || 0);
        return sum + (isNaN(hasValue) ? 0 : hasValue);
      }, 0);
      
      setTotalStock(isNaN(total) ? 0 : total);
      setTotalHas(isNaN(totalHasValue) ? 0 : totalHasValue);
      
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