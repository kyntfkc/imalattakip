import React, { useState } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Table, 
  Button, 
  Space, 
  Modal, 
  Form, 
  Input, 
  Select, 
  message, 
  Popconfirm,
  Alert
} from 'antd';
import { 
  TeamOutlined, 
  PlusOutlined, 
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  BankOutlined
} from '@ant-design/icons';
import { useCompanies } from '../context/CompanyContext';
import { useLog } from '../context/LogContext';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Option } = Select;

const Companies: React.FC = () => {
  const { companies, addCompany, updateCompany, deleteCompany } = useCompanies();
  const { addLog } = useLog();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [form] = Form.useForm();

  const handleAddCompany = () => {
    setEditingCompany(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditCompany = (company: any) => {
    setEditingCompany(company);
    form.setFieldsValue(company);
    setModalVisible(true);
  };

  const handleDeleteCompany = (companyId: string) => {
    deleteCompany(companyId);
    addLog({
      action: 'DELETE',
      entityType: 'COMPANY',
      entityName: 'Firma',
      details: 'Firma silindi'
    });
    message.success('Firma başarıyla silindi!');
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingCompany) {
        await updateCompany(editingCompany.id, values);
        addLog({
          action: 'UPDATE',
          entityType: 'COMPANY',
          entityName: 'Firma',
          details: `Firma bilgileri güncellendi: ${values.name}`
        });
        message.success('Firma başarıyla güncellendi!');
      } else {
        await addCompany(values);
        addLog({
          action: 'CREATE',
          entityType: 'COMPANY',
          entityName: 'Firma',
          details: `Yeni firma eklendi: ${values.name}`
        });
        message.success('Firma başarıyla eklendi!');
      }
      setModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Firma işlemi hatası:', error);
      message.error('Firma işlemi tamamlanırken hata oluştu!');
    }
  };

  const columns: ColumnsType<any> = [
    {
      title: 'Firma/Kişi Adı',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <Space>
          <TeamOutlined style={{ color: '#64748b' }} />
          <Text strong style={{ color: '#1f2937' }}>{text}</Text>
        </Space>
      )
    },
    {
      title: 'Tür',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Space>
          {type === 'company' ? (
            <BankOutlined style={{ color: '#64748b' }} />
          ) : (
            <UserOutlined style={{ color: '#64748b' }} />
          )}
          <Text style={{ color: '#64748b' }}>
            {type === 'company' ? 'Firma' : 'Kişi'}
          </Text>
        </Space>
      )
    },
    {
      title: 'İletişim',
      dataIndex: 'contact',
      key: 'contact',
      render: (contact: string) => (
        <Text style={{ color: '#64748b' }}>{contact || '-'}</Text>
      )
    },
    {
      title: 'Notlar',
      dataIndex: 'notes',
      key: 'notes',
      render: (notes: string) => (
        <Text style={{ color: '#64748b' }}>{notes || '-'}</Text>
      )
    },
    {
      title: 'İşlemler',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditCompany(record)}
            style={{ color: '#64748b' }}
          >
            Düzenle
          </Button>
          <Popconfirm
            title="Firmayı Sil"
            description="Bu firmayı silmek istediğinizden emin misiniz?"
            onConfirm={() => handleDeleteCompany(record.id)}
            okText="Evet"
            cancelText="Hayır"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
            >
              Sil
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space align="center">
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #cbd5e1'
          }}>
            <TeamOutlined style={{ fontSize: '24px', color: '#64748b' }} />
          </div>
          <div>
            <Title level={2} style={{ margin: 0, color: '#1f2937' }}>Firmalar</Title>
            <Text type="secondary" style={{ fontSize: '16px' }}>Dış kasa işlemleri için firma yönetimi</Text>
          </div>
        </Space>
      </div>

      {/* Ana İçerik */}
      <Card 
        style={{ 
          borderRadius: '16px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 24 
        }}>
          <div>
            <Title level={4} style={{ margin: 0, color: '#1f2937' }}>Kayıtlı Firmalar</Title>
            <Text type="secondary">Dış kasa işlemlerinde kullanılacak firmalar</Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddCompany}
            size="large"
            style={{
              borderRadius: '8px',
              height: '40px',
              padding: '0 20px',
              fontWeight: '500'
            }}
          >
            Yeni Firma
          </Button>
        </div>

        {companies.length === 0 ? (
          <Alert
            message="Henüz firma eklenmemiş"
            description="Dış kasa işlemleri için önce firma eklemeniz gerekiyor."
            type="info"
            showIcon
            style={{ borderRadius: '8px' }}
            action={
              <Button type="primary" onClick={handleAddCompany}>
                İlk Firmayı Ekle
              </Button>
            }
          />
        ) : (
          <Table
            columns={columns}
            dataSource={companies}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} firma`
            }}
            style={{ borderRadius: '8px' }}
          />
        )}
      </Card>

      {/* Firma Ekleme/Düzenleme Modal */}
      <Modal
        title={
          <Space>
            <TeamOutlined style={{ color: '#64748b' }} />
            <span style={{ color: '#1f2937' }}>
              {editingCompany ? 'Firma Düzenle' : 'Yeni Firma Ekle'}
            </span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
        style={{
          top: '20px'
        }}
        styles={{
          body: {
            padding: '24px',
            background: '#f8fafc'
          }
        }}
      >
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            size="large"
          >
            <Form.Item
              name="name"
              label="Firma/Kişi Adı"
              rules={[
                { required: true, message: 'Firma adı giriniz!' },
                { min: 2, message: 'En az 2 karakter olmalı!' },
                { max: 100, message: 'En fazla 100 karakter!' }
              ]}
            >
              <Input
                placeholder="Firma veya kişi adı"
                style={{ borderRadius: '8px' }}
              />
            </Form.Item>

            <Form.Item
              name="type"
              label="Tür"
              rules={[{ required: true, message: 'Tür seçiniz!' }]}
              initialValue="company"
            >
              <Select placeholder="Firma türünü seçin" style={{ borderRadius: '8px' }}>
                <Option value="company">Firma</Option>
                <Option value="person">Kişi</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="contact"
              label="İletişim Bilgisi"
              rules={[
                { max: 200, message: 'En fazla 200 karakter!' }
              ]}
            >
              <Input
                placeholder="Telefon, email veya adres"
                style={{ borderRadius: '8px' }}
              />
            </Form.Item>

            <Form.Item
              name="notes"
              label="Notlar"
              rules={[
                { max: 500, message: 'En fazla 500 karakter!' }
              ]}
            >
              <Input.TextArea
                rows={3}
                placeholder="Firma hakkında notlar..."
                style={{ borderRadius: '8px' }}
                maxLength={500}
                showCount
              />
            </Form.Item>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '24px'
            }}>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  form.resetFields();
                }}
                size="large"
                style={{
                  borderRadius: '8px',
                  height: '40px',
                  padding: '0 20px'
                }}
              >
                İptal
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                style={{
                  borderRadius: '8px',
                  height: '40px',
                  padding: '0 20px',
                  fontWeight: '500'
                }}
              >
                {editingCompany ? 'Güncelle' : 'Firmayı Kaydet'}
              </Button>
            </div>
          </Form>
        </div>
      </Modal>
    </div>
  );
};

export default Companies;
