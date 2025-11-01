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
  DatePicker
} from 'antd';
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
import { useCinsiSettings, CinsiOption } from '../context/CinsiSettingsContext';
import { UnitType, KaratType, UNIT_NAMES, FIRE_UNITS, OUTPUT_ONLY_UNITS, SEMI_FINISHED_UNITS, PROCESSING_UNITS, INPUT_UNITS, KARAT_HAS_RATIOS } from '../types';
import type { ColumnsType } from 'antd/es/table';
import TransferModal from './TransferModal';
import { unitColors, commonStyles } from '../styles/theme';
import { useBackendStatus } from '../hooks/useBackendStatus';

const { Title, Text } = Typography;

interface UnitPageProps {
  unitId: UnitType;
}

const UnitPage: React.FC<UnitPageProps> = React.memo(({ unitId }) => {
  const { unitSummaries, transfers, deleteTransfer } = useTransfers();
  const { addLog } = useLog();
  const { cinsiOptions } = useCinsiSettings();
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month' | 'year'>('all');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [tableSearchText, setTableSearchText] = useState('');
  const [tableFilteredInfo, setTableFilteredInfo] = useState<Record<string, string[] | null>>({});
  const { isBackendOnline, isChecking } = useBackendStatus();

  const unit = unitSummaries.find(u => u.unitId === unitId);
  const unitName = UNIT_NAMES[unitId];
  const hasFire = FIRE_UNITS.includes(unitId);
  const unitColor = unitColors[unitId];
  const isProcessingUnit = PROCESSING_UNITS.includes(unitId);
  const isInputUnit = INPUT_UNITS.includes(unitId);
  const isOutputOnlyUnit = OUTPUT_ONLY_UNITS.includes(unitId);
  const isSemiFinishedUnit = SEMI_FINISHED_UNITS.includes(unitId);

  // Tarih filtreleme fonksiyonu
  const filterTransfersByDate = (transfers: any[]) => {
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
  };

  // Bu birime ait işlemleri getir
  const unitTransfers = useMemo(() => {
    return transfers
      .filter(t => t.fromUnit === unitId || t.toUnit === unitId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transfers, unitId]);

  // Filtrelenmiş transferler
  const filteredTransfers = useMemo(() => {
    return filterTransfersByDate(unitTransfers);
  }, [unitTransfers, dateFilter, dateRange]);

  // OUTPUT_ONLY_UNITS, FIRE_UNITS, PROCESSING_UNITS, INPUT_UNITS ve SEMI_FINISHED_UNITS için toplam giriş hesapla
  const totalInput = useMemo(() => {
    if (!isOutputOnlyUnit && !hasFire && !isProcessingUnit && !isInputUnit && !isSemiFinishedUnit) return unit?.totalStock || 0;
    
    return filteredTransfers
      .filter(t => t.toUnit === unitId)
      .reduce((sum, t) => {
        const safeAmount = typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0;
        return sum + safeAmount;
      }, 0);
  }, [filteredTransfers, unitId, isOutputOnlyUnit, hasFire, isProcessingUnit, isInputUnit, isSemiFinishedUnit, unit]);

  // OUTPUT_ONLY_UNITS, FIRE_UNITS, PROCESSING_UNITS, INPUT_UNITS ve SEMI_FINISHED_UNITS için toplam çıkış hesapla
  const totalOutput = useMemo(() => {
    if (!isOutputOnlyUnit && !hasFire && !isProcessingUnit && !isInputUnit && !isSemiFinishedUnit) return 0;
    
    return filteredTransfers
      .filter(t => t.fromUnit === unitId)
      .reduce((sum, t) => {
        const safeAmount = typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0;
        return sum + safeAmount;
      }, 0);
  }, [filteredTransfers, unitId, isOutputOnlyUnit, hasFire, isProcessingUnit, isInputUnit, isSemiFinishedUnit]);

  // OUTPUT_ONLY_UNITS, PROCESSING_UNITS, INPUT_UNITS ve SEMI_FINISHED_UNITS için has karşılığı hesapla
  const filteredHasEquivalent = useMemo(() => {
    if (!isOutputOnlyUnit && !isProcessingUnit && !isInputUnit && !isSemiFinishedUnit) return unit?.hasEquivalent || 0;
    
    // Yarı mamül için: girişlerden çıkışları çıkar (mevcut stokun has karşılığı)
    if (isSemiFinishedUnit) {
      // Giriş ve çıkışları karat bazında topla
      const stockByKarat = new Map<string, { input: number; output: number }>();
      
      filteredTransfers.forEach(t => {
        if (t.toUnit === unitId || t.fromUnit === unitId) {
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
        const karatMultiplier = KARAT_HAS_RATIOS[karat as keyof typeof KARAT_HAS_RATIOS] || 0;
        return sum + (Math.max(0, currentStock) * karatMultiplier);
      }, 0);
    }
    
    // Diğer birimler için çıkışlardan hesapla
    return filteredTransfers
      .filter(t => t.fromUnit === unitId)
      .reduce((sum, t) => {
        const safeAmount = typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0;
        const karat: KaratType = t.karat;
        const karatMultiplier = KARAT_HAS_RATIOS[karat] || 0;
        return sum + (safeAmount * karatMultiplier);
      }, 0);
  }, [filteredTransfers, unitId, isOutputOnlyUnit, isProcessingUnit, isInputUnit, isSemiFinishedUnit, unit]);

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
    const icons: { [key: string]: React.ReactNode } = {
      'ana-kasa': <BankOutlined style={{ fontSize: '48px', color }} />,
      'yarimamul': <GoldOutlined style={{ fontSize: '48px', color }} />,
      'lazer-kesim': <ThunderboltOutlined style={{ fontSize: '48px', color }} />,
      'tezgah': <ToolOutlined style={{ fontSize: '48px', color }} />,
      'cila': <CrownOutlined style={{ fontSize: '48px', color }} />,
      'dokum': <GoldOutlined style={{ fontSize: '48px', color }} />,
      'tedarik': <ToolOutlined style={{ fontSize: '48px', color }} />
    };
    return icons[unitId] || <BankOutlined style={{ fontSize: '48px', color }} />;
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
  }, []);

  const handleExport = useCallback(() => {
    // Filtrelenmiş verileri al (tableFilteredInfo ve tableSearchText'e göre)
    let dataToExport = (isOutputOnlyUnit || isInputUnit || unitId === 'satis' || isSemiFinishedUnit) ? filteredTransfers : unitTransfers;
    
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
    
    // Türkçe karakter desteği için Unicode encoding ayarları
    doc.setLanguage('tr-TR');
    
    // Başlık
    doc.setFontSize(18);
    doc.setTextColor(31, 41, 55);
    const title = `${unitName} - Tüm İşlemler`;
    doc.text(title, 14, 15);
    
    // Tarih bilgisi
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const exportDate = new Date().toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const dateText = `Oluşturulma Tarihi: ${exportDate}`;
    doc.text(dateText, 14, 22);
    
    // Filtre bilgisi
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
      doc.text(filterInfo, 14, 28);
    }
    const totalText = `Toplam İşlem: ${dataToExport.length}`;
    doc.text(totalText, 14, 34);

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
    autoTable(doc, {
      head: [['Tarih', 'İşlem Tipi', 'Kaynak Birim', 'Hedef Birim', 'Ayar', 'Miktar', 'Cinsi', 'Not']],
      body: tableData,
      startY: filterInfo ? 40 : 36,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        cellWidth: 'wrap',
        font: 'helvetica',
        fontStyle: 'normal'
      },
      headStyles: {
        fillColor: [31, 41, 55],
        textColor: 255,
        fontStyle: 'bold',
        font: 'helvetica'
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 25 },
        2: { cellWidth: 35 },
        3: { cellWidth: 35 },
        4: { cellWidth: 30 },
        5: { cellWidth: 25 },
        6: { cellWidth: 30 },
        7: { cellWidth: 40 }
      },
      margin: { left: 14, right: 14 },
      didParseCell: function(data: any) {
        // Türkçe karakterleri doğru encode et - Unicode karakterleri koru
        if (data.cell && typeof data.cell.text !== 'undefined') {
          const convertText = (text: any): string => {
            if (typeof text === 'string') {
              // Unicode karakterleri olduğu gibi koru
              return text;
            }
            return String(text || '');
          };
          
          if (Array.isArray(data.cell.text)) {
            data.cell.text = data.cell.text.map(convertText);
          } else {
            data.cell.text = convertText(data.cell.text);
          }
        }
      },
      // Unicode desteği için encoding ayarları
      useUnicode: true
    });

    // PDF'i indir
    const fileName = `${unitName}_işlemler_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    message.success(`${dataToExport.length} işlem PDF olarak dışa aktarıldı`);
  }, [unitTransfers, filteredTransfers, isOutputOnlyUnit, isInputUnit, unitId, isSemiFinishedUnit, unitName, tableSearchText, tableFilteredInfo, dateRange, dateFilter, cinsiOptions]);

  const columns: ColumnsType<any> = [
    {
      title: 'Tarih',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => new Date(date).toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      width: 160,
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
        const handleDateChange = (dates: any) => {
          if (dates && dates.length > 0) {
            if (dates.length === 1) {
              setSelectedKeys([dates[0].format('DD.MM.YYYY')]);
            } else if (dates.length === 2) {
              setSelectedKeys([dates[0].format('DD.MM.YYYY'), dates[1].format('DD.MM.YYYY')]);
            }
          } else {
            setSelectedKeys([]);
          }
        };

        const selectedDates = selectedKeys && selectedKeys.length > 0 
          ? selectedKeys.map((key: string) => dayjs(key, 'DD.MM.YYYY'))
          : null;

        return (
          <div style={{ padding: 8 }}>
            <DatePicker
              placeholder="Tarih seç"
              value={selectedDates && selectedDates[0] ? selectedDates[0] : null}
              onChange={(date) => {
                if (date) {
                  setSelectedKeys([date.format('DD.MM.YYYY')]);
                } else {
                  setSelectedKeys([]);
                }
              }}
              format="DD.MM.YYYY"
              style={{ marginBottom: 8, width: '100%' }}
              size="small"
            />
            <DatePicker.RangePicker
              placeholder={['Başlangıç', 'Bitiş']}
              value={selectedDates && selectedDates.length === 2 
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
              style={{ marginBottom: 8, width: '100%' }}
              size="small"
            />
            <Space>
              <Button
                type="primary"
                onClick={() => confirm()}
                size="small"
                style={{ width: 90 }}
              >
                Ara
              </Button>
              <Button 
                onClick={() => {
                  if (clearFilters) {
                    clearFilters();
                    setSelectedKeys([]);
                  }
                }} 
                size="small" 
                style={{ width: 90 }}
              >
                Temizle
              </Button>
            </Space>
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
          <Tag color={isIncoming ? 'green' : 'red'}>
            {isIncoming ? 'Giriş' : 'Çıkış'}
          </Tag>
        );
      },
      width: 100,
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
      width: 100,
      render: (karat: string) => (
        <Tag color="blue">
          {karat === '24K' ? 'Has Altın' : karat.replace('K', ' Ayar')}
        </Tag>
      ),
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
      title: 'Miktar',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount: number, record: any) => {
        const isIncoming = record.toUnit === unitId;
        const safeAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
        return (
          <Text strong style={{ color: isIncoming ? '#52c41a' : '#ff4d4f' }}>
            {isIncoming ? '+' : '-'}{safeAmount.toFixed(2)} gr
          </Text>
        );
      }
    },
    {
      title: 'Not',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (notes: string) => (
        <Text type="secondary">{notes || '-'}</Text>
      )
    },
    {
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
    }
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
    
    // Filtrelenmiş transferleri kullan (dateFilter varsa)
    const transfersToUse = (isOutputOnlyUnit || isInputUnit || isSemiFinishedUnit) ? filteredTransfers : transfers;
    
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
  }, [unit, transfers, filteredTransfers, unitId, hasFire, isProcessingUnit, isInputUnit, isSemiFinishedUnit, isOutputOnlyUnit, cinsiOptions]);

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
      {/* Professional Header */}
      <Card 
        style={{ 
          marginBottom: 24, 
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}
        styles={{ body: { padding: 32 } }}
      >
        <Row align="middle" justify="space-between">
          <Col>
            <Space size={20} align="center">
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                {getUnitIcon('#64748b')}
              </div>
              <div>
                <Space direction="vertical" size={4} style={{ alignItems: 'flex-start' }}>
                  <Space size={10} align="center">
                    <Title level={2} style={{ margin: 0, color: '#1f2937', fontSize: '28px', fontWeight: '700' }}>
                      {unitName}
                    </Title>
                    {!isChecking && (
                      <div style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: isBackendOnline ? '#22c55e' : '#ef4444',
                        boxShadow: isBackendOnline ? '0 0 8px rgba(34,197,94,0.6)' : '0 0 8px rgba(239,68,68,0.6)',
                        border: `2px solid ${isBackendOnline ? '#dcfce7' : '#fee2e2'}`
                      }} />
                    )}
                  </Space>
                  <Text style={{ color: '#6b7280', fontSize: '16px', fontWeight: '400' }}>
                    Birim Detay Sayfası
                  </Text>
                </Space>
              </div>
            </Space>
          </Col>
          <Col>
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => setTransferModalOpen(true)}
              style={{
                height: '44px',
                padding: '0 24px',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '12px'
              }}
            >
              Yeni Transfer
            </Button>
          </Col>
        </Row>
        
        {/* Filtreler - Satış, output-only, input ve yarı mamül birimler için */}
        {(isOutputOnlyUnit || unitId === 'satis' || isInputUnit || isSemiFinishedUnit) && (
          <div style={{ 
            marginTop: '24px',
            paddingTop: '24px',
            borderTop: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <Space size={8}>
                <FilterOutlined style={{ fontSize: '16px', color: '#64748b' }} />
                <Text style={{ 
                  fontSize: '15px', 
                  fontWeight: '600',
                  color: '#1f2937'
                }}>
                  Zaman Filtresi
                </Text>
              </Space>
              <Space size={12}>
                <Tag 
                  color="blue"
                  style={{
                    borderRadius: '12px',
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    margin: 0,
                    border: 'none'
                  }}
                >
                  <CalendarOutlined style={{ marginRight: '4px' }} />
                  {filteredTransfers.length} işlem
                </Tag>
              </Space>
            </div>
            <Segmented
              value={dateFilter}
              onChange={(value) => {
                setDateFilter(value as typeof dateFilter);
                // Preset filtre seçildiğinde tarih aralığını temizle
                if (value !== 'all') {
                  setDateRange([null, null]);
                }
              }}
              options={[
                {
                  label: (
                    <span style={{ 
                      padding: '0 8px',
                      fontWeight: 500,
                      fontSize: '14px'
                    }}>
                      Tümü
                    </span>
                  ),
                  value: 'all'
                },
                {
                  label: (
                    <span style={{ 
                      padding: '0 8px',
                      fontWeight: 500,
                      fontSize: '14px'
                    }}>
                      Son Hafta
                    </span>
                  ),
                  value: 'week'
                },
                {
                  label: (
                    <span style={{ 
                      padding: '0 8px',
                      fontWeight: 500,
                      fontSize: '14px'
                    }}>
                      Son Ay
                    </span>
                  ),
                  value: 'month'
                },
                {
                  label: (
                    <span style={{ 
                      padding: '0 8px',
                      fontWeight: 500,
                      fontSize: '14px'
                    }}>
                      Son Yıl
                    </span>
                  ),
                  value: 'year'
                }
              ]}
              size="large"
              className="time-filter-segmented"
              style={{
                width: '100%',
                background: '#f8fafc',
                padding: '4px',
                borderRadius: '12px',
                border: '1px solid #e5e7eb'
              }}
              block
            />
          </div>
        )}
        
        {/* Tarih Aralığı Seçici */}
        {(isOutputOnlyUnit || isInputUnit || unitId === 'satis' || isSemiFinishedUnit) && (
          <div style={{ marginTop: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8, fontSize: '14px' }}>
              Tarih Aralığı
            </Text>
            <DatePicker.RangePicker
              value={dateRange}
              onChange={(dates) => {
                setDateRange(dates as [Dayjs | null, Dayjs | null]);
                // Tarih aralığı seçildiğinde preset filtreyi sıfırla
                if (dates && dates[0] && dates[1]) {
                  setDateFilter('all');
                }
              }}
              format="DD.MM.YYYY"
              placeholder={['Başlangıç Tarihi', 'Bitiş Tarihi']}
              style={{ width: '100%' }}
              size="large"
              allowClear
            />
          </div>
        )}
      </Card>

      {/* İstatistikler - Tek Kart */}
      <Card 
        className="card-hover"
        style={{ 
          borderRadius: '20px',
          border: '1px solid #e5e7eb',
          background: 'white',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          marginBottom: 20
        }}
      >
        <Row gutter={16}>
          {/* Fire birimleri için sadece Toplam Fire göster */}
          {hasFire || isProcessingUnit ? (
            <Col xs={24} style={{ textAlign: 'center' }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {(() => {
                  const totalFire = Math.max(0, totalInput - totalOutput);
                  const formattedFire = totalFire.toFixed(2).replace(/^0+(?=\d)/, '');
                  return (
                    <Statistic
                      title={<Text strong style={{ fontSize: '13px', opacity: 0.8 }}>Toplam Fire</Text>}
                      value={formattedFire}
                      suffix="gr"
                      valueStyle={{ 
                        color: totalFire > 1 ? '#ff4d4f' : totalFire > 0 ? '#faad14' : '#52c41a',
                        fontSize: '32px',
                        fontWeight: 700
                      }}
                      prefix={<ThunderboltOutlined style={{ fontSize: '24px', color: '#64748b' }} />}
                    />
                  );
                })()}
              </Space>
            </Col>
          ) : (
            <>
              {/* Sol Kısım - Toplam Satış/Stok/İşlem */}
              <Col xs={24} sm={12}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  {(() => {
                    const calculatedValue = unitId === 'satis' ? totalInput : 
                                           isOutputOnlyUnit ? totalInput : 
                                           isInputUnit ? totalInput + totalOutput : (unit?.totalStock || 0);
                    const formattedValue = calculatedValue.toFixed(2).replace(/^0+(?=\d)/, '');
                    return (
                      <Statistic
                        title={<Text strong style={{ fontSize: '13px', opacity: 0.8 }}>
                          {unitId === 'satis' ? 'Toplam Satış' : 
                           isOutputOnlyUnit ? 'Toplam Giriş' : 
                           isInputUnit ? 'Toplam İşlem' : 'Toplam Stok'}
                        </Text>}
                        value={formattedValue}
                        suffix="gr"
                        valueStyle={{ 
                          color: '#1f2937', 
                          fontSize: '28px',
                          fontWeight: 700
                        }}
                        prefix={<GoldOutlined style={{ fontSize: '20px', color: '#64748b' }} />}
                      />
                    );
                  })()}
                </Space>
              </Col>
              
              {/* Sağ Kısım - Has Karşılığı */}
              <Col xs={24} sm={12}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  {(() => {
                    // Diğer birimler için Has Karşılığı
                    const hasValue = isOutputOnlyUnit ? filteredHasEquivalent : 
                                   isSemiFinishedUnit ? filteredHasEquivalent : (unit?.hasEquivalent || 0);
                    const formattedHas = hasValue.toFixed(2).replace(/^0+(?=\d)/, '');
                    return (
                      <Statistic
                        title={<Text strong style={{ fontSize: '13px', opacity: 0.8 }}>Has Karşılığı</Text>}
                        value={formattedHas}
                        suffix="gr"
                        valueStyle={{ 
                          color: '#059669',
                          fontSize: '28px',
                          fontWeight: 700
                        }}
                        prefix={<CrownOutlined style={{ fontSize: '20px', color: '#64748b' }} />}
                      />
                    );
                  })()}
                </Space>
              </Col>
            </>
          )}
        </Row>
      </Card>

      {/* Cinsi Bazlı Stok Dağılımı - Sadece stok tutan birimler için (fire birimleri hariç) */}
      {((!isProcessingUnit && !isOutputOnlyUnit && !isInputUnit && !hasFire) || isSemiFinishedUnit) && (
        <Card 
          title={
            <Space size={12}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: unitColor.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <GoldOutlined style={{ color: '#ffffff', fontSize: '18px' }} />
              </div>
              <Text strong style={{ fontSize: '16px' }}>Cinsi Bazlı Stok Dağılımı</Text>
            </Space>
          }
          style={{ 
            marginBottom: 20, 
            borderRadius: commonStyles.borderRadius,
            boxShadow: commonStyles.cardShadow 
          }}
        >
          {cinsiData.length > 0 ? (
            <Table
              columns={cinsiColumns}
              dataSource={cinsiData}
              pagination={false}
              size="middle"
              rowKey="cinsi"
              scroll={{ x: 'max-content' }}
            />
          ) : (
            <Empty description="Bu birimde henüz stok yok" />
          )}
        </Card>
      )}

      {/* İşlem Geçmişi */}
      <Card
        title={
          <Row justify="space-between" align="middle">
            <Col>
              <Space size={12} align="center">
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: unitColor.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <HistoryOutlined style={{ color: '#ffffff', fontSize: '18px' }} />
                </div>
                <Space size={8} align="center">
                  <Text strong style={{ fontSize: '16px' }}>Tüm İşlemler</Text>
                  <Tag 
                    color={unitColor.primary} 
                    style={{ 
                      borderRadius: '10px',
                      fontSize: '12px',
                      padding: '2px 8px',
                      margin: 0
                    }}
                  >
                    {(isOutputOnlyUnit || isInputUnit || unitId === 'satis' || isSemiFinishedUnit) ? filteredTransfers.length : unitTransfers.length}
                  </Tag>
                </Space>
              </Space>
            </Col>
            <Col>
              <Space size={8}>
                <Button
                  icon={<FilterOutlined />}
                  onClick={handleResetFilters}
                  size="small"
                  disabled={Object.keys(tableFilteredInfo).length === 0 && !tableSearchText && dateFilter === 'all' && !dateRange[0] && !dateRange[1]}
                >
                  Filtreleri Temizle
                </Button>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={handleExport}
                  size="small"
                >
                  Dışa Aktar
                </Button>
              </Space>
            </Col>
          </Row>
        }
        style={{ 
          borderRadius: commonStyles.borderRadius,
          boxShadow: commonStyles.cardShadow
        }}
      >
        {unitTransfers.length > 0 ? (
          <Table
            columns={columns}
            dataSource={(isOutputOnlyUnit || isInputUnit || unitId === 'satis' || isSemiFinishedUnit) ? filteredTransfers : unitTransfers}
            rowKey="id"
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `Toplam ${total} işlem`
            }}
            scroll={{ x: 1000 }}
            onChange={(pagination, filters, sorter) => {
              setTableFilteredInfo(filters as Record<string, string[] | null>);
            }}
          />
        ) : (
          <Empty description="Henüz işlem yok" />
        )}
      </Card>

      <TransferModal
        open={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        defaultFromUnit={unitId}
      />
    </div>
  );
});

export default UnitPage;

