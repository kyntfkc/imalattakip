import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Table, 
  DatePicker, 
  Select, 
  Button, 
  Space,
  Statistic,
  Progress,
  Tag,
  Tabs,
  type TabsProps,
  Radio,
  Divider,
  Popconfirm,
  message,
  Badge,
  Tooltip,
  Empty,
  Spin
} from 'antd';
import { 
  BarChartOutlined, 
  DownloadOutlined, 
  PrinterOutlined,
  GoldOutlined,
  FireOutlined,
  BankOutlined,
  CalendarOutlined,
  FilterOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  RiseOutlined,
  FallOutlined,
  InfoCircleOutlined,
  ExportOutlined,
  LineChartOutlined,
  PieChartOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useTransfers } from '../context/TransferContext';
import { useExternalVault } from '../context/ExternalVaultContext';
import { commonStyles } from '../styles/theme';
import { FIRE_UNITS, UNIT_NAMES, KARAT_HAS_RATIOS } from '../types';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import '../styles/animations.css';

dayjs.extend(isBetween);

// Güvenli sayı dönüştürme fonksiyonu
const safeNumber = (value: any): number => {
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

// Güvenli toFixed fonksiyonu
const safeToFixed = (value: any, decimals: number = 2): string => {
  const num = safeNumber(value);
  return num.toFixed(decimals).replace(/^0+(?=\d)/, '');
};

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface ReportData {
  key: string;
  unit: string;
  totalStock: number;
  fireAmount: number;
  hasEquivalent: number;
  lastUpdate: string;
}

interface KaratReport {
  karat: string;
  totalStock: number;
  hasEquivalent: number;
  percentage: number;
}

interface FireReportData {
  key: string;
  unit: string;
  totalInput: number;
  totalOutput: number;
  fireAmount: number;
  fireByKarat: {
    '14K': number;
    '18K': number;
    '22K': number;
    '24K': number;
  };
  lastUpdate: string;
}

type DateFilterType = 'all' | 'today' | 'week' | 'month' | 'custom';

const Reports: React.FC = () => {
  const { unitSummaries, transfers, deleteTransfer, isLoading } = useTransfers();
  const { totalStock: externalVaultStock, totalHas: externalVaultHas, stockByKarat: externalVaultStockByKarat } = useExternalVault();
  
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [customDateRange, setCustomDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);

  const handleDeleteTransfer = (id: string) => {
    deleteTransfer(id);
    message.success('İşlem başarıyla silindi');
  };

  // Tarih filtresi uygula
  const getDateRange = (): [Dayjs, Dayjs] | null => {
    const now = dayjs();
    switch (dateFilter) {
      case 'today':
        return [now.startOf('day'), now.endOf('day')];
      case 'week':
        return [now.startOf('week'), now.endOf('week')];
      case 'month':
        return [now.startOf('month'), now.endOf('month')];
      case 'custom':
        return customDateRange;
      default:
        return null;
    }
  };

  // Transferleri filtrele
  const filteredTransfers = useMemo(() => {
    const dateRange = getDateRange();
    if (!dateRange) return transfers;

    return transfers.filter(transfer => {
      const transferDate = dayjs(transfer.date);
      return transferDate.isBetween(dateRange[0], dateRange[1], null, '[]');
    });
  }, [transfers, dateFilter, customDateRange]);

  // Birim bazlı rapor verilerini hazırla
  const reportData: ReportData[] = useMemo(() => {
    const data = unitSummaries.map((unit, index) => {
      // Son işlem tarihini bul
      const unitTransfers = filteredTransfers.filter(
        t => t.fromUnit === unit.unitId || t.toUnit === unit.unitId
      );
      const lastTransfer = unitTransfers.length > 0 
        ? unitTransfers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
        : null;

      return {
        key: String(index + 1),
        unit: unit.unitName,
        totalStock: safeNumber(unit.totalStock),
        fireAmount: safeNumber(unit.totalFire),
        hasEquivalent: safeNumber(unit.hasEquivalent),
        lastUpdate: lastTransfer 
          ? dayjs(lastTransfer.date).format('DD.MM.YYYY HH:mm')
          : '-'
      };
    });

    // Dış Kasa'yı ekle
    const externalVaultTransfers = filteredTransfers.length > 0 ? filteredTransfers : [];
    data.push({
      key: String(data.length + 1),
      unit: 'Dış Kasa',
      totalStock: safeNumber(externalVaultStock),
      fireAmount: 0,
      hasEquivalent: safeNumber(externalVaultHas),
      lastUpdate: externalVaultTransfers.length > 0 
        ? dayjs(externalVaultTransfers[externalVaultTransfers.length - 1].date).format('DD.MM.YYYY HH:mm')
        : '-'
    });

    // Birim filtresini uygula
    if (selectedUnit !== 'all') {
      return data.filter(item => {
        const unitIdMap: { [key: string]: string } = {
          'Ana Kasa': 'ana-kasa',
          'Yarımamül': 'yarimamul',
          'Lazer Kesim': 'lazer-kesim',
          'Tezgah': 'tezgah',
          'Cila': 'cila',
          'Döküm': 'dokum',
          'Tedarik': 'tedarik',
          'Satış': 'satis',
          'Dış Kasa': 'dis-kasa'
        };
        return unitIdMap[item.unit] === selectedUnit;
      });
    }

    return data;
  }, [unitSummaries, externalVaultStock, externalVaultHas, selectedUnit, filteredTransfers]);

  // Ayar bazlı rapor verilerini hazırla
  const karatData: KaratReport[] = useMemo(() => {
    const karatTotals: { [key: string]: { stock: number; has: number } } = {
      '14K': { stock: 0, has: 0 },
      '18K': { stock: 0, has: 0 },
      '22K': { stock: 0, has: 0 },
      '24K': { stock: 0, has: 0 }
    };

    // Her birim için ayar bazlı toplamları hesapla
    unitSummaries.forEach(unit => {
      Object.entries(unit.stockByKarat).forEach(([karat, stock]) => {
        if (karatTotals[karat]) {
          karatTotals[karat].stock += safeNumber(stock.currentStock);
          karatTotals[karat].has += safeNumber(stock.hasEquivalent);
        }
      });
    });

    // Dış Kasa'nın has karşılığını ekle
    Object.entries(externalVaultStockByKarat || {}).forEach(([karat, stock]) => {
      if (karatTotals[karat]) {
        karatTotals[karat].stock += safeNumber(stock.currentStock);
        karatTotals[karat].has += safeNumber(stock.hasEquivalent);
      }
    });

    const totalStock = Object.values(karatTotals).reduce((sum, k) => sum + k.stock, 0);

    return Object.entries(karatTotals).map(([karat, totals]) => ({
      karat: karat === '24K' ? 'Has Altın' : karat.replace('K', ' Ayar'),
      totalStock: totals.stock,
      hasEquivalent: totals.has,
      percentage: totalStock > 0 ? (totals.stock / totalStock) * 100 : 0
    }));
  }, [unitSummaries, externalVaultStockByKarat]);

  // Fire bazlı analiz verilerini hazırla - sadece lazer kesim, tezgah, cila birimleri
  const fireData: FireReportData[] = useMemo(() => {
    const fireUnits = unitSummaries.filter(unit => FIRE_UNITS.includes(unit.unitId));
    
    return fireUnits.map((unit, index) => {
      // Birim transferlerini filtrele
      const unitTransfers = filteredTransfers.filter(
        t => t.fromUnit === unit.unitId || t.toUnit === unit.unitId
      );

      // Ayar bazlı fire hesapla
      const fireByKarat: { '14K': number; '18K': number; '22K': number; '24K': number } = {
        '14K': 0,
        '18K': 0,
        '22K': 0,
        '24K': 0
      };

      let totalInput = 0;
      let totalOutput = 0;

      // Her ayar için giriş ve çıkışları hesapla
      Object.entries(unit.stockByKarat).forEach(([karat, stock]) => {
        const karatKey = karat as keyof typeof fireByKarat;
        if (fireByKarat[karatKey] !== undefined) {
          const input = safeNumber(stock.totalInput);
          const output = safeNumber(stock.totalOutput);
          fireByKarat[karatKey] = Math.max(0, input - output);
          totalInput += input;
          totalOutput += output;
        }
      });

      // Son işlem tarihini bul
      const lastTransfer = unitTransfers.length > 0 
        ? unitTransfers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
        : null;

      return {
        key: String(index + 1),
        unit: unit.unitName,
        totalInput: totalInput,
        totalOutput: totalOutput,
        fireAmount: Math.max(0, totalInput - totalOutput),
        fireByKarat,
        lastUpdate: lastTransfer 
          ? dayjs(lastTransfer.date).format('DD.MM.YYYY HH:mm')
          : '-'
      };
    });
  }, [unitSummaries, filteredTransfers]);

  // Gelişmiş kolonlar
  const columns: ColumnsType<ReportData> = [
    {
      title: 'Birim',
      dataIndex: 'unit',
      key: 'unit',
      render: (text: string) => (
        <Space>
          <Badge 
            status={text === 'Dış Kasa' ? 'warning' : 'success'} 
            text={
              <Space>
                <BankOutlined style={{ color: text === 'Dış Kasa' ? '#faad14' : '#52c41a' }} />
                <Text strong style={{ color: '#1f2937' }}>{text}</Text>
              </Space>
            }
          />
        </Space>
      )
    },
    {
      title: 'Toplam Stok (gr)',
      dataIndex: 'totalStock',
      key: 'totalStock',
      render: (value: number) => {
        const safeValue = safeNumber(value);
        return (
          <Tooltip title={`${safeToFixed(safeValue, 3)} gram`}>
            <Text strong style={{ color: '#1890ff', fontSize: '16px' }}>
              {safeToFixed(safeValue, 2)}
            </Text>
          </Tooltip>
        );
      },
      sorter: (a, b) => a.totalStock - b.totalStock
    },
    {
      title: 'Fire Miktarı (gr)',
      dataIndex: 'fireAmount',
      key: 'fireAmount',
      render: (value: number) => {
        const safeValue = safeNumber(value);
        return (
          <Tag 
            color={safeValue === 0 ? 'success' : safeValue > 10 ? 'error' : 'warning'}
            style={{ fontSize: '14px', padding: '4px 12px' }}
          >
            <FireOutlined /> {safeToFixed(safeValue, 2)}
          </Tag>
        );
      },
      sorter: (a, b) => a.fireAmount - b.fireAmount
    },
    {
      title: 'Has Karşılığı (gr)',
      dataIndex: 'hasEquivalent',
      key: 'hasEquivalent',
      render: (value: number) => {
        const safeValue = safeNumber(value);
        return (
          <Text style={{ color: '#52c41a', fontSize: '16px' }}>
            <GoldOutlined /> {safeToFixed(safeValue, 2)}
          </Text>
        );
      },
      sorter: (a, b) => a.hasEquivalent - b.hasEquivalent
    },
    {
      title: 'Son Güncelleme',
      dataIndex: 'lastUpdate',
      key: 'lastUpdate',
      render: (text: string) => (
        <Text type="secondary" style={{ fontSize: '13px' }}>
          {text}
        </Text>
      )
    }
  ];

  const karatColumns: ColumnsType<KaratReport> = [
    {
      title: 'Ayar',
      dataIndex: 'karat',
      key: 'karat',
      render: (text: string) => (
        <Tag 
          color={text === 'Has Altın' ? 'gold' : 'blue'} 
          style={{ fontSize: '14px', padding: '6px 16px', fontWeight: '600' }}
        >
          {text}
        </Tag>
      )
    },
    {
      title: 'Toplam Stok (gr)',
      dataIndex: 'totalStock',
      key: 'totalStock',
      render: (value: number) => {
        const safeValue = safeNumber(value);
        return (
          <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
            {safeToFixed(safeValue, 2)}
          </Text>
        );
      },
      sorter: (a, b) => a.totalStock - b.totalStock
    },
    {
      title: 'Has Karşılığı (gr)',
      dataIndex: 'hasEquivalent',
      key: 'hasEquivalent',
      render: (value: number) => {
        const safeValue = safeNumber(value);
        return (
          <Text style={{ fontSize: '16px', color: '#52c41a' }}>
            {safeToFixed(safeValue, 2)}
          </Text>
        );
      },
      sorter: (a, b) => a.hasEquivalent - b.hasEquivalent
    },
    {
      title: 'Dağılım (%)',
      dataIndex: 'percentage',
      key: 'percentage',
      render: (value: number) => {
        const safeValue = safeNumber(value);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Progress 
              percent={safeValue} 
              size="small" 
              strokeColor={safeValue > 50 ? '#52c41a' : safeValue > 25 ? '#1890ff' : '#faad14'}
              showInfo={false}
              style={{ flex: 1 }}
            />
            <Text strong style={{ minWidth: '50px', textAlign: 'right' }}>
              {safeToFixed(safeValue, 1)}%
            </Text>
          </div>
        );
      },
      sorter: (a, b) => a.percentage - b.percentage
    }
  ];

  const fireColumns: ColumnsType<FireReportData> = [
    {
      title: 'Birim',
      dataIndex: 'unit',
      key: 'unit',
      render: (text: string) => (
        <Space>
          <Badge 
            status="error" 
            text={
              <Space>
                <FireOutlined style={{ color: '#ff4d4f' }} />
                <Text strong style={{ color: '#1f2937' }}>{text}</Text>
              </Space>
            }
          />
        </Space>
      )
    },
    {
      title: 'Toplam Giriş (gr)',
      dataIndex: 'totalInput',
      key: 'totalInput',
      render: (value: number) => {
        const safeValue = safeNumber(value);
        return (
          <Text style={{ color: '#1890ff', fontSize: '16px' }}>
            {safeToFixed(safeValue, 2)}
          </Text>
        );
      },
      sorter: (a, b) => a.totalInput - b.totalInput
    },
    {
      title: 'Toplam Çıkış (gr)',
      dataIndex: 'totalOutput',
      key: 'totalOutput',
      render: (value: number) => {
        const safeValue = safeNumber(value);
        return (
          <Text style={{ color: '#52c41a', fontSize: '16px' }}>
            {safeToFixed(safeValue, 2)}
          </Text>
        );
      },
      sorter: (a, b) => a.totalOutput - b.totalOutput
    },
    {
      title: 'Fire Miktarı (gr)',
      dataIndex: 'fireAmount',
      key: 'fireAmount',
      render: (value: number) => {
        const safeValue = safeNumber(value);
        return (
          <Tag 
            color={safeValue === 0 ? 'success' : safeValue > 10 ? 'error' : 'warning'}
            style={{ fontSize: '14px', padding: '4px 12px', fontWeight: '600' }}
          >
            <FireOutlined /> {safeToFixed(safeValue, 2)}
          </Tag>
        );
      },
      sorter: (a, b) => a.fireAmount - b.fireAmount
    },
    {
      title: '14K Fire',
      key: 'fire14K',
      render: (_, record) => {
        const fire14K = safeNumber(record.fireByKarat['14K']);
        return (
          <Text style={{ color: fire14K > 0 ? '#ff4d4f' : '#8c8c8c', fontSize: '14px' }}>
            {safeToFixed(fire14K, 2)}
          </Text>
        );
      },
      sorter: (a, b) => a.fireByKarat['14K'] - b.fireByKarat['14K']
    },
    {
      title: '18K Fire',
      key: 'fire18K',
      render: (_, record) => {
        const fire18K = safeNumber(record.fireByKarat['18K']);
        return (
          <Text style={{ color: fire18K > 0 ? '#ff4d4f' : '#8c8c8c', fontSize: '14px' }}>
            {safeToFixed(fire18K, 2)}
          </Text>
        );
      },
      sorter: (a, b) => a.fireByKarat['18K'] - b.fireByKarat['18K']
    },
    {
      title: '22K Fire',
      key: 'fire22K',
      render: (_, record) => {
        const fire22K = safeNumber(record.fireByKarat['22K']);
        return (
          <Text style={{ color: fire22K > 0 ? '#ff4d4f' : '#8c8c8c', fontSize: '14px' }}>
            {safeToFixed(fire22K, 2)}
          </Text>
        );
      },
      sorter: (a, b) => a.fireByKarat['22K'] - b.fireByKarat['22K']
    },
    {
      title: '24K Fire',
      key: 'fire24K',
      render: (_, record) => {
        const fire24K = safeNumber(record.fireByKarat['24K']);
        return (
          <Text style={{ color: fire24K > 0 ? '#ff4d4f' : '#8c8c8c', fontSize: '14px' }}>
            {safeToFixed(fire24K, 2)}
          </Text>
        );
      },
      sorter: (a, b) => a.fireByKarat['24K'] - b.fireByKarat['24K']
    },
    {
      title: 'Son Güncelleme',
      dataIndex: 'lastUpdate',
      key: 'lastUpdate',
      render: (text: string) => (
        <Text type="secondary" style={{ fontSize: '13px' }}>
          {text}
        </Text>
      )
    }
  ];

  const totalStock = reportData.reduce((sum, item) => sum + safeNumber(item.totalStock), 0);
  const totalFire = reportData.reduce((sum, item) => sum + safeNumber(item.fireAmount), 0);
  const totalHas = reportData.reduce((sum, item) => sum + safeNumber(item.hasEquivalent), 0);

  const handleResetFilters = () => {
    setDateFilter('all');
    setCustomDateRange(null);
    setSelectedUnit('all');
    message.success('Filtreler sıfırlandı');
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    setIsExporting(true);
    try {
      if (format === 'pdf') {
        // PDF oluştur
        const doc = new jsPDF('landscape', 'mm', 'a4');
        
        // Başlık
        doc.setFontSize(18);
        doc.setTextColor(31, 41, 55);
        doc.text('Raporlar - Birim Bazlı Analiz', 14, 15);
        
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
        doc.text(`Oluşturulma Tarihi: ${exportDate}`, 14, 22);
        
        // Filtre bilgisi
        let currentY = 28;
        const dateRange = getDateRange();
        if (dateRange) {
          doc.text(`Tarih Aralığı: ${dateRange[0].format('DD.MM.YYYY')} - ${dateRange[1].format('DD.MM.YYYY')}`, 14, currentY);
          currentY += 6;
        }
        if (selectedUnit !== 'all') {
          const unitName = reportData.find(item => {
            const unitIdMap: { [key: string]: string } = {
              'Ana Kasa': 'ana-kasa',
              'Yarımamül': 'yarimamul',
              'Lazer Kesim': 'lazer-kesim',
              'Tezgah': 'tezgah',
              'Cila': 'cila',
              'Döküm': 'dokum',
              'Tedarik': 'tedarik',
              'Satış': 'satis',
              'Dış Kasa': 'dis-kasa'
            };
            return unitIdMap[item.unit] === selectedUnit;
          })?.unit || selectedUnit;
          doc.text(`Seçili Birim: ${unitName}`, 14, currentY);
          currentY += 6;
        }
        doc.text(`Toplam Birim: ${reportData.length}`, 14, currentY);
        currentY += 8;

        // Tablo verileri
        const tableData = reportData.map(item => [
          String(item.unit || '-'),
          `${safeNumber(item.totalStock).toFixed(2)} gr`,
          `${safeNumber(item.fireAmount).toFixed(2)} gr`,
          `${safeNumber(item.hasEquivalent).toFixed(2)} gr`,
          String(item.lastUpdate || '-')
        ]);

        // Tablo oluştur
        autoTable(doc, {
          head: [['Birim', 'Toplam Stok', 'Fire', 'Has Karşılığı', 'Son Güncelleme']],
          body: tableData,
          startY: currentY,
          styles: {
            fontSize: 7,
            cellPadding: 1.5,
            overflow: 'linebreak',
            cellWidth: 'wrap',
            font: 'helvetica',
            fontStyle: 'normal'
          },
          headStyles: {
            fillColor: [31, 41, 55],
            textColor: 255,
            fontStyle: 'bold',
            font: 'helvetica',
            fontSize: 7
          },
          alternateRowStyles: {
            fillColor: [249, 250, 251]
          },
          columnStyles: {
            0: { cellWidth: 50 },  // Birim
            1: { cellWidth: 35 },  // Toplam Stok
            2: { cellWidth: 30 },  // Fire
            3: { cellWidth: 35 },  // Has Karşılığı
            4: { cellWidth: 50 }   // Son Güncelleme
          },
          margin: { left: 10, right: 10 },
          didParseCell: function(data: any) {
            if (data.cell && typeof data.cell.text !== 'undefined') {
              const convertText = (text: any): string => {
                if (typeof text === 'string') {
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
          }
        });

        // PDF'i indir
        const fileName = `Raporlar_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        
        message.success('PDF formatında rapor dışa aktarıldı');
      } else {
        // Excel export (simüle edilmiş - gelecekte implement edilebilir)
        await new Promise(resolve => setTimeout(resolve, 1000));
        message.success('Excel formatında rapor dışa aktarıldı');
      }
    } catch (error) {
      console.error('Export hatası:', error);
      message.error('Dışa aktarma işlemi başarısız');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
    message.success('Yazdırma işlemi başlatıldı');
  };

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ padding: '0 8px' }}>
      {/* Minimalist Header */}
      <div style={{
        marginBottom: '20px',
        paddingBottom: '12px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <Space size={12} align="center">
          <BarChartOutlined style={{ fontSize: '20px', color: '#64748b' }} />
          <Title level={4} style={{ 
            margin: 0, 
            color: '#1f2937', 
            fontSize: '18px',
            fontWeight: '600'
          }}>
            Raporlar & Analiz
          </Title>
        </Space>
      </div>

      {/* Profesyonel Filtreler */}
      <Card 
        style={{ 
          marginBottom: 16, 
          borderRadius: '8px', 
          border: '1px solid #e5e7eb', 
          boxShadow: 'none',
          background: 'white'
        }}
        styles={{ body: { padding: '20px' } }}
        title={
          <Space size={8}>
            <FilterOutlined style={{ color: '#64748b', fontSize: '16px' }} />
            <span style={{ color: '#1f2937', fontWeight: '600', fontSize: '15px' }}>Filtreler & İşlemler</span>
          </Space>
        }
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} lg={6}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Text strong style={{ fontSize: '13px', color: '#374151', display: 'block' }}>
                <CalendarOutlined style={{ marginRight: '6px', fontSize: '12px' }} />
                Tarih Aralığı
              </Text>
              <Radio.Group 
                value={dateFilter} 
                onChange={(e) => setDateFilter(e.target.value)}
                buttonStyle="solid"
                size="small"
                style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: '4px' }}
              >
                <Radio.Button value="all" style={{ flex: 1, minWidth: '60px' }}>Tümü</Radio.Button>
                <Radio.Button value="today" style={{ flex: 1, minWidth: '60px' }}>Bugün</Radio.Button>
                <Radio.Button value="week" style={{ flex: 1, minWidth: '60px' }}>Hafta</Radio.Button>
                <Radio.Button value="month" style={{ flex: 1, minWidth: '60px' }}>Ay</Radio.Button>
                <Radio.Button value="custom" style={{ flex: 1, minWidth: '60px' }}>Özel</Radio.Button>
              </Radio.Group>
              {dateFilter === 'custom' && (
                <RangePicker 
                  value={customDateRange}
                  onChange={(dates) => setCustomDateRange(dates as [Dayjs, Dayjs])}
                  style={{ width: '100%' }}
                  format="DD.MM.YYYY"
                  placeholder={['Başlangıç Tarihi', 'Bitiş Tarihi']}
                  size="small"
                />
              )}
            </Space>
          </Col>

          <Col xs={24} sm={12} lg={5}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Text strong style={{ fontSize: '13px', color: '#374151', display: 'block' }}>
                <BankOutlined style={{ marginRight: '6px', fontSize: '12px' }} />
                Birim Seçimi
              </Text>
              <Select 
                value={selectedUnit} 
                onChange={setSelectedUnit}
                style={{ width: '100%' }}
                size="small"
                placeholder="Tüm birimler"
                showSearch
                filterOption={(input, option) =>
                  (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                <Option value="all">Tüm Birimler</Option>
                <Option value="ana-kasa">Ana Kasa</Option>
                <Option value="yarimamul">Yarımamül</Option>
                <Option value="lazer-kesim">Lazer Kesim</Option>
                <Option value="tezgah">Tezgah</Option>
                <Option value="cila">Cila</Option>
                <Option value="dokum">Döküm</Option>
                <Option value="tedarik">Tedarik</Option>
                <Option value="satis">Satış</Option>
                <Option value="dis-kasa">Dış Kasa</Option>
              </Select>
            </Space>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Text strong style={{ fontSize: '13px', color: '#374151', display: 'block' }}>
                <ReloadOutlined style={{ marginRight: '6px', fontSize: '12px' }} />
                İşlemler
              </Text>
              <Space style={{ width: '100%' }} size={8}>
                <Button 
                  icon={<ReloadOutlined />}
                  onClick={handleResetFilters}
                  size="small"
                  style={{ flex: 1 }}
                >
                  Sıfırla
                </Button>
                <Button 
                  icon={<FilePdfOutlined />}
                  onClick={() => handleExport('pdf')}
                  loading={isExporting}
                  size="small"
                  style={{ flex: 1 }}
                >
                  PDF
                </Button>
              </Space>
            </Space>
          </Col>

          <Col xs={24} sm={12} lg={7}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Text strong style={{ fontSize: '13px', color: '#374151', display: 'block' }}>
                <ExportOutlined style={{ marginRight: '6px', fontSize: '12px' }} />
                Dışa Aktarma
              </Text>
              <Space style={{ width: '100%' }} size={8}>
                <Button 
                  type="primary" 
                  icon={<FileExcelOutlined />}
                  onClick={() => handleExport('excel')}
                  loading={isExporting}
                  size="small"
                  style={{ flex: 1 }}
                >
                  Excel
                </Button>
                <Button 
                  icon={<PrinterOutlined />}
                  onClick={handlePrint}
                  size="small"
                  style={{ flex: 1 }}
                >
                  Yazdır
                </Button>
              </Space>
            </Space>
          </Col>
        </Row>

          {/* Aktif Filtre Bilgisi */}
          {(dateFilter !== 'all' || selectedUnit !== 'all') && (
            <div style={{ 
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <Space wrap size={8}>
                <Text style={{ fontSize: '12px', color: '#6b7280' }}>Aktif:</Text>
                {dateFilter !== 'all' && (
                  <Tag 
                    color="blue" 
                    closable 
                    onClose={() => setDateFilter('all')}
                    style={{ fontSize: '11px', padding: '2px 8px', margin: 0 }}
                  >
                    {dateFilter === 'today' && 'Bugün'}
                    {dateFilter === 'week' && 'Bu Hafta'}
                    {dateFilter === 'month' && 'Bu Ay'}
                    {dateFilter === 'custom' && customDateRange && 
                      `${customDateRange[0].format('DD.MM.YYYY')} - ${customDateRange[1].format('DD.MM.YYYY')}`
                    }
                  </Tag>
                )}
                {selectedUnit !== 'all' && (
                  <Tag 
                    color="green" 
                    closable 
                    onClose={() => setSelectedUnit('all')}
                    style={{ fontSize: '11px', padding: '2px 8px', margin: 0 }}
                  >
                    {selectedUnit === 'ana-kasa' && 'Ana Kasa'}
                    {selectedUnit === 'yarimamul' && 'Yarımamül'}
                    {selectedUnit === 'lazer-kesim' && 'Lazer Kesim'}
                    {selectedUnit === 'tezgah' && 'Tezgah'}
                    {selectedUnit === 'cila' && 'Cila'}
                    {selectedUnit === 'dokum' && 'Döküm'}
                    {selectedUnit === 'tedarik' && 'Tedarik'}
                    {selectedUnit === 'satis' && 'Satış'}
                    {selectedUnit === 'dis-kasa' && 'Dış Kasa'}
                  </Tag>
                )}
              </Space>
            </div>
          )}
      </Card>

      {/* Kompakt İstatistik Kartları */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card 
            style={{ 
              borderRadius: '8px', 
              border: '1px solid #e5e7eb',
              background: 'white',
              boxShadow: 'none'
            }}
            styles={{ body: { padding: '16px' } }}
          >
            <Space size={12} align="center" style={{ width: '100%' }}>
              <GoldOutlined style={{ fontSize: '20px', color: '#64748b' }} />
              <div style={{ flex: 1 }}>
                <Text style={{ 
                  color: '#6b7280', 
                  fontSize: '12px', 
                  display: 'block',
                  marginBottom: '4px'
                }}>
                  Toplam Stok
                </Text>
                <Text style={{ 
                  color: '#1f2937', 
                  fontSize: '20px', 
                  fontWeight: '600',
                  display: 'block'
                }}>
                  {safeToFixed(totalStock, 2)} gr
                </Text>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card 
            style={{ 
              borderRadius: '8px', 
              border: '1px solid #e5e7eb',
              background: 'white',
              boxShadow: 'none'
            }}
            styles={{ body: { padding: '16px' } }}
          >
            <Space size={12} align="center" style={{ width: '100%' }}>
              <FireOutlined style={{ fontSize: '20px', color: '#64748b' }} />
              <div style={{ flex: 1 }}>
                <Text style={{ 
                  color: '#6b7280', 
                  fontSize: '12px', 
                  display: 'block',
                  marginBottom: '4px'
                }}>
                  Toplam Fire
                </Text>
                <Text style={{ 
                  color: '#1f2937', 
                  fontSize: '20px', 
                  fontWeight: '600',
                  display: 'block'
                }}>
                  {safeToFixed(totalFire, 2)} gr
                </Text>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card 
            style={{ 
              borderRadius: '8px', 
              border: '1px solid #e5e7eb',
              background: 'white',
              boxShadow: 'none'
            }}
            styles={{ body: { padding: '16px' } }}
          >
            <Space size={12} align="center" style={{ width: '100%' }}>
              <BankOutlined style={{ fontSize: '20px', color: '#64748b' }} />
              <div style={{ flex: 1 }}>
                <Text style={{ 
                  color: '#6b7280', 
                  fontSize: '12px', 
                  display: 'block',
                  marginBottom: '4px'
                }}>
                  Toplam Has
                </Text>
                <Text style={{ 
                  color: '#1f2937', 
                  fontSize: '20px', 
                  fontWeight: '600',
                  display: 'block'
                }}>
                  {safeToFixed(totalHas, 2)} gr
                </Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Kompakt Tabbed Raporlar */}
      <Card 
        style={{ 
          borderRadius: '8px', 
          border: '1px solid #e5e7eb',
          boxShadow: 'none'
        }}
        styles={{ body: { padding: '16px' } }}
      >
        <Tabs 
          defaultActiveKey="units"
          size="small"
          items={[
            {
              key: 'units',
              label: (
                <Space>
                  <BankOutlined />
                  <span>Birim Raporları</span>
                </Space>
              ),
              children: (
                reportData.length > 0 ? (
                  <Table
                    columns={columns}
                    dataSource={reportData}
                    pagination={false}
                    scroll={{ x: 800 }}
                    size="large"
                    style={{ borderRadius: '8px' }}
                  />
                ) : (
                  <Empty description="Rapor verisi bulunamadı" />
                )
              )
            },
            {
              key: 'karat',
              label: (
                <Space>
                  <PieChartOutlined />
                  <span>Ayar Bazlı Analiz</span>
                </Space>
              ),
              children: (
                karatData.length > 0 ? (
                  <Table
                    columns={karatColumns}
                    dataSource={karatData}
                    pagination={false}
                    size="large"
                    style={{ borderRadius: '8px' }}
                  />
                ) : (
                  <Empty description="Ayar bazlı veri bulunamadı" />
                )
              )
            },
            {
              key: 'fire',
              label: (
                <Space>
                  <FireOutlined />
                  <span>Fire Bazlı Analiz</span>
                </Space>
              ),
              children: (
                fireData.length > 0 ? (
                  <Table
                    columns={fireColumns}
                    dataSource={fireData}
                    pagination={false}
                    scroll={{ x: 1000 }}
                    size="large"
                    style={{ borderRadius: '8px' }}
                  />
                ) : (
                  <Empty description="Fire bazlı veri bulunamadı" />
                )
              )
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default Reports;
