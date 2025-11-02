import React, { useState, useEffect } from 'react';
import { Card, Switch, Space, Typography, Row, Col, Divider, Button, message, Collapse, Alert, Tabs } from 'antd';
import { MenuOutlined, ReloadOutlined, EyeOutlined, EyeInvisibleOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import { useMenuSettings } from '../../context/MenuSettingsContext';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/apiService';

const { Title, Text } = Typography;
const { Panel } = Collapse;

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

// Menüleri kategoriye göre grupla
const getGroupedMenus = (isAdmin: boolean) => {
  return menuItems.reduce((acc, item) => {
    // Admin-only menüleri sadece admin'e göster
    if (item.category.includes('Admin') && !isAdmin) {
      return acc;
    }
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);
};

const MenuVisibilityCard: React.FC = () => {
  const { settings, toggleMenuVisibility, resetToDefaults, isLoading } = useMenuSettings();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const groupedMenus = getGroupedMenus(isAdmin);
  
  // Rol varsayılanları için state (sadece admin)
  const [roleDefaults, setRoleDefaults] = useState<any>(null);
  const [loadingRoleDefaults, setLoadingRoleDefaults] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');

  useEffect(() => {
    if (isAdmin) {
      loadRoleDefaults();
    }
  }, [isAdmin]);

  const loadRoleDefaults = async () => {
    try {
      setLoadingRoleDefaults(true);
      const response = await apiService.getRoleMenuDefaults('user');
      if ('defaults' in response && response.defaults) {
        setRoleDefaults(response.defaults);
      } else if ('settings' in response && response.settings) {
        setRoleDefaults(response.settings);
      } else {
        // Varsayılan değerleri kullan
        const defaultUserSettings = {
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
          }
        };
        setRoleDefaults(defaultUserSettings);
      }
    } catch (error) {
      console.error('Rol varsayılanları yüklenemedi:', error);
      // Varsayılan değerleri kullan
      const defaultUserSettings = {
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
        }
      };
      setRoleDefaults(defaultUserSettings);
    } finally {
      setLoadingRoleDefaults(false);
    }
  };

  const handleToggle = async (menuKey: string) => {
    try {
      await toggleMenuVisibility(menuKey as any);
    } catch (error) {
      message.error('Görünürlük güncellenemedi');
    }
  };

  const handleRoleDefaultToggle = async (menuKey: string) => {
    if (!roleDefaults || !roleDefaults.visibleMenus) return;
    
    const newRoleDefaults = {
      ...roleDefaults,
      visibleMenus: {
        ...roleDefaults.visibleMenus,
        [menuKey]: !roleDefaults.visibleMenus[menuKey],
      },
    };
    setRoleDefaults(newRoleDefaults);
    
    try {
      await apiService.saveRoleMenuDefaults('user', newRoleDefaults);
      message.success('Kullanıcı rolü varsayılan ayarları güncellendi');
    } catch (error) {
      message.error('Rol varsayılanları güncellenemedi');
      // Hata durumunda geri al
      setRoleDefaults(roleDefaults);
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

  const handleResetRoleDefaults = async () => {
    const defaultUserSettings = {
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
      }
    };
    setRoleDefaults(defaultUserSettings);
    
    try {
      await apiService.saveRoleMenuDefaults('user', defaultUserSettings);
      message.success('Kullanıcı rolü varsayılan ayarları sıfırlandı');
    } catch (error) {
      message.error('Rol varsayılanları sıfırlanamadı');
    }
  };

  const renderMenuSettings = (currentSettings: any, onToggle: (key: string) => void, isRoleDefaults: boolean = false) => {
    // Rol varsayılanları için admin-only menüleri filtrele
    const menusToUse = isRoleDefaults 
      ? getGroupedMenus(false) // Kullanıcı menüleri (admin-only hariç)
      : groupedMenus;
    
    return (
      <Collapse
        defaultActiveKey={Object.keys(menusToUse)}
        ghost
        style={{ background: 'transparent' }}
      >
        {Object.entries(menusToUse).map(([category, items]) => (
          <Panel
            header={
              <Text strong style={{ fontSize: '14px', color: '#1f2937' }}>
                {category}
              </Text>
            }
            key={category}
          >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {items.map((item) => {
                const isVisible = currentSettings?.visibleMenus?.[item.key as keyof typeof currentSettings.visibleMenus] ?? true;
                const isAdminOnly = item.category.includes('Admin');
                
                return (
                  <div
                    key={item.key}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      background: isVisible ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${isVisible ? '#d1fae5' : '#fee2e2'}`,
                      borderRadius: '8px',
                    }}
                  >
                    <Space>
                      {isVisible ? (
                        <EyeOutlined style={{ color: '#22c55e', fontSize: '16px' }} />
                      ) : (
                        <EyeInvisibleOutlined style={{ color: '#ef4444', fontSize: '16px' }} />
                      )}
                      <Text style={{ fontSize: '14px', color: '#1f2937' }}>
                        {item.label}
                      </Text>
                      {isAdminOnly && !isRoleDefaults && (
                        <Text type="secondary" style={{ fontSize: '12px', fontStyle: 'italic' }}>
                          (Sadece admin)
                        </Text>
                      )}
                    </Space>
                    <Switch
                      checked={isVisible}
                      onChange={() => onToggle(item.key)}
                      disabled={isLoading || loadingRoleDefaults || (isAdminOnly && !isAdmin && !isRoleDefaults)}
                      size="default"
                    />
                  </div>
                );
              })}
            </Space>
          </Panel>
        ))}
      </Collapse>
    );
  };

  return (
    <Card
      style={{
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
      }}
      styles={{ body: { padding: '20px' } }}
    >
      {isAdmin ? (
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'personal',
              label: (
                <Space size={8}>
                  <SettingOutlined />
                  <span>Kendi Ayarlarım</span>
                </Space>
              ),
              children: (
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
                      disabled={isLoading}
                    >
                      Varsayılana Sıfırla
                    </Button>
                  </div>

                  <Text type="secondary" style={{ fontSize: '13px' }}>
                    Sol menüde görünmesini istediğiniz sayfaları seçin.
                  </Text>

                  {renderMenuSettings(settings, handleToggle, false)}
                </Space>
              ),
            },
            {
              key: 'role-defaults',
              label: (
                <Space size={8}>
                  <UserOutlined />
                  <span>Kullanıcı Rolü Varsayılanları</span>
                </Space>
              ),
              children: (
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <Alert
                    message="Rol Varsayılanları"
                    description="Bu ayarlar kullanıcı rolündeki tüm kullanıcılar için varsayılan menü görünürlüğünü belirler. Yeni kullanıcılar veya ayarlarını sıfırlayan kullanıcılar bu ayarları kullanır."
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                      <UserOutlined style={{ fontSize: '20px', color: '#64748b' }} />
                      <Title level={5} style={{ margin: 0, color: '#1f2937' }}>
                        Kullanıcı Rolü Varsayılan Ayarları
                      </Title>
                    </Space>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={handleResetRoleDefaults}
                      size="small"
                      disabled={loadingRoleDefaults}
                    >
                      Varsayılana Sıfırla
                    </Button>
                  </div>

                  <Text type="secondary" style={{ fontSize: '13px' }}>
                    Kullanıcı rolündeki kullanıcıların hangi sayfaları görebileceğini ayarlayın.
                  </Text>

                  {loadingRoleDefaults ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                      <Text type="secondary">Yükleniyor...</Text>
                    </div>
                  ) : (
                    renderMenuSettings(roleDefaults, handleRoleDefaultToggle, true)
                  )}
                </Space>
              ),
            },
          ]}
        />
      ) : (
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
              disabled={isLoading}
            >
              Varsayılana Sıfırla
            </Button>
          </div>

          <Text type="secondary" style={{ fontSize: '13px' }}>
            Sol menüde görünmesini istediğiniz sayfaları seçin.
          </Text>

          {renderMenuSettings(settings, handleToggle, false)}
        </Space>
      )}
    </Card>
  );
};

export default MenuVisibilityCard;