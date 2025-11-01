import React, { useState, useEffect, useMemo } from 'react';
import {
  Card, 
  Row, 
  Col, 
  Typography, 
  Table, 
  Button, 
  Space, 
  Statistic,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  message,
  Divider,
  Popconfirm,
  Empty,
  Select,
  Radio
} from 'antd';
import { 
  CalculatorOutlined, 
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  GoldOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ShoppingCartOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { useExternalVault } from '../context/ExternalVaultContext';
import { useLog } from '../context/LogContext';
import dayjs, { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { parseNumberFromInput, formatNumberForDisplay } from '../utils/numberFormat';
import { commonStyles } from '../styles/theme';
import '../styles/animations.css';

const { Title, Text } = Typography;

interface RequiredHasItem {
  id: string;
  date: string;
  productName: string;
  requiredHas: number; // Gereken has (TL)
  receivedHas?: number; // Alınan has (TL)
  notes?: string;
}

const RequiredHas: React.FC = () => {
  const { totalHas, addTransaction } = useExternalVault();
  const { addLog } = useLog();
  const [modalVisible, setModalVisible] = useState(false);
  const [receivedModalVisible, setReceivedModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add-required' | 'add-received' | 'edit'>('add-required');
  const [editingItem, setEditingItem] = useState<RequiredHasItem | null>(null);
  const [form] = Form.useForm();
  const [receivedForm] = Form.useForm();
  const [items, setItems] = useState<RequiredHasItem[]>([]);

  // LocalStorage'dan verileri yükle
  useEffect(() => {
    const saved = localStorage.getItem('requiredHasItems');
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load required has items:', e);
      }
    }
  }, []);

  // LocalStorage'a kaydet
  useEffect(() => {
    if (items.length > 0 || localStorage.getItem('requiredHasItems')) {
      localStorage.setItem('requiredHasItems', JSON.stringify(items));
    }
  }, [items]);

  // Toplam hesaplamaları
  const totals = useMemo(() => {
    const totalRequired = items.reduce((sum, item) => sum + (item.requiredHas || 0), 0);
    const totalReceived = items.reduce((sum, item) => sum + (item.receivedHas || 0), 0);
    return {
      required: totalRequired,
      received: totalReceived,
      remaining: totalRequired - totalReceived
    };
  }, [items]);

  // Dış Kasa'dan has düşürme fonksiyonu
  const handleDeductFromVault = async (item: RequiredHasItem) => {
    if (!item.receivedHas || item.receivedHas <= 0) {
      message.warning('Lütfen önce alınan has miktarını giriniz!');
      return;
    }

    if (item.receivedHas > totalHas) {
      message.error(`Yetersiz has! Dış Kasa'da ${totalHas.toFixed(2)} gr has var, ${item.receivedHas.toFixed(2)} gr gerekiyor.`);
      return;
    }

    try {
      // Dış Kasa'dan çıkış yap (24K has olarak)
      // TL olarak girilen değer, has fiyatı ≈ 1 TL/gr olduğu için direkt gram olarak kullanılıyor
      await addTransaction({
        type: 'output',
        karat: '24K',
        amount: item.receivedHas, // TL değeri gram olarak kullanılıyor
        notes: `${item.productName} - Gereken Has: ${item.requiredHas.toFixed(2)} TL, Alınan: ${item.receivedHas.toFixed(2)} TL`,
        companyName: 'Gereken Has Sistemi'
      });

      // Log kaydı
      await addLog({
        action: 'CREATE',
        entityType: 'REQUIRED_HAS',
        entityName: `${item.productName} - ${item.receivedHas.toFixed(2)} TL`,
        details: `Gereken Has: ${item.requiredHas.toFixed(2)} TL, Alınan: ${item.receivedHas.toFixed(2)} TL`
      });

      message.success(`✅ ${item.receivedHas.toFixed(2)} TL has Dış Kasa'dan düşürüldü!`);
    } catch (error: any) {
      console.error('Has düşürme hatası:', error);
      message.error(error?.message || 'Has düşürme işlemi başarısız!');
    }
  };

  // Alınacak has ekle/düzenle
  const handleAddRequiredHas = (values: any) => {
    const newItem: RequiredHasItem = {
      id: editingItem?.id || `RH${Date.now()}`,
      date: values.date ? dayjs(values.date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      productName: values.productName,
      requiredHas: typeof values.requiredHas === 'string' 
        ? parseNumberFromInput(values.requiredHas) 
        : values.requiredHas,
      receivedHas: undefined, // Alınacak has eklerken alınan boş
      notes: values.notes
    };

    if (editingItem) {
      setItems(items.map(item => item.id === editingItem.id ? newItem : item));
      message.success('Güncellendi!');
    } else {
      setItems([...items, newItem]);
      message.success('Alınacak has eklendi!');
    }

    form.resetFields();
    setModalVisible(false);
    setEditingItem(null);
    setModalMode('add-required');
  };

  // Alınan has ekle
  const handleAddReceivedHas = async (values: any) => {
    const receivedAmount = typeof values.receivedHas === 'string' 
      ? parseNumberFromInput(values.receivedHas) 
      : values.receivedHas;

    if (!receivedAmount || receivedAmount <= 0) {
      message.warning('Alınan has miktarını giriniz!');
      return;
    }

    if (values.mode === 'existing' && values.itemId) {
      // Mevcut kayıta alınan has ekle
      const item = items.find(i => i.id === values.itemId);
      if (item) {
        const newReceivedHas = (item.receivedHas || 0) + receivedAmount;
        setItems(items.map(i => 
          i.id === values.itemId 
            ? { ...i, receivedHas: newReceivedHas }
            : i
        ));
        message.success(`${formatNumberForDisplay(receivedAmount)} TL alınan has eklendi!`);
      }
    } else {
      // Yeni kayıt oluştur
      const newItem: RequiredHasItem = {
        id: `RH${Date.now()}`,
        date: values.date ? dayjs(values.date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        productName: values.productName,
        requiredHas: typeof values.requiredHas === 'string' 
          ? parseNumberFromInput(values.requiredHas) 
          : values.requiredHas || 0,
        receivedHas: receivedAmount,
        notes: values.notes
      };
      setItems([...items, newItem]);
      message.success('Alınan has kaydı oluşturuldu!');
    }

    receivedForm.resetFields();
    receivedForm.setFieldsValue({ mode: 'existing', date: dayjs() });
    setReceivedModalVisible(false);
  };

  const handleDelete = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    message.success('Silindi!');
  };

  const handleEdit = (item: RequiredHasItem) => {
    setEditingItem(item);
    setModalMode('edit');
    form.setFieldsValue({
      date: dayjs(item.date),
      productName: item.productName,
      requiredHas: item.requiredHas,
      receivedHas: item.receivedHas,
      notes: item.notes
    });
    setModalVisible(true);
  };

  const handleOpenRequiredModal = () => {
    setEditingItem(null);
    setModalMode('add-required');
    form.resetFields();
    form.setFieldsValue({ date: dayjs() });
    setModalVisible(true);
  };

  const handleOpenReceivedModal = () => {
    receivedForm.resetFields();
    receivedForm.setFieldsValue({ 
      date: dayjs(),
      itemId: undefined,
      productName: '',
      requiredHas: ''
    });
    setReceivedModalVisible(true);
  };

  const columns: ColumnsType<RequiredHasItem> = [
    {
      title: 'Tarih',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      render: (date: string) => dayjs(date).format('DD.MM.YYYY')
    },
    {
      title: 'Ürün Adı',
      dataIndex: 'productName',
      key: 'productName',
      sorter: (a, b) => a.productName.localeCompare(b.productName),
      render: (name: string) => (
        <Text strong style={{ color: '#1f2937' }}>{name}</Text>
      )
    },
    {
      title: 'Gereken Has (TL)',
      dataIndex: 'requiredHas',
      key: 'requiredHas',
      width: 150,
      align: 'right' as const,
      sorter: (a, b) => a.requiredHas - b.requiredHas,
      render: (value: number) => (
        <Text style={{ color: '#1890ff', fontSize: '15px', fontWeight: '600' }}>
          {formatNumberForDisplay(value)}
        </Text>
      )
    },
    {
      title: 'Alınan (TL)',
      dataIndex: 'receivedHas',
      key: 'receivedHas',
      width: 150,
      align: 'right' as const,
      sorter: (a, b) => (a.receivedHas || 0) - (b.receivedHas || 0),
      render: (value: number | undefined, record: RequiredHasItem) => {
        if (value) {
          return (
            <Text style={{ color: '#52c41a', fontSize: '15px', fontWeight: '600' }}>
              {formatNumberForDisplay(value)}
            </Text>
          );
        }
        return (
          <Tag color="default" style={{ margin: 0 }}>Henüz alınmadı</Tag>
        );
      }
    },
    {
      title: 'Durum',
      key: 'status',
      width: 120,
      render: (_, record: RequiredHasItem) => {
        const received = record.receivedHas || 0;
        const required = record.requiredHas;
        const percentage = required > 0 ? (received / required) * 100 : 0;

        if (received >= required) {
          return (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              Tamamlandı
            </Tag>
          );
        } else if (received > 0) {
          return (
            <Tag color="warning">
              %{percentage.toFixed(0)}
            </Tag>
          );
        }
        return (
          <Tag color="default" icon={<CloseCircleOutlined />}>
            Beklemede
          </Tag>
        );
      }
    },
    {
      title: 'İşlemler',
      key: 'actions',
      width: 200,
      align: 'center' as const,
      render: (_, record: RequiredHasItem) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Düzenle
          </Button>
          {record.receivedHas && record.receivedHas > 0 && (
            <Popconfirm
              title="Dış Kasa'dan Düş"
              description={`${record.productName} için ${formatNumberForDisplay(record.receivedHas)} TL has Dış Kasa'dan düşülecek. Devam etmek istiyor musunuz?`}
              onConfirm={() => handleDeductFromVault(record)}
              okText="Evet"
              cancelText="Hayır"
            >
              <Button
                type="primary"
                size="small"
                icon={<GoldOutlined />}
                danger
              >
                Dış Kasa'dan Düş
              </Button>
            </Popconfirm>
          )}
          <Popconfirm
            title="Sil"
            description="Bu kaydı silmek istediğinize emin misiniz?"
            onConfirm={() => handleDelete(record.id)}
            okText="Evet"
            cancelText="Hayır"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="fade-in" style={{ padding: '0 8px' }}>
      {/* Professional Header */}
      <div style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        borderRadius: '20px',
        padding: '32px',
        marginBottom: '24px',
        border: '1px solid #e5e7eb'
      }}>
        <Space align="center" size={20}>
          <div style={{
            background: '#f8fafc',
            borderRadius: '16px',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #e5e7eb'
          }}>
            <CalculatorOutlined style={{ fontSize: '32px', color: '#64748b' }} />
          </div>
          <div>
            <Title level={2} style={{ margin: 0, color: '#1f2937', fontSize: '28px', fontWeight: '700' }}>
              Gereken Has
            </Title>
            <Text style={{ color: '#6b7280', fontSize: '16px', fontWeight: '400' }}>
              Ürün bazında gereken has takibi ve Dış Kasa entegrasyonu
            </Text>
          </div>
        </Space>
      </div>

      {/* Özet İstatistikler */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: '20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
            <Statistic
              title="Toplam Gereken Has"
              value={totals.required}
              suffix="TL"
              valueStyle={{ color: '#1890ff', fontSize: '20px' }}
              prefix={<CalculatorOutlined style={{ color: '#64748b' }} />}
              precision={2}
              formatter={(value) => formatNumberForDisplay(Number(value))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: '20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
            <Statistic
              title="Toplam Alınan"
              value={totals.received}
              suffix="TL"
              valueStyle={{ color: '#52c41a', fontSize: '20px' }}
              prefix={<CheckCircleOutlined style={{ color: '#64748b' }} />}
              precision={2}
              formatter={(value) => formatNumberForDisplay(Number(value))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: '20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
            <Statistic
              title="Kalan"
              value={totals.remaining}
              suffix="TL"
              valueStyle={{ color: totals.remaining > 0 ? '#faad14' : '#52c41a', fontSize: '20px' }}
              prefix={<GoldOutlined style={{ color: '#64748b' }} />}
              precision={2}
              formatter={(value) => formatNumberForDisplay(Number(value))}
            />
          </Card>
        </Col>
      </Row>

      {/* Dış Kasa Durumu */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <Card style={{ borderRadius: '20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
            <Statistic
              title="Dış Kasa Mevcut Has Karşılığı"
              value={totalHas}
              suffix="gr"
              valueStyle={{ color: '#059669', fontSize: '24px' }}
              prefix={<GoldOutlined style={{ color: '#64748b' }} />}
              precision={2}
            />
            <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
              Bu değer, alınan has miktarını Dış Kasa'dan düşerken kullanılır.
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Tablo ve Aksiyon Butonları */}
      <Card 
        title={
          <Space>
            <CalculatorOutlined />
            <span>Gereken Has Listesi</span>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
onClick={handleOpenRequiredModal}
            size="large"
          >
            Yeni Ekle
          </Button>
        }
        style={{ borderRadius: commonStyles.borderRadius, boxShadow: commonStyles.cardShadow }}
      >
        {items.length === 0 ? (
          <Empty 
            description="Henüz gereken has kaydı yok"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Space>
              <Button type="default" icon={<PlusOutlined />} onClick={handleOpenRequiredModal}>
                Alınacak Has Ekle
              </Button>
              <Button type="primary" icon={<DownloadOutlined />} onClick={handleOpenReceivedModal}>
                Alınan Has Ekle
              </Button>
            </Space>
          </Empty>
        ) : (
          <Table
            columns={columns}
            dataSource={items}
            rowKey="id"
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `Toplam ${total} kayıt`
            }}
            scroll={{ x: 1000 }}
          />
        )}
      </Card>

      {/* Alınacak Has Ekleme/Düzenleme Modal */}
      <Modal
        title={
          <Space>
            {modalMode === 'edit' ? <EditOutlined /> : <PlusOutlined />}
            <span>{modalMode === 'edit' ? 'Gereken Has Düzenle' : 'Alınacak Has Ekle'}</span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => {
          form.resetFields();
          setModalVisible(false);
          setEditingItem(null);
          setModalMode('add-required');
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddRequiredHas}
        >
          <Form.Item
            label="Tarih"
            name="date"
            rules={[{ required: true, message: 'Tarih seçiniz!' }]}
            initialValue={dayjs()}
          >
            <DatePicker
              style={{ width: '100%' }}
              size="large"
              format="DD.MM.YYYY"
            />
          </Form.Item>

          <Form.Item
            label="Ürün Adı"
            name="productName"
            rules={[{ required: true, message: 'Ürün adı giriniz!' }]}
          >
            <Input
              placeholder="Örn: Anka kolye, Nokta küpe..."
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Gereken Has (TL)"
            name="requiredHas"
            rules={[
              { required: true, message: 'Gereken has miktarını giriniz!' },
              {
                validator: (_, value) => {
                  if (!value && value !== 0 && value !== '') {
                    return Promise.reject(new Error('Gereken has miktarını giriniz!'));
                  }
                  const numValue = typeof value === 'string' ? parseNumberFromInput(value) : value;
                  if (isNaN(numValue) || numValue <= 0) {
                    return Promise.reject(new Error('Gereken has 0\'dan büyük olmalı!'));
                  }
                  return Promise.resolve();
                }
              }
            ]}
            getValueFromEvent={(e) => {
              const value = e.target?.value || e;
              return typeof value === 'string' ? value : String(value);
            }}
          >
            <Input
              placeholder="0,00"
              size="large"
              style={{ width: '100%' }}
              onKeyDown={(e) => {
                const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter', 'Home', 'End'];
                const key = e.key;
                const isNumber = /^\d$/.test(key);
                const isComma = key === ',';
                const isDot = key === '.';
                const isControl = allowedKeys.includes(key);
                
                if (isNumber || isComma || isDot || isControl || (e.ctrlKey || e.metaKey)) {
                  return;
                }
                e.preventDefault();
              }}
              onChange={(e) => {
                let value = e.target.value;
                if (value === '') {
                  form.setFieldsValue({ requiredHas: '' });
                  return;
                }
                value = value.replace(/[^\d,.]/g, '');
                const parts = value.split(/[,.]/);
                if (parts.length > 2) {
                  value = parts[0] + ',' + parts.slice(1).join('');
                }
                form.setFieldsValue({ requiredHas: value });
              }}
              onBlur={(e) => {
                const value = e.target.value;
                if (value && !isNaN(parseNumberFromInput(value))) {
                  const numericValue = parseNumberFromInput(value);
                  form.setFieldsValue({ requiredHas: numericValue });
                  setTimeout(() => {
                    e.target.value = formatNumberForDisplay(numericValue);
                  }, 0);
                }
              }}
            />
          </Form.Item>

          <Form.Item
            label="Alınan (TL) - Opsiyonel"
            name="receivedHas"
            getValueFromEvent={(e) => {
              const value = e.target?.value || e;
              return typeof value === 'string' ? value : String(value);
            }}
          >
            <Input
              placeholder="0,00"
              size="large"
              style={{ width: '100%' }}
              onKeyDown={(e) => {
                const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter', 'Home', 'End'];
                const key = e.key;
                const isNumber = /^\d$/.test(key);
                const isComma = key === ',';
                const isDot = key === '.';
                const isControl = allowedKeys.includes(key);
                
                if (isNumber || isComma || isDot || isControl || (e.ctrlKey || e.metaKey)) {
                  return;
                }
                e.preventDefault();
              }}
              onChange={(e) => {
                let value = e.target.value;
                if (value === '') {
                  form.setFieldsValue({ receivedHas: '' });
                  return;
                }
                value = value.replace(/[^\d,.]/g, '');
                const parts = value.split(/[,.]/);
                if (parts.length > 2) {
                  value = parts[0] + ',' + parts.slice(1).join('');
                }
                form.setFieldsValue({ receivedHas: value });
              }}
              onBlur={(e) => {
                const value = e.target.value;
                if (value && !isNaN(parseNumberFromInput(value))) {
                  const numericValue = parseNumberFromInput(value);
                  form.setFieldsValue({ receivedHas: numericValue });
                  setTimeout(() => {
                    e.target.value = formatNumberForDisplay(numericValue);
                  }, 0);
                }
              }}
            />
          </Form.Item>

          <Form.Item
            label="Notlar"
            name="notes"
          >
            <Input.TextArea
              placeholder="Ek notlar..."
              rows={3}
            />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button 
                onClick={() => {
                  form.resetFields();
                  setModalVisible(false);
                  setEditingItem(null);
                }}
                size="large"
              >
                İptal
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                size="large"
                icon={editingItem ? <EditOutlined /> : <PlusOutlined />}
              >
                {editingItem ? 'Güncelle' : 'Ekle'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Alınan Has Ekleme Modal */}
      <Modal
        title={
          <Space>
            <DownloadOutlined />
            <span>Alınan Has Ekle</span>
          </Space>
        }
        open={receivedModalVisible}
        onCancel={() => {
          receivedForm.resetFields();
          setReceivedModalVisible(false);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={receivedForm}
          layout="vertical"
          onFinish={handleAddReceivedHas}
          initialValues={{
            mode: 'existing',
            date: dayjs()
          }}
        >
          <Form.Item
            label="İşlem Tipi"
            name="mode"
          >
            <Radio.Group>
              <Radio value="existing">Mevcut Kayıta Ekle</Radio>
              <Radio value="new">Yeni Kayıt Oluştur</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.mode !== currentValues.mode}
          >
            {({ getFieldValue }) => {
              const mode = getFieldValue('mode');
              
              if (mode === 'existing') {
                return (
                  <Form.Item
                    label="Mevcut Kayıt"
                    name="itemId"
                    rules={[{ required: true, message: 'Bir kayıt seçiniz!' }]}
                  >
                    <Select
                      placeholder="Kayıt seçiniz..."
                      size="large"
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                    >
                      {items.map(item => (
                        <Select.Option key={item.id} value={item.id} label={item.productName}>
                          {item.productName} - {formatNumberForDisplay(item.requiredHas)} TL
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                );
              }
              
              return (
                <>
                  <Form.Item
                    label="Tarih"
                    name="date"
                    rules={[{ required: true, message: 'Tarih seçiniz!' }]}
                  >
                    <DatePicker
                      style={{ width: '100%' }}
                      size="large"
                      format="DD.MM.YYYY"
                    />
                  </Form.Item>

                  <Form.Item
                    label="Ürün Adı"
                    name="productName"
                    rules={[{ required: true, message: 'Ürün adı giriniz!' }]}
                  >
                    <Input
                      placeholder="Örn: Anka kolye, Nokta küpe..."
                      size="large"
                    />
                  </Form.Item>

                  <Form.Item
                    label="Gereken Has (TL) - Opsiyonel"
                    name="requiredHas"
                    getValueFromEvent={(e) => {
                      const value = e.target?.value || e;
                      return typeof value === 'string' ? value : String(value);
                    }}
                  >
                    <Input
                      placeholder="0,00"
                      size="large"
                      style={{ width: '100%' }}
                      onKeyDown={(e) => {
                        const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter', 'Home', 'End'];
                        const key = e.key;
                        const isNumber = /^\d$/.test(key);
                        const isComma = key === ',';
                        const isDot = key === '.';
                        const isControl = allowedKeys.includes(key);
                        
                        if (isNumber || isComma || isDot || isControl || (e.ctrlKey || e.metaKey)) {
                          return;
                        }
                        e.preventDefault();
                      }}
                      onChange={(e) => {
                        let value = e.target.value;
                        if (value === '') {
                          receivedForm.setFieldsValue({ requiredHas: '' });
                          return;
                        }
                        value = value.replace(/[^\d,.]/g, '');
                        const parts = value.split(/[,.]/);
                        if (parts.length > 2) {
                          value = parts[0] + ',' + parts.slice(1).join('');
                        }
                        receivedForm.setFieldsValue({ requiredHas: value });
                      }}
                      onBlur={(e) => {
                        const value = e.target.value;
                        if (value && !isNaN(parseNumberFromInput(value))) {
                          const numericValue = parseNumberFromInput(value);
                          receivedForm.setFieldsValue({ requiredHas: numericValue });
                          setTimeout(() => {
                            e.target.value = formatNumberForDisplay(numericValue);
                          }, 0);
                        }
                      }}
                    />
                  </Form.Item>
                </>
              );
            }}
          </Form.Item>

          <Form.Item
            label="Alınan Has (TL)"
            name="receivedHas"
            rules={[
              { required: true, message: 'Alınan has miktarını giriniz!' },
              {
                validator: (_, value) => {
                  if (!value && value !== 0 && value !== '') {
                    return Promise.reject(new Error('Alınan has miktarını giriniz!'));
                  }
                  const numValue = typeof value === 'string' ? parseNumberFromInput(value) : value;
                  if (isNaN(numValue) || numValue <= 0) {
                    return Promise.reject(new Error('Alınan has 0\'dan büyük olmalı!'));
                  }
                  return Promise.resolve();
                }
              }
            ]}
            getValueFromEvent={(e) => {
              const value = e.target?.value || e;
              return typeof value === 'string' ? value : String(value);
            }}
          >
            <Input
              placeholder="0,00"
              size="large"
              style={{ width: '100%' }}
              onKeyDown={(e) => {
                const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter', 'Home', 'End'];
                const key = e.key;
                const isNumber = /^\d$/.test(key);
                const isComma = key === ',';
                const isDot = key === '.';
                const isControl = allowedKeys.includes(key);
                
                if (isNumber || isComma || isDot || isControl || (e.ctrlKey || e.metaKey)) {
                  return;
                }
                e.preventDefault();
              }}
              onChange={(e) => {
                let value = e.target.value;
                if (value === '') {
                  receivedForm.setFieldsValue({ receivedHas: '' });
                  return;
                }
                value = value.replace(/[^\d,.]/g, '');
                const parts = value.split(/[,.]/);
                if (parts.length > 2) {
                  value = parts[0] + ',' + parts.slice(1).join('');
                }
                receivedForm.setFieldsValue({ receivedHas: value });
              }}
              onBlur={(e) => {
                const value = e.target.value;
                if (value && !isNaN(parseNumberFromInput(value))) {
                  const numericValue = parseNumberFromInput(value);
                  receivedForm.setFieldsValue({ receivedHas: numericValue });
                  setTimeout(() => {
                    e.target.value = formatNumberForDisplay(numericValue);
                  }, 0);
                }
              }}
            />
          </Form.Item>

          <Form.Item
            label="Notlar"
            name="notes"
          >
            <Input.TextArea
              placeholder="Ek notlar..."
              rows={3}
            />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button 
                onClick={() => {
                  receivedForm.resetFields();
                  setReceivedModalVisible(false);
                }}
                size="large"
              >
                İptal
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                size="large"
                icon={<DownloadOutlined />}
              >
                Ekle
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RequiredHas;

