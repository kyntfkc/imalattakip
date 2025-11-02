import React, { useState } from 'react';
import { Card, Switch, Space, Typography, Row, Col, Divider, Button, message, Tabs, Alert } from 'antd';
import { MenuOutlined, ReloadOutlined, EyeOutlined, EyeInvisibleOutlined, CrownOutlined, TeamOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

interface MenuItem {
  key: string;
  label: string;
  category: string;
  roles: ('admin' | 'user')[]; // Hangi roller için görünebilir
}

const menuItems: MenuItem[] = [
  { key: 'dashboard', label: 'Dashboard', category: 'Genel', roles: ['admin', 'user'] },
  { key: 'ana-kasa', label: 'Ana Kasa', category: 'Üretim Birimleri', roles: ['admin', 'user'] },
  { key: 'yarimamul', label: 'Yarımamül', category: 'Üretim Birimleri', roles: ['admin', 'user'] },
  { key: 'lazer-kesim', label: 'Lazer Kesim', category: 'Üretim Birimleri', roles: ['admin', 'user'] },
  { key: 'tezgah', label: 'Tezgah', category: 'Üretim Birimleri', roles: ['admin', 'user'] },
  { key: 'cila', label: 'Cila', category: 'Üretim Birimleri', roles: ['admin', 'user'] },
  { key: 'external-vault', label: 'Dış Kasa', category: 'Diğer Birimler', roles: ['admin', 'user'] },
  { key: 'dokum', label: 'Döküm', category: 'Diğer Birimler', roles: ['admin', 'user'] },
  { key: 'tedarik', label: 'Tedarik', category: 'Diğer Birimler', roles: ['admin', 'user'] },
  { key: 'satis', label: 'Satış', category: 'Diğer Birimler', roles: ['admin', 'user'] },
  { key: 'required-has', label: 'Gereken Has', category: 'Raporlar', roles: ['admin', 'user'] },
  { key: 'reports', label: 'Raporlar', category: 'Raporlar', roles: ['admin', 'user'] },
  { key: 'companies', label: 'Firmalar', category: 'Raporlar', roles: ['admin', 'user'] },
  { key: 'settings', label: 'Ayarlar', category: 'Sistem', roles: ['admin', 'user'] },
  { key: 'logs', label: 'Sistem Logları', category: 'Sistem', roles: ['admin'] }, // Sadece admin
  { key: 'user-management', label: 'Kullanıcı Yönetimi', category: 'Sistem', roles: ['admin'] }, // Sadece admin
];

// Rol bazlı varsayılan ayarlar
const defaultSettingsByRole: Record<'admin' | 'user', Record<string, boolean>> = {
  admin: {
    dashboard: true,
    'ana-kasa': true,
    'yarimamul': true,
    'lazer-kesim': true,
    'tezgah': true,
    'cila': true,
    'external-vault': true,
    'dokum': true,
    'tedarik': true,
    'satis': true,
    'required-has': true,
    'reports': true,
    'companies': true,
    'logs': true,
    'settings': true,
    'user-management': true,
  },
  user: {
    dashboard: true,
    'ana-kasa': true,
    'yarimamul': true,
    'lazer-kesim': true,
    'tezgah': true,
    'cila': true,
    'external-vault': true,
    'dokum': true,
    'tedarik': true,
    'satis': true,
    'required-has': true,
    'reports': true,
    'companies': true,
    'logs': false, // User için varsayılan olarak gizli
    'settings': true,
    'user-management': false, // User için varsayılan olarak gizli
  },
};

const RoleMenuSettingsCard: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState<'admin' | 'user'>('admin');

  if (!isAdmin) {
    return (
      <Alert
        message="Yetkisiz Erişim"
        description="Rol bazlı menü ayarları sadece yöneticiler tarafından yapılandırılabilir."
        type="warning"
        style={{ borderRadius: '12px' }}
      />
    );
  }

  const handleToggle = async (menuKey: string, role: 'admin' | 'user', value: boolean) => {
    // Bu özellik backend'de rol bazlı ayarlar implement edildiğinde kullanılabilir
    message.info(`Rol bazlı ayarlar yakında eklenecek. Şu anda kullanıcı bazlı ayarlar kullanılıyor.`);
  };

  const getDefaultValue = (menuKey: string, role: 'admin' | 'user'): boolean => {
    return defaultSettingsByRole[role][menuKey] ?? true;
  };

  return (
    <div>
      <Card
        style={{
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          marginBottom: 16
        }}
        styles={{ body: { padding: '20px' } }}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <MenuOutlined style={{ fontSize: '20px', color: '#64748b' }} />
              <Title level={5} style={{ margin: 0, color: '#1f2937' }}>
                Rol Bazlı Menü Görünürlüğü
              </Title>
            </Space>
          </div>

          <Text type="secondary" style={{ fontSize: '13px' }}>
            Her rol için hangi menülerin varsayılan olarak görünür olacağını ayarlayın. 
            Kullanıcılar kendi ayarlarını değiştirebilir, ancak burada belirlediğiniz ayarlar yeni kullanıcılar için varsayılan olacaktır.
          </Text>

          <Divider style={{ margin: '16px 0' }} />

          <Tabs 
            activeKey={activeTab} 
            onChange={(key) => setActiveTab(key as 'admin' | 'user')}
            items={[
              {
                key: 'admin',
                label: (
                  <Space>
                    <CrownOutlined />
                    <span>Yönetici</span>
                  </Space>
                ),
                children: (
                  <div>
                    {Object.entries(menuItems.reduce((acc, item) => {
                      if (!acc[item.category]) {
                        acc[item.category] = [];
                      }
                      if (item.roles.includes('admin')) {
                        acc[item.category].push(item);
                      }
                      return acc;
                    }, {} as Record<string, MenuItem[]>)).map(([category, items]) => (
                      <div key={category} style={{ marginBottom: 24 }}>
                        <Text strong style={{ color: '#1f2937', fontSize: '14px', display: 'block', marginBottom: 12 }}>
                          {category}
                        </Text>
                        <Row gutter={[16, 16]}>
                          {items.map((item) => {
                            const isVisible = getDefaultValue(item.key, 'admin');
                            
                            return (
                              <Col xs={24} sm={12} md={8} lg={6} key={item.key}>
                                <Card
                                  size="small"
                                  style={{
                                    borderRadius: '8px',
                                    border: `1px solid ${isVisible ? '#d1fae5' : '#fee2e2'}`,
                                    background: isVisible ? '#f0fdf4' : '#fef2f2'
                                  }}
                                  styles={{ body: { padding: '12px' } }}
                                >
                                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <Space>
                                        {isVisible ? (
                                          <EyeOutlined style={{ color: '#22c55e', fontSize: '14px' }} />
                                        ) : (
                                          <EyeInvisibleOutlined style={{ color: '#ef4444', fontSize: '14px' }} />
                                        )}
                                        <Text style={{ fontSize: '13px', color: '#1f2937' }}>
                                          {item.label}
                                        </Text>
                                      </Space>
                                      <Switch
                                        checked={isVisible}
                                        onChange={(checked) => handleToggle(item.key, 'admin', checked)}
                                        size="small"
                                        disabled={item.roles.length === 1 && item.roles[0] === 'admin'}
                                      />
                                    </div>
                                    {item.roles.length === 1 && item.roles[0] === 'admin' && (
                                      <Text type="secondary" style={{ fontSize: '11px', fontStyle: 'italic' }}>
                                        Sadece admin
                                      </Text>
                                    )}
                                  </Space>
                                </Card>
                              </Col>
                            );
                          })}
                        </Row>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                key: 'user',
                label: (
                  <Space>
                    <TeamOutlined />
                    <span>Kullanıcı</span>
                  </Space>
                ),
                children: (
                  <div>
                    {Object.entries(menuItems.reduce((acc, item) => {
                      if (!acc[item.category]) {
                        acc[item.category] = [];
                      }
                      if (item.roles.includes('user')) {
                        acc[item.category].push(item);
                      }
                      return acc;
                    }, {} as Record<string, MenuItem[]>)).map(([category, items]) => (
                      <div key={category} style={{ marginBottom: 24 }}>
                        <Text strong style={{ color: '#1f2937', fontSize: '14px', display: 'block', marginBottom: 12 }}>
                          {category}
                        </Text>
                        <Row gutter={[16, 16]}>
                          {items.map((item) => {
                            const isVisible = getDefaultValue(item.key, 'user');
                            
                            return (
                              <Col xs={24} sm={12} md={8} lg={6} key={item.key}>
                                <Card
                                  size="small"
                                  style={{
                                    borderRadius: '8px',
                                    border: `1px solid ${isVisible ? '#d1fae5' : '#fee2e2'}`,
                                    background: isVisible ? '#f0fdf4' : '#fef2f2'
                                  }}
                                  styles={{ body: { padding: '12px' } }}
                                >
                                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <Space>
                                        {isVisible ? (
                                          <EyeOutlined style={{ color: '#22c55e', fontSize: '14px' }} />
                                        ) : (
                                          <EyeInvisibleOutlined style={{ color: '#ef4444', fontSize: '14px' }} />
                                        )}
                                        <Text style={{ fontSize: '13px', color: '#1f2937' }}>
                                          {item.label}
                                        </Text>
                                      </Space>
                                      <Switch
                                        checked={isVisible}
                                        onChange={(checked) => handleToggle(item.key, 'user', checked)}
                                        size="small"
                                        disabled={item.roles.length === 1 && item.roles[0] === 'admin'}
                                      />
                                    </div>
                                  </Space>
                                </Card>
                              </Col>
                            );
                          })}
                        </Row>
                      </div>
                    ))}
                  </div>
                ),
              },
            ]}
          />

          <Alert
            message="Bilgi"
            description="Bu ayarlar varsayılan değerlerdir. Her kullanıcı kendi menü görünürlük ayarlarını Settings > Menü Görünürlüğü bölümünden özelleştirebilir."
            type="info"
            showIcon
            style={{ borderRadius: '12px' }}
          />
        </Space>
      </Card>
    </div>
  );
};

export default RoleMenuSettingsCard;

