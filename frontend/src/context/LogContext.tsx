import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/apiService';
import { useAuth } from './AuthContext';

export interface LogEntry {
  id: string;
  user: string;
  action: string;
  entityType?: string;
  entityName?: string;
  details?: string;
  timestamp: string;
}

interface LogContextType {
  logs: LogEntry[];
  isLoading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp' | 'user'>) => Promise<void>;
  clearAllLogs: () => Promise<void>;
  loadLogs: (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }) => Promise<void>;
}

const LogContext = createContext<LogContextType | undefined>(undefined);

export const useLog = () => {
  const context = useContext(LogContext);
  if (!context) {
    throw new Error('useLog must be used within LogProvider');
  }
  return context;
};

interface LogProviderProps {
  children: ReactNode;
}

export const LogProvider: React.FC<LogProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | undefined>();

  // Backend'den verileri yükle - sadece authenticated olduğunda
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      setIsLoading(authLoading);
      return;
    }
    loadLogs();
  }, [isAuthenticated, authLoading]);

  const loadLogs = async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    try {
      setIsLoading(true);
      const response = await apiService.getLogs(params);
      
      // Backend formatını frontend formatına çevir
      const formattedLogs: LogEntry[] = response.logs.map((log: any) => ({
        id: log.id.toString(),
        user: log.username || log.user || 'Bilinmeyen',
        action: log.action,
        entityType: log.entity_type || log.entityType,
        entityName: log.entity_name || log.entityName,
        details: log.details,
        timestamp: log.created_at
      }));
      
      setLogs(formattedLogs);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Log verileri yüklenemedi:', error);
      // Backend hatası durumunda localStorage'dan yükle
      const saved = localStorage.getItem('system-logs');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setLogs(parsed);
        } catch (parseError) {
          console.error('localStorage parse hatası:', parseError);
          setLogs([]);
        }
      } else {
        setLogs([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // LocalStorage'a da kaydet (backup olarak)
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('system-logs', JSON.stringify(logs));
    }
  }, [logs, isLoading]);

  const addLog = async (log: Omit<LogEntry, 'id' | 'timestamp' | 'user'>) => {
    try {
      // Backend'e gönder
      const response = await apiService.createLog({
        user: user?.username || 'Bilinmeyen Kullanıcı',
        action: log.action,
        entityType: log.entityType,
        entityName: log.entityName,
        details: log.details
      });
      
      // Response null ise (log kaydı başarısız ama kritik değil)
      if (!response) {
        console.warn('Log kaydı yapılamadı, lokal olarak eklendi');
        // Backend hatası durumunda localStorage'a ekle
        const newLog: LogEntry = {
          ...log,
          id: `LOG${Date.now()}`,
          timestamp: new Date().toISOString(),
          user: user?.username || 'Bilinmeyen Kullanıcı'
        };
        setLogs(prev => [newLog, ...prev]);
        return;
      }
      
      // Backend'den dönen veriyi frontend formatına çevir
      const newLog: LogEntry = {
        id: response.id?.toString() || `LOG${Date.now()}`,
        user: response.username || response.user || 'Bilinmeyen',
        action: response.action,
        entityType: response.entity_type || response.entityType,
        entityName: response.entity_name || response.entityName,
        details: response.details,
        timestamp: response.created_at || new Date().toISOString()
      };
      
      setLogs(prev => [newLog, ...prev]); // En yeni log en üstte
    } catch (error) {
      console.error('Log eklenemedi:', error);
      // Backend hatası durumunda localStorage'a ekle
      const newLog: LogEntry = {
        ...log,
        id: `LOG${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: user?.username || 'Bilinmeyen Kullanıcı'
      };
      setLogs(prev => [newLog, ...prev]);
    }
  };

  const clearAllLogs = async () => {
    try {
      // Backend'den tüm logları temizle
      await apiService.clearAllLogs();
      setLogs([]);
    } catch (error) {
      console.error('Tüm loglar temizlenemedi:', error);
      // Backend hatası durumunda localStorage'ı temizle
      setLogs([]);
      localStorage.removeItem('system-logs');
    }
  };

  return (
    <LogContext.Provider
      value={{
        logs,
        isLoading,
        pagination,
        addLog,
        clearAllLogs,
        loadLogs
      }}
    >
      {children}
    </LogContext.Provider>
  );
};