import React from 'react';
import { Card, Space, Typography, Row, Col, Statistic } from 'antd';
import { SafetyOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { SETTINGS_TEXTS } from '../../constants/settings';

const { Title } = Typography;

interface DataStatsCardProps {
  className?: string;
}

export const DataStatsCard: React.FC<DataStatsCardProps> = ({ className }) => {
  const getDataCount = (key: string) => {
    return JSON.parse(localStorage.getItem(key) || '[]').length;
  };

  const transfersCount = getDataCount('transfers');
  const externalVaultCount = getDataCount('externalVaultTransactions');
  const companiesCount = getDataCount('companies');
  const totalCount = transfersCount + externalVaultCount + companiesCount;

  return (
    <Card 
      title={
        <Space>
          <SafetyOutlined />
          <span>{SETTINGS_TEXTS.TITLES.DATA_STATS}</span>
        </Space>
      }
      style={{ borderRadius: 12 }}
      className={className}
    >
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
    </Card>
  );
};
