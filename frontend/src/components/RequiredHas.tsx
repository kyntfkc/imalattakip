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
    const newItem: RequiredHasItem = {
      id: editingItem?.id || `RH${Date.now()}`,
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

    if (editingItem) {
      setItems(items.map(item => item.id === editingItem.id ? newItem : item));
      message.success('Güncellendi!');
    } else {
      setItems([...items, newItem]);
      message.success('Eklendi!');
    }

    form.resetFields();
    setModalVisible(false);
    setEditingItem(null);
  };

  const handleDelete = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    message.success('Silindi!');
  };

  const handleEdit = (item: RequiredHasItem) => {
    setEditingItem(item);
    form.setFieldsValue({
      date: dayjs(item.date),
      description: item.description,
      input: item.input,
      output: item.output,
      notes: item.notes
    });
    setModalVisible(true);
  };

  const handleOpenModal = () => {
    setEditingItem(null);
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
          {formatNumberForDisplay(value)}
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
          {formatNumberForDisplay(value)}
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
              Giriş/Çıkış kayıtları ve alınacak has takibi
            </Text>
          </div>
        </Space>
      </div>

      {/* Özet İstatistik - Sadece Alınacak Toplam */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: '20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
            <Statistic
              title="Toplam Giriş"
              value={totals.input}
              suffix="TL"
              valueStyle={{ color: '#52c41a', fontSize: '20px' }}
              prefix={<CalculatorOutlined style={{ color: '#64748b' }} />}
              precision={2}
              formatter={(value) => formatNumberForDisplay(Number(value))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: '20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
            <Statistic
              title="Toplam Çıkış"
              value={totals.output}
              suffix="TL"
              valueStyle={{ color: '#ff4d4f', fontSize: '20px' }}
              prefix={<CalculatorOutlined style={{ color: '#64748b' }} />}
              precision={2}
              formatter={(value) => formatNumberForDisplay(Number(value))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: '20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', background: 'linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%)' }}>
            <Statistic
              title="Alınacak Toplam"
              value={totals.required}
              suffix="TL"
              valueStyle={{ color: '#fa8c16', fontSize: '24px', fontWeight: '700' }}
              prefix={<GoldOutlined style={{ color: '#fa8c16' }} />}
              precision={2}
              formatter={(value) => formatNumberForDisplay(Number(value))}
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
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenModal}
            size="large"
          >
            Yeni Ekle
          </Button>
        }
        style={{ borderRadius: commonStyles.borderRadius, boxShadow: commonStyles.cardShadow }}
      >
        {items.length === 0 ? (
          <Empty 
            description="Henüz kayıt yok"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenModal}>
              İlk Kaydı Ekle
            </Button>
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

      {/* Ekleme/Düzenleme Modal */}
      <Modal
        title={
          <Space>
            {editingItem ? <EditOutlined /> : <PlusOutlined />}
            <span>{editingItem ? 'Kayıt Düzenle' : 'Yeni Kayıt Ekle'}</span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => {
          form.resetFields();
          setModalVisible(false);
          setEditingItem(null);
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
    </div>
  );
};

export default RequiredHas;
