import React, { useState, useEffect } from 'react';
import { Card, Switch, Space, Typography, Row, Col, Divider, Button, message, Tabs, Alert, Tag } from 'antd';
import { MenuOutlined, ReloadOutlined, EyeOutlined, EyeInvisibleOutlined, CrownOutlined, TeamOutlined, InfoCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { useMenuSettings } from '../../context/MenuSettingsContext';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/apiService';

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

// Rol bazlı varsayılan ayarlar (display için)
const defaultSettingsByRole: Record<'admin' | 'user', { visibleMenus: Record<string, boolean> }> = {
  admin: {
    visibleMenus: {
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
  },
  user: {
    visibleMenus: {
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
      'logs': false,
      'settings': true,
      'user-management': false,
    },
  },
};

const MenuVisibilityCard: React.FC = () => {
  const { settings, toggleMenuVisibility, resetToDefaults, isLoading } = useMenuSettings();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [showRoleDefaults, setShowRoleDefaults] = useState(false);
  const [activeRoleTab, setActiveRoleTab] = useState<'admin' | 'user'>('user');
  const [roleDefaults, setRoleDefaults] = useState<Record<'admin' | 'user', { visibleMenus: Record<string, boolean> } | null>>({
    admin: null,
    user: null
  });
  const [loadingRoleDefaults, setLoadingRoleDefaults] = useState(false);

  // Rol varsayılanlarını yükle
  useEffect(() => {
    if (isAdmin && showRoleDefaults) {
      const loadRoleDefaults = async () => {
        try {
          setLoadingRoleDefaults(true);
          const response = await apiService.getRoleMenuDefaults();
          // response type check
          if ('defaults' in response && response.defaults) {
            setRoleDefaults({
              admin: response.defaults.admin || defaultSettingsByRole.admin,
              user: response.defaults.user || defaultSettingsByRole.user
            });
          } else {
            // Fallback to default settings
            setRoleDefaults({
              admin: defaultSettingsByRole.admin,
              user: defaultSettingsByRole.user
            });
          }
        } catch (error) {
          console.error('Rol varsayılanları yüklenemedi:', error);
          setRoleDefaults({
            admin: defaultSettingsByRole.admin,
            user: defaultSettingsByRole.user
          });
        } finally {
          setLoadingRoleDefaults(false);
        }
      };
      loadRoleDefaults();
    }
  }, [isAdmin, showRoleDefaults]);

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
  
  // Rol varsayılanlarını kaydet
  const handleSaveRoleDefaults = async (role: 'admin' | 'user', newSettings: any) => {
    try {
      setLoadingRoleDefaults(true);
      await apiService.saveRoleMenuDefaults(role, newSettings);
      setRoleDefaults(prev => ({
        ...prev,
        [role]: newSettings
      }));
      message.success(`${role === 'admin' ? 'Yönetici' : 'Kullanıcı'} rolü için varsayılan ayarlar kaydedildi`);
    } catch (error: any) {
      console.error('Rol varsayılanları kaydedilemedi:', error);
      message.error(error.message || 'Rol varsayılanları kaydedilemedi');
    } finally {
      setLoadingRoleDefaults(false);
    }
  };
  
  // Rol varsayılan ayarlarını güncelle
  const handleRoleDefaultToggle = async (menuKey: string, role: 'admin' | 'user') => {
    const currentDefaults = roleDefaults[role] || defaultSettingsByRole[role];
    const newSettings = {
      ...currentDefaults,
      visibleMenus: {
        ...currentDefaults.visibleMenus,
        [menuKey]: !currentDefaults.visibleMenus[menuKey]
      }
    };
    await handleSaveRoleDefaults(role, newSettings);
  };

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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Text type="secondary" style={{ fontSize: '13px' }}>
              Menü öğelerinin görünürlüğünü kontrol edin. Gizlenen menüler sol menüde görünmez.
            </Text>
            {isAdmin && (
              <Button
                type={showRoleDefaults ? 'default' : 'link'}
                size="small"
                onClick={() => setShowRoleDefaults(!showRoleDefaults)}
                icon={<InfoCircleOutlined />}
              >
                {showRoleDefaults ? 'Varsayılanları Gizle' : 'Rol Varsayılanlarını Göster'}
              </Button>
            )}
          </div>

          {isAdmin && showRoleDefaults && (
            <Card
              style={{
                borderRadius: '12px',
                border: '1px solid #d1fae5',
                background: '#f0fdf4',
                marginBottom: 16
              }}
              styles={{ body: { padding: '16px' } }}
            >
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space>
                    <SettingOutlined style={{ fontSize: '18px', color: '#22c55e' }} />
                    <Title level={5} style={{ margin: 0, color: '#1f2937' }}>
                      Rol Varsayılan Ayarları
                    </Title>
                  </Space>
                  <Button
                    size="small"
                    onClick={() => setShowRoleDefaults(false)}
                  >
                    Kapat
                  </Button>
                </div>
                
                <Text type="secondary" style={{ fontSize: '13px' }}>
                  Her rol için varsayılan menü görünürlük ayarlarını belirleyin. Yeni kullanıcılar bu ayarlarla başlar.
                </Text>
                
                <Tabs
                  activeKey={activeRoleTab}
                  onChange={(key) => setActiveRoleTab(key as 'admin' | 'user')}
                  items={[
                    {
                      key: 'admin',
                      label: (
                        <Space>
                          <CrownOutlined />
                          <span>Yönetici Varsayılanları</span>
                        </Space>
                      ),
                      children: (
                        <div>
                          {Object.entries(groupedMenus).map(([category, items]) => (
                            <div key={category} style={{ marginBottom: 16 }}>
                              <Text strong style={{ fontSize: '13px', display: 'block', marginBottom: 8 }}>
                                {category}
                              </Text>
                              <Row gutter={[12, 12]}>
                                {items
                                  .filter(item => item.category !== 'Sistem (Admin)')
                                  .map((item) => {
                                    const currentDefaults = roleDefaults.admin || defaultSettingsByRole.admin;
                                    const isVisible = currentDefaults.visibleMenus?.[item.key] ?? true;
                                    
                                    return (
                                      <Col xs={24} sm={12} md={8} lg={6} key={item.key}>
                                        <Card
                                          size="small"
                                          style={{
                                            borderRadius: '8px',
                                            border: `1px solid ${isVisible ? '#d1fae5' : '#fee2e2'}`,
                                            background: isVisible ? '#f0fdf4' : '#fef2f2'
                                          }}
                                          styles={{ body: { padding: '10px' } }}
                                        >
                                          <Space direction="vertical" size={6} style={{ width: '100%' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                              <Space size={4}>
                                                {isVisible ? (
                                                  <EyeOutlined style={{ color: '#22c55e', fontSize: '12px' }} />
                                                ) : (
                                                  <EyeInvisibleOutlined style={{ color: '#ef4444', fontSize: '12px' }} />
                                                )}
                                                <Text style={{ fontSize: '12px', color: '#1f2937' }}>
                                                  {item.label}
                                                </Text>
                                              </Space>
                                              <Switch
                                                checked={isVisible}
                                                onChange={() => handleRoleDefaultToggle(item.key, 'admin')}
                                                size="small"
                                                disabled={loadingRoleDefaults}
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
                    {
                      key: 'user',
                      label: (
                        <Space>
                          <TeamOutlined />
                          <span>Kullanıcı Varsayılanları</span>
                        </Space>
                      ),
                      children: (
                        <div>
                          {Object.entries(groupedMenus).map(([category, items]) => (
                            <div key={category} style={{ marginBottom: 16 }}>
                              <Text strong style={{ fontSize: '13px', display: 'block', marginBottom: 8 }}>
                                {category}
                              </Text>
                              <Row gutter={[12, 12]}>
                                {items.map((item) => {
                                  const currentDefaults = roleDefaults.user || defaultSettingsByRole.user;
                                  const isVisible = currentDefaults.visibleMenus?.[item.key] ?? true;
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
                                        styles={{ body: { padding: '10px' } }}
                                      >
                                        <Space direction="vertical" size={6} style={{ width: '100%' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Space size={4}>
                                              {isVisible ? (
                                                <EyeOutlined style={{ color: '#22c55e', fontSize: '12px' }} />
                                              ) : (
                                                <EyeInvisibleOutlined style={{ color: '#ef4444', fontSize: '12px' }} />
                                              )}
                                              <Text style={{ fontSize: '12px', color: '#1f2937' }}>
                                                {item.label}
                                              </Text>
                                            </Space>
                                            <Switch
                                              checked={isVisible}
                                              onChange={() => handleRoleDefaultToggle(item.key, 'user')}
                                              size="small"
                                              disabled={loadingRoleDefaults || isAdminOnly}
                                            />
                                          </div>
                                          {isAdminOnly && (
                                            <Text type="secondary" style={{ fontSize: '10px', fontStyle: 'italic' }}>
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
                  ]}
                />
              </Space>
            </Card>
          )}

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

