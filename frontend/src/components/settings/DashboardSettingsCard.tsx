import React from 'react';
import { Card, Space, Typography, Button, Switch, Row, Col, Divider } from 'antd';
import { DashboardOutlined, SettingOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { useDashboardSettings } from '../../context/DashboardSettingsContext';
import { UNIT_NAMES } from '../../types';
import { SETTINGS_TEXTS } from '../../constants/settings';
import { message } from 'antd';

const { Title, Text } = Typography;

interface DashboardSettingsCardProps {
  className?: string;
}

export const DashboardSettingsCard: React.FC<DashboardSettingsCardProps> = ({ className }) => {
  const { settings, updateSetting, resetToDefaults, toggleUnitVisibility } = useDashboardSettings();

  const handleResetSettings = () => {
    resetToDefaults();
    message.success(SETTINGS_TEXTS.BUTTONS.RESET_DEFAULTS);
  };

  return (
    <Card
      title={
        <Space>
          <DashboardOutlined />
          <span>{SETTINGS_TEXTS.TITLES.DASHBOARD_SETTINGS}</span>
        </Space>
      }
      style={{ borderRadius: 12 }}
      className={className}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={5}>Görünüm Ayarları</Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Text>Fire Miktarını Göster</Text>
                <Switch
                  checked={settings.showFire}
                  onChange={(checked) => updateSetting('showFire', checked)}
                />
              </Space>
            </Col>
            <Col xs={24} sm={8}>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Text>Has Karşılığını Göster</Text>
                <Switch
                  checked={settings.showHas}
                  onChange={(checked) => updateSetting('showHas', checked)}
                />
              </Space>
            </Col>
            <Col xs={24} sm={8}>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Text>Son Güncellemeyi Göster</Text>
                <Switch
                  checked={settings.showLastUpdate}
                  onChange={(checked) => updateSetting('showLastUpdate', checked)}
                />
              </Space>
            </Col>
          </Row>
        </div>

        <Divider />

        <div>
          <Title level={5}>Birim Görünürlüğü</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            {SETTINGS_TEXTS.DESCRIPTIONS.UNIT_VISIBILITY}
          </Text>
          <Row gutter={[16, 16]}>
            {settings.unitOrder.map(unitId => (
              <Col xs={12} sm={8} md={6} key={unitId}>
                <Button
                  block
                  type={settings.hiddenUnits.includes(unitId) ? 'default' : 'primary'}
                  icon={settings.hiddenUnits.includes(unitId) ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  onClick={() => toggleUnitVisibility(unitId)}
                >
                  {UNIT_NAMES[unitId]}
                </Button>
              </Col>
            ))}
          </Row>
        </div>

        <Divider />

        <div style={{ textAlign: 'center' }}>
          <Button
            danger
            icon={<SettingOutlined />}
            onClick={handleResetSettings}
          >
            {SETTINGS_TEXTS.BUTTONS.RESET_DEFAULTS}
          </Button>
        </div>
      </Space>
    </Card>
  );
};
