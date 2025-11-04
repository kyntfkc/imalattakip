import React, { useState, useMemo, useCallback } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Space, 
  Statistic, 
  Button, 
  Table, 
  Tag,
  Divider,
  Popconfirm,
  message,
  Empty,
  Segmented,
  Input,
  DatePicker,
  Badge,
  Tooltip,
  Select
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  GoldOutlined,
  ToolOutlined,
  ThunderboltOutlined,
  CrownOutlined,
  BankOutlined,
  SwapOutlined,
  ArrowRightOutlined,
  HistoryOutlined,
  DeleteOutlined,
  PlusOutlined,
  FilterOutlined,
  CalendarOutlined,
  DownloadOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { useTransfers } from '../context/TransferContext';
import { useLog } from '../context/LogContext';
import { useAuth } from '../context/AuthContext';
import { useCinsiSettings, CinsiOption } from '../context/CinsiSettingsContext';
import { UnitType, KaratType, UNIT_NAMES, FIRE_UNITS, OUTPUT_ONLY_UNITS, SEMI_FINISHED_UNITS, PROCESSING_UNITS, INPUT_UNITS, KARAT_HAS_RATIOS } from '../types';
import TransferModal from './TransferModal';
import { unitColors, commonStyles } from '../styles/theme';
import { useBackendStatus } from '../hooks/useBackendStatus';
import { useResponsive } from '../hooks/useResponsive';

const { Option } = Select;
const { RangePicker } = DatePicker;

const { Title, Text } = Typography;

interface UnitPageProps {
  unitId: UnitType;
}

// Türkçe karakter desteği için helper fonksiyon - component dışında optimize edildi
// jsPDF'in standart font'ları Türkçe karakterleri desteklemiyor
// Bu yüzden Türkçe karakterleri ASCII benzeri karakterlere çeviriyoruz
const normalizeTurkishChars = (text: string): string => {
  return text
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'i')
    .replace(/Ş/g, 'S')
    .replace(/ş/g, 's')
    .replace(/Ğ/g, 'G')
    .replace(/ğ/g, 'g')
    .replace(/Ü/g, 'U')
    .replace(/ü/g, 'u')
    .replace(/Ö/g, 'O')
    .replace(/ö/g, 'o')
    .replace(/Ç/g, 'C')
    .replace(/ç/g, 'c');
};

const UnitPage: React.FC<UnitPageProps> = React.memo(({ unitId }) => {
  const { unitSummaries, transfers, deleteTransfer } = useTransfers();
  const { addLog } = useLog();
  const { user } = useAuth();
  const { cinsiOptions } = useCinsiSettings();
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [tableSearchText, setTableSearchText] = useState('');
  const [tableFilteredInfo, setTableFilteredInfo] = useState<Record<string, string[] | null>>({});
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<'all' | 'input' | 'output'>('all');
  const { isBackendOnline, isChecking } = useBackendStatus();
  const { isMobile } = useResponsive();

  const isAdmin = user?.role === 'admin';

  const unit = unitSummaries.find(u => u.unitId === unitId);
  const unitName = UNIT_NAMES[unitId];
  const hasFire = FIRE_UNITS.includes(unitId);
  const unitColor = unitColors[unitId];
  const isProcessingUnit = PROCESSING_UNITS.includes(unitId);
  const isInputUnit = INPUT_UNITS.includes(unitId);
  const isOutputOnlyUnit = OUTPUT_ONLY_UNITS.includes(unitId);
  const isSemiFinishedUnit = SEMI_FINISHED_UNITS.includes(unitId);

  // Tarih filtreleme fonksiyonu
  const filterTransfersByDate = useCallback((transfers: any[]) => {
    let filtered = transfers;

    // Önce tarih aralığı filtresini uygula
    if (dateRange[0] && dateRange[1]) {
      const startDate = dateRange[0].startOf('day').toDate();
      const endDate = dateRange[1].endOf('day').toDate();
      filtered = filtered.filter(transfer => {
        const transferDate = new Date(transfer.date);
        return transferDate >= startDate && transferDate <= endDate;
      });
    } else if (dateRange[0]) {
      const startDate = dateRange[0].startOf('day').toDate();
      filtered = filtered.filter(transfer => new Date(transfer.date) >= startDate);
    } else if (dateRange[1]) {
      const endDate = dateRange[1].endOf('day').toDate();
      filtered = filtered.filter(transfer => new Date(transfer.date) <= endDate);
    }

    // Sonra preset filtreyi uygula (eğer tarih aralığı yoksa)
    if (dateFilter !== 'all' && !dateRange[0] && !dateRange[1]) {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(transfer => new Date(transfer.date) >= filterDate);
    }

    return filtered;
  }, [dateFilter, dateRange]);

  // Bu birime ait işlemleri getir
  const unitTransfers = useMemo(() => {
    return transfers
      .filter(t => t.fromUnit === unitId || t.toUnit === unitId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transfers, unitId]);

  // Filtrelenmiş transferler - Tüm filtreleri uygula
  const filteredTransfers = useMemo(() => {
    let filtered = unitTransfers;

    // Yarı mamül, Tedarik, Satış ve Döküm için tarih filtresi uygulanmaz
    if (!(isSemiFinishedUnit || unitId === 'tedarik' || unitId === 'satis' || unitId === 'dokum' || isOutputOnlyUnit)) {
      filtered = filterTransfersByDate(filtered);
    }

    // İşlem tipi filtresi
    if (transactionTypeFilter !== 'all') {
      filtered = filtered.filter(transfer => {
        const isIncoming = transfer.toUnit === unitId;
        return transactionTypeFilter === 'input' ? isIncoming : !isIncoming;
      });
    }

    // Arama filtresi
    if (tableSearchText) {
      const searchLower = tableSearchText.toLowerCase();
      filtered = filtered.filter(transfer => {
        const fromUnitName = (UNIT_NAMES[transfer.fromUnit as UnitType] || transfer.fromUnit).toLowerCase();
        const toUnitName = (UNIT_NAMES[transfer.toUnit as UnitType] || transfer.toUnit).toLowerCase();
        const karat = transfer.karat === '24K' ? 'Has Altın' : transfer.karat.replace('K', ' Ayar');
        const cinsi = transfer.cinsi ? cinsiOptions.find(opt => opt.value === transfer.cinsi)?.label || transfer.cinsi : '';
        const notes = transfer.notes || '';
        
        return fromUnitName.includes(searchLower) ||
               toUnitName.includes(searchLower) ||
               karat.toLowerCase().includes(searchLower) ||
               cinsi.toLowerCase().includes(searchLower) ||
               notes.toLowerCase().includes(searchLower);
      });
    }

    return filtered;
  }, [unitTransfers, filterTransfersByDate, isSemiFinishedUnit, unitId, isOutputOnlyUnit, transactionTypeFilter, tableSearchText, cinsiOptions]);

  // OUTPUT_ONLY_UNITS, FIRE_UNITS, PROCESSING_UNITS, INPUT_UNITS ve SEMI_FINISHED_UNITS için toplam giriş hesapla
  const totalInput = useMemo(() => {
    // Tüm birimler için transferlerden hesapla (backend'den gelen değere güvenme)
    return transfers
      .filter(t => t.toUnit === unitId)
      .reduce((sum, t) => {
        const safeAmount = typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0;
        return sum + safeAmount;
      }, 0);
  }, [transfers, unitId]);

  // OUTPUT_ONLY_UNITS, FIRE_UNITS, PROCESSING_UNITS, INPUT_UNITS ve SEMI_FINISHED_UNITS için toplam çıkış hesapla
  const totalOutput = useMemo(() => {
    // Tüm birimler için transferlerden hesapla (backend'den gelen değere güvenme)
    return transfers
      .filter(t => t.fromUnit === unitId)
      .reduce((sum, t) => {
        const safeAmount = typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0;
        return sum + safeAmount;
      }, 0);
  }, [transfers, unitId]);

  // Admin için toplam fire hesapla (tüm transferlerden)
  const adminTotalFire = useMemo(() => {
    if (!isAdmin || !hasFire) return null;
    return Math.max(0, totalInput - totalOutput);
  }, [isAdmin, hasFire, totalInput, totalOutput]);

  // Normal kullanıcılar için son 7 günlük fire hesapla
  const last7DaysFire = useMemo(() => {
    if (isAdmin || !hasFire) return null;
    
    const sevenDaysAgo = dayjs().subtract(7, 'days').startOf('day').toDate();
    
    const last7DaysInput = transfers
      .filter(t => t.toUnit === unitId && new Date(t.date) >= sevenDaysAgo)
      .reduce((sum, t) => {
        const safeAmount = typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0;
        return sum + safeAmount;
      }, 0);
    
    const last7DaysOutput = transfers
      .filter(t => t.fromUnit === unitId && new Date(t.date) >= sevenDaysAgo)
      .reduce((sum, t) => {
        const safeAmount = typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0;
        return sum + safeAmount;
      }, 0);
    
    return Math.max(0, last7DaysInput - last7DaysOutput);
  }, [transfers, unitId, hasFire, isAdmin]);

  // Has karşılığı hesapla - Tüm birimler için transferlerden hesapla
  const filteredHasEquivalent = useMemo(() => {
    // Fire birimleri için: fire'in has karşılığı (fire = giriş - çıkış)
    if (hasFire || isProcessingUnit) {
      const fireByKarat = new Map<string, { input: number; output: number }>();
      
      transfers.forEach(t => {
        if (t.toUnit === unitId || t.fromUnit === unitId) {
          // Karat değeri geçerlilik kontrolü
          if (!t.karat || typeof t.karat !== 'string') {
            return; // Geçersiz karat değerini atla
          }
          const key = t.karat;
          if (!fireByKarat.has(key)) {
            fireByKarat.set(key, { input: 0, output: 0 });
          }
          const fire = fireByKarat.get(key)!;
          
          if (t.toUnit === unitId) {
            fire.input += typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0;
          }
          if (t.fromUnit === unitId) {
            fire.output += typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0;
          }
        }
      });
      
      // Her karat için fire'in has karşılığını hesapla
      return Array.from(fireByKarat.entries()).reduce((sum, [karat, fire]) => {
        const fireAmount = Math.max(0, fire.input - fire.output);
        // Karat değeri geçerlilik kontrolü
        if (!karat || typeof karat !== 'string') {
          return sum;
        }
        const karatMultiplier = KARAT_HAS_RATIOS[karat as keyof typeof KARAT_HAS_RATIOS] || 0;
        return sum + (fireAmount * karatMultiplier);
      }, 0);
    }
    
    // Yarı mamül için: girişlerden çıkışları çıkar (mevcut stokun has karşılığı)
    if (isSemiFinishedUnit) {
      // Giriş ve çıkışları karat bazında topla
      const stockByKarat = new Map<string, { input: number; output: number }>();
      
      transfers.forEach(t => {
        if (t.toUnit === unitId || t.fromUnit === unitId) {
          // Karat değeri geçerlilik kontrolü
          if (!t.karat || typeof t.karat !== 'string') {
            return; // Geçersiz karat değerini atla
          }
          const key = t.karat;
          if (!stockByKarat.has(key)) {
            stockByKarat.set(key, { input: 0, output: 0 });
          }
          const stock = stockByKarat.get(key)!;
          
          if (t.toUnit === unitId) {
            stock.input += typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0;
          }
          if (t.fromUnit === unitId) {
            stock.output += typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0;
          }
        }
      });
      
      // Her karat için mevcut stokun has karşılığını hesapla
      return Array.from(stockByKarat.entries()).reduce((sum, [karat, stock]) => {
        const currentStock = stock.input - stock.output;
        // Karat değeri geçerlilik kontrolü
        if (!karat || typeof karat !== 'string') {
          return sum;
        }
        const karatMultiplier = KARAT_HAS_RATIOS[karat as keyof typeof KARAT_HAS_RATIOS] || 0;
        return sum + (Math.max(0, currentStock) * karatMultiplier);
      }, 0);
    }
    
    // Normal birimler (Ana Kasa, Dış Kasa vb.) için: mevcut stokun has karşılığı
    // Mevcut stok = giriş - çıkış
    const stockByKarat = new Map<string, { input: number; output: number }>();
    
    transfers.forEach(t => {
      if (t.toUnit === unitId || t.fromUnit === unitId) {
        // Karat değeri geçerlilik kontrolü
        if (!t.karat || typeof t.karat !== 'string') {
          return; // Geçersiz karat değerini atla
        }
        const key = t.karat;
        if (!stockByKarat.has(key)) {
          stockByKarat.set(key, { input: 0, output: 0 });
        }
        const stock = stockByKarat.get(key)!;
        
        if (t.toUnit === unitId) {
          stock.input += typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0;
        }
        if (t.fromUnit === unitId) {
          stock.output += typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0;
        }
      }
    });
    
    // Her karat için mevcut stokun has karşılığını hesapla
    return Array.from(stockByKarat.entries()).reduce((sum, [karat, stock]) => {
      const currentStock = Math.max(0, stock.input - stock.output);
      // Karat değeri geçerlilik kontrolü
      if (!karat || typeof karat !== 'string') {
        return sum;
      }
      const karatMultiplier = KARAT_HAS_RATIOS[karat as keyof typeof KARAT_HAS_RATIOS] || 0;
      return sum + (currentStock * karatMultiplier);
    }, 0);
  }, [transfers, unitId, isSemiFinishedUnit, hasFire, isProcessingUnit]);

  // Cila sayfası için günlük kasa hesaplaması (bugünkü giriş - bugünkü çıkış)
  const dailyCash = useMemo(() => {
    if (unitId !== 'cila') return null;
    
    const today = dayjs().startOf('day').toDate();
    const tomorrow = dayjs().add(1, 'day').startOf('day').toDate();
    
    const todayInput = transfers
      .filter(t => t.toUnit === unitId && new Date(t.date) >= today && new Date(t.date) < tomorrow)
      .reduce((sum, t) => {
        const safeAmount = typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0;
        return sum + safeAmount;
      }, 0);
    
    const todayOutput = transfers
      .filter(t => t.fromUnit === unitId && new Date(t.date) >= today && new Date(t.date) < tomorrow)
      .reduce((sum, t) => {
        const safeAmount = typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0;
        return sum + safeAmount;
      }, 0);
    
    return todayInput - todayOutput;
  }, [transfers, unitId]);

  const handleDeleteTransfer = (id: string) => {
    // Silinecek transfer'i bul
    const transferToDelete = transfers.find(t => t.id === id);
    
    deleteTransfer(id);
    
    // Log kaydı
    if (transferToDelete) {
      addLog({
        action: 'DELETE',
        entityType: 'TRANSFER',
        entityName: `${transferToDelete.karat === '24K' ? 'Has Altın' : transferToDelete.karat.replace('K', ' Ayar')} - ${transferToDelete.amount} gr`,
        details: `Transfer silindi: ${transferToDelete.fromUnit} → ${transferToDelete.toUnit}`
      });
    }
    
    message.success('İşlem başarıyla silindi');
  };

  const getUnitIcon = (color: string = '#1890ff') => {
    const iconSize = isMobile ? '32px' : '36px';
    const icons: { [key: string]: React.ReactNode } = {
      'ana-kasa': <BankOutlined style={{ fontSize: iconSize, color }} />,
      'yarimamul': <GoldOutlined style={{ fontSize: iconSize, color }} />,
      'lazer-kesim': <ThunderboltOutlined style={{ fontSize: iconSize, color }} />,
      'tezgah': <ToolOutlined style={{ fontSize: iconSize, color }} />,
      'cila': <CrownOutlined style={{ fontSize: iconSize, color }} />,
      'dokum': <GoldOutlined style={{ fontSize: iconSize, color }} />,
      'tedarik': <ToolOutlined style={{ fontSize: iconSize, color }} />
    };
    return icons[unitId] || <BankOutlined style={{ fontSize: iconSize, color }} />;
  };

  const getFireColor = (fire: number) => {
    if (fire === 0) return 'success';
    if (fire < 1) return 'warning';
    return 'error';
  };

  // Tablo için filtreleme ve export fonksiyonları
  const handleResetFilters = useCallback(() => {
    setTableFilteredInfo({});
    setTableSearchText('');
    setDateRange([null, null]);
    setDateFilter('all');
    setTransactionTypeFilter('all');
    message.success('Filtreler sıfırlandı');
  }, []);

  const handleExport = useCallback(() => {
    // Filtrelenmiş verileri al (tableFilteredInfo ve tableSearchText'e göre)
    // Sadece Döküm için filtre uygulanır, diğerleri için tüm transferler
    // Tüm birimler için unitTransfers kullan (filtre uygulanmaz)
    let dataToExport = unitTransfers;
    
    // Arama filtresini uygula
    if (tableSearchText) {
      dataToExport = dataToExport.filter(transfer => {
        const searchLower = tableSearchText.toLowerCase();
        const fromUnitName = (UNIT_NAMES[transfer.fromUnit as UnitType] || transfer.fromUnit).toLowerCase();
        const toUnitName = (UNIT_NAMES[transfer.toUnit as UnitType] || transfer.toUnit).toLowerCase();
        const karat = transfer.karat === '24K' ? 'Has Altın' : transfer.karat.replace('K', ' Ayar');
        const cinsi = transfer.cinsi ? cinsiOptions.find(opt => opt.value === transfer.cinsi)?.label || transfer.cinsi : '';
        const notes = transfer.notes || '';
        
        return fromUnitName.includes(searchLower) ||
               toUnitName.includes(searchLower) ||
               karat.toLowerCase().includes(searchLower) ||
               cinsi.toLowerCase().includes(searchLower) ||
               notes.toLowerCase().includes(searchLower);
      });
    }

    // Tablo filtrelerini uygula
    if (tableFilteredInfo['Tarih']) {
      const filteredDates = tableFilteredInfo['Tarih'];
      if (filteredDates && filteredDates.length > 0) {
        dataToExport = dataToExport.filter(transfer => {
          const transferDate = new Date(transfer.date).toLocaleDateString('tr-TR');
          return filteredDates.includes(transferDate);
        });
      }
    }

    if (tableFilteredInfo['İşlem Tipi']) {
      const filteredTypes = tableFilteredInfo['İşlem Tipi'];
      if (filteredTypes && filteredTypes.length > 0) {
        dataToExport = dataToExport.filter(transfer => {
          const isIncoming = transfer.toUnit === unitId;
          const type = isIncoming ? 'Giriş' : 'Çıkış';
          return filteredTypes.includes(type);
        });
      }
    }

    if (tableFilteredInfo['Ayar']) {
      const filteredKarat = tableFilteredInfo['Ayar'];
      if (filteredKarat && filteredKarat.length > 0) {
        dataToExport = dataToExport.filter(transfer => {
          const karat = transfer.karat === '24K' ? 'Has Altın' : transfer.karat.replace('K', ' Ayar');
          return filteredKarat.includes(karat);
        });
      }
    }

    if (dataToExport.length === 0) {
      message.warning('Dışa aktarılacak işlem bulunamadı');
      return;
    }

    // PDF oluştur
    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    const addText = (text: string, x: number, y: number, options?: { fontSize?: number; color?: [number, number, number]; font?: string; style?: string; normalize?: boolean }) => {
      if (options?.fontSize) doc.setFontSize(options.fontSize);
      if (options?.color) doc.setTextColor(options.color[0], options.color[1], options.color[2]);
      if (options?.font) doc.setFont(options.font, options.style || 'normal');
      
      // Türkçe karakterleri normalize et (varsayılan olarak normalize et)
      const normalizedText = options?.normalize === false ? text : normalizeTurkishChars(text);
      const textLines = doc.splitTextToSize(normalizedText, 250);
      doc.text(textLines, x, y);
    };
    
    // Arka plan rengi için (başlık çizgisi)
    const primaryColor: [number, number, number] = [102, 126, 234]; // Indigo
    
    // Başlık çizgisi (üst kenarda)
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 297, 8, 'F');
    
    // Logo/Şirket adı alanı
    addText('İndigo Takı - İmalat Takip', 14, 6, { fontSize: 12, color: [255, 255, 255] });
    
    // Ana başlık
    const title = `${unitName} - Tüm İşlemler`;
    addText(title, 14, 18, { fontSize: 20, color: [31, 41, 55], font: 'helvetica', style: 'bold' });
    
    // Alt başlık çizgisi
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.5);
    doc.line(14, 21, 283, 21);
    
    // Tarih ve bilgiler (daha düzenli)
    let currentY = 26;
    const exportDate = new Date().toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    addText(`Oluşturulma Tarihi: ${exportDate}`, 14, currentY, { fontSize: 9, color: [100, 100, 100] });
    
    // İstatistikler hesapla
    const totalInput = dataToExport
      .filter(t => t.toUnit === unitId)
      .reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0), 0);
    
    const totalOutput = dataToExport
      .filter(t => t.fromUnit === unitId)
      .reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0), 0);
    
    const netAmount = totalInput - totalOutput;
    
    // İstatistik kutuları
    currentY = 32;
    const boxWidth = 85;
    const boxHeight = 12;
    const spacing = 8;
    let boxX = 14;
    
    // Toplam Giriş
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(boxX, currentY, boxWidth, boxHeight, 2, 2, 'F');
    addText('Toplam Giriş', boxX + 3, currentY + 4, { fontSize: 8, color: [100, 100, 100] });
    addText(`${totalInput.toFixed(2)} gr`, boxX + 3, currentY + 8, { fontSize: 11, color: [5, 150, 105], font: 'helvetica', style: 'bold' });
    
    // Toplam Çıkış
    boxX += boxWidth + spacing;
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(boxX, currentY, boxWidth, boxHeight, 2, 2, 'F');
    addText('Toplam Çıkış', boxX + 3, currentY + 4, { fontSize: 8, color: [100, 100, 100] });
    addText(`${totalOutput.toFixed(2)} gr`, boxX + 3, currentY + 8, { fontSize: 11, color: [239, 68, 68], font: 'helvetica', style: 'bold' });
    
    // Net Stok/Fire
    boxX += boxWidth + spacing;
    const netLabel = hasFire || isProcessingUnit ? 'Net Fire' : 'Net Stok';
    const netColor: [number, number, number] = netAmount > 0 && (hasFire || isProcessingUnit) ? [239, 68, 68] : [59, 130, 246];
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(boxX, currentY, boxWidth, boxHeight, 2, 2, 'F');
    addText(netLabel, boxX + 3, currentY + 4, { fontSize: 8, color: [100, 100, 100] });
    addText(`${Math.max(0, netAmount).toFixed(2)} gr`, boxX + 3, currentY + 8, { fontSize: 11, color: netColor, font: 'helvetica', style: 'bold' });
    
    // Toplam İşlem
    boxX += boxWidth + spacing;
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(boxX, currentY, 55, boxHeight, 2, 2, 'F');
    addText('Toplam İşlem', boxX + 3, currentY + 4, { fontSize: 8, color: [100, 100, 100] });
    addText(`${dataToExport.length}`, boxX + 3, currentY + 8, { fontSize: 11, color: [31, 41, 55], font: 'helvetica', style: 'bold' });
    
    // Filtre bilgisi (varsa)
    currentY = 47;
    let filterInfo = '';
    if (dateRange[0] && dateRange[1]) {
      filterInfo = `Tarih Aralığı: ${dateRange[0].format('DD.MM.YYYY')} - ${dateRange[1].format('DD.MM.YYYY')}`;
    } else if (dateFilter !== 'all') {
      const filterLabels: Record<string, string> = {
        'week': 'Son 1 Hafta',
        'month': 'Son 1 Ay',
        'year': 'Son 1 Yıl'
      };
      filterInfo = `Tarih Filtresi: ${filterLabels[dateFilter]}`;
    }
    if (filterInfo) {
      addText(filterInfo, 14, currentY, { fontSize: 8, color: [100, 100, 100] });
      currentY += 4;
    }

    // Tablo verileri - Türkçe karakterleri koru
    const tableData = dataToExport.map(transfer => {
      const isIncoming = transfer.toUnit === unitId;
      const date = new Date(transfer.date).toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      const type = isIncoming ? 'Giriş' : 'Çıkış';
      const amount = typeof transfer.amount === 'number' ? transfer.amount : parseFloat(transfer.amount) || 0;
      const karat = transfer.karat === '24K' ? 'Has Altın' : transfer.karat.replace('K', ' Ayar');
      const cinsi = transfer.cinsi ? cinsiOptions.find(opt => opt.value === transfer.cinsi)?.label || transfer.cinsi : '-';
      
      // Her hücreyi string olarak döndür - Unicode karakterleri koru
      return [
        String(date || ''),
        String(type || ''),
        String(UNIT_NAMES[transfer.fromUnit as UnitType] || transfer.fromUnit || ''),
        String(UNIT_NAMES[transfer.toUnit as UnitType] || transfer.toUnit || ''),
        String(karat || ''),
        `${amount.toFixed(2)} gr`,
        String(cinsi || '-'),
        String(transfer.notes || '-')
      ];
    });

    // Tablo oluştur - Türkçe karakter desteği için didParseCell hook'u kullan
    // Landscape A4: 297mm x 210mm (kullanılabilir: ~277mm x ~190mm, margin'lerle: ~249mm x ~162mm)
    autoTable(doc, {
      head: [['Tarih', 'İşlem Tipi', 'Kaynak Birim', 'Hedef Birim', 'Ayar', 'Miktar', 'Cinsi', 'Not']],
      body: tableData,
      startY: filterInfo ? currentY + 2 : currentY - 2,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        cellWidth: 'wrap',
        font: 'helvetica',
        fontStyle: 'normal',
        textColor: [31, 41, 55],
        lineColor: [229, 231, 235],
        lineWidth: 0.3
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: 255,
        fontStyle: 'bold',
        font: 'helvetica',
        fontSize: 9,
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      columnStyles: {
        0: { cellWidth: 35 },  // Tarih
        1: { cellWidth: 22 },  // İşlem Tipi
        2: { cellWidth: 30 },  // Kaynak Birim
        3: { cellWidth: 30 },  // Hedef Birim
        4: { cellWidth: 25 },  // Ayar
        5: { cellWidth: 22 },  // Miktar
        6: { cellWidth: 28 },  // Cinsi
        7: { cellWidth: 35 }   // Not
      },
      margin: { left: 10, right: 10 },
      didParseCell: function(data: any) {
        // Türkçe karakterleri normalize et - jsPDF'in standart font'ları Türkçe karakterleri desteklemiyor
        if (data.cell && typeof data.cell.text !== 'undefined') {
          const normalizeText = (text: any): string => {
            if (typeof text === 'string') {
              // Türkçe karakterleri ASCII benzeri karakterlere dönüştür
              return text
                .replace(/İ/g, 'I')
                .replace(/ı/g, 'i')
                .replace(/Ş/g, 'S')
                .replace(/ş/g, 's')
                .replace(/Ğ/g, 'G')
                .replace(/ğ/g, 'g')
                .replace(/Ü/g, 'U')
                .replace(/ü/g, 'u')
                .replace(/Ö/g, 'O')
                .replace(/ö/g, 'o')
                .replace(/Ç/g, 'C')
                .replace(/ç/g, 'c');
            }
            return String(text || '');
          };
          
          if (Array.isArray(data.cell.text)) {
            data.cell.text = data.cell.text.map(normalizeText);
          } else {
            data.cell.text = normalizeText(data.cell.text);
          }
        }
      },
      didDrawPage: function(data: any) {
        // Her sayfa için footer ekle
        const pageCount = doc.getNumberOfPages();
        
        // Sol alt - Şirket bilgisi
        addText('İndigo Takı - İmalat Takip Sistemi', 14, 202, { fontSize: 8, color: [150, 150, 150] });
        
        // Sağ alt - Sayfa numarası
        const pageText = `Sayfa ${data.pageNumber} / ${pageCount}`;
        const pageTextWidth = doc.getTextWidth(pageText);
        addText(pageText, 283 - pageTextWidth, 202, { fontSize: 8, color: [150, 150, 150] });
        
        // Orta alt - Tarih
        const pageDate = new Date().toLocaleDateString('tr-TR');
        const pageDateWidth = doc.getTextWidth(pageDate);
        addText(pageDate, 148.5 - pageDateWidth / 2, 202, { fontSize: 8, color: [150, 150, 150] });
      }
    });

    // PDF'i indir
    const fileName = `${unitName}_işlemler_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    message.success(`${dataToExport.length} işlem PDF olarak dışa aktarıldı`);
  }, [unitTransfers, filteredTransfers, isOutputOnlyUnit, isInputUnit, unitId, isSemiFinishedUnit, unitName, tableSearchText, tableFilteredInfo, dateRange, dateFilter, cinsiOptions, hasFire, isProcessingUnit]);

  const columns: ColumnsType<any> = [
    {
      title: 'Tarih',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => {
        const formattedDate = new Date(date).toLocaleString('tr-TR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CalendarOutlined style={{ fontSize: '12px', color: '#9ca3af' }} />
            <Text style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>
              {formattedDate}
            </Text>
          </div>
        );
      },
      width: 180,
      sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      filteredValue: tableFilteredInfo.date || null,
      onFilter: (value, record) => {
        if (!value || !Array.isArray(value) || value.length === 0) return true;
        
        const recordDate = dayjs(record.date);
        if (value.length === 1) {
          // Tek tarih seçildiyse, o güne ait tüm kayıtları göster
          return recordDate.format('DD.MM.YYYY') === value[0];
        } else if (value.length === 2) {
          // Tarih aralığı seçildiyse
          const startDate = dayjs(value[0]).startOf('day');
          const endDate = dayjs(value[1]).endOf('day');
          return recordDate.isAfter(startDate.subtract(1, 'day')) && recordDate.isBefore(endDate.add(1, 'day'));
        }
        return true;
      },
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => {
        const selectedDates = selectedKeys && selectedKeys.length > 0 
          ? selectedKeys.map((key) => dayjs(String(key), 'DD.MM.YYYY'))
          : null;

        const isRangeSelected = selectedDates && selectedDates.length === 2;
        const isSingleDateSelected = selectedDates && selectedDates.length === 1 && !isRangeSelected;

        return (
          <div style={{ 
            padding: '16px',
            background: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            minWidth: '320px'
          }}>
            <div style={{ marginBottom: '16px' }}>
              <Text strong style={{ 
                display: 'block', 
                marginBottom: '12px', 
                fontSize: '14px',
                color: '#1f2937',
                fontWeight: 600
              }}>
                Tarih Filtresi
              </Text>
              
              <div style={{ marginBottom: '12px' }}>
                <Text style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '12px',
                  color: '#6b7280',
                  fontWeight: 500
                }}>
                  Tek Tarih
                </Text>
                <DatePicker
                  placeholder="Tarih seç"
                  value={isSingleDateSelected ? selectedDates[0] : null}
                  onChange={(date) => {
                    if (date) {
                      setSelectedKeys([date.format('DD.MM.YYYY')]);
                    } else {
                      setSelectedKeys([]);
                    }
                  }}
                  format="DD.MM.YYYY"
                  style={{ width: '100%' }}
                  size="middle"
                  allowClear
                />
              </div>

              <Divider style={{ margin: '12px 0' }} />

              <div style={{ marginBottom: '12px' }}>
                <Text style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '12px',
                  color: '#6b7280',
                  fontWeight: 500
                }}>
                  Tarih Aralığı
                </Text>
                <DatePicker.RangePicker
                  placeholder={['Başlangıç Tarihi', 'Bitiş Tarihi']}
                  value={isRangeSelected 
                    ? [selectedDates[0], selectedDates[1]] as [Dayjs, Dayjs]
                    : null}
                  onChange={(dates) => {
                    if (dates && dates[0] && dates[1]) {
                      setSelectedKeys([dates[0].format('DD.MM.YYYY'), dates[1].format('DD.MM.YYYY')]);
                    } else {
                      setSelectedKeys([]);
                    }
                  }}
                  format="DD.MM.YYYY"
                  style={{ width: '100%' }}
                  size="middle"
                  allowClear
                />
              </div>
            </div>
            
            <div style={{ 
              borderTop: '1px solid #e5e7eb', 
              paddingTop: '12px',
              display: 'flex',
              gap: '8px',
              justifyContent: 'flex-end'
            }}>
              <Button 
                onClick={() => {
                  if (clearFilters) {
                    clearFilters();
                    setSelectedKeys([]);
                  }
                }} 
                size="middle"
                style={{ 
                  minWidth: '90px',
                  borderColor: '#d1d5db',
                  color: '#6b7280'
                }}
              >
                Temizle
              </Button>
              <Button
                type="primary"
                onClick={() => confirm()}
                size="middle"
                style={{ 
                  minWidth: '90px',
                  background: '#3b82f6',
                  borderColor: '#3b82f6'
                }}
              >
                Uygula
              </Button>
            </div>
          </div>
        );
      },
      filterIcon: (filtered) => <FilterOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
    },
    {
      title: 'İşlem Tipi',
      key: 'type',
      render: (record: any) => {
        const isIncoming = record.toUnit === unitId;
        return (
          <Tag 
            color={isIncoming ? 'success' : 'error'}
            style={{
              borderRadius: '6px',
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: 600,
              border: 'none',
              boxShadow: isIncoming 
                ? '0 2px 4px rgba(52, 211, 153, 0.2)' 
                : '0 2px 4px rgba(239, 68, 68, 0.2)'
            }}
          >
            {isIncoming ? '✓ Giriş' : '✕ Çıkış'}
          </Tag>
        );
      },
      width: 120,
      filters: [
        { text: 'Giriş', value: 'giris' },
        { text: 'Çıkış', value: 'cikis' }
      ],
      filteredValue: tableFilteredInfo.type || null,
      onFilter: (value, record) => {
        const isIncoming = record.toUnit === unitId;
        return value === 'giris' ? isIncoming : !isIncoming;
      }
    },
    {
      title: 'Detay',
      key: 'detail',
      render: (record: any) => {
        const isIncoming = record.toUnit === unitId;
        const otherUnit = isIncoming ? record.fromUnit : record.toUnit;
        const otherUnitName = UNIT_NAMES[otherUnit as UnitType] || otherUnit;
        
        return (
          <Space size="small">
            {isIncoming ? (
              <>
                <Text type="secondary">{otherUnitName}</Text>
                <ArrowRightOutlined style={{ fontSize: '12px', color: '#52c41a' }} />
                <Text strong>{unitName}</Text>
              </>
            ) : (
              <>
                <Text strong>{unitName}</Text>
                <ArrowRightOutlined style={{ fontSize: '12px', color: '#ff4d4f' }} />
                <Text type="secondary">{otherUnitName}</Text>
              </>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Ayar',
      dataIndex: 'karat',
      key: 'karat',
      width: 120,
      render: (karat: string) => {
        const isHas = karat === '24K';
        return (
          <Tag 
            color={isHas ? 'gold' : 'blue'}
            style={{
              borderRadius: '6px',
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: 600,
              border: 'none',
              boxShadow: isHas 
                ? '0 2px 4px rgba(250, 204, 21, 0.2)' 
                : '0 2px 4px rgba(59, 130, 246, 0.2)'
            }}
          >
            {isHas ? '👑 Has Altın' : karat.replace('K', ' Ayar')}
          </Tag>
        );
      },
      filters: [
        { text: '14 Ayar', value: '14K' },
        { text: '18 Ayar', value: '18K' },
        { text: '22 Ayar', value: '22K' },
        { text: 'Has Altın', value: '24K' }
      ],
      filteredValue: tableFilteredInfo.karat || null,
      onFilter: (value, record) => record.karat === value
    },
    {
      title: 'Cinsi',
      dataIndex: 'cinsi',
      key: 'cinsi',
      width: 120,
      render: (cinsi: string) => {
        if (!cinsi) {
          return <Text type="secondary" style={{ fontSize: '12px', color: '#d1d5db' }}>-</Text>;
        }
        const cinsiLabel = cinsiOptions.find((opt: CinsiOption) => opt.value === cinsi)?.label || cinsi;
        return (
          <Tag 
            color="purple"
            style={{
              borderRadius: '6px',
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: 500,
              border: 'none'
            }}
          >
            {cinsiLabel}
          </Tag>
        );
      },
      filters: cinsiOptions.map((opt: CinsiOption) => ({
        text: opt.label,
        value: opt.value
      })),
      filteredValue: tableFilteredInfo.cinsi || null,
      onFilter: (value, record) => record.cinsi === value
    },
    {
      title: 'Miktar',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      render: (amount: number, record: any) => {
        const isIncoming = record.toUnit === unitId;
        const safeAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
        return (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{
              fontSize: '14px',
              fontWeight: 700,
              color: isIncoming ? '#10b981' : '#ef4444'
            }}>
              {isIncoming ? '↗' : '↙'}
            </span>
            <Text strong style={{ 
              color: isIncoming ? '#10b981' : '#ef4444',
              fontSize: '14px',
              fontWeight: 600
            }}>
              {isIncoming ? '+' : '-'}{safeAmount.toFixed(2)} gr
            </Text>
          </div>
        );
      },
      sorter: (a, b) => {
        const aAmount = typeof a.amount === 'number' ? a.amount : parseFloat(a.amount) || 0;
        const bAmount = typeof b.amount === 'number' ? b.amount : parseFloat(b.amount) || 0;
        return aAmount - bAmount;
      }
    },
    {
      title: 'Not',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: {
        showTitle: false
      },
      render: (notes: string) => (
        notes ? (
          <Tooltip title={notes} placement="topLeft">
            <Text 
              type="secondary" 
              style={{
                fontSize: '12px',
                color: '#6b7280',
                cursor: 'help',
                display: 'block',
                maxWidth: '200px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {notes}
            </Text>
          </Tooltip>
        ) : (
          <Text type="secondary" style={{ fontSize: '12px', color: '#d1d5db' }}>-</Text>
        )
      )
    },
    ...(isAdmin ? [{
      title: 'İşlemler',
      key: 'actions',
      width: 100,
      align: 'center' as const,
      render: (record: any) => (
        <Popconfirm
          title="İşlemi Sil"
          description="Bu işlemi silmek istediğinizden emin misiniz?"
          onConfirm={() => handleDeleteTransfer(record.id)}
          okText="Evet"
          cancelText="Hayır"
          okButtonProps={{ danger: true }}
        >
          <Button 
            type="text" 
            danger 
            size="small"
            icon={<DeleteOutlined />}
          />
        </Popconfirm>
      )
    }] : [])
  ];

  // Cinsi bazlı stok tablosu
  const cinsiColumns: ColumnsType<any> = useMemo(() => {
    const columns: ColumnsType<any> = [
      {
        title: 'Cinsi',
        dataIndex: 'cinsi',
        key: 'cinsi',
        width: 200,
        render: (cinsi: string) => (
          <Tag color="purple">
            {cinsiOptions.find((opt: CinsiOption) => opt.value === cinsi)?.label || cinsi}
          </Tag>
        )
      },
      {
        title: 'Stok',
        dataIndex: 'stock',
        key: 'stock',
        width: 150,
        align: 'right' as const,
        render: (stock: number) => `${(typeof stock === 'number' ? stock : parseFloat(stock) || 0).toFixed(2)} gr`
      },
      {
        title: 'Has Karşılığı',
        dataIndex: 'has',
        key: 'has',
        width: 150,
        align: 'right' as const,
        render: (has: number) => {
          const safeHas = typeof has === 'number' ? has : parseFloat(has) || 0;
          return (
            <Text style={{ color: '#52c41a' }}>{safeHas.toFixed(2)} gr</Text>
          );
        }
      }
    ];

    if (hasFire) {
      columns.push({
        title: 'Fire',
        dataIndex: 'fire',
        key: 'fire',
        width: 150,
        align: 'right' as const,
        render: (fire: number) => {
          const safeFire = typeof fire === 'number' ? fire : parseFloat(fire) || 0;
          return (
            <Tag color={getFireColor(safeFire)}>
              {safeFire.toFixed(2)} gr
            </Tag>
          );
        }
      });
    }

    return columns;
  }, [hasFire, cinsiOptions]);

  // Cinsi bazlı stok verilerini hesapla
  const cinsiData = useMemo(() => {
    if (!unit) return [];
    
    // Transferlerden cinsi bilgilerini çıkar
    const cinsiMap = new Map<string, { stock: number; has: number; fire: number; input: number; output: number }>();
    
    // Stok hesaplaması her zaman TÜM transferlerden yapılmalı (tarih filtresinden bağımsız)
    // Tarih filtresi sadece işlem listesini göstermek için kullanılır, stok hesaplaması için değil
    const transfersToUse = transfers;
    
    // Bu birime gelen transferler
    const incomingTransfers = transfersToUse.filter(t => t.toUnit === unitId);
    // Bu birimden çıkan transferler
    const outgoingTransfers = transfersToUse.filter(t => t.fromUnit === unitId);
    
    // Giriş transferlerini işle
    incomingTransfers.forEach(transfer => {
      const safeAmount = typeof transfer.amount === 'number' ? transfer.amount : parseFloat(String(transfer.amount)) || 0;
      if (safeAmount > 0) {
        // Cinsi kontrolü: undefined, null, boş string veya sadece boşluk ise atla (cinsi belirtilmemiş transferleri gösterme)
        if (!transfer.cinsi || !String(transfer.cinsi).trim()) return;
        const cinsi = String(transfer.cinsi).trim();
        const existing = cinsiMap.get(cinsi) || { stock: 0, has: 0, fire: 0, input: 0, output: 0 };
        existing.stock += safeAmount;
        existing.input += safeAmount;
        const karatRatio = (KARAT_HAS_RATIOS[transfer.karat as keyof typeof KARAT_HAS_RATIOS]) || 0;
        existing.has += safeAmount * karatRatio;
        cinsiMap.set(cinsi, existing);
      }
    });
    
    // Çıkış transferlerini işle
    outgoingTransfers.forEach(transfer => {
      const safeAmount = typeof transfer.amount === 'number' ? transfer.amount : parseFloat(String(transfer.amount)) || 0;
      if (safeAmount > 0) {
        // Cinsi kontrolü: undefined, null, boş string veya sadece boşluk ise atla (cinsi belirtilmemiş transferleri gösterme)
        if (!transfer.cinsi || !String(transfer.cinsi).trim()) return;
        const cinsi = String(transfer.cinsi).trim();
        const existing = cinsiMap.get(cinsi) || { stock: 0, has: 0, fire: 0, input: 0, output: 0 };
        existing.stock -= safeAmount;
        existing.output += safeAmount;
        const karatRatio = (KARAT_HAS_RATIOS[transfer.karat as keyof typeof KARAT_HAS_RATIOS]) || 0;
        existing.has -= safeAmount * karatRatio;
        cinsiMap.set(cinsi, existing);
      }
    });
    
    // Fire ve stok hesaplama - birim tipine göre
    if (hasFire || isProcessingUnit) {
      // Lazer Kesim, Tezgah, Cila gibi fire/işlem birimleri
      // Fire = Toplam Giriş - Toplam Çıkış (işlem sırasında kaybolan miktar)
      cinsiMap.forEach((data, cinsi) => {
        data.fire = Math.max(0, data.input - data.output); // Fire = giriş - çıkış
        data.stock = 0; // Fire/işlem birimlerinde stok 0
        data.has = 0; // Fire birimlerinde has da 0 (stok olmadığı için)
      });
    } else if (isInputUnit) {
      // Döküm, Tedarik - stok tutulur ama fire yok
      cinsiMap.forEach((data, cinsi) => {
        data.fire = 0;
        data.stock = Math.max(0, data.stock);
        // Has değeri negatif olamaz (stok negatif olamaz)
        data.has = Math.max(0, data.has);
      });
    } else if (isSemiFinishedUnit || isOutputOnlyUnit) {
      // Yarı Mamul, Satış - normal stok takibi
      cinsiMap.forEach((data, cinsi) => {
        data.fire = 0;
        data.stock = Math.max(0, data.stock);
        // Has değeri negatif olamaz (stok negatif olamaz)
        data.has = Math.max(0, data.has);
      });
    } else {
      // Ana Kasa, Dış Kasa - normal stok takibi
      cinsiMap.forEach((data, cinsi) => {
        data.fire = 0;
        data.stock = Math.max(0, data.stock);
        // Has değeri negatif olamaz (stok negatif olamaz)
        data.has = Math.max(0, data.has);
      });
    }
    
    // Sonuçları filtrele ve düzenle - cinsi ayarlarına göre sırala
    const result = Array.from(cinsiMap.entries())
      .map(([cinsi, data]) => ({
        key: cinsi,
        cinsi,
        stock: Number(data.stock.toFixed(3)),
        has: Number(data.has.toFixed(3)),
        fire: Number(data.fire.toFixed(3))
      }))
      .filter(item => {
        // Yarı mamül için stok > 0 olanları göster, diğerleri için stok > 0 veya fire > 0
        if (isSemiFinishedUnit) {
          return item.stock > 0;
        }
        return item.stock > 0 || item.fire > 0;
      })
      .sort((a, b) => {
        // Cinsi ayarlarına göre sırala
        const aIndex = cinsiOptions.findIndex(opt => opt.value === a.cinsi);
        const bIndex = cinsiOptions.findIndex(opt => opt.value === b.cinsi);
        
        // Ayarlarda tanımlı olanlar önce gelsin
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        
        // İkisi de ayarlarda yoksa alfabetik sırala
        return a.cinsi.localeCompare(b.cinsi, 'tr');
      });
    
    return result;
  }, [unit, transfers, unitId, hasFire, isProcessingUnit, isInputUnit, isSemiFinishedUnit, isOutputOnlyUnit, cinsiOptions]);

  if (!unit) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px' }}>
        <GoldOutlined style={{ fontSize: '64px', color: '#d9d9d9', marginBottom: 16 }} />
        <Title level={3} type="secondary">Birim bilgisi bulunamadı</Title>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Ultra Minimal Header */}
      <div style={{ 
        marginBottom: 16, 
        padding: isMobile ? '8px 0' : '12px 0',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <Space size={10} align="center">
          {getUnitIcon('#64748b')}
          <Title level={4} style={{ margin: 0, color: '#1f2937', fontSize: isMobile ? '16px' : '18px', fontWeight: '500', lineHeight: 1.2 }}>
            {unitName}
          </Title>
          {!isChecking && (
            <div style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: isBackendOnline ? '#22c55e' : '#ef4444'
            }} />
          )}
        </Space>
      </div>


      {/* İstatistikler ve Cinsi Bazlı Stok Dağılımı - Minimalist Kompakt (Satış, Tedarik, Döküm, Lazer Kesim, Tezgah ve Cila sayfası hariç) */}
      {unitId !== 'satis' && unitId !== 'tedarik' && unitId !== 'dokum' && unitId !== 'lazer-kesim' && unitId !== 'tezgah' && unitId !== 'cila' && (
        <div style={{ marginTop: 16 }}>
          {/* İstatistikler Kartı - Ultra Kompakt */}
          <div 
            style={{ 
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
              background: 'white',
              padding: '12px 16px',
              marginBottom: 12
            }}
          >
            <Row gutter={[16, 0]}>
              {/* Fire birimleri için sadece Toplam Fire göster - Normal kullanıcılar için son 7 günlük */}
              {hasFire || isProcessingUnit ? (
                <Col xs={24} style={{ textAlign: 'center' }}>
                  <Space size={8} align="center">
                    <ThunderboltOutlined style={{ fontSize: '14px', color: '#64748b' }} />
                    <div style={{ textAlign: 'left' }}>
                      <Text style={{ fontSize: '11px', color: '#9ca3af', display: 'block', lineHeight: '1.2' }}>
                        {isAdmin ? 'Toplam Fire' : 'Son 7 Günlük Fire'}
                      </Text>
                      <Text style={{ 
                        fontSize: isMobile ? '16px' : '18px',
                        fontWeight: 600,
                        color: '#1f2937',
                        display: 'block'
                      }}>
                        {isAdmin 
                          ? (adminTotalFire !== null ? adminTotalFire.toFixed(2).replace(/^0+(?=\d)/, '') : '0.00')
                          : (last7DaysFire !== null ? last7DaysFire.toFixed(2).replace(/^0+(?=\d)/, '') : '0.00')
                        } gr
                      </Text>
                    </div>
                  </Space>
                </Col>
              ) : (
                <>
                  {/* Sol Kısım - Toplam Stok/İşlem */}
                  <Col xs={24} sm={12}>
                    <Space size={8} align="start" style={{ width: '100%' }}>
                      <GoldOutlined style={{ fontSize: '14px', color: '#64748b' }} />
                      <div style={{ flex: 1 }}>
                        <Text style={{ fontSize: '11px', color: '#9ca3af', display: 'block', lineHeight: '1.2' }}>
                          {isOutputOnlyUnit ? 'Toplam Giriş' : 
                           isInputUnit ? 'Toplam İşlem' : 'Toplam Stok'}
                        </Text>
                        <Text style={{ 
                          fontSize: isMobile ? '16px' : '18px',
                          fontWeight: 600,
                          color: '#1f2937',
                          display: 'block'
                        }}>
                          {(() => {
                            const calculatedValue = isOutputOnlyUnit ? totalInput : 
                                                   isInputUnit ? totalInput + totalOutput : 
                                                   Math.max(0, totalInput - totalOutput);
                            return calculatedValue.toFixed(2).replace(/^0+(?=\d)/, '');
                          })()} gr
                        </Text>
                      </div>
                    </Space>
                  </Col>
                  
                  {/* Sağ Kısım - Has Karşılığı */}
                  <Col xs={24} sm={12}>
                    <Space size={8} align="start" style={{ width: '100%' }}>
                      <CrownOutlined style={{ fontSize: '14px', color: '#64748b' }} />
                      <div style={{ flex: 1 }}>
                        <Text style={{ fontSize: '11px', color: '#9ca3af', display: 'block', lineHeight: '1.2' }}>Has Karşılığı</Text>
                        <Text style={{ 
                          fontSize: isMobile ? '16px' : '18px',
                          fontWeight: 600,
                          color: '#059669',
                          display: 'block'
                        }}>
                          {(() => {
                            const hasValue = hasFire || isProcessingUnit ? 0 : filteredHasEquivalent;
                            return hasValue.toFixed(2).replace(/^0+(?=\d)/, '');
                          })()} gr
                        </Text>
                      </div>
                    </Space>
                  </Col>
                </>
              )}
            </Row>
          </div>

          {/* Cinsi Bazlı Stok Dağılımı - Minimalist */}
          {((!isProcessingUnit && !isOutputOnlyUnit && !isInputUnit && !hasFire) || isSemiFinishedUnit) && (
            <div 
              style={{ 
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                background: 'white'
              }}
            >
              <div style={{ 
                padding: '10px 16px', 
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <GoldOutlined style={{ fontSize: '14px', color: '#64748b' }} />
                <Text strong style={{ fontSize: '13px', color: '#1f2937' }}>Cinsi Bazlı Stok Dağılımı</Text>
              </div>
              <div style={{ padding: '12px' }}>
                {cinsiData.length > 0 ? (
                  <Table
                    columns={cinsiColumns}
                    dataSource={cinsiData}
                    pagination={false}
                    size="small"
                    rowKey="cinsi"
                    style={{ margin: 0 }}
                  />
                ) : (
                  <Empty description="Bu birimde henüz stok yok" style={{ margin: '12px 0' }} />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cila sayfası için Günlük Kasa Kartı */}
      {unitId === 'cila' && dailyCash !== null && (
        <div style={{ marginTop: 16 }}>
          <div style={{ 
            padding: '16px 20px',
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)'
          }}>
            <Space size={16} align="center" style={{ width: '100%', justifyContent: 'center' }}>
              <BankOutlined style={{ fontSize: '20px', color: '#64748b' }} />
              <div style={{ textAlign: 'center' }}>
                <Text style={{ 
                  display: 'block', 
                  fontSize: '12px', 
                  color: '#6b7280',
                  marginBottom: '4px'
                }}>
                  Günlük Kasa
                </Text>
                <Text strong style={{ 
                  display: 'block', 
                  fontSize: isMobile ? '24px' : '28px', 
                  color: dailyCash < 0 ? '#ff4d4f' : '#1f2937',
                  fontWeight: 600
                }}>
                  {dailyCash.toFixed(2).replace(/^0+(?=\d)/, '')} gr
                </Text>
              </div>
            </Space>
          </div>
        </div>
      )}

      {/* İşlem Geçmişi - Profesyonel Tasarım */}
      <div style={{ marginTop: 16 }}>
        <Card
          style={{
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            background: 'white',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden'
          }}
          bodyStyle={{ padding: 0 }}
        >
          {/* Header */}
          <div style={{
            padding: isMobile ? '16px' : '16px 24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <Text strong style={{
              fontSize: isMobile ? '16px' : '17px',
              color: '#1f2937',
              fontWeight: 600
            }}>
              Tüm İşlemler
            </Text>
            <Space size={8}>
              <Button
                icon={<FilterOutlined />}
                onClick={handleResetFilters}
                size={isMobile ? 'small' : 'middle'}
                disabled={Object.keys(tableFilteredInfo).length === 0 && !tableSearchText && dateFilter === 'all' && !dateRange[0] && !dateRange[1] && transactionTypeFilter === 'all'}
                style={{
                  borderRadius: '6px'
                }}
              >
                Temizle
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleExport}
                size={isMobile ? 'small' : 'middle'}
                style={{
                  borderRadius: '6px'
                }}
              >
                Dışa Aktar
              </Button>
            </Space>
          </div>

          {/* Filtre Sistemi - Dış Kasa gibi */}
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e5e7eb',
            background: '#fafafa'
          }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Input
                  placeholder="Birim, ayar, cinsi, notlarda ara..."
                  prefix={<SearchOutlined />}
                  value={tableSearchText}
                  onChange={(e) => setTableSearchText(e.target.value)}
                  allowClear
                  style={{ borderRadius: '8px' }}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Select
                  placeholder="İşlem Tipi"
                  value={transactionTypeFilter}
                  onChange={(value) => setTransactionTypeFilter(value)}
                  style={{ width: '100%', borderRadius: '8px' }}
                  allowClear
                >
                  <Option value="all">Tüm İşlemler</Option>
                  <Option value="input">Giriş</Option>
                  <Option value="output">Çıkış</Option>
                </Select>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Segmented
                  options={[
                    { label: 'Tümü', value: 'all' },
                    { label: 'Son 7 Gün', value: 'week' },
                    { label: 'Son Ay', value: 'month' },
                    { label: 'Son Yıl', value: 'year' }
                  ]}
                  value={dateFilter}
                  onChange={(value) => {
                    setDateFilter(value as 'all' | 'week' | 'month' | 'year');
                    setDateRange([null, null]);
                  }}
                  style={{ borderRadius: '8px', width: '100%' }}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <RangePicker
                  style={{ width: '100%', borderRadius: '8px' }}
                  placeholder={['Başlangıç Tarihi', 'Bitiş Tarihi']}
                  value={dateRange}
                  onChange={(dates) => {
                    if (dates) {
                      setDateRange([dates[0], dates[1]]);
                      setDateFilter('all');
                    } else {
                      setDateRange([null, null]);
                    }
                  }}
                />
              </Col>
            </Row>
          </div>

          {/* Aktif Filtreler - Kompakt */}
          {(Object.keys(tableFilteredInfo).length > 0 || tableSearchText || dateFilter !== 'all' || dateRange[0] || dateRange[1] || transactionTypeFilter !== 'all') && (
            <div style={{
              padding: '12px 24px',
              background: '#f9fafb',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <Text style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Aktif Filtreler:</Text>
              {dateFilter !== 'all' && (
                <Tag
                  closable
                  onClose={() => setDateFilter('all')}
                  style={{
                    borderRadius: '6px',
                    fontSize: '11px',
                    padding: '4px 10px',
                    border: '1px solid #d1d5db',
                    background: 'white'
                  }}
                >
                  {dateFilter === 'today' && 'Bugün'}
                  {dateFilter === 'week' && 'Bu Hafta'}
                  {dateFilter === 'month' && 'Bu Ay'}
                </Tag>
              )}
              {(dateRange[0] || dateRange[1]) && (
                <Tag
                  closable
                  onClose={() => setDateRange([null, null])}
                  style={{
                    borderRadius: '6px',
                    fontSize: '11px',
                    padding: '4px 10px',
                    border: '1px solid #d1d5db',
                    background: 'white'
                  }}
                >
                  {dateRange[0]?.format('DD.MM.YYYY')} - {dateRange[1]?.format('DD.MM.YYYY')}
                </Tag>
              )}
              {tableSearchText && (
                <Tag
                  closable
                  onClose={() => setTableSearchText('')}
                  style={{
                    borderRadius: '6px',
                    fontSize: '11px',
                    padding: '4px 10px',
                    border: '1px solid #d1d5db',
                    background: 'white'
                  }}
                >
                  Arama: {tableSearchText}
                </Tag>
              )}
              {transactionTypeFilter !== 'all' && (
                <Tag
                  closable
                  onClose={() => setTransactionTypeFilter('all')}
                  style={{
                    borderRadius: '6px',
                    fontSize: '11px',
                    padding: '4px 10px',
                    border: '1px solid #d1d5db',
                    background: 'white'
                  }}
                >
                  İşlem Tipi: {transactionTypeFilter === 'input' ? 'Giriş' : 'Çıkış'}
                </Tag>
              )}
            </div>
          )}

          {/* Table Content - Modern */}
          <div style={{ padding: isMobile ? '12px' : '16px 24px' }}>
            {filteredTransfers.length > 0 ? (
              <Table
                columns={columns}
                dataSource={filteredTransfers}
                rowKey="id"
                pagination={{
                  pageSize: 20,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => (
                    <span style={{ color: '#6b7280', fontSize: '13px', fontWeight: 500 }}>
                      {range[0]}-{range[1]} / <strong style={{ color: '#1f2937' }}>{total}</strong> işlem
                      {filteredTransfers.length !== unitTransfers.length && (
                        <span style={{ marginLeft: '8px', color: '#9ca3af' }}>
                          (Toplam: {unitTransfers.length})
                        </span>
                      )}
                    </span>
                  ),
                  size: 'small',
                  pageSizeOptions: ['10', '20', '50', '100']
                }}
                scroll={{ x: 1000 }}
                size="middle"
                onChange={(pagination, filters, sorter) => {
                  setTableFilteredInfo(filters as Record<string, string[] | null>);
                }}
                style={{
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}
                rowClassName={(record, index) =>
                  index % 2 === 0 ? 'table-row-even' : 'table-row-odd'
                }
                onRow={(record) => ({
                  style: {
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  },
                  onMouseEnter: (e) => {
                    e.currentTarget.style.background = '#f8fafc';
                  },
                  onMouseLeave: (e) => {
                    e.currentTarget.style.background = '';
                  }
                })}
              />
            ) : (
              <Empty
                description={
                  <span style={{ color: '#6b7280', fontSize: '14px' }}>
                    Henüz işlem kaydı bulunmuyor
                  </span>
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{
                  margin: '40px 0',
                  padding: '20px'
                }}
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setTransferModalOpen(true)}
                  style={{
                    borderRadius: '8px',
                    marginTop: '12px',
                    height: '36px',
                    fontWeight: 500
                  }}
                >
                  İlk İşlemi Oluştur
                </Button>
              </Empty>
            )}
          </div>
        </Card>
      </div>

      {/* Satış, Tedarik, Döküm, Lazer Kesim, Tezgah ve Cila sayfaları için minimalist kartlar - Tüm İşlemler'in altında */}
      {(unitId === 'satis' || unitId === 'tedarik' || unitId === 'dokum' || unitId === 'lazer-kesim' || unitId === 'tezgah' || unitId === 'cila') && (
        <Row gutter={16} style={{ marginTop: 16 }}>
          {/* Toplam Satış/İşlem/Fire */}
          <Col xs={24} sm={isAdmin ? 12 : 24}>
            <div style={{ 
              padding: '16px 20px',
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)'
            }}>
              <Space size={16} align="center" style={{ width: '100%', justifyContent: 'center' }}>
                {hasFire ? (
                  <ThunderboltOutlined style={{ fontSize: '20px', color: '#64748b' }} />
                ) : (
                  <GoldOutlined style={{ fontSize: '20px', color: '#64748b' }} />
                )}
                <div style={{ textAlign: 'center' }}>
                  <Text style={{ 
                    display: 'block', 
                    fontSize: '12px', 
                    color: '#6b7280',
                    marginBottom: '4px'
                  }}>
                    {unitId === 'satis' ? 'Toplam Satış' : hasFire || isProcessingUnit ? (isAdmin ? 'Toplam Fire' : 'Son 7 Günlük Fire') : 'Toplam İşlem'}
                  </Text>
                  <Text strong style={{ 
                    display: 'block', 
                    fontSize: isMobile ? '24px' : '28px', 
                    color: hasFire && ((isAdmin ? (adminTotalFire || 0) : (last7DaysFire || 0)) > 0) ? '#ff4d4f' : (isInputUnit && (totalInput + totalOutput) < 0) ? '#ff4d4f' : '#1f2937',
                    fontWeight: 600
                  }}>
                    {hasFire || isProcessingUnit ? 
                      (isAdmin ? 
                        (adminTotalFire !== null ? adminTotalFire.toFixed(2).replace(/^0+(?=\d)/, '') : '0.00') :
                        (last7DaysFire !== null ? last7DaysFire.toFixed(2).replace(/^0+(?=\d)/, '') : '0.00')
                      ) : 
                      (isInputUnit ? 
                        (totalInput + totalOutput).toFixed(2).replace(/^0+(?=\d)/, '') : 
                        totalInput.toFixed(2).replace(/^0+(?=\d)/, ''))
                    } gr
                  </Text>
                </div>
              </Space>
            </div>
          </Col>
          
          {/* Has Karşılığı - Sadece admin için */}
          {isAdmin && (
            <Col xs={24} sm={12}>
              <div style={{ 
                padding: '16px 20px',
                background: 'white',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)'
              }}>
                <Space size={16} align="center" style={{ width: '100%', justifyContent: 'center' }}>
                  <CrownOutlined style={{ fontSize: '20px', color: '#64748b' }} />
                  <div style={{ textAlign: 'center' }}>
                    <Text style={{ 
                      display: 'block', 
                      fontSize: '12px', 
                      color: '#6b7280',
                      marginBottom: '4px'
                    }}>
                      Has Karşılığı
                    </Text>
                    <Text strong style={{ 
                      display: 'block', 
                      fontSize: isMobile ? '24px' : '28px', 
                      color: '#059669',
                      fontWeight: 600
                    }}>
                      {filteredHasEquivalent.toFixed(2).replace(/^0+(?=\d)/, '')} gr
                    </Text>
                  </div>
                </Space>
              </div>
            </Col>
          )}
        </Row>
      )}

      <TransferModal
        open={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        defaultFromUnit={unitId}
      />
    </div>
  );
});

export default UnitPage;

