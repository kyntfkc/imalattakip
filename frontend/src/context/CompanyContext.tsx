import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/apiService';

export interface Company {
  id: string;
  name: string;
  type: 'company' | 'person';
  contact?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

interface CompanyContextType {
  companies: Company[];
  isLoading?: boolean;
  addCompany: (company: Omit<Company, 'id' | 'createdAt'>) => Promise<void>;
  updateCompany: (id: string, updatedData: Partial<Company>) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
  clearAllCompanies: () => Promise<void>;
  getCompanyById: (id: string) => Company | undefined;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const useCompanies = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompanies must be used within CompanyProvider');
  }
  return context;
};

interface CompanyProviderProps {
  children: ReactNode;
}

export const CompanyProvider: React.FC<CompanyProviderProps> = ({ children }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Backend'den verileri yükle
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        setIsLoading(true);
        const backendCompanies = await apiService.getCompanies();
        
        // Backend formatını frontend formatına çevir
        const formattedCompanies: Company[] = backendCompanies.map((company: any) => ({
          id: company.id.toString(),
          name: company.name,
          type: company.type,
          contact: company.contact,
          address: company.address,
          notes: company.notes,
          createdAt: company.created_at
        }));
        
        setCompanies(formattedCompanies);
      } catch (error) {
        console.error('Firma verileri yüklenemedi:', error);
        // Backend hatası durumunda localStorage'dan yükle
        const saved = localStorage.getItem('companies');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setCompanies(parsed);
          } catch (parseError) {
            console.error('localStorage parse hatası:', parseError);
            setCompanies([]);
          }
        } else {
          setCompanies([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadCompanies();
  }, []);

  // LocalStorage'a da kaydet (backup olarak)
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('companies', JSON.stringify(companies));
    }
  }, [companies, isLoading]);

  const addCompany = async (company: Omit<Company, 'id' | 'createdAt'>) => {
    try {
      // Undefined değerleri boş string'e çevir (address kaldırıldı)
      const cleanCompany = {
        name: company.name || '',
        type: company.type,
        contact: company.contact || '',
        notes: company.notes || ''
      };
      
      console.log('Frontend\'den API\'ye gönderilen veri:', cleanCompany);
      const response = await apiService.createCompany(cleanCompany);
      
      console.log('Backend\'den dönen response:', response);
      
      // Backend'den dönen veriyi frontend formatına çevir
      const newCompany: Company = {
        id: response.id.toString(),
        name: response.name || '',
        type: response.type,
        contact: response.contact || '',
        address: response.address || '',
        notes: response.notes || '',
        createdAt: response.created_at || new Date().toISOString()
      };
      
      setCompanies(prev => [...prev, newCompany]);
    } catch (error) {
      console.error('Firma eklenemedi:', error);
      
      // Backend hatası durumunda localStorage'a ekle
      const newCompany: Company = {
        name: company.name || '',
        type: company.type,
        contact: company.contact || '',
        address: company.address || '',
        notes: company.notes || '',
        id: `C${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      
      setCompanies(prev => [...prev, newCompany]);
      
      // Hata mesajı gösterme, sadece console'da bırak
      console.warn('Backend hatası, firma local olarak kaydedildi');
    }
  };

  const updateCompany = async (id: string, updatedData: Partial<Company>) => {
    try {
      // Backend'e gönder
      const response = await apiService.updateCompany(parseInt(id), {
        name: updatedData.name || '',
        type: updatedData.type || 'company',
        contact: updatedData.contact,
        address: updatedData.address,
        notes: updatedData.notes
      });
      
      // Backend'den dönen veriyi frontend formatına çevir
      const updatedCompany: Company = {
        id: response.id.toString(),
        name: response.name,
        type: response.type,
        contact: response.contact,
        address: response.address,
        notes: response.notes,
        createdAt: response.created_at
      };
      
      setCompanies(prev =>
        prev.map(company =>
          company.id === id ? updatedCompany : company
        )
      );
    } catch (error) {
      console.error('Firma güncellenemedi:', error);
      // Backend hatası durumunda localStorage'da güncelle
      setCompanies(prev =>
        prev.map(company =>
          company.id === id ? { ...company, ...updatedData } : company
        )
      );
    }
  };

  const deleteCompany = async (id: string) => {
    try {
      // Backend'den sil
      await apiService.deleteCompany(parseInt(id));
      setCompanies(prev => prev.filter(company => company.id !== id));
    } catch (error) {
      console.error('Firma silinemedi:', error);
      // Backend hatası durumunda localStorage'dan sil
      setCompanies(prev => prev.filter(company => company.id !== id));
    }
  };

  const clearAllCompanies = async () => {
    try {
      // Backend'den tüm firmaları sil
      for (const company of companies) {
        await apiService.deleteCompany(parseInt(company.id));
      }
      setCompanies([]);
    } catch (error) {
      console.error('Firmalar temizlenemedi:', error);
      // Backend hatası durumunda localStorage'ı temizle
      setCompanies([]);
    }
  };

  const getCompanyById = (id: string) => {
    return companies.find(company => company.id === id);
  };

  return (
    <CompanyContext.Provider
      value={{
        companies,
        isLoading,
        addCompany,
        updateCompany,
        deleteCompany,
        clearAllCompanies,
        getCompanyById
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};