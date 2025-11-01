import React, { useState } from 'react';
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
  Select,
  message,
  Divider,
  Popconfirm,
  Drawer
} from 'antd';
import { 
  BankOutlined, 
  PlusOutlined, 
  MinusOutlined,
  GoldOutlined,
  HistoryOutlined,
  CalculatorOutlined,
  ShoppingOutlined,
  UserOutlined,
  DeleteOutlined,
  EditOutlined
} from '@ant-design/icons';
import { useExternalVault } from '../context/ExternalVaultContext';
import { useCompanies } from '../context/CompanyContext';
import { useLog } from '../context/LogContext';
import { KaratType } from '../types';
import type { ColumnsType } from 'antd/es/table';
import { parseNumberFromInput, formatNumberForDisplay } from '../utils/numberFormat';

const { Title, Text } = Typography;
const { Option } = Select;

interface ExternalVaultStock {
  karat: KaratType;
  totalInput: number;
  totalOutput: number;
  currentStock: number;
  hasEquivalent: number;
}

interface ExternalTransaction {
  id: string;
  type: 'input' | 'output';
  karat: KaratType;
  amount: number;
  companyId?: string;
  companyName?: string;
  notes?: string;
  date: string;
}

const ExternalVault: React.FC = () => {
  const { stockByKarat, totalStock, totalHas, addTransaction, transactions, deleteTransaction } = useExternalVault();
  const { companies, addCompany } = useCompanies();
  const { addLog } = useLog();
  const [modalVisible, setModalVisible] = useState(false);
  const [transactionType, setTransactionType] = useState<'input' | 'output'>('input');
  const [form] = Form.useForm();
  const [quickAddDrawerVisible, setQuickAddDrawerVisible] = useState(false);
  const [quickAddForm] = Form.useForm();

  const karatOptions: KaratType[] = ['14K', '18K', '22K', '24K'];

  // Ayar bazlı stok verilerini hazırla
  const stockData: ExternalVaultStock[] = karatOptions
    .map(karat => stockByKarat[karat])
    .filter(item => item.currentStock !== 0 || item.totalInput !== 0 || item.totalOutput !== 0);

  const stockColumns: ColumnsType<ExternalVaultStock> = [
    {
      title: 'Ayar',
      dataIndex: 'karat',
      key: 'karat',
      render: (karat: string) => (
        <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px' }}>
          {karat === '24K' ? 'Has Altın' : karat.replace('K', ' Ayar')}
        </Tag>
      )
    },
    {
      title: 'Toplam Giriş',
      dataIndex: 'totalInput',
      key: 'totalInput',
      render: (value: any) => {
        const numValue = typeof value === 'number' ? value : (parseFloat(value) || 0);
        return `${numValue.toFixed(2)} gr`;
      },
      sorter: (a, b) => a.totalInput - b.totalInput
    },
    {
      title: 'Toplam Çıkış',
      dataIndex: 'totalOutput',
      key: 'totalOutput',
      render: (value: any) => {
        const numValue = typeof value === 'number' ? value : (parseFloat(value) || 0);
        return `${numValue.toFixed(2)} gr`;
      },
      sorter: (a, b) => a.totalOutput - b.totalOutput
    },
    {
      title: 'Mevcut Stok',
      dataIndex: 'currentStock',
      key: 'currentStock',
      render: (value: any) => {
        const numValue = typeof value === 'number' ? value : (parseFloat(value) || 0);
        return (
          <Text strong style={{ color: '#1890ff', fontSize: '16px' }}>
            {numValue.toFixed(2)} gr
          </Text>
        );
      },
      sorter: (a, b) => a.currentStock - b.currentStock
    },
    {
      title: 'Has Karşılığı',
      dataIndex: 'hasEquivalent',
      key: 'hasEquivalent',
      render: (value: any) => {
        const numValue = typeof value === 'number' ? value : (parseFloat(value) || 0);
        return (
          <Text style={{ color: '#52c41a' }}>
            {numValue.toFixed(2)} gr
          </Text>
        );
      },
      sorter: (a, b) => a.hasEquivalent - b.hasEquivalent
    }
  ];

  const handleOpenModal = (type: 'input' | 'output') => {
    setTransactionType(type);
    setModalVisible(true);
  };

  const handleQuickAddCompany = async (values: any) => {
    try {
      // API ile firma oluştur
      await addCompany({
        name: values.name,
        type: values.type,
        contact: values.contact || '',
        address: values.address || '',
        notes: values.notes || ''
      });
      
      message.success(`✅ ${values.type === 'company' ? 'Firma' : 'Kişi'} başarıyla eklendi!`);
      
      // Form'u sıfırla ve drawer'ı kapat
      quickAddForm.resetFields();
      setQuickAddDrawerVisible(false);
      
    } catch (error) {
      message.error('Firma eklenirken hata oluştu!');
    }
  };

  const handleSubmit = async (values: any) => {
    const selectedCompany = companies.find(c => c.id === values.companyId);
    
    // Amount'u parse et (string ise number'a çevir)
    const amount = typeof values.amount === 'string' 
      ? parseNumberFromInput(values.amount) 
      : values.amount;
    
    try {
      // Transaction ekle
      await addTransaction({
        type: transactionType,
        karat: values.karat,
        amount: amount,
        companyId: values.companyId,
        companyName: selectedCompany?.name,
        notes: values.notes
      });

      // Log kaydı (başarısız olsa bile devam et)
      try {
        await addLog({
          action: 'CREATE',
          entityType: 'EXTERNAL_VAULT',
          entityName: `${values.karat === '24K' ? 'Has Altın' : values.karat.replace('K', ' Ayar')} - ${amount} gr`,
          details: `Dış Kasa ${transactionType === 'input' ? 'Giriş' : 'Çıkış'}${selectedCompany ? ` - Firma: ${selectedCompany.name}` : ''}`
        });
      } catch (logError) {
        console.warn('Log kaydı yapılamadı:', logError);
        // Log hatası kritik değil, sessizce devam et
      }
      
      const successMessage = transactionType === 'input' 
        ? `✅ Giriş işlemi kaydedildi! ${amount}gr ${values.karat}` 
        : `✅ Çıkış işlemi kaydedildi! ${amount}gr ${values.karat} - ${selectedCompany?.name}`;
      
      message.success(successMessage);
      
      form.resetFields();
      setModalVisible(false);
    } catch (error: any) {
      console.error('Transaction eklenirken hata:', error);
      const errorMessage = error?.message || 'İşlem eklenirken bir hata oluştu!';
      message.error(errorMessage);
      // Hata durumunda form'u kapatma, kullanıcı tekrar deneyebilsin
    }
  };


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
            <BankOutlined style={{ fontSize: '32px', color: '#64748b' }} />
          </div>
          <div>
            <Title level={2} style={{ margin: 0, color: '#1f2937', fontSize: '28px', fontWeight: '700' }}>
              Dış Kasa
            </Title>
            <Text style={{ color: '#6b7280', fontSize: '16px', fontWeight: '400' }}>
              Elimizdeki altının hesabı
            </Text>
          </div>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: '20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
            <Statistic
              title="Toplam Stok"
              value={totalStock}
              suffix="gr"
              valueStyle={{ color: '#1f2937' }}
              prefix={<GoldOutlined style={{ color: '#64748b' }} />}
              precision={2}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: '20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
            <Statistic
              title="Toplam Has"
              value={totalHas}
              suffix="gr"
              valueStyle={{ color: '#059669' }}
              prefix={<CalculatorOutlined style={{ color: '#64748b' }} />}
              precision={2}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => handleOpenModal('input')}
              size="large"
              style={{ width: '100%' }}
            >
              Giriş Yap
            </Button>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Button 
              danger
              icon={<MinusOutlined />}
              onClick={() => handleOpenModal('output')}
              size="large"
              style={{ width: '100%' }}
            >
              Çıkış Yap
            </Button>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card 
            title={
              <Space>
                <HistoryOutlined />
                <span>İşlem Geçmişi</span>
              </Space>
            }
            style={{ borderRadius: 12 }}
          >
            {transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <HistoryOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: 16 }} />
                <Title level={4} type="secondary">Henüz işlem yok</Title>
                <Text type="secondary">Giriş veya çıkış işlemi yaparak başlayın</Text>
              </div>
            ) : (
              <Table
                columns={[
                  {
                    title: 'Tarih',
                    dataIndex: 'date',
                    key: 'date',
                    render: (date: string) => new Date(date).toLocaleString('tr-TR')
                  },
                  {
                    title: 'İşlem',
                    dataIndex: 'type',
                    key: 'type',
                    render: (type: string) => (
                      <Tag color={type === 'input' ? 'green' : 'red'}>
                        {type === 'input' ? 'Giriş' : 'Çıkış'}
                      </Tag>
                    )
                  },
                  {
                    title: 'Ayar',
                    dataIndex: 'karat',
                    key: 'karat',
                    render: (karat: string) => karat === '24K' ? 'Has Altın' : karat.replace('K', ' Ayar')
                  },
                  {
                    title: 'Miktar',
                    dataIndex: 'amount',
                    key: 'amount',
                    render: (amount: any) => {
                      const numValue = typeof amount === 'number' ? amount : (parseFloat(amount) || 0);
                      return `${numValue.toFixed(2)} gr`;
                    }
                  },
                  {
                    title: 'Firma',
                    dataIndex: 'companyName',
                    key: 'companyName',
                    render: (name: string) => name || '-'
                  },
                  {
                    title: 'Notlar',
                    dataIndex: 'notes',
                    key: 'notes',
                    render: (notes: string) => notes || '-'
                  },
                  {
                    title: 'İşlemler',
                    key: 'actions',
                    width: 100,
                    align: 'center' as const,
                    render: (record: any) => (
                      <Popconfirm
                        title="İşlemi Sil"
                        description="Bu işlemi silmek istediğinizden emin misiniz?"
                        onConfirm={() => {
                          deleteTransaction(record.id);
                          addLog({
                            action: 'DELETE',
                            entityType: 'EXTERNAL_VAULT',
                            entityName: `${record.karat === '24K' ? 'Has Altın' : record.karat.replace('K', ' Ayar')} - ${record.amount} gr`,
                            details: `Dış Kasa ${record.type === 'input' ? 'Giriş' : 'Çıkış'} işlemi silindi`
                          });
                          message.success('İşlem başarıyla silindi!');
                        }}
                        okText="Evet"
                        cancelText="Hayır"
                        okButtonProps={{ danger: true }}
                      >
                        <Button 
                          type="text" 
                          danger 
                          size="small"
                          icon={<DeleteOutlined />}
                        />
                      </Popconfirm>
                    )
                  }
                ]}
                dataSource={transactions.slice().reverse()}
                pagination={{ pageSize: 10 }}
                rowKey="id"
              />
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title={
          <Space>
            {transactionType === 'input' ? <PlusOutlined /> : <MinusOutlined />}
            <span>{transactionType === 'input' ? 'Dış Kasa Giriş' : 'Dış Kasa Çıkış'}</span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => {
          form.resetFields();
          setModalVisible(false);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="Ayar"
            name="karat"
            rules={[{ required: true, message: 'Ayar seçiniz!' }]}
            initialValue="24K"
          >
            <Select placeholder="Altın ayarını seçin" size="large">
              {karatOptions.map(karat => (
                <Option key={karat} value={karat}>
                  {karat === '24K' ? 'Has Altın' : karat.replace('K', ' Ayar')}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Miktar (gram)"
            name="amount"
            rules={[
              { required: true, message: 'Miktar giriniz!' },
              {
                validator: (_, value) => {
                  if (!value && value !== 0 && value !== '') {
                    return Promise.reject(new Error('Miktar giriniz!'));
                  }
                  if (value === '' || value === undefined) {
                    return Promise.reject(new Error('Miktar giriniz!'));
                  }
                  const numValue = typeof value === 'string' ? parseNumberFromInput(value) : value;
                  if (isNaN(numValue) || numValue < 0.01) {
                    return Promise.reject(new Error('Miktar 0.01\'den büyük olmalı!'));
                  }
                  return Promise.resolve();
                }
              }
            ]}
            getValueFromEvent={(e) => {
              const value = e.target?.value || e;
              // String olarak tut, virgülü koru
              return typeof value === 'string' ? value : String(value);
            }}
          >
            <Input
              placeholder="0,00"
              size="large"
              style={{ width: '100%' }}
              onKeyDown={(e) => {
                // Virgül, nokta, sayı ve kontrol tuşlarına izin ver
                const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter', 'Home', 'End'];
                const key = e.key;
                const isNumber = /^\d$/.test(key);
                const isComma = key === ',';
                const isDot = key === '.';
                const isControl = allowedKeys.includes(key);
                
                if (isNumber || isComma || isDot || isControl || (e.ctrlKey || e.metaKey)) {
                  return; // İzin ver
                }
                e.preventDefault(); // Diğer karakterleri engelle
              }}
              onChange={(e) => {
                let value = e.target.value;
                
                // Boş değere izin ver
                if (value === '') {
                  form.setFieldsValue({ amount: '' });
                  return;
                }
                
                // Geçersiz karakterleri filtrele - sadece sayı, virgül ve nokta bırak
                value = value.replace(/[^\d,.]/g, '');
                
                // Çift ondalık ayırıcı varsa, sadece birini tut (virgül tercih edilir)
                const parts = value.split(/[,.]/);
                if (parts.length > 2) {
                  value = parts[0] + ',' + parts.slice(1).join('');
                }
                
                // Form'a string olarak gönder (virgülü koru)
                form.setFieldsValue({ amount: value });
              }}
              onBlur={(e) => {
                const value = e.target.value;
                if (value && !isNaN(parseNumberFromInput(value))) {
                  const numericValue = parseNumberFromInput(value);
                  const formattedValue = formatNumberForDisplay(numericValue);
                  form.setFieldsValue({ amount: numericValue });
                  // Input'un görünür değerini formatla
                  setTimeout(() => {
                    e.target.value = formattedValue;
                  }, 0);
                }
              }}
            />
          </Form.Item>

          {transactionType === 'output' && (
            <>
              <Form.Item
                label="Firma Seç"
                name="companyId"
                rules={[{ required: true, message: 'Firma seçiniz!' }]}
              >
                <Select
                  placeholder="Ödeme yapılacak firmayı seçin"
                  size="large"
                  showSearch
                  optionFilterProp="children"
                  popupRender={menu => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ padding: '8px 12px' }}>
                        <Button
                          type="dashed"
                          icon={<PlusOutlined />}
                          onClick={() => setQuickAddDrawerVisible(true)}
                          style={{ width: '100%' }}
                        >
                          Hızlı Firma Ekle
                        </Button>
                      </div>
                    </>
                  )}
                >
                  {companies.map(company => (
                    <Option key={company.id} value={company.id}>
                      <Space>
                        {company.type === 'company' ? <BankOutlined /> : <UserOutlined />}
                        <Text>{company.name}</Text>
                        <Tag color={company.type === 'company' ? 'blue' : 'green'} style={{ marginLeft: '4px' }}>
                          {company.type === 'company' ? 'Firma' : 'Kişi'}
                        </Tag>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Divider style={{ margin: '12px 0' }} />
            </>
          )}

          <Form.Item
            label="Notlar"
            name="notes"
          >
            <Input.TextArea
              placeholder="İşlem hakkında notlar..."
              rows={3}
            />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button 
                onClick={() => {
                  form.resetFields();
                  setModalVisible(false);
                }}
                size="large"
              >
                İptal
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                size="large"
                icon={transactionType === 'input' ? <PlusOutlined /> : <MinusOutlined />}
              >
                {transactionType === 'input' ? 'Giriş Yap' : 'Çıkış Yap'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Hızlı Firma Ekleme Drawer */}
      <Drawer
        title={
          <Space>
            <PlusOutlined />
            <span>Hızlı Firma Ekle</span>
          </Space>
        }
        open={quickAddDrawerVisible}
        onClose={() => {
          quickAddForm.resetFields();
          setQuickAddDrawerVisible(false);
        }}
        width={500}
        footer={
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => setQuickAddDrawerVisible(false)}>
              İptal
            </Button>
            <Button 
              type="primary" 
              onClick={() => quickAddForm.submit()}
              icon={<PlusOutlined />}
            >
              Ekle
            </Button>
          </Space>
        }
      >
        <Form
          form={quickAddForm}
          layout="vertical"
          onFinish={handleQuickAddCompany}
        >
          <Form.Item
            label="Tür"
            name="type"
            rules={[{ required: true, message: 'Tür seçiniz!' }]}
            initialValue="company"
          >
            <Select size="large">
              <Option value="company">
                <Space>
                  <BankOutlined />
                  <span>Firma</span>
                </Space>
              </Option>
              <Option value="person">
                <Space>
                  <UserOutlined />
                  <span>Kişi</span>
                </Space>
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Ad"
            name="name"
            rules={[{ required: true, message: 'Ad giriniz!' }]}
          >
            <Input 
              placeholder="Firma veya kişi adı" 
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="İletişim"
            name="contact"
          >
            <Input 
              placeholder="Telefon, email vb." 
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Adres"
            name="address"
          >
            <Input.TextArea 
              placeholder="Adres bilgisi" 
              rows={2}
            />
          </Form.Item>

          <Form.Item
            label="Notlar"
            name="notes"
          >
            <Input.TextArea 
              placeholder="Ek notlar..." 
              rows={2}
            />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
};

export default ExternalVault;

