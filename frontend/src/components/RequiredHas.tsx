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
  DatePicker,
  message,
  Popconfirm,
  Empty
} from 'antd';
import { 
  CalculatorOutlined, 
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  GoldOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { parseNumberFromInput, formatNumberForDisplay } from '../utils/numberFormat';
import { commonStyles } from '../styles/theme';
import '../styles/animations.css';

const { Title, Text } = Typography;

interface RequiredHasItem {
  id: string;
  date: string;
  description: string;
  input: number; // Giriş (TL)
  output: number; // Çıkış (TL)
  notes?: string;
}

const RequiredHas: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'input' | 'output' | 'edit'>('input');
  const [editingItem, setEditingItem] = useState<RequiredHasItem | null>(null);
  const [form] = Form.useForm();
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
    const totalInput = items.reduce((sum, item) => sum + (item.input || 0), 0);
    const totalOutput = items.reduce((sum, item) => sum + (item.output || 0), 0);
    const totalRequired = totalInput - totalOutput; // Alınacak toplam
    return {
      input: totalInput,
      output: totalOutput,
      required: totalRequired
    };
  }, [items]);


  // Ekle/düzenle
  const handleAddOrEdit = (values: any) => {
    if (editingItem) {
      // Düzenleme
      const newItem: RequiredHasItem = {
        id: editingItem.id,
        date: values.date ? dayjs(values.date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        description: values.description,
        input: typeof values.input === 'string' 
          ? parseNumberFromInput(values.input) 
          : values.input || 0,
        output: typeof values.output === 'string' 
          ? parseNumberFromInput(values.output) 
          : values.output || 0,
        notes: values.notes
      };
      setItems(items.map(item => item.id === editingItem.id ? newItem : item));
      message.success('Güncellendi!');
    } else {
      // Yeni ekleme
      const newItem: RequiredHasItem = {
        id: `RH${Date.now()}`,
        date: values.date ? dayjs(values.date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        description: values.description,
        input: modalType === 'input' 
          ? (typeof values.amount === 'string' ? parseNumberFromInput(values.amount) : values.amount || 0)
          : 0,
        output: modalType === 'output' 
          ? (typeof values.amount === 'string' ? parseNumberFromInput(values.amount) : values.amount || 0)
          : 0,
        notes: values.notes
      };
      setItems([...items, newItem]);
      message.success(modalType === 'input' ? 'Giriş eklendi!' : 'Çıkış eklendi!');
    }

    form.resetFields();
    setModalVisible(false);
    setEditingItem(null);
    setModalType('input');
  };

  const handleDelete = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    message.success('Silindi!');
  };

  const handleEdit = (item: RequiredHasItem) => {
    setEditingItem(item);
    setModalType('edit');
    form.setFieldsValue({
      date: dayjs(item.date),
      description: item.description,
      input: item.input,
      output: item.output,
      notes: item.notes
    });
    setModalVisible(true);
  };

  const handleOpenInputModal = () => {
    setEditingItem(null);
    setModalType('input');
    form.resetFields();
    form.setFieldsValue({ date: dayjs() });
    setModalVisible(true);
  };

  const handleOpenOutputModal = () => {
    setEditingItem(null);
    setModalType('output');
    form.resetFields();
    form.setFieldsValue({ date: dayjs() });
    setModalVisible(true);
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
      title: 'Açıklama',
      dataIndex: 'description',
      key: 'description',
      sorter: (a, b) => a.description.localeCompare(b.description),
      render: (name: string) => (
        <Text strong style={{ color: '#1f2937' }}>{name}</Text>
      )
    },
    {
      title: 'Giriş (TL)',
      dataIndex: 'input',
      key: 'input',
      width: 120,
      align: 'right' as const,
      sorter: (a, b) => a.input - b.input,
      render: (value: number) => value > 0 ? (
        <Text style={{ color: '#52c41a', fontSize: '15px', fontWeight: '600' }}>
          {Math.round(value)}
        </Text>
      ) : (
        <Text type="secondary">-</Text>
      )
    },
    {
      title: 'Çıkış (TL)',
      dataIndex: 'output',
      key: 'output',
      width: 120,
      align: 'right' as const,
      sorter: (a, b) => a.output - b.output,
      render: (value: number, record: RequiredHasItem) => value > 0 ? (
        <Text style={{ color: '#ff4d4f', fontSize: '15px', fontWeight: '600' }}>
          {Math.round(value)}
        </Text>
      ) : (
        <Text type="secondary">-</Text>
      )
    },
    {
      title: 'Notlar',
      dataIndex: 'notes',
      key: 'notes',
      render: (notes: string) => notes ? (
        <Text type="secondary" style={{ fontSize: '12px' }}>{notes}</Text>
      ) : (
        <Text type="secondary">-</Text>
      )
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
      {/* Minimal Header */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
        border: '1px solid #e5e7eb',
        boxShadow: 'none'
      }}>
        <Space align="center" size={12}>
          <div style={{
            background: '#f8fafc',
            borderRadius: '8px',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #e5e7eb',
            width: '40px',
            height: '40px'
          }}>
            <CalculatorOutlined style={{ fontSize: '20px', color: '#64748b' }} />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, color: '#1f2937', fontSize: '18px', fontWeight: '600' }}>
              Gereken Has
            </Title>
          </div>
        </Space>
      </div>

      {/* Özet İstatistik - Sadece Alınacak Toplam */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <Card style={{ borderRadius: '20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', background: 'linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%)' }}>
            <Statistic
              title="Alınacak Toplam"
              value={Math.round(totals.required)}
              suffix="TL"
              valueStyle={{ color: '#fa8c16', fontSize: '24px', fontWeight: '700' }}
              prefix={<GoldOutlined style={{ color: '#fa8c16' }} />}
            />
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
          <Space>
            <Button
              type="default"
              icon={<PlusOutlined />}
              onClick={handleOpenInputModal}
              size="large"
              style={{ background: '#f0f9ff', borderColor: '#52c41a', color: '#52c41a' }}
            >
              Giriş Ekle
            </Button>
            <Button
              type="default"
              icon={<PlusOutlined />}
              onClick={handleOpenOutputModal}
              size="large"
              style={{ background: '#fff1f0', borderColor: '#ff4d4f', color: '#ff4d4f' }}
            >
              Çıkış Ekle
            </Button>
          </Space>
        }
        style={{ borderRadius: commonStyles.borderRadius, boxShadow: commonStyles.cardShadow }}
      >
        {items.length === 0 ? (
          <Empty 
            description="Henüz kayıt yok"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Space>
              <Button 
                type="default" 
                icon={<PlusOutlined />} 
                onClick={handleOpenInputModal}
                style={{ background: '#f0f9ff', borderColor: '#52c41a', color: '#52c41a' }}
              >
                Giriş Ekle
              </Button>
              <Button 
                type="default" 
                icon={<PlusOutlined />} 
                onClick={handleOpenOutputModal}
                style={{ background: '#fff1f0', borderColor: '#ff4d4f', color: '#ff4d4f' }}
              >
                Çıkış Ekle
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

      {/* Alt Bilgi Satırı */}
      <div style={{
        marginTop: '24px',
        padding: '12px 16px',
        background: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '14px',
        color: '#64748b'
      }}>
        <Space size="large">
          <Text style={{ fontSize: '14px', color: '#64748b' }}>
            <Text strong style={{ color: '#52c41a' }}>Toplam Giriş: </Text>
            {Math.round(totals.input)} TL
          </Text>
          <Text style={{ fontSize: '14px', color: '#64748b' }}>
            <Text strong style={{ color: '#ff4d4f' }}>Toplam Çıkış: </Text>
            {Math.round(totals.output)} TL
          </Text>
        </Space>
      </div>

      {/* Ekleme/Düzenleme Modal */}
      <Modal
        title={
          <Space>
            {modalType === 'edit' ? <EditOutlined /> : <PlusOutlined />}
            <span>
              {modalType === 'edit' ? 'Kayıt Düzenle' : 
               modalType === 'input' ? 'Giriş Ekle' : 'Çıkış Ekle'}
            </span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => {
          form.resetFields();
          setModalVisible(false);
          setEditingItem(null);
          setModalType('input');
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddOrEdit}
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
            label="Açıklama"
            name="description"
            rules={[{ required: true, message: 'Açıklama giriniz!' }]}
          >
            <Input
              placeholder="Örn: Anka kolye, Nokta küpe..."
              size="large"
            />
          </Form.Item>

          {modalType === 'edit' ? (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Giriş (TL)"
                  name="input"
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
                        form.setFieldsValue({ input: '' });
                        return;
                      }
                      value = value.replace(/[^\d,.]/g, '');
                      const parts = value.split(/[,.]/);
                      if (parts.length > 2) {
                        value = parts[0] + ',' + parts.slice(1).join('');
                      }
                      form.setFieldsValue({ input: value });
                    }}
                    onBlur={(e) => {
                      const value = e.target.value;
                      if (value && !isNaN(parseNumberFromInput(value))) {
                        const numericValue = parseNumberFromInput(value);
                        form.setFieldsValue({ input: numericValue });
                        setTimeout(() => {
                          e.target.value = formatNumberForDisplay(numericValue);
                        }, 0);
                      }
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Çıkış (TL)"
                  name="output"
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
                        form.setFieldsValue({ output: '' });
                        return;
                      }
                      value = value.replace(/[^\d,.]/g, '');
                      const parts = value.split(/[,.]/);
                      if (parts.length > 2) {
                        value = parts[0] + ',' + parts.slice(1).join('');
                      }
                      form.setFieldsValue({ output: value });
                    }}
                    onBlur={(e) => {
                      const value = e.target.value;
                      if (value && !isNaN(parseNumberFromInput(value))) {
                        const numericValue = parseNumberFromInput(value);
                        form.setFieldsValue({ output: numericValue });
                        setTimeout(() => {
                          e.target.value = formatNumberForDisplay(numericValue);
                        }, 0);
                      }
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>
          ) : (
            <Form.Item
              label={modalType === 'input' ? 'Giriş Miktarı (TL)' : 'Çıkış Miktarı (TL)'}
              name="amount"
              rules={[
                { required: true, message: `${modalType === 'input' ? 'Giriş' : 'Çıkış'} miktarını giriniz!` },
                {
                  validator: (_, value) => {
                    if (!value && value !== 0 && value !== '') {
                      return Promise.reject(new Error(`${modalType === 'input' ? 'Giriş' : 'Çıkış'} miktarını giriniz!`));
                    }
                    const numValue = typeof value === 'string' ? parseNumberFromInput(value) : value;
                    if (isNaN(numValue) || numValue <= 0) {
                      return Promise.reject(new Error('Miktar 0\'dan büyük olmalı!'));
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
                    form.setFieldsValue({ amount: '' });
                    return;
                  }
                  value = value.replace(/[^\d,.]/g, '');
                  const parts = value.split(/[,.]/);
                  if (parts.length > 2) {
                    value = parts[0] + ',' + parts.slice(1).join('');
                  }
                  form.setFieldsValue({ amount: value });
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value && !isNaN(parseNumberFromInput(value))) {
                    const numericValue = parseNumberFromInput(value);
                    form.setFieldsValue({ amount: numericValue });
                    setTimeout(() => {
                      e.target.value = formatNumberForDisplay(numericValue);
                    }, 0);
                  }
                }}
              />
            </Form.Item>
          )}

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
                  setModalType('input');
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
    </div>
  );
};

export default RequiredHas;
