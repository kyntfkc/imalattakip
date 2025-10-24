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
  Radio
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
  PlusOutlined
} from '@ant-design/icons';
import { useTransfers } from '../context/TransferContext';
import { useLog } from '../context/LogContext';
import { useCinsiSettings, CinsiOption } from '../context/CinsiSettingsContext';
import { UnitType, UNIT_NAMES, FIRE_UNITS, OUTPUT_ONLY_UNITS, SEMI_FINISHED_UNITS, PROCESSING_UNITS, INPUT_UNITS } from '../types';
import type { ColumnsType } from 'antd/es/table';
import TransferModal from './TransferModal';
import { unitColors, commonStyles } from '../styles/theme';

const { Title, Text } = Typography;

interface UnitPageProps {
  unitId: UnitType;
}

const UnitPage: React.FC<UnitPageProps> = React.memo(({ unitId }) => {
  const { unitSummaries, transfers, deleteTransfer } = useTransfers();
  const { addLog } = useLog();
  const { cinsiOptions } = useCinsiSettings();
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month' | 'year'>('week');

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
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransfers, unitId, isOutputOnlyUnit, hasFire, isProcessingUnit, isInputUnit, isSemiFinishedUnit, unit]);

  // OUTPUT_ONLY_UNITS, FIRE_UNITS, PROCESSING_UNITS, INPUT_UNITS ve SEMI_FINISHED_UNITS için toplam çıkış hesapla
  const totalOutput = useMemo(() => {
    if (!isOutputOnlyUnit && !hasFire && !isProcessingUnit && !isInputUnit && !isSemiFinishedUnit) return 0;
    
    return filteredTransfers
      .filter(t => t.fromUnit === unitId)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransfers, unitId, isOutputOnlyUnit, hasFire, isProcessingUnit, isInputUnit, isSemiFinishedUnit]);

  // OUTPUT_ONLY_UNITS, PROCESSING_UNITS, INPUT_UNITS ve SEMI_FINISHED_UNITS için has karşılığı hesapla
  const filteredHasEquivalent = useMemo(() => {
    if (!isOutputOnlyUnit && !isProcessingUnit && !isInputUnit && !isSemiFinishedUnit) return unit?.hasEquivalent || 0;
    
    return filteredTransfers
      .filter(t => t.fromUnit === unitId)
      .reduce((sum, t) => {
        // Karat'a göre has karşılığı hesapla
        const karatMultiplier = t.karat === '24K' ? 1 : 
                               t.karat === '22K' ? 0.9167 :
                               t.karat === '18K' ? 0.75 : 0.5833; // 14K
        return sum + (t.amount * karatMultiplier);
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
        return (
          <Text strong style={{ color: isIncoming ? '#52c41a' : '#ff4d4f' }}>
            {isIncoming ? '+' : '-'}{amount.toFixed(2)} gr
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
      render: (stock: number) => `${stock.toFixed(2)} gr`
    },
    {
      title: 'Has Karşılığı',
      dataIndex: 'has',
      key: 'has',
      render: (has: number) => (
        <Text style={{ color: '#52c41a' }}>{has.toFixed(2)} gr</Text>
      )
    }
  ];

  if (hasFire) {
    cinsiColumns.push({
      title: 'Fire',
      dataIndex: 'fire',
      key: 'fire',
      render: (fire: number) => (
        <Tag color={getFireColor(fire)}>
          {fire.toFixed(2)} gr
        </Tag>
      )
    });
  }

  // Cinsi bazlı stok verilerini hesapla
  const cinsiData = useMemo(() => {
    if (!unit) return [];
    
    // Transferlerden cinsi bilgilerini çıkar
    const cinsiMap = new Map<string, { stock: number; has: number; fire: number }>();
    
    // Bu birime gelen transferler
    const incomingTransfers = transfers.filter(t => t.toUnit === unitId);
    // Bu birimden çıkan transferler
    const outgoingTransfers = transfers.filter(t => t.fromUnit === unitId);
    
    // Giriş transferlerini işle
    incomingTransfers.forEach(transfer => {
      if (transfer.cinsi) {
        const existing = cinsiMap.get(transfer.cinsi) || { stock: 0, has: 0, fire: 0 };
        existing.stock += transfer.amount;
        existing.has += transfer.amount * (transfer.karat === '24K' ? 1 : 
                                        transfer.karat === '22K' ? 0.9167 :
                                        transfer.karat === '18K' ? 0.75 : 0.5833);
        cinsiMap.set(transfer.cinsi, existing);
      }
    });
    
    // Çıkış transferlerini işle
    outgoingTransfers.forEach(transfer => {
      if (transfer.cinsi) {
        const existing = cinsiMap.get(transfer.cinsi) || { stock: 0, has: 0, fire: 0 };
        existing.stock -= transfer.amount;
        existing.has -= transfer.amount * (transfer.karat === '24K' ? 1 : 
                                         transfer.karat === '22K' ? 0.9167 :
                                         transfer.karat === '18K' ? 0.75 : 0.5833);
        cinsiMap.set(transfer.cinsi, existing);
      }
    });
    
    // Fire hesaplama (sadece fire birimleri için)
    if (hasFire) {
      cinsiMap.forEach((data, cinsi) => {
        // Fire birimlerinde fire = giriş - çıkış
        // data.stock zaten giriş - çıkış olarak hesaplandı
        data.fire = data.stock; // Fire = net değişim
        data.stock = 0; // Fire birimlerinde stok 0
      });
    } else if (isProcessingUnit) {
      // İşlem birimleri: Tezgah, Cila
      // Bu birimlerde stok tutulmaz, sadece geçici işlem yapılır
      cinsiMap.forEach((data, cinsi) => {
        // Fire = giriş - çıkış (işlem sırasında kaybolan miktar)
        data.fire = data.stock; // Fire = net değişim
        data.stock = 0; // İşlem birimlerinde stok tutulmaz
      });
    } else if (isInputUnit) {
      // Dışarıdan gelen mamülleri sisteme sokan birimler: Döküm, Tedarik
      // Bu birimlerde stok tutulmaz, sadece giriş-çıkış dengesi tutulur
      cinsiMap.forEach((data, cinsi) => {
        data.fire = 0; // Fire hesaplanmaz
        // data.stock zaten giriş - çıkış olarak hesaplandı
      });
    } else if (isSemiFinishedUnit) {
      // Yarı mamul birimi: Ana kasadan ayrı hesaplanır
      // Fire hesaplanmaz, sadece stok takibi
      cinsiMap.forEach((data, cinsi) => {
        data.fire = 0; // Yarı mamul biriminde fire yok
        // data.stock zaten giriş - çıkış olarak hesaplandı
      });
    }
    
    return Array.from(cinsiMap.entries())
      .filter(([_, data]) => data.stock > 0 || data.fire > 0)
      .map(([cinsi, data]) => ({
        key: cinsi,
        cinsi,
        stock: data.stock,
        has: data.has,
        fire: data.fire
      }));
  }, [unit, transfers, unitId, hasFire, isProcessingUnit, isInputUnit]);

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
                <Title level={2} style={{ margin: 0, color: '#1f2937', fontSize: '28px', fontWeight: '700' }}>
                  {unitName}
                </Title>
                <Text style={{ color: '#6b7280', fontSize: '16px', fontWeight: '400' }}>
                  Birim Detay Sayfası
                </Text>
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
      </Card>

      {/* İstatistikler */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} lg={hasFire ? 8 : 12}>
          <Card 
            className="card-hover"
            style={{ 
              borderRadius: '20px',
              border: '1px solid #e5e7eb',
              background: 'white',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Statistic
                title={<Text strong style={{ fontSize: '13px', opacity: 0.8 }}>
                  {unitId === 'satis' ? 'Toplam Satış' : 
                   isOutputOnlyUnit ? 'Toplam Giriş' : 
                   hasFire ? 'Toplam İşlem' : 
                   isProcessingUnit ? 'Toplam İşlem' : 
                   isInputUnit ? 'Toplam İşlem' : 'Toplam Stok'}
                </Text>}
                value={unitId === 'satis' ? unit.totalStock : 
                       isOutputOnlyUnit ? totalInput : 
                       hasFire ? totalInput + totalOutput : 
                       isProcessingUnit ? totalInput + totalOutput : 
                       isInputUnit ? totalInput + totalOutput : unit.totalStock}
                suffix="gr"
                valueStyle={{ 
                  color: '#1f2937', 
                  fontSize: '28px',
                  fontWeight: 700
                }}
                precision={2}
                prefix={<GoldOutlined style={{ fontSize: '20px', color: '#64748b' }} />}
              />
              {(isOutputOnlyUnit || unitId === 'satis') && (
                <div style={{ 
                  width: '100%',
                  display: 'flex',
                  gap: '4px'
                }}>
                  <button
                    onClick={() => setDateFilter('all')}
                    style={{ 
                      fontSize: '11px', 
                      padding: '4px 8px',
                      borderRadius: '8px',
                      border: dateFilter === 'all' ? '1px solid #1890ff' : '1px solid #e8e8e8',
                      background: dateFilter === 'all' ? '#1890ff' : '#fafafa',
                      color: dateFilter === 'all' ? '#fff' : '#666',
                      flex: 1,
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    Tümü
                  </button>
                  <button
                    onClick={() => setDateFilter('week')}
                    style={{ 
                      fontSize: '11px', 
                      padding: '4px 8px',
                      borderRadius: '8px',
                      border: dateFilter === 'week' ? '1px solid #1890ff' : '1px solid #e8e8e8',
                      background: dateFilter === 'week' ? '#1890ff' : '#fafafa',
                      color: dateFilter === 'week' ? '#fff' : '#666',
                      flex: 1,
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    Haftalık
                  </button>
                  <button
                    onClick={() => setDateFilter('month')}
                    style={{ 
                      fontSize: '11px', 
                      padding: '4px 8px',
                      borderRadius: '8px',
                      border: dateFilter === 'month' ? '1px solid #1890ff' : '1px solid #e8e8e8',
                      background: dateFilter === 'month' ? '#1890ff' : '#fafafa',
                      color: dateFilter === 'month' ? '#fff' : '#666',
                      flex: 1,
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    Aylık
                  </button>
                  <button
                    onClick={() => setDateFilter('year')}
                    style={{ 
                      fontSize: '11px', 
                      padding: '4px 8px',
                      borderRadius: '8px',
                      border: dateFilter === 'year' ? '1px solid #1890ff' : '1px solid #e8e8e8',
                      background: dateFilter === 'year' ? '#1890ff' : '#fafafa',
                      color: dateFilter === 'year' ? '#fff' : '#666',
                      flex: 1,
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    Yıllık
                  </button>
                </div>
              )}
            </Space>
          </Card>
        </Col>
        {!isOutputOnlyUnit && !isInputUnit && (
          <Col xs={24} sm={12} lg={hasFire || isProcessingUnit ? 12 : 12}>
          <Card 
            className="card-hover"
            style={{ 
              borderRadius: '20px',
              border: '1px solid #e5e7eb',
              background: 'white',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}
          >
            {(hasFire || isProcessingUnit) ? (
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title={<Text strong style={{ fontSize: '13px', opacity: 0.8 }}>Fire Miktarı</Text>}
                    value={Number(unit.totalFire.toFixed(2))}
                    suffix="gr"
                    valueStyle={{ 
                      color: unit.totalFire > 0 ? '#dc2626' : '#059669',
                      fontSize: '24px',
                      fontWeight: 700
                    }}
                    precision={2}
                    prefix={<HistoryOutlined style={{ fontSize: '16px', color: '#64748b' }} />}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title={<Text strong style={{ fontSize: '13px', opacity: 0.8 }}>Has Karşılığı</Text>}
                    value={unitId === 'satis' ? unit.hasEquivalent : 
                           isOutputOnlyUnit ? filteredHasEquivalent : 
                           isProcessingUnit ? 0 : unit.hasEquivalent}
                    suffix="gr"
                    valueStyle={{ 
                      color: '#059669',
                      fontSize: '24px',
                      fontWeight: 700
                    }}
                    precision={2}
                    prefix={<CrownOutlined style={{ fontSize: '16px', color: '#64748b' }} />}
                  />
                </Col>
              </Row>
            ) : (
              <Statistic
                title={<Text strong style={{ fontSize: '13px', opacity: 0.8 }}>Has Karşılığı</Text>}
                value={unitId === 'satis' ? unit.hasEquivalent : 
                       isOutputOnlyUnit ? filteredHasEquivalent : 
                       isProcessingUnit ? 0 : unit.hasEquivalent}
                suffix="gr"
                valueStyle={{ 
                  color: '#059669',
                  fontSize: '28px',
                  fontWeight: 700
                }}
                precision={2}
                prefix={<CrownOutlined style={{ fontSize: '20px', color: '#64748b' }} />}
              />
            )}
          </Card>
        </Col>
        )}
      </Row>

      {/* Cinsi Bazlı Stok Dağılımı - Sadece stok tutan birimler için */}
      {!isProcessingUnit && !isOutputOnlyUnit && !isInputUnit && (
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
            dataSource={isOutputOnlyUnit ? filteredTransfers : unitTransfers}
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

