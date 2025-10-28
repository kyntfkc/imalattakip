import React, { useState } from 'react';
import { Row, Col, Typography, Space, Card, Button, Alert, Divider, Tabs, Badge } from 'antd';
import { SettingOutlined, DatabaseOutlined, UserOutlined, ReloadOutlined, DashboardOutlined, TagsOutlined, BarChartOutlined, CloudDownloadOutlined } from '@ant-design/icons';

// Modüler bileşenler
import { DashboardSettingsCard } from './settings/DashboardSettingsCard';
import { CinsiSettingsCard } from './settings/CinsiSettingsCard';
import { DataStatsCard } from './settings/DataStatsCard';
import { BackupCard } from './settings/BackupCard';

// Hook'lar
import { useBackendStatus } from '../hooks/useBackendStatus';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const Settings: React.FC = () => {
  const { isBackendOnline, isChecking } = useBackendStatus();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('system');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  // Mobile detection
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const refreshBackendStatus = () => {
    window.location.reload();
  };

  return (
    <div style={{ padding: '0' }}>
      {/* Kompakt Header */}
      <div style={{ 
        marginBottom: isMobile ? 16 : 20,
        padding: isMobile ? '12px 16px' : '16px 20px',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        borderRadius: isMobile ? '12px' : '12px',
        border: '1px solid #e5e7eb'
      }}>
        <Space align="center" size={isMobile ? 12 : 16}>
          <div style={{
            width: isMobile ? '36px' : '40px',
            height: isMobile ? '36px' : '40px',
            borderRadius: '10px',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #d1d5db',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}>
            <SettingOutlined style={{ fontSize: isMobile ? '18px' : '20px', color: '#64748b' }} />
          </div>
          <div>
            <Title level={3} style={{ margin: 0, color: '#1f2937', fontSize: isMobile ? '18px' : '20px' }}>Ayarlar</Title>
            {!isMobile && <Text type="secondary" style={{ fontSize: '14px' }}>Sistem ve kullanıcı ayarları</Text>}
          </div>
        </Space>
      </div>

      {/* Backend Status - Kompakt */}
      <Card 
        style={{ 
          marginBottom: isMobile ? 16 : 20,
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
        }}
        styles={{ body: { padding: isMobile ? '12px' : '16px' } }}
      >
        <Space align="center" style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Space align="center" size={8}>
            <Badge 
              status={isBackendOnline ? 'success' : 'error'} 
              text={
                <Text style={{ 
                  color: isBackendOnline ? '#059669' : '#dc2626',
                  fontWeight: '500',
                  fontSize: isMobile ? '13px' : '14px'
                }}>
                  {isBackendOnline ? (isMobile ? 'Aktif' : 'Backend Aktif') : (isMobile ? 'Offline' : 'Backend Offline')}
                </Text>
              }
            />
          </Space>
          <Button 
            size={isMobile ? 'small' : 'small'}
            icon={<ReloadOutlined />} 
            onClick={refreshBackendStatus}
            style={{ borderRadius: '6px', fontSize: isMobile ? '12px' : '13px' }}
          >
            {isMobile ? '' : 'Yenile'}
          </Button>
        </Space>
        
        {!isBackendOnline && (
          <Alert
            message="Backend Bağlantısı Yok"
            description="Backend sunucusunu başlatmanız gerekiyor. Dropbox klasöründeki 'start-backend.bat' dosyasını çalıştırın."
            type="error"
            showIcon
            style={{ marginTop: 12, borderRadius: '8px' }}
          />
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
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default Settings;