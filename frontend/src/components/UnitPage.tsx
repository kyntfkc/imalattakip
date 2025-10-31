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
  Segmented
} from 'antd';
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
  CalendarOutlined
} from '@ant-design/icons';
import { useTransfers } from '../context/TransferContext';
import { useLog } from '../context/LogContext';
import { useCinsiSettings, CinsiOption } from '../context/CinsiSettingsContext';
import { UnitType, UNIT_NAMES, FIRE_UNITS, OUTPUT_ONLY_UNITS, SEMI_FINISHED_UNITS, PROCESSING_UNITS, INPUT_UNITS, KARAT_HAS_RATIOS } from '../types';
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
    if (dateFilter === 'all') return transfers;
    
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
    
    return transfers.filter(transfer => new Date(transfer.date) >= filterDate);
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
  }, [unitTransfers, dateFilter]);

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
        const karatMultiplier = KARAT_HAS_RATIOS[t.karat as KaratType] || 0;
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
      width: 160
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
      width: 100
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
      )
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
  const cinsiColumns: ColumnsType<any> = [
    {
      title: 'Cinsi',
      dataIndex: 'cinsi',
      key: 'cinsi',
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
      render: (stock: number) => `${(typeof stock === 'number' ? stock : parseFloat(stock) || 0).toFixed(2)} gr`
    },
    {
      title: 'Has Karşılığı',
      dataIndex: 'has',
      key: 'has',
      render: (has: number) => {
        const safeHas = typeof has === 'number' ? has : parseFloat(has) || 0;
        return (
          <Text style={{ color: '#52c41a' }}>{safeHas.toFixed(2)} gr</Text>
        );
      }
    }
  ];

  if (hasFire) {
    cinsiColumns.push({
      title: 'Fire',
      dataIndex: 'fire',
      key: 'fire',
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
      if (transfer.amount > 0) {
        // Cinsi kontrolü: undefined, null, boş string veya sadece boşluk ise "Genel"
        const cinsi = (transfer.cinsi && transfer.cinsi.trim()) ? transfer.cinsi.trim() : 'Genel';
        const existing = cinsiMap.get(cinsi) || { stock: 0, has: 0, fire: 0, input: 0, output: 0 };
        const safeAmount = typeof transfer.amount === 'number' ? transfer.amount : parseFloat(String(transfer.amount)) || 0;
        existing.stock += safeAmount;
        existing.input += safeAmount;
        const karatRatio = KARAT_HAS_RATIOS[transfer.karat as KaratType] || 0;
        existing.has += safeAmount * karatRatio;
        cinsiMap.set(cinsi, existing);
      }
    });
    
    // Çıkış transferlerini işle
    outgoingTransfers.forEach(transfer => {
      if (transfer.amount > 0) {
        // Cinsi kontrolü: undefined, null, boş string veya sadece boşluk ise "Genel"
        const cinsi = (transfer.cinsi && transfer.cinsi.trim()) ? transfer.cinsi.trim() : 'Genel';
        const existing = cinsiMap.get(cinsi) || { stock: 0, has: 0, fire: 0, input: 0, output: 0 };
        const safeAmount = typeof transfer.amount === 'number' ? transfer.amount : parseFloat(String(transfer.amount)) || 0;
        existing.stock -= safeAmount;
        existing.output += safeAmount;
        const karatRatio = KARAT_HAS_RATIOS[transfer.karat as KaratType] || 0;
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
        // Has hesaplaması: Stok 0 olduğu için has da 0 olmalı, ama fire'ın has karşılığı gösterilebilir
        // Şu an has değeri korunuyor (fire birimlerinde fire gösterilir)
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
    
    // Sonuçları filtrele ve düzenle
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
      });
    
    return result;
  }, [unit, transfers, filteredTransfers, unitId, hasFire, isProcessingUnit, isInputUnit, isSemiFinishedUnit, isOutputOnlyUnit]);

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
        
        {/* Filtreler - Satış, output-only ve input birimler için */}
        {(isOutputOnlyUnit || unitId === 'satis' || isInputUnit) && (
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
              onChange={(value) => setDateFilter(value as typeof dateFilter)}
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
          {/* Sol Kısım - Toplam Satış/Stok/İşlem */}
          <Col xs={24} sm={12}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              {(() => {
                const calculatedValue = unitId === 'satis' ? totalInput : 
                                       isOutputOnlyUnit ? totalInput : 
                                       hasFire ? totalInput + totalOutput : 
                                       isProcessingUnit ? totalInput + totalOutput : 
                                       isInputUnit ? totalInput + totalOutput : (unit?.totalStock || 0);
                const formattedValue = calculatedValue.toFixed(2).replace(/^0+(?=\d)/, '');
                return (
                  <Statistic
                    title={<Text strong style={{ fontSize: '13px', opacity: 0.8 }}>
                      {unitId === 'satis' ? 'Toplam Satış' : 
                       isOutputOnlyUnit ? 'Toplam Giriş' : 
                       hasFire ? 'Toplam İşlem' : 
                       isProcessingUnit ? 'Toplam İşlem' : 
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
                const hasValue = isOutputOnlyUnit ? filteredHasEquivalent : 
                               isProcessingUnit ? 0 : 
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
        </Row>
      </Card>

      {/* Cinsi Bazlı Stok Dağılımı - Sadece stok tutan birimler için */}
      {((!isProcessingUnit && !isOutputOnlyUnit && !isInputUnit) || isSemiFinishedUnit) && (
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
            />
          ) : (
            <Empty description="Bu birimde henüz stok yok" />
          )}
        </Card>
      )}

      {/* İşlem Geçmişi */}
      <Card
        title={
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
                {unitTransfers.length}
              </Tag>
            </Space>
          </Space>
        }
        style={{ 
          borderRadius: commonStyles.borderRadius,
          boxShadow: commonStyles.cardShadow
        }}
      >
        {unitTransfers.length > 0 ? (
          <Table
            columns={columns}
            dataSource={(isOutputOnlyUnit || isInputUnit || unitId === 'satis') ? filteredTransfers : unitTransfers}
            rowKey="id"
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `Toplam ${total} işlem`
            }}
            scroll={{ x: 1000 }}
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

