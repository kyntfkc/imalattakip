import React, { useState, useEffect } from 'react';
import { Card, Switch, Space, Typography, Row, Col, Divider, Button, message, Collapse, Alert } from 'antd';
import { MenuOutlined, ReloadOutlined, EyeOutlined, EyeInvisibleOutlined, SettingOutlined } from '@ant-design/icons';
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

  const handleToggle = async (menuKey: string) => {
    try {
      await toggleMenuVisibility(menuKey as any);
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
    <Card
      style={{
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
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
            disabled={isLoading}
          >
            Varsayılana Sıfırla
          </Button>
        </div>

        <Text type="secondary" style={{ fontSize: '13px' }}>
          Sol menüde görünmesini istediğiniz sayfaları seçin.
        </Text>

        <Collapse
          defaultActiveKey={Object.keys(groupedMenus)}
          ghost
          style={{ background: 'transparent' }}
        >
          {Object.entries(groupedMenus).map(([category, items]) => (
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
                  const isVisible = settings.visibleMenus[item.key as keyof typeof settings.visibleMenus] ?? true;
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
                        {isAdminOnly && (
                          <Text type="secondary" style={{ fontSize: '12px', fontStyle: 'italic' }}>
                            (Sadece admin)
                          </Text>
                        )}
                      </Space>
                      <Switch
                        checked={isVisible}
                        onChange={() => handleToggle(item.key)}
                        disabled={isLoading || (isAdminOnly && !isAdmin)}
                        size="default"
                      />
                    </div>
                  );
                })}
              </Space>
            </Panel>
          ))}
        </Collapse>
      </Space>
    </Card>
  );
};

export default MenuVisibilityCard;