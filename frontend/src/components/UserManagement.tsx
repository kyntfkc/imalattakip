import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Space, Typography, Tag, Popconfirm, message, Row, Col, Statistic } from 'antd';
import { UserOutlined, PlusOutlined, EditOutlined, DeleteOutlined, CrownOutlined, TeamOutlined } from '@ant-design/icons';
import { User } from '../context/AuthContext';
import { apiService } from '../services/apiService';

const { Title, Text } = Typography;
const { Option } = Select;

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);

  // Backend'den kullanıcıları yükle
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const backendUsers = await apiService.getUsers();
        
        // Backend formatını frontend formatına çevir
        const formattedUsers: User[] = backendUsers.map((u: any) => ({
          id: u.id,
          username: u.username,
          role: u.role as 'admin' | 'user'
        }));
        
        setUsers(formattedUsers);
      } catch (error) {
        console.error('Kullanıcılar yüklenemedi:', error);
        message.error('Kullanıcılar yüklenemedi');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const handleAddUser = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue(user);
    setModalVisible(true);
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      await apiService.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      message.success('Kullanıcı silindi!');
    } catch (error) {
      console.error('Kullanıcı silinemedi:', error);
      message.error('Kullanıcı silinemedi');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingUser) {
        // Rol güncelleme
        await apiService.updateUserRole(editingUser.id, values.role);
        setUsers(prev => prev.map(u => 
          u.id === editingUser.id ? { ...u, role: values.role } : u
        ));
        message.success('Kullanıcı güncellendi!');
      } else {
        // Yeni kullanıcı ekleme
        await apiService.register(values.username, values.password, values.role);
        message.success('Kullanıcı eklendi!');
        // Kullanıcı listesini yenile
        const backendUsers = await apiService.getUsers();
        const formattedUsers: User[] = backendUsers.map((u: any) => ({
          id: u.id,
          username: u.username,
          role: u.role as 'admin' | 'user'
        }));
        setUsers(formattedUsers);
      }
      setModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('İşlem başarısız:', error);
      message.error('İşlem başarısız');
    }
  };

  const columns = [
    {
      title: 'Kullanıcı Adı',
      dataIndex: 'username',
      key: 'username',
      render: (text: string) => (
        <Space>
          <UserOutlined />
          <Text strong>{text}</Text>
        </Space>
      )
    },
    {
      title: 'Ad Soyad',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'Rol',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag 
          color={role === 'admin' ? 'red' : 'blue'}
          icon={role === 'admin' ? <CrownOutlined /> : <TeamOutlined />}
        >
          {role === 'admin' ? 'Yönetici' : 'Kullanıcı'}
        </Tag>
      )
    },
    {
      title: 'E-posta',
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: 'İşlemler',
      key: 'actions',
      render: (record: User) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditUser(record)}
          >
            Düzenle
          </Button>
          <Popconfirm
            title="Kullanıcıyı silmek istediğinizden emin misiniz?"
            onConfirm={() => handleDeleteUser(record.id)}
            okText="Evet"
            cancelText="Hayır"
          >
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
            >
              Sil
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const adminCount = users.filter(u => u.role === 'admin').length;
  const userCount = users.filter(u => u.role === 'user').length;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space align="center">
          <UserOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
          <div>
            <Title level={2} style={{ margin: 0 }}>Kullanıcı Yönetimi</Title>
            <Text type="secondary">Sistem kullanıcılarını yönetin</Text>
          </div>
        </Space>
      </div>

      {/* İstatistikler */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Toplam Kullanıcı"
              value={users.length}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Yönetici"
              value={adminCount}
              prefix={<CrownOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Kullanıcı"
              value={userCount}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Kullanıcı Listesi */}
      <Card
        title="Kullanıcılar"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddUser}
          >
            Yeni Kullanıcı
          </Button>
        }
        style={{ borderRadius: 12 }}
      >
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'Henüz kullanıcı yok' }}
        />
      </Card>

      {/* Kullanıcı Ekleme/Düzenleme Modal */}
      <Modal
        title={editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="username"
            label="Kullanıcı Adı"
            rules={[
              { required: true, message: 'Kullanıcı adı gerekli!' },
              { min: 3, message: 'En az 3 karakter olmalı!' }
            ]}
          >
            <Input placeholder="Kullanıcı adı girin" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Şifre"
            rules={[
              { required: true, message: 'Şifre gerekli!' },
              { min: 6, message: 'En az 6 karakter olmalı!' }
            ]}
          >
            <Input.Password placeholder="Şifre girin" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Ad Soyad"
            rules={[
              { required: true, message: 'Ad soyad gerekli!' }
            ]}
          >
            <Input placeholder="Ad soyad girin" />
          </Form.Item>

          <Form.Item
            name="email"
            label="E-posta"
            rules={[
              { type: 'email', message: 'Geçerli bir e-posta adresi girin!' }
            ]}
          >
            <Input placeholder="E-posta adresi girin" />
          </Form.Item>

          <Form.Item
            name="role"
            label="Rol"
            rules={[
              { required: true, message: 'Rol seçin!' }
            ]}
          >
            <Select placeholder="Rol seçin">
              <Option value="admin">Yönetici</Option>
              <Option value="user">Kullanıcı</Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                İptal
              </Button>
              <Button type="primary" htmlType="submit">
                {editingUser ? 'Güncelle' : 'Ekle'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;
