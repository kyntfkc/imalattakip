import React, { useState, useMemo } from 'react';
import { Card, Table, Tag, Space, Typography, Button, Select, DatePicker, Input, Row, Col, Alert } from 'antd';
import { FileTextOutlined, DeleteOutlined, SearchOutlined, FilterOutlined, ReloadOutlined, LockOutlined } from '@ant-design/icons';
import { useLog } from '../context/LogContext';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const Logs: React.FC = () => {
  const { user } = useAuth();
  const { logs, clearAllLogs } = useLog();
  const [searchText, setSearchText] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  // Filtrelenmiş loglar
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Arama filtresi
      const searchMatch = searchText === '' || 
        (log.entityName && log.entityName.toLowerCase().includes(searchText.toLowerCase())) ||
        (log.details && log.details.toLowerCase().includes(searchText.toLowerCase())) ||
        (log.user && log.user.toLowerCase().includes(searchText.toLowerCase()));

      // Aksiyon filtresi
      const actionMatch = selectedAction === 'all' || log.action === selectedAction;

      // Entity filtresi
      const entityMatch = selectedEntity === 'all' || log.entityType === selectedEntity;

      // Tarih filtresi
      const dateMatch = !dateRange || 
        dayjs(log.timestamp).isBetween(dateRange[0], dateRange[1], 'day', '[]');

      return searchMatch && actionMatch && entityMatch && dateMatch;
    });
  }, [logs, searchText, selectedAction, selectedEntity, dateRange]);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'green';
      case 'UPDATE': return 'blue';
      case 'DELETE': return 'red';
      default: return 'default';
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'CREATE': return 'Oluşturma';
      case 'UPDATE': return 'Güncelleme';
      case 'DELETE': return 'Silme';
      default: return action;
    }
  };

  const getEntityText = (entity: string) => {
    switch (entity) {
      case 'TRANSFER': return 'Transfer';
      case 'EXTERNAL_VAULT': return 'Dış Kasa';
      case 'COMPANY': return 'Firma';
      default: return entity;
    }
  };

  const columns: ColumnsType<any> = [
    {
      title: 'Tarih/Saat',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (timestamp: string) => dayjs(timestamp).format('DD.MM.YYYY HH:mm:ss')
    },
    {
      title: 'Kullanıcı',
      dataIndex: 'user',
      key: 'user',
      width: 120,
      render: (user: string) => (
        <Tag color="purple" style={{ fontWeight: '500' }}>
          👤 {user || 'Bilinmeyen'}
        </Tag>
      )
    },
    {
      title: 'İşlem',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (action: string) => (
        <Tag color={getActionColor(action)}>
          {getActionText(action)}
        </Tag>
      )
    },
    {
      title: 'Modül',
      dataIndex: 'entityType',
      key: 'entityType',
      width: 120,
      render: (entityType: string) => (
        <Tag color="blue">{getEntityText(entityType)}</Tag>
      )
    },
    {
      title: 'Varlık',
      dataIndex: 'entityName',
      key: 'entityName',
      width: 200,
      render: (name: string) => <Text strong>{name}</Text>
    },
    {
      title: 'Detaylar',
      dataIndex: 'details',
      key: 'details',
      ellipsis: true,
      render: (details: string) => <Text type="secondary">{details}</Text>
    }
  ];

  const handleReset = () => {
    setSearchText('');
    setSelectedAction('all');
    setSelectedEntity('all');
    setDateRange(null);
  };

  // Admin kontrolü
  if (user?.role !== 'admin') {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="Yetkisiz Erişim"
          description="Bu sayfaya sadece yönetici kullanıcılar erişebilir."
          type="error"
          icon={<LockOutlined />}
          showIcon
          style={{ borderRadius: '12px' }}
        />
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <Card 
        style={{ 
          marginBottom: 20,
          borderRadius: 12,
          background: '#ffffff',
          border: '1px solid #e5e7eb'
        }}
        styles={{ body: { padding: 24 } }}
      >
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={2} style={{ margin: 0, color: '#1f2937', fontSize: '24px' }}>
                <FileTextOutlined style={{ marginRight: 12 }} />
                Sistem Logları
              </Title>
              <Text style={{ color: '#6b7280', fontSize: '14px' }}>
                Tüm sistem işlemlerinin kayıtlarını görüntüleyin
              </Text>
            </div>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                if (window.confirm('Tüm log kayıtlarını silmek istediğinizden emin misiniz?')) {
                  clearAllLogs();
                }
              }}
            >
              Tüm Logları Temizle
            </Button>
          </div>
        </Space>
      </Card>

      {/* Filtreler */}
      <Card
        title={
          <Space>
            <FilterOutlined />
            <span>Filtreler</span>
          </Space>
        }
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={handleReset}
            size="small"
          >
            Sıfırla
          </Button>
        }
        style={{ marginBottom: 20, borderRadius: 12 }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Kullanıcı, varlık veya detay ara..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="İşlem Türü"
              value={selectedAction}
              onChange={setSelectedAction}
            >
              <Select.Option value="all">Tüm İşlemler</Select.Option>
              <Select.Option value="CREATE">Oluşturma</Select.Option>
              <Select.Option value="UPDATE">Güncelleme</Select.Option>
              <Select.Option value="DELETE">Silme</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="Modül"
              value={selectedEntity}
              onChange={setSelectedEntity}
            >
              <Select.Option value="all">Tüm Modüller</Select.Option>
              <Select.Option value="TRANSFER">Transfer</Select.Option>
              <Select.Option value="EXTERNAL_VAULT">Dış Kasa</Select.Option>
              <Select.Option value="COMPANY">Firma</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              format="DD.MM.YYYY"
              placeholder={['Başlangıç', 'Bitiş']}
            />
          </Col>
        </Row>
      </Card>

      {/* Log Tablosu */}
      <Card
        title={
          <Space>
            <FileTextOutlined />
            <span>Log Kayıtları ({filteredLogs.length})</span>
          </Space>
        }
        style={{ borderRadius: 12 }}
      >
        <Table
          columns={columns}
          dataSource={filteredLogs}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Toplam ${total} kayıt`
          }}
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  );
};

export default Logs;

