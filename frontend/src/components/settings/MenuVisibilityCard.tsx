import React from 'react';
import { Card, Switch, Space, Typography, Row, Col, Divider, Button, message } from 'antd';
import { MenuOutlined, ReloadOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { useMenuSettings } from '../../context/MenuSettingsContext';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

interface MenuItem {
  key: string;
  label: string;
  category: string;
}

const menuItems: MenuItem[] = [
  { key: 'dashboard', label: 'Dashboard', category: 'Genel' },
  { key: 'ana-kasa', label: 'Ana Kasa', category: 'Üretim Birimleri' },
  { key: 'yarimamul', label: 'Yarımamül', category: 'Üretim Birimleri' },
  { key: 'lazer-kesim', label: 'Lazer Kesim', category: 'Üretim Birimleri' },
  { key: 'tezgah', label: 'Tezgah', category: 'Üretim Birimleri' },
  { key: 'cila', label: 'Cila', category: 'Üretim Birimleri' },
  { key: 'external-vault', label: 'Dış Kasa', category: 'Diğer Birimler' },
  { key: 'dokum', label: 'Döküm', category: 'Diğer Birimler' },
  { key: 'tedarik', label: 'Tedarik', category: 'Diğer Birimler' },
  { key: 'satis', label: 'Satış', category: 'Diğer Birimler' },
  { key: 'required-has', label: 'Gereken Has', category: 'Raporlar' },
  { key: 'reports', label: 'Raporlar', category: 'Raporlar' },
  { key: 'companies', label: 'Firmalar', category: 'Raporlar' },
  { key: 'settings', label: 'Ayarlar', category: 'Sistem' },
  { key: 'logs', label: 'Sistem Logları', category: 'Sistem (Admin)' },
  { key: 'user-management', label: 'Kullanıcı Yönetimi', category: 'Sistem (Admin)' },
];

const MenuVisibilityCard: React.FC = () => {
  const { settings, toggleMenuVisibility, resetToDefaults, isLoading } = useMenuSettings();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Menüleri kategoriye göre grupla
  const groupedMenus = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    // Admin-only menüleri sadece admin'e göster
    if (item.category.includes('Admin') && !isAdmin) {
      return acc;
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const handleToggle = async (menuKey: string) => {
    try {
      await toggleMenuVisibility(menuKey as any);
      message.success(`${menuKey === 'dashboard' ? 'Dashboard' : menuItems.find(m => m.key === menuKey)?.label} görünürlüğü güncellendi`);
    } catch (error) {
      message.error('Görünürlük güncellenemedi');
    }
  };

  const handleReset = async () => {
    try {
      await resetToDefaults();
      message.success('Menü görünürlük ayarları varsayılan değerlere sıfırlandı');
    } catch (error) {
      message.error('Ayarlar sıfırlanamadı');
    }
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
                Menü Görünürlüğü
              </Title>
            </Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              size="small"
            >
              Varsayılana Sıfırla
            </Button>
          </div>

          <Text type="secondary" style={{ fontSize: '13px' }}>
            Menü öğelerinin görünürlüğünü kontrol edin. Gizlenen menüler sol menüde görünmez.
          </Text>

          <Divider style={{ margin: '16px 0' }} />

          {Object.entries(groupedMenus).map(([category, items]) => (
            <div key={category} style={{ marginBottom: 24 }}>
              <Text strong style={{ color: '#1f2937', fontSize: '14px', display: 'block', marginBottom: 12 }}>
                {category}
              </Text>
              <Row gutter={[16, 16]}>
                {items.map((item) => {
                  const isVisible = settings.visibleMenus[item.key as keyof typeof settings.visibleMenus] ?? true;
                  const isAdminOnly = item.category.includes('Admin');
                  
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
                              onChange={() => handleToggle(item.key)}
                              disabled={isLoading || (isAdminOnly && !isAdmin)}
                              size="small"
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
        </Space>
      </Card>
    </div>
  );
};

export default MenuVisibilityCard;

