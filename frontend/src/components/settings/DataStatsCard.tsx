import React, { useState, useEffect } from 'react';
import { Card, Space, Typography, Row, Col, Statistic, Badge, Tag, Divider, Switch, message, Progress } from 'antd';
import { SafetyOutlined, CheckCircleOutlined, SyncOutlined, ClockCircleOutlined, DatabaseOutlined, CloudServerOutlined } from '@ant-design/icons';
import { SETTINGS_TEXTS } from '../../constants/settings';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/tr';

dayjs.extend(relativeTime);
dayjs.locale('tr');

const { Title, Text } = Typography;

interface DataStatsCardProps {
  className?: string;
}

export const DataStatsCard: React.FC<DataStatsCardProps> = ({ className }) => {
  const [autoSync, setAutoSync] = useState(() => {
    return localStorage.getItem('autoSync') === 'true';
  });
  const [lastSyncTime, setLastSyncTime] = useState(() => {
    return localStorage.getItem('lastSyncTime') || dayjs().toISOString();
  });
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'synced' | 'error'>('synced');

  const getDataCount = (key: string) => {
    return JSON.parse(localStorage.getItem(key) || '[]').length;
  };

  const transfersCount = getDataCount('transfers');
  const externalVaultCount = getDataCount('externalVaultTransactions');
  const companiesCount = getDataCount('companies');
  const totalCount = transfersCount + externalVaultCount + companiesCount;

  // Veri boyutunu hesapla (KB)
  const getDataSize = () => {
    const allData = (localStorage.getItem('transfers') || '') + 
                    (localStorage.getItem('externalVaultTransactions') || '') + 
                    (localStorage.getItem('companies') || '');
    return (new Blob([allData]).size / 1024).toFixed(2);
  };

  const handleAutoSyncToggle = (checked: boolean) => {
    setAutoSync(checked);
    localStorage.setItem('autoSync', checked.toString());
    message.success(checked ? 'Otomatik senkronizasyon açıldı' : 'Otomatik senkronizasyon kapatıldı');
    
    if (checked) {
      performSync();
    }
  };

  const performSync = () => {
    setSyncStatus('syncing');
    
    // Simüle edilmiş senkronizasyon
    setTimeout(() => {
      const now = dayjs().toISOString();
      setLastSyncTime(now);
      localStorage.setItem('lastSyncTime', now);
      setSyncStatus('synced');
      message.success('Veriler senkronize edildi');
    }, 1500);
  };

  // Otomatik senkronizasyon
  useEffect(() => {
    if (!autoSync) return;

    const interval = setInterval(() => {
      performSync();
    }, 60000); // Her dakika

    return () => clearInterval(interval);
  }, [autoSync]);

  return (
    <Card 
      title={
        <Space>
          <DatabaseOutlined style={{ color: '#1890ff' }} />
          <span>{SETTINGS_TEXTS.TITLES.DATA_STATS}</span>
        </Space>
      }
      extra={
        <Badge 
          status={syncStatus === 'synced' ? 'success' : syncStatus === 'syncing' ? 'processing' : 'error'} 
          text={syncStatus === 'synced' ? 'Senkronize' : syncStatus === 'syncing' ? 'Senkronize ediliyor...' : 'Hata'} 
        />
      }
      style={{ borderRadius: 12 }}
      className={className}
    >
      {/* Veri İstatistikleri */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Statistic
            title="Transfer Sayısı"
            value={transfersCount}
            prefix={<CheckCircleOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="Dış Kasa İşlem"
            value={externalVaultCount}
            prefix={<CheckCircleOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="Kayıtlı Firma"
            value={companiesCount}
            prefix={<CheckCircleOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="Toplam Veri"
            value={totalCount}
            prefix={<CheckCircleOutlined />}
          />
        </Col>
      </Row>

      <Divider />

      {/* Senkronizasyon Bilgileri */}
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Card size="small" style={{ background: '#f8fafc', borderRadius: '8px' }}>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space>
                    <CloudServerOutlined style={{ fontSize: '18px', color: '#1890ff' }} />
                    <Text strong>Veri Boyutu</Text>
                  </Space>
                  <Tag color="blue">{getDataSize()} KB</Tag>
                </div>
                <Progress 
                  percent={Math.min((parseFloat(getDataSize()) / 500) * 100, 100)} 
                  showInfo={false}
                  strokeColor="#1890ff"
                  size="small"
                />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Maksimum 500 KB
                </Text>
              </Space>
            </Card>
          </Col>

          <Col xs={24} sm={12}>
            <Card size="small" style={{ background: '#f8fafc', borderRadius: '8px' }}>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space>
                    <ClockCircleOutlined style={{ fontSize: '18px', color: '#52c41a' }} />
                    <Text strong>Son Senkronizasyon</Text>
                  </Space>
                </div>
                <Text style={{ fontSize: '14px', color: '#1f2937' }}>
                  {dayjs(lastSyncTime).format('DD.MM.YYYY HH:mm')}
                </Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {dayjs(lastSyncTime).fromNow()}
                </Text>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Otomatik Senkronizasyon */}
        <Card 
          size="small" 
          style={{ 
            background: autoSync ? '#f0f9ff' : '#f8fafc', 
            borderRadius: '8px',
            border: autoSync ? '1px solid #91d5ff' : '1px solid #e5e7eb'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <SyncOutlined spin={syncStatus === 'syncing'} style={{ fontSize: '18px', color: autoSync ? '#1890ff' : '#8c8c8c' }} />
              <div>
                <Text strong>Otomatik Senkronizasyon</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {autoSync ? 'Her dakika otomatik senkronize edilir' : 'Manuel senkronizasyon gerekli'}
                </Text>
              </div>
            </Space>
            <Switch 
              checked={autoSync} 
              onChange={handleAutoSyncToggle}
              checkedChildren="Açık"
              unCheckedChildren="Kapalı"
            />
          </div>
        </Card>
      </Space>
    </Card>
  );
};
