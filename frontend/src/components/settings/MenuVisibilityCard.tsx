import React, { useState, useEffect } from 'react';
import { Card, Switch, Space, Typography, Button, message, Collapse, Alert, Tabs } from 'antd';
import { MenuOutlined, ReloadOutlined, EyeOutlined, EyeInvisibleOutlined, SettingOutlined, UserOutlined, SaveOutlined } from '@ant-design/icons';
import { useMenuSettings, MenuSettings } from '../../context/MenuSettingsContext';
import { useAuth } from '../../context/AuthContext';

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
  const { 
    settings, 
    roleDefaults, 
    toggleMenuVisibility, 
    resetToRoleDefaults, 
    updateRoleDefaults,
    loadRoleDefaults,
    isLoading 
  } = useMenuSettings();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const groupedMenus = getGroupedMenus(isAdmin);
  
  const [userRoleDefaults, setUserRoleDefaults] = useState<MenuSettings | null>(null);
  const [loadingRoleDefaults, setLoadingRoleDefaults] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [savingRoleDefaults, setSavingRoleDefaults] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Admin ise, kullanıcı rolü varsayılanlarını yükle
  useEffect(() => {
    if (isAdmin) {
      loadUserRoleDefaults();
    }
  }, [isAdmin]);

  const loadUserRoleDefaults = async () => {
    try {
      setLoadingRoleDefaults(true);
      const defaults = await loadRoleDefaults('user');
      if (defaults) {
        setUserRoleDefaults(defaults);
      } else {
        // Varsayılan değerleri kullan
        const defaultUserSettings: MenuSettings = {
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
        setUserRoleDefaults(defaultUserSettings);
      }
    } catch (error) {
      console.error('Rol varsayılanları yüklenemedi:', error);
      // Varsayılan değerleri kullan
      const defaultUserSettings: MenuSettings = {
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
      setUserRoleDefaults(defaultUserSettings);
    } finally {
      setLoadingRoleDefaults(false);
    }
  };

  const handleToggle = async (menuKey: string) => {
    try {
      await toggleMenuVisibility(menuKey as keyof MenuSettings['visibleMenus']);
      message.success('Menü görünürlüğü güncellendi');
    } catch (error) {
      message.error('Görünürlük güncellenemedi');
    }
  };

  const handleRoleDefaultToggle = (menuKey: string) => {
    if (!userRoleDefaults) return;
    
    const newRoleDefaults: MenuSettings = {
      visibleMenus: {
        ...userRoleDefaults.visibleMenus,
        [menuKey]: !userRoleDefaults.visibleMenus[menuKey as keyof MenuSettings['visibleMenus']],
      },
    };
    setUserRoleDefaults(newRoleDefaults);
    setHasUnsavedChanges(true);
  };

  const handleSaveRoleDefaults = async () => {
    if (!userRoleDefaults) return;
    
    try {
      setSavingRoleDefaults(true);
      await updateRoleDefaults('user', userRoleDefaults);
      message.success('Kullanıcı rolü varsayılan ayarları kaydedildi');
      setHasUnsavedChanges(false);
    } catch (error) {
      message.error('Rol varsayılanları kaydedilemedi');
    } finally {
      setSavingRoleDefaults(false);
    }
  };

  const handleReset = async () => {
    try {
      await resetToRoleDefaults();
      message.success('Menü görünürlük ayarları rol varsayılanlarına sıfırlandı');
    } catch (error) {
      message.error('Ayarlar sıfırlanamadı');
    }
  };

  const handleResetRoleDefaults = async () => {
      const defaultUserSettings: MenuSettings = {
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
      setUserRoleDefaults(defaultUserSettings);
      setHasUnsavedChanges(true);
      
      try {
        await updateRoleDefaults('user', defaultUserSettings);
        message.success('Kullanıcı rolü varsayılan ayarları sıfırlandı ve kaydedildi');
        setHasUnsavedChanges(false);
      } catch (error) {
        message.error('Rol varsayılanları sıfırlanamadı');
      }
  };

  const renderMenuSettings = (currentSettings: MenuSettings | null, onToggle: (key: string) => void, isRoleDefaults: boolean = false) => {
    if (!currentSettings) {
      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Text type="secondary">Yükleniyor...</Text>
        </div>
      );
    }

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
                const isVisible = currentSettings.visibleMenus[item.key as keyof MenuSettings['visibleMenus']] ?? false;
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
                      Rol Varsayılanlarına Sıfırla
                    </Button>
                  </div>

                  <Text type="secondary" style={{ fontSize: '13px' }}>
                    Sol menüde görünmesini istediğiniz sayfaları seçin. Rol varsayılanlarından farklı ayarlar yapabilirsiniz.
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
                    description="Bu ayarlar kullanıcı rolündeki tüm kullanıcılar için varsayılan menü görünürlüğünü belirler. Yeni kullanıcılar veya ayarlarını sıfırlayan kullanıcılar bu ayarları kullanır. Mevcut kullanıcıların özel ayarları varsa, onlar önceliklidir."
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
                    <Space>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={handleSaveRoleDefaults}
                        size="small"
                        disabled={loadingRoleDefaults || savingRoleDefaults || !hasUnsavedChanges}
                        loading={savingRoleDefaults}
                      >
                        Kaydet
                      </Button>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={handleResetRoleDefaults}
                        size="small"
                        disabled={loadingRoleDefaults || savingRoleDefaults}
                      >
                        Varsayılana Sıfırla
                      </Button>
                    </Space>
                  </div>

                  <Text type="secondary" style={{ fontSize: '13px' }}>
                    Kullanıcı rolündeki kullanıcıların hangi sayfaları görebileceğini ayarlayın. Değişiklikleri kaydetmek için "Kaydet" butonuna basın.
                  </Text>
                  {hasUnsavedChanges && (
                    <Alert
                      message="Kaydedilmemiş değişiklikler var"
                      description="Yaptığınız değişiklikleri kaydetmek için 'Kaydet' butonuna basın."
                      type="warning"
                      showIcon
                      closable={false}
                      style={{ marginBottom: 16 }}
                    />
                  )}

                  {loadingRoleDefaults ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                      <Text type="secondary">Yükleniyor...</Text>
                    </div>
                  ) : (
                    renderMenuSettings(userRoleDefaults, handleRoleDefaultToggle, true)
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
              Rol Varsayılanlarına Sıfırla
            </Button>
          </div>

          <Text type="secondary" style={{ fontSize: '13px' }}>
            Sol menüde görünmesini istediğiniz sayfaları seçin. Rol varsayılanlarından farklı ayarlar yapabilirsiniz.
          </Text>

          {renderMenuSettings(settings, handleToggle, false)}
        </Space>
      )}
    </Card>
  );
};

export default MenuVisibilityCard;
