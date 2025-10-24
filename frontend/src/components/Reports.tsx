import React, { useState, useMemo } from 'react';
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
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

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

type DateFilterType = 'all' | 'today' | 'week' | 'month' | 'custom';

const Reports: React.FC = () => {
  const { unitSummaries, transfers, deleteTransfer, isLoading } = useTransfers();
  const { totalStock: externalVaultStock, totalHas: externalVaultHas } = useExternalVault();
  
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
        totalStock: unit.totalStock,
        fireAmount: unit.totalFire,
        hasEquivalent: unit.hasEquivalent,
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
      totalStock: externalVaultStock,
      fireAmount: 0,
      hasEquivalent: externalVaultHas,
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
          karatTotals[karat].stock += stock.currentStock;
          karatTotals[karat].has += stock.hasEquivalent;
        }
      });
    });

    const totalStock = Object.values(karatTotals).reduce((sum, k) => sum + k.stock, 0);

    return Object.entries(karatTotals).map(([karat, totals]) => ({
      karat: karat === '24K' ? 'Has Altın' : karat.replace('K', ' Ayar'),
      totalStock: totals.stock,
      hasEquivalent: totals.has,
      percentage: totalStock > 0 ? (totals.stock / totalStock) * 100 : 0
    }));
  }, [unitSummaries]);

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
      render: (value: number) => (
        <Tooltip title={`${value.toFixed(3)} gram`}>
          <Text strong style={{ color: '#1890ff', fontSize: '16px' }}>
            {value.toFixed(2)}
          </Text>
        </Tooltip>
      ),
      sorter: (a, b) => a.totalStock - b.totalStock
    },
    {
      title: 'Fire Miktarı (gr)',
      dataIndex: 'fireAmount',
      key: 'fireAmount',
      render: (value: number) => (
        <Tag 
          color={value === 0 ? 'success' : value > 10 ? 'error' : 'warning'}
          style={{ fontSize: '14px', padding: '4px 12px' }}
        >
          <FireOutlined /> {value.toFixed(2)}
        </Tag>
      ),
      sorter: (a, b) => a.fireAmount - b.fireAmount
    },
    {
      title: 'Has Karşılığı (gr)',
      dataIndex: 'hasEquivalent',
      key: 'hasEquivalent',
      render: (value: number) => (
        <Text style={{ color: '#52c41a', fontSize: '16px' }}>
          <GoldOutlined /> {value.toFixed(2)}
        </Text>
      ),
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
      render: (value: number) => (
        <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
          {value.toFixed(2)}
        </Text>
      ),
      sorter: (a, b) => a.totalStock - b.totalStock
    },
    {
      title: 'Has Karşılığı (gr)',
      dataIndex: 'hasEquivalent',
      key: 'hasEquivalent',
      render: (value: number) => (
        <Text style={{ fontSize: '16px', color: '#52c41a' }}>
          {value.toFixed(2)}
        </Text>
      ),
      sorter: (a, b) => a.hasEquivalent - b.hasEquivalent
    },
    {
      title: 'Dağılım (%)',
      dataIndex: 'percentage',
      key: 'percentage',
      render: (value: number) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Progress 
            percent={value} 
            size="small" 
            strokeColor={value > 50 ? '#52c41a' : value > 25 ? '#1890ff' : '#faad14'}
            showInfo={false}
            style={{ flex: 1 }}
          />
          <Text strong style={{ minWidth: '50px', textAlign: 'right' }}>
            {value.toFixed(1)}%
          </Text>
        </div>
      ),
      sorter: (a, b) => a.percentage - b.percentage
    }
  ];

  const totalStock = reportData.reduce((sum, item) => sum + item.totalStock, 0);
  const totalFire = reportData.reduce((sum, item) => sum + item.fireAmount, 0);
  const totalHas = reportData.reduce((sum, item) => sum + item.hasEquivalent, 0);

  const handleResetFilters = () => {
    setDateFilter('all');
    setCustomDateRange(null);
    setSelectedUnit('all');
    message.success('Filtreler sıfırlandı');
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    setIsExporting(true);
    try {
      // Simüle edilmiş export işlemi
      await new Promise(resolve => setTimeout(resolve, 2000));
      message.success(`${format.toUpperCase()} formatında rapor dışa aktarıldı`);
    } catch (error) {
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
      {/* Modern Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '24px',
        color: 'white',
        boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
      }}>
        <Space direction="vertical" size={12}>
          <Title level={2} style={{ margin: 0, color: 'white', fontSize: '28px', fontWeight: '700' }}>
            <BarChartOutlined style={{ marginRight: '12px' }} />
            Raporlar & Analiz
          </Title>
          <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '16px', fontWeight: '400' }}>
            Detaylı stok analizi, fire raporları ve ayar bazlı dağılım grafikleri
          </Text>
        </Space>
      </div>

      {/* Gelişmiş Filtreler */}
      <Card 
        style={{ 
          marginBottom: 24, 
          borderRadius: '16px', 
          border: '1px solid #e5e7eb', 
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' 
        }}
        title={
          <Space>
            <FilterOutlined style={{ color: '#667eea', fontSize: '18px' }} />
            <span style={{ color: '#1f2937', fontWeight: '600', fontSize: '16px' }}>Gelişmiş Filtreler</span>
          </Space>
        }
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Tarih Filtreleri */}
          <div>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text strong style={{ fontSize: '14px', color: '#374151' }}>
                <CalendarOutlined style={{ marginRight: '8px' }} />
                Tarih Aralığı:
              </Text>
              <Radio.Group 
                value={dateFilter} 
                onChange={(e) => setDateFilter(e.target.value)}
                buttonStyle="solid"
                size="large"
              >
                <Radio.Button value="all">Tümü</Radio.Button>
                <Radio.Button value="today">Bugün</Radio.Button>
                <Radio.Button value="week">Bu Hafta</Radio.Button>
                <Radio.Button value="month">Bu Ay</Radio.Button>
                <Radio.Button value="custom">Özel Aralık</Radio.Button>
              </Radio.Group>
            </Space>

            {dateFilter === 'custom' && (
              <div style={{ marginTop: 16 }}>
                <RangePicker 
                  value={customDateRange}
                  onChange={(dates) => setCustomDateRange(dates as [Dayjs, Dayjs])}
                  style={{ width: '100%' }}
                  format="DD.MM.YYYY"
                  placeholder={['Başlangıç Tarihi', 'Bitiş Tarihi']}
                  size="large"
                />
              </div>
            )}
          </div>

          <Divider style={{ margin: '8px 0' }} />

          {/* Diğer Filtreler ve Aksiyonlar */}
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} md={6}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Text strong style={{ fontSize: '14px', color: '#374151' }}>Birim Seçimi:</Text>
                <Select 
                  value={selectedUnit} 
                  onChange={setSelectedUnit}
                  style={{ width: '100%' }}
                  size="large"
                  placeholder="Tüm birimler"
                >
                  <Option value="all">Tüm Birimler</Option>
                  <Option value="ana-kasa">Ana Kasa</Option>
                  <Option value="yarimamul">Yarımamül</Option>
                  <Option value="lazer-kesim">Lazer Kesim</Option>
                  <Option value="tezgah">Tezgah</Option>
                  <Option value="cila">Cila</Option>
                  <Option value="dokum">Döküm</Option>
                  <Option value="dis-kasa">Dış Kasa</Option>
                </Select>
              </Space>
            </Col>

            <Col xs={24} md={6}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Text strong style={{ fontSize: '14px', color: '#374151' }}>İşlemler:</Text>
                <Button 
                  icon={<ReloadOutlined />}
                  onClick={handleResetFilters}
                  block
                  size="large"
                  style={{ borderRadius: '8px' }}
                >
                  Filtreleri Sıfırla
                </Button>
              </Space>
            </Col>

            <Col xs={24} md={12}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Text strong style={{ fontSize: '14px', color: '#374151' }}>Dışa Aktarma:</Text>
                <Space style={{ width: '100%' }}>
                  <Button 
                    type="primary" 
                    icon={<FileExcelOutlined />}
                    onClick={() => handleExport('excel')}
                    loading={isExporting}
                    size="large"
                    style={{ borderRadius: '8px', flex: 1 }}
                  >
                    Excel
                  </Button>
                  <Button 
                    icon={<FilePdfOutlined />}
                    onClick={() => handleExport('pdf')}
                    loading={isExporting}
                    size="large"
                    style={{ borderRadius: '8px', flex: 1 }}
                  >
                    PDF
                  </Button>
                  <Button 
                    icon={<PrinterOutlined />}
                    onClick={handlePrint}
                    size="large"
                    style={{ borderRadius: '8px', flex: 1 }}
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
              background: 'linear-gradient(135deg, #f0f5ff 0%, #e6f7ff 100%)', 
              padding: '16px', 
              borderRadius: '12px',
              border: '1px solid #d6e4ff'
            }}>
              <Space wrap>
                <Text strong style={{ color: '#1890ff' }}>Aktif Filtreler:</Text>
                {dateFilter !== 'all' && (
                  <Tag 
                    color="blue" 
                    closable 
                    onClose={() => setDateFilter('all')}
                    style={{ fontSize: '13px', padding: '4px 12px' }}
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
                    style={{ fontSize: '13px', padding: '4px 12px' }}
                  >
                    {selectedUnit === 'ana-kasa' && 'Ana Kasa'}
                    {selectedUnit === 'yarimamul' && 'Yarımamül'}
                    {selectedUnit === 'lazer-kesim' && 'Lazer Kesim'}
                    {selectedUnit === 'tezgah' && 'Tezgah'}
                    {selectedUnit === 'cila' && 'Cila'}
                    {selectedUnit === 'dokum' && 'Döküm'}
                    {selectedUnit === 'dis-kasa' && 'Dış Kasa'}
                  </Tag>
                )}
              </Space>
            </div>
          )}
        </Space>
      </Card>

      {/* Gelişmiş İstatistik Kartları */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card 
            style={{ 
              borderRadius: '16px', 
              border: '1px solid #e5e7eb',
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <Statistic
              title={
                <Space>
                  <GoldOutlined style={{ color: '#1890ff' }} />
                  <span style={{ color: '#374151', fontSize: '14px', fontWeight: '600' }}>Toplam Stok</span>
                </Space>
              }
              value={Number(totalStock.toFixed(2))}
              suffix="gr"
              valueStyle={{ color: '#1890ff', fontSize: '24px', fontWeight: '700' }}
              prefix={<RiseOutlined />}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Tüm birimlerdeki toplam altın miktarı
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card 
            style={{ 
              borderRadius: '16px', 
              border: '1px solid #e5e7eb',
              background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <Statistic
              title={
                <Space>
                  <FireOutlined style={{ color: '#ef4444' }} />
                  <span style={{ color: '#374151', fontSize: '14px', fontWeight: '600' }}>Toplam Fire</span>
                </Space>
              }
              value={Number(totalFire.toFixed(2))}
              suffix="gr"
              valueStyle={{ color: '#ef4444', fontSize: '24px', fontWeight: '700' }}
              prefix={<FallOutlined />}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              İşlem sırasında oluşan fire miktarı
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card 
            style={{ 
              borderRadius: '16px', 
              border: '1px solid #e5e7eb',
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <Statistic
              title={
                <Space>
                  <BankOutlined style={{ color: '#22c55e' }} />
                  <span style={{ color: '#374151', fontSize: '14px', fontWeight: '600' }}>Toplam Has</span>
                </Space>
              }
              value={Number(totalHas.toFixed(2))}
              suffix="gr"
              valueStyle={{ color: '#22c55e', fontSize: '24px', fontWeight: '700' }}
              prefix={<RiseOutlined />}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Has altın karşılığı toplam miktar
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Gelişmiş Tabbed Raporlar */}
      <Card 
        style={{ 
          borderRadius: '16px', 
          border: '1px solid #e5e7eb',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
        }}
        bodyStyle={{ padding: '24px' }}
      >
        <Tabs 
          defaultActiveKey="units"
          size="large"
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
                <Table
                  columns={columns}
                  dataSource={reportData}
                  pagination={false}
                  scroll={{ x: 800 }}
                  size="large"
                  style={{ borderRadius: '8px' }}
                />
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
                <Table
                  columns={karatColumns}
                  dataSource={karatData}
                  pagination={false}
                  size="large"
                  style={{ borderRadius: '8px' }}
                />
              )
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default Reports;
