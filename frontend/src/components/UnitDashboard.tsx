import React, { useState, useMemo, useCallback } from 'react';
import { Card, Row, Col, Statistic, Typography, Space, Tag, Button, Modal, Table, Divider, Popconfirm, message, Skeleton, Spin } from 'antd';
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
  EditOutlined,
  DragOutlined,
  ShoppingCartOutlined
} from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTransfers } from '../context/TransferContext';
import { useExternalVault } from '../context/ExternalVaultContext';
import { useDashboardSettings } from '../context/DashboardSettingsContext';
import { useLog } from '../context/LogContext';
import { useAuth } from '../context/AuthContext';
import { UnitSummary, KaratType, FIRE_UNITS, UnitType } from '../types';
import type { ColumnsType } from 'antd/es/table';
import TransferModal from './TransferModal';
import { unitColors, commonStyles } from '../styles/theme';
import { useResponsive } from '../hooks/useResponsive';
import '../styles/animations.css';

const { Title, Text } = Typography;

// Sortable Card Component
interface SortableUnitCardProps {
  unit: UnitSummary;
  index: number;
  onClick: () => void;
  isMobile: boolean;
}

const SortableUnitCard: React.FC<SortableUnitCardProps> = React.memo(({ unit, index, onClick, isMobile }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: unit.unitId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getUnitIcon = (unitId: string, color: string) => {
    const iconSize = isMobile ? '20px' : '24px';
    const icons: { [key: string]: React.ReactNode } = {
      'ana-kasa': <BankOutlined style={{ fontSize: iconSize, color }} />,
      'yarimamul': <GoldOutlined style={{ fontSize: iconSize, color }} />,
      'lazer-kesim': <ThunderboltOutlined style={{ fontSize: iconSize, color }} />,
      'tezgah': <ToolOutlined style={{ fontSize: iconSize, color }} />,
      'cila': <CrownOutlined style={{ fontSize: iconSize, color }} />,
      'dokum': <GoldOutlined style={{ fontSize: iconSize, color }} />,
      'tedarik': <ToolOutlined style={{ fontSize: iconSize, color }} />,
      'satis': <ShoppingCartOutlined style={{ fontSize: iconSize, color }} />,
      'dis-kasa': <BankOutlined style={{ fontSize: iconSize, color }} />
    };
    return icons[unitId] || <BankOutlined style={{ fontSize: iconSize, color }} />;
  };

  const getFireColor = (fire: number) => {
    if (fire === 0) return 'green';
    if (fire < 1) return 'orange';
    return 'red';
  };

  const isExternalVault = unit.unitId === 'dis-kasa';
  const unitColor = unitColors[unit.unitId as keyof typeof unitColors];

  return (
    <Col xs={24} sm={12} lg={8} xl={6} key={unit.unitId} ref={setNodeRef} style={style}>
      <Card
        className="card-hover"
        hoverable
        onClick={onClick}
        style={{ 
          borderRadius: isMobile ? '14px' : '16px',
          boxShadow: '0 6px 24px rgba(0, 0, 0, 0.08)',
          cursor: 'pointer',
          height: '100%',
          minHeight: isMobile ? '200px' : '220px',
          border: 'none',
          background: 'white',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: 'translateY(0)',
        }}
        styles={{ 
          body: { 
            padding: isMobile ? '14px' : '18px', 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%',
            justifyContent: 'space-between'
          } 
        }}
      >
        {/* Modern Gradient Background - Removed */}
        
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            cursor: 'grab',
            padding: '6px',
            borderRadius: '8px',
            background: 'rgba(0, 0, 0, 0.05)',
            zIndex: 10,
            transition: 'all 0.2s ease',
            opacity: 0.6
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)';
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
            e.currentTarget.style.opacity = '0.6';
          }}
        >
          <DragOutlined style={{ fontSize: '16px', color: '#666' }} />
        </div>

        {/* Card Content */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Icon and Title */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: isMobile ? '10px' : '12px', 
            marginBottom: isMobile ? '12px' : '16px' 
          }}>
            <div style={{
              background: '#f8fafc',
              borderRadius: isMobile ? '10px' : '12px',
              padding: isMobile ? '8px' : '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #e5e7eb',
              flexShrink: 0
            }}>
              {getUnitIcon(unit.unitId, '#64748b')}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Title level={4} style={{ 
                margin: 0, 
                color: '#1f2937',
                fontSize: isMobile ? '14px' : '16px',
                fontWeight: '600',
                wordBreak: 'break-word',
                lineHeight: 1.2
              }}>
                {unit.unitName}
              </Title>
            </div>
          </div>

          {/* Statistics */}
          <div style={{ marginBottom: isMobile ? '12px' : '16px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: isMobile ? '8px' : '10px',
              flexWrap: 'wrap',
              gap: '4px'
            }}>
              <Text style={{ color: '#6b7280', fontSize: isMobile ? '11px' : '12px', fontWeight: '500', flexShrink: 0 }}>
                Mevcut Stok
              </Text>
              <Text style={{ 
                color: '#1f2937', 
                fontSize: isMobile ? '16px' : '18px', 
                fontWeight: '600',
                wordBreak: 'break-word',
                textAlign: 'right',
                lineHeight: 1.2
              }}>
                {((typeof unit?.totalStock === 'number' ? unit.totalStock : parseFloat(unit?.totalStock) || 0) || 0).toFixed(2).replace(/^0+(?=\d)/, '')} gr
              </Text>
            </div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: isMobile ? '8px' : '10px',
              flexWrap: 'wrap',
              gap: '4px'
            }}>
              <Text style={{ color: '#6b7280', fontSize: isMobile ? '11px' : '12px', fontWeight: '500', flexShrink: 0 }}>
                Has Karşılığı
              </Text>
              <Text style={{ 
                color: '#059669', 
                fontSize: isMobile ? '14px' : '16px', 
                fontWeight: '600',
                wordBreak: 'break-word',
                textAlign: 'right',
                lineHeight: 1.2
              }}>
                {((typeof unit?.hasEquivalent === 'number' ? unit.hasEquivalent : parseFloat(unit?.hasEquivalent) || 0) || 0).toFixed(2).replace(/^0+(?=\d)/, '')} gr
              </Text>
            </div>

            {/* Fire Display (only for fire units) */}
            {FIRE_UNITS.includes(unit.unitId as UnitType) && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginTop: isMobile ? '4px' : '6px'
              }}>
                <Text style={{ color: '#6b7280', fontSize: isMobile ? '11px' : '12px', fontWeight: '500' }}>
                  Fire
                </Text>
                <Tag color={getFireColor(unit?.totalFire || 0)} style={{ 
                  fontWeight: '600',
                  borderRadius: '6px',
                  padding: '2px 6px',
                  fontSize: isMobile ? '11px' : '12px'
                }}>
                  {((typeof unit?.totalFire === 'number' ? unit.totalFire : parseFloat(unit?.totalFire) || 0) || 0).toFixed(2).replace(/^0+(?=\d)/, '')} gr
                </Tag>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div style={{ marginTop: 'auto' }}>
          <Button
            type="primary"
            size={isMobile ? 'small' : 'middle'}
            block
            style={{
              background: '#f8fafc',
              border: '1px solid #e5e7eb',
              borderRadius: isMobile ? '8px' : '10px',
              height: isMobile ? '36px' : '40px',
              fontWeight: '600',
              fontSize: isMobile ? '12px' : '13px',
              color: '#64748b',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.color = '#1f2937';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            {isExternalVault ? 'Dış Kasa' : 'Detayları Gör'}
            <ArrowRightOutlined style={{ marginLeft: '6px', fontSize: isMobile ? '12px' : '14px' }} />
          </Button>
        </div>
      </Card>
    </Col>
  );
});

const UnitDashboard: React.FC = () => {
  const { unitSummaries, transfers, deleteTransfer, isLoading } = useTransfers();
  const { totalStock: externalVaultStock, totalHas: externalVaultHas, stockByKarat: externalVaultStockByKarat } = useExternalVault();
  const { settings, updateUnitOrder } = useDashboardSettings();
  const { addLog } = useLog();
  const { user } = useAuth();
  const [selectedUnit, setSelectedUnit] = useState<UnitSummary | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const { isMobile } = useResponsive();
  
  // Normal kullanıcılar için admin değil
  const isAdmin = user?.role === 'admin';

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDeleteTransfer = useCallback((id: string) => {
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
  }, [transfers, deleteTransfer, addLog]);

  // Dış Kasa için özel kart verisi - ExternalVaultContext'ten gerçek verileri kullan
  const externalVaultUnit = useMemo<UnitSummary>(() => ({
    unitId: 'dis-kasa',
    unitName: 'Dış Kasa',
    totalStock: externalVaultStock,
    totalFire: 0,
    hasEquivalent: externalVaultHas,
    stockByKarat: externalVaultStockByKarat,
    lastUpdate: new Date().toISOString()
  }), [externalVaultStock, externalVaultHas, externalVaultStockByKarat]);

  // Tüm birimleri birleştir
  const allUnits = useMemo(() => [...unitSummaries, externalVaultUnit], [unitSummaries, externalVaultUnit]);

  // Birimleri kullanıcının ayarladığı sıraya göre sırala ve gizli olanları filtrele
  const sortedUnits = useMemo(() => {
    let filtered = settings.unitOrder
      .map(unitId => allUnits.find(u => u.unitId === unitId))
      .filter((unit): unit is UnitSummary => unit !== undefined)
      .filter(unit => !settings.hiddenUnits.includes(unit.unitId as UnitType));
    
    // Normal kullanıcılar için sadece Lazer Kesim, Tezgah ve Cila görünür
    if (!isAdmin) {
      const allowedUnits = ['lazer-kesim', 'tezgah', 'cila'];
      filtered = filtered.filter(unit => allowedUnits.includes(unit.unitId));
    }
    
    return filtered;
  }, [settings.unitOrder, settings.hiddenUnits, allUnits, isAdmin]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedUnits.findIndex(u => u.unitId === active.id);
      const newIndex = sortedUnits.findIndex(u => u.unitId === over.id);

      const newOrder = arrayMove(sortedUnits, oldIndex, newIndex).map(u => u.unitId as UnitType);
      updateUnitOrder(newOrder);
      message.success('Birim sıralaması güncellendi');
    }
  }, [sortedUnits, updateUnitOrder]);

  // Seçili birim için son 10 işlemi getir
  const getRecentTransactions = useCallback((unitId: string) => {
    return transfers
      .filter(t => t.fromUnit === unitId || t.toUnit === unitId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [transfers]);

  // getUnitIcon - Modal ve diğer yerler için
  const getUnitIcon = (unitId: string, color: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      'ana-kasa': <BankOutlined style={{ fontSize: '24px', color }} />,
      'yarimamul': <GoldOutlined style={{ fontSize: '24px', color }} />,
      'lazer-kesim': <ThunderboltOutlined style={{ fontSize: '24px', color }} />,
      'tezgah': <ToolOutlined style={{ fontSize: '24px', color }} />,
      'cila': <CrownOutlined style={{ fontSize: '24px', color }} />,
      'dokum': <GoldOutlined style={{ fontSize: '24px', color }} />,
      'tedarik': <ToolOutlined style={{ fontSize: '24px', color }} />,
      'satis': <ShoppingCartOutlined style={{ fontSize: '24px', color }} />,
      'dis-kasa': <BankOutlined style={{ fontSize: '24px', color }} />
    };
    return icons[unitId] || <BankOutlined style={{ fontSize: '24px', color }} />;
  };

  const getUnitColor = (index: number) => {
    const colors = ['#1890ff', '#52c41a', '#fa8c16', '#722ed1', '#eb2f96', '#13c2c2'];
    return colors[index % colors.length];
  };

  const getFireColor = (fireAmount: number) => {
    if (fireAmount === 0) return 'success';
    if (fireAmount < 5) return 'warning';
    return 'error';
  };

  const columns = [
    {
      title: 'Ayar',
      dataIndex: 'karat',
      key: 'karat',
      render: (karat: string) => karat === '24K' ? 'Has Altın' : karat.replace('K', ' Ayar')
    },
    {
      title: 'Mevcut Stok (gr)',
      dataIndex: 'stock',
      key: 'stock',
      render: (value: number) => (typeof value === 'number' ? value : parseFloat(value) || 0).toFixed(2)
    },
    {
      title: 'Has Karşılığı (gr)',
      dataIndex: 'has',
      key: 'has',
      render: (value: number) => (typeof value === 'number' ? value : parseFloat(value) || 0).toFixed(2)
    }
  ];

  const handleUnitClick = useCallback((unit: UnitSummary) => {
    setSelectedUnit(unit);
    setModalVisible(true);
  }, []);

  const getKaratDetailData = (unit: UnitSummary) => {
    const karats: KaratType[] = ['14K', '18K', '22K', '24K'];
    return karats.map(karat => ({
      key: karat,
      karat,
      stock: unit.stockByKarat[karat].currentStock,
      has: unit.stockByKarat[karat].hasEquivalent,
      fire: unit.stockByKarat[karat].fire
    })).filter(item => item.stock > 0 || item.fire > 0);
  };

  // Toplam özet istatistikler - TÜM birimler için (gizli olsalar bile)
  // Sadece gösterilen birimler değil, tüm birimlerin toplamı hesaplanmalı
  // Dış kasa toplam stok hesabına dahil edilmez
  // unitSummaries'den hesapla (externalVaultUnit dahil edilmez)
  const totalStats = useMemo(() => {
    const total = unitSummaries
      .filter(unit => unit.unitId !== 'dis-kasa')
      .reduce((acc, unit) => {
        const stock = typeof unit?.totalStock === 'number' ? unit.totalStock : parseFloat(unit?.totalStock) || 0;
        const has = typeof unit?.hasEquivalent === 'number' ? unit.hasEquivalent : parseFloat(unit?.hasEquivalent) || 0;
        return {
          stock: acc.stock + stock,
          has: acc.has + has
        };
      }, { stock: 0, has: 0 });
    return total;
  }, [unitSummaries]);

  // Loading state
  if (isLoading) {
    return (
      <div className="fade-in" style={{ padding: '0 8px' }}>
        {/* Header Skeleton */}
        <div style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          borderRadius: '20px',
          padding: '40px 32px',
          marginBottom: '32px',
          textAlign: 'center'
        }}>
          <Skeleton.Input active size="large" style={{ width: 300, height: 60 }} />
          <br />
          <Skeleton.Input active size="default" style={{ width: 400, height: 30, marginTop: 16 }} />
        </div>
        
        {/* Quick Stats Skeleton */}
        <Row gutter={[24, 20]} style={{ marginBottom: '32px' }}>
          <Col xs={24} sm={12} md={12}>
            <Card>
              <Skeleton active paragraph={{ rows: 2 }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12}>
            <Card>
              <Skeleton active paragraph={{ rows: 2 }} />
            </Card>
          </Col>
        </Row>
        
        {/* Units Skeleton */}
        <Row gutter={[24, 20]}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Col xs={24} sm={12} lg={8} xl={6} key={i}>
              <Card>
                <Skeleton active avatar paragraph={{ rows: 3 }} />
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  }
  
  return (
    <div className="fade-in" style={{ padding: isMobile ? '8px 4px' : '0 12px' }}>
      {/* Modern Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        borderRadius: isMobile ? '16px' : '18px',
        padding: isMobile ? '20px 16px' : '24px 24px',
        marginBottom: isMobile ? '16px' : '20px',
        color: '#1f2937',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid #e5e7eb'
      }}>
        {/* Decorative Elements */}
        <div style={{
          position: 'absolute',
          top: '-30px',
          right: '-30px',
          width: '120px',
          height: '120px',
          background: 'rgba(148, 163, 184, 0.1)',
          borderRadius: '50%',
          opacity: 0.5
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-20px',
          left: '-20px',
          width: '80px',
          height: '80px',
          background: 'rgba(148, 163, 184, 0.08)',
          borderRadius: '50%',
          opacity: 0.4
        }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Space direction="vertical" size={12}>
            <div>
              <Title level={1} style={{ 
                margin: 0, 
                marginBottom: '4px',
                color: '#1f2937', 
                fontSize: isMobile ? '20px' : '28px',
                fontWeight: '700',
                lineHeight: 1.2
              }}>
                Dashboard
              </Title>
              <Text style={{ 
                color: '#6b7280', 
                fontSize: isMobile ? '12px' : '14px',
                fontWeight: '400'
              }}>
                Tüm üretim birimlerinizin anlık durumunu takip edin
              </Text>
            </div>
            
            {/* Quick Stats - Sadece admin için göster */}
            {isAdmin && (
              <Row gutter={[12, 12]} style={{ marginTop: isMobile ? '12px' : '16px' }}>
                <Col xs={24} sm={12} md={12}>
                  <div style={{
                    background: 'white',
                    borderRadius: isMobile ? '14px' : '16px',
                    padding: isMobile ? '12px' : '16px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    minHeight: isMobile ? '80px' : '100px',
                    height: isMobile ? 'auto' : '100px',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '14px', width: '100%', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                      <div style={{
                        background: '#f8fafc',
                        borderRadius: isMobile ? '10px' : '12px',
                        padding: isMobile ? '10px' : '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: isMobile ? '40px' : '48px',
                        width: isMobile ? '40px' : '48px',
                        height: isMobile ? '40px' : '48px',
                        flexShrink: 0
                      }}>
                        <GoldOutlined style={{ fontSize: isMobile ? '18px' : '22px', color: '#64748b' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ 
                          color: '#64748b', 
                          fontSize: isMobile ? '12px' : '14px', 
                          fontWeight: '500',
                          display: 'block',
                          marginBottom: isMobile ? '2px' : '4px'
                        }}>
                          Toplam Stok
                        </Text>
                        <Text style={{ 
                          color: '#1f2937', 
                          fontSize: isMobile ? '18px' : '28px', 
                          fontWeight: '600',
                          display: 'block',
                          whiteSpace: isMobile ? 'normal' : 'nowrap',
                          wordBreak: 'break-word',
                          lineHeight: 1.2
                        }}>
                          {(typeof totalStats.stock === 'number' ? totalStats.stock : parseFloat(totalStats.stock) || 0).toFixed(2).replace(/^0+(?=\d)/, '')} gr
                        </Text>
                      </div>
                    </div>
                  </div>
                </Col>
                
                <Col xs={24} sm={12} md={12}>
                  <div style={{
                    background: 'white',
                    borderRadius: isMobile ? '14px' : '16px',
                    padding: isMobile ? '12px' : '16px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    minHeight: isMobile ? '80px' : '100px',
                    height: isMobile ? 'auto' : '100px',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '14px', width: '100%', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                      <div style={{
                        background: '#f8fafc',
                        borderRadius: isMobile ? '10px' : '12px',
                        padding: isMobile ? '10px' : '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: isMobile ? '40px' : '48px',
                        width: isMobile ? '40px' : '48px',
                        height: isMobile ? '40px' : '48px',
                        flexShrink: 0
                      }}>
                        <CrownOutlined style={{ fontSize: isMobile ? '18px' : '22px', color: '#64748b' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ 
                          color: '#64748b', 
                          fontSize: isMobile ? '12px' : '14px', 
                          fontWeight: '500',
                          display: 'block',
                          marginBottom: isMobile ? '2px' : '4px'
                        }}>
                          Has Karşılığı
                        </Text>
                        <Text style={{ 
                          color: '#1f2937', 
                          fontSize: isMobile ? '18px' : '28px', 
                          fontWeight: '600',
                          display: 'block',
                          whiteSpace: isMobile ? 'normal' : 'nowrap',
                          wordBreak: 'break-word',
                          lineHeight: 1.2
                        }}>
                          {(typeof totalStats.has === 'number' ? totalStats.has : parseFloat(totalStats.has) || 0).toFixed(2).replace(/^0+(?=\d)/, '')} gr
                        </Text>
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>
            )}
          </Space>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={sortedUnits.map(u => u.unitId)} 
          strategy={rectSortingStrategy}
        >
          <Row gutter={[isMobile ? 8 : 12, isMobile ? 12 : 16]}>
            {sortedUnits.length === 0 ? (
              <Col span={24}>
                <Card style={{ textAlign: 'center', padding: '40px' }}>
                  <GoldOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: 16 }} />
                  <Title level={4} type="secondary">Henüz transfer işlemi yok</Title>
                  <Text type="secondary">Transfer işlemi yaparak başlayın</Text>
                </Card>
              </Col>
            ) : (
              sortedUnits.map((unit, index) => (
                <SortableUnitCard
                  key={unit.unitId}
                  unit={unit}
                  index={index}
                  onClick={() => handleUnitClick(unit)}
                  isMobile={isMobile}
                />
              ))
            )}
          </Row>
        </SortableContext>
      </DndContext>

      <Modal
        title={
          <Space>
            {selectedUnit && getUnitIcon(selectedUnit.unitId, '#1890ff')}
            <span>{selectedUnit?.unitName} Detayları</span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            Kapat
          </Button>,
          <Button
            key="transfer" 
            type="primary" 
            icon={<SwapOutlined />}
            onClick={() => setTransferModalOpen(true)}
          >
            Transfer Yap
          </Button>
        ]}
        width={isMobile ? '95%' : 800}
        style={isMobile ? { top: 20, paddingBottom: 0 } : undefined}
      >
        {selectedUnit && (
          <div>
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={FIRE_UNITS.includes(selectedUnit.unitId) ? 8 : 12}>
                <Statistic
                  title="Toplam Stok"
                  value={selectedUnit.totalStock}
                  suffix={<span style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>gr</span>}
                  valueStyle={{ color: '#1890ff' }}
                  precision={2}
                />
              </Col>
              {FIRE_UNITS.includes(selectedUnit.unitId) && (
                <Col span={8}>
                  <Statistic
                    title="Fire Miktarı"
                    value={selectedUnit.totalFire}
                    suffix={<span style={{ fontSize: '16px', fontWeight: 'bold', color: selectedUnit.totalFire > 0 ? '#ff4d4f' : '#52c41a' }}>gr</span>}
                    valueStyle={{ color: selectedUnit.totalFire > 0 ? '#ff4d4f' : '#52c41a' }}
                    precision={2}
                  />
                </Col>
              )}
              <Col span={FIRE_UNITS.includes(selectedUnit.unitId) ? 8 : 12}>
                <Statistic
                  title="Has Karşılığı"
                  value={selectedUnit.hasEquivalent}
                  suffix={<span style={{ fontSize: '16px', fontWeight: 'bold', color: '#52c41a' }}>gr</span>}
                  valueStyle={{ color: '#52c41a' }}
                  precision={2}
                />
              </Col>
            </Row>

            <Title level={4}>Ayar Bazlı Stok Dağılımı</Title>
            <Table
              columns={columns}
              dataSource={getKaratDetailData(selectedUnit)}
              pagination={false}
              size="small"
              locale={{ emptyText: 'Bu birimde henüz stok yok' }}
            />

            <Divider />

            <Title level={4}>
              <Space>
                <HistoryOutlined />
                Son 10 İşlem
              </Space>
            </Title>
            
            {(() => {
              const recentTransactions = getRecentTransactions(selectedUnit.unitId);
              
              if (recentTransactions.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                    <Text type="secondary">Henüz işlem yok</Text>
                  </div>
                );
              }

              const transactionColumns: ColumnsType<any> = [
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
                  width: 140
                },
                {
                  title: 'İşlem',
                  key: 'transaction',
                  render: (record: any) => {
                    const isIncoming = record.toUnit === selectedUnit.unitId;
                    const otherUnit = isIncoming ? record.fromUnit : record.toUnit;
                    const unitLabel = sortedUnits.find(u => u.unitId === otherUnit)?.unitName || otherUnit;
                    
                    return (
                      <Space size="small">
                        {isIncoming ? (
                          <>
                            <Tag color="green">Giriş</Tag>
                            <Text type="secondary">{unitLabel}</Text>
                            <ArrowRightOutlined style={{ fontSize: '12px', color: '#52c41a' }} />
                            <Text strong>{selectedUnit.unitName}</Text>
                          </>
                        ) : (
                          <>
                            <Tag color="red">Çıkış</Tag>
                            <Text strong>{selectedUnit.unitName}</Text>
                            <ArrowRightOutlined style={{ fontSize: '12px', color: '#ff4d4f' }} />
                            <Text type="secondary">{unitLabel}</Text>
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
                  width: 80,
                  render: (karat: string) => <Tag color="blue">{karat === '24K' ? 'Has Altın' : karat.replace('K', ' Ayar')}</Tag>
                },
                {
                  title: 'Miktar',
                  dataIndex: 'amount',
                  key: 'amount',
                  width: 100,
                  render: (amount: number, record: any) => {
                    const isIncoming = record.toUnit === selectedUnit.unitId;
                    const safeAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
                    return (
                      <Text style={{ 
                        color: isIncoming ? '#52c41a' : '#ff4d4f',
                        fontWeight: 600
                      }}>
                        {isIncoming ? '+' : '-'}{safeAmount.toFixed(2)} gr
                      </Text>
                    );
                  }
                },
                {
                  title: 'İşlemler',
                  key: 'actions',
                  width: 80,
                  align: 'center',
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

              return (
                <Table
                  columns={transactionColumns}
                  dataSource={recentTransactions}
                  pagination={false}
                  size="small"
                  rowKey="id"
                  scroll={{ x: 600 }}
                />
              );
            })()}
          </div>
        )}
      </Modal>

      <TransferModal 
        open={transferModalOpen} 
        onClose={() => setTransferModalOpen(false)}
        defaultFromUnit={selectedUnit?.unitId}
      />
    </div>
  );
};

export default UnitDashboard;
