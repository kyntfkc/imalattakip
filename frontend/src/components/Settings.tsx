import React, { useState } from 'react';
import { Row, Col, Typography, Space, Card, Alert, Tabs } from 'antd';
import { SettingOutlined, DatabaseOutlined, UserOutlined, DashboardOutlined, TagsOutlined, BarChartOutlined, CloudDownloadOutlined, MenuOutlined } from '@ant-design/icons';

// Modüler bileşenler
import { DashboardSettingsCard } from './settings/DashboardSettingsCard';
import { CinsiSettingsCard } from './settings/CinsiSettingsCard';
import { DataStatsCard } from './settings/DataStatsCard';
import { BackupCard } from './settings/BackupCard';
import MenuVisibilityCard from './settings/MenuVisibilityCard';

// Hook'lar
import { useBackendStatus } from '../hooks/useBackendStatus';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';

const { Title, Text } = Typography;

const Settings: React.FC = () => {
  const { isBackendOnline, isChecking } = useBackendStatus();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('system');
  const { isMobile } = useResponsive();

  return (
    <div className="fade-in" style={{ padding: '0' }}>
      {/* Minimal Header */}
      <Card 
        style={{ 
          marginBottom: 16, 
          borderRadius: '12px',
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          boxShadow: 'none'
        }}
        styles={{ body: { padding: '16px' } }}
      >
        <Row align="middle" justify="space-between">
          <Col>
            <Space size={12} align="center">
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #e5e7eb'
              }}>
                <SettingOutlined style={{ fontSize: '20px', color: '#64748b' }} />
              </div>
              <div>
                <Space size={8} align="center">
                  <Title level={4} style={{ margin: 0, color: '#1f2937', fontSize: '18px', fontWeight: '600' }}>
                    Ayarlar
                  </Title>
                  {!isChecking && (
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: isBackendOnline ? '#22c55e' : '#ef4444'
                    }} />
                  )}
                </Space>
              </div>
            </Space>
          </Col>
        </Row>
        
        {!isBackendOnline && (
          <div style={{ marginTop: 20 }}>
            <Alert
              message="Backend Bağlantısı Yok"
              description="Backend sunucusunu başlatmanız gerekiyor. Dropbox klasöründeki 'start-backend.bat' dosyasını çalıştırın."
              type="error"
              showIcon
              style={{ borderRadius: '12px' }}
            />
          </div>
        )}
      </Card>

      {/* Tabbed Settings */}
      <Card 
        style={{ 
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
        }}
        styles={{ body: { padding: isMobile ? '12px' : '20px' } }}
      >
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          style={{ marginBottom: 0 }}
          size={isMobile ? 'small' : 'middle'}
          type={isMobile ? 'line' : 'line'}
          items={[
            {
              key: 'system',
              label: (
                <Space size={8}>
                  <DatabaseOutlined style={{ fontSize: '16px' }} />
                  <span>Sistem</span>
                </Space>
              ),
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={12}>
                    <Card 
                      size="small"
                      style={{ 
                        borderRadius: '8px',
                        border: '1px solid #f3f4f6',
                        background: '#fafafa'
                      }}
                      styles={{ body: { padding: '16px' } }}
                    >
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        <Space align="center" size={8}>
                          <UserOutlined style={{ color: '#64748b', fontSize: '16px' }} />
                          <Text strong style={{ color: '#1f2937', fontSize: '14px' }}>Kullanıcı Bilgileri</Text>
                        </Space>
                        <div style={{ paddingLeft: '24px' }}>
                          <Text style={{ color: '#64748b', fontSize: '13px' }}>Kullanıcı: {user?.username}</Text>
                          <br />
                          <Text style={{ color: '#64748b', fontSize: '13px' }}>Rol: {user?.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}</Text>
                          <br />
                          <Text style={{ color: '#64748b', fontSize: '13px' }}>ID: {user?.id}</Text>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                  <Col xs={24} lg={12}>
                    <Card 
                      size="small"
                      style={{ 
                        borderRadius: '8px',
                        border: '1px solid #f3f4f6',
                        background: '#fafafa'
                      }}
                      styles={{ body: { padding: '16px' } }}
                    >
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        <Space align="center" size={8}>
                          <DatabaseOutlined style={{ color: '#64748b', fontSize: '16px' }} />
                          <Text strong style={{ color: '#1f2937', fontSize: '14px' }}>Veri Yönetimi</Text>
                        </Space>
                        <div style={{ paddingLeft: '24px' }}>
                          <Text style={{ color: '#64748b', fontSize: '13px' }}>
                            Veriler otomatik olarak Dropbox klasöründe yedekleniyor.
                          </Text>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                </Row>
              )
            },
            {
              key: 'dashboard',
              label: (
                <Space size={8}>
                  <DashboardOutlined style={{ fontSize: '16px' }} />
                  <span>Dashboard</span>
                </Space>
              ),
              children: <DashboardSettingsCard />
            },
            {
              key: 'cinsi',
              label: (
                <Space size={8}>
                  <TagsOutlined style={{ fontSize: '16px' }} />
                  <span>Cinsi Ayarları</span>
                </Space>
              ),
              children: <CinsiSettingsCard />
            },
            {
              key: 'data',
              label: (
                <Space size={8}>
                  <BarChartOutlined style={{ fontSize: '16px' }} />
                  <span>Veri İstatistikleri</span>
                </Space>
              ),
              children: <DataStatsCard />
            },
            {
              key: 'backup',
              label: (
                <Space size={8}>
                  <CloudDownloadOutlined style={{ fontSize: '16px' }} />
                  <span>Yedekleme</span>
                </Space>
              ),
              children: <BackupCard />
            },
            {
              key: 'menu',
              label: (
                <Space size={8}>
                  <MenuOutlined style={{ fontSize: '16px' }} />
                  <span>Menü Görünürlüğü</span>
                </Space>
              ),
              children: <MenuVisibilityCard />
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default Settings;
