import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Space, Typography, Tag, Popconfirm, message, Row, Col, Statistic, Alert } from 'antd';
import { UserOutlined, PlusOutlined, EditOutlined, DeleteOutlined, CrownOutlined, TeamOutlined, SearchOutlined, ReloadOutlined, KeyOutlined, LockOutlined } from '@ant-design/icons';
import { User, useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';

const { Title, Text } = Typography;

// Rol normalleştirme fonksiyonu: Backend'den 'normal_user' gelebilir, frontend'de 'user' olarak normalize edilir
const normalizeRole = (role: string): 'admin' | 'user' => {
  if (role === 'admin') return 'admin';
  if (role === 'normal_user' || role === 'user') return 'user';
  return 'user';
};
const { Option } = Select;
const { Search } = Input;

const UserManagement: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [passwordResetModalVisible, setPasswordResetModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [passwordResetForm] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [submitting, setSubmitting] = useState(false);

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
          role: normalizeRole(u.role),
          name: u.name || '',
          email: u.email || ''
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

  // Filtreleme ve arama
  useEffect(() => {
    let filtered = [...users];

    // Rol filtresi
    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    // Arama filtresi
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(u => 
        u.username.toLowerCase().includes(searchLower) ||
        (u.name && u.name.toLowerCase().includes(searchLower)) ||
        (u.email && u.email.toLowerCase().includes(searchLower))
      );
    }

    setFilteredUsers(filtered);
  }, [users, searchText, roleFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const backendUsers = await apiService.getUsers();
      const formattedUsers: User[] = backendUsers.map((u: any) => ({
        id: u.id,
        username: u.username,
        role: normalizeRole(u.role),
        name: u.name || '',
        email: u.email || ''
      }));
      setUsers(formattedUsers);
    } catch (error) {
      console.error('Kullanıcılar yüklenemedi:', error);
      message.error('Kullanıcılar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      username: user.username,
      role: user.role,
      name: user.name || '',
      email: user.email || ''
    });
    setModalVisible(true);
  };

  const handlePasswordReset = (user: User) => {
    setResettingUser(user);
    passwordResetForm.resetFields();
    setPasswordResetModalVisible(true);
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      // Kullanıcı kendisini silmeye çalışıyorsa engelle
      if (user?.id === userId) {
        message.error('Kendi hesabınızı silemezsiniz!');
        return;
      }

      // Silinecek kullanıcıyı bul
      const userToDelete = users.find(u => u.id === userId);
      
      // Son admin kontrolü
      if (userToDelete?.role === 'admin') {
        const adminUsers = users.filter(u => u.role === 'admin');
        if (adminUsers.length <= 1) {
          message.error('En az bir admin kullanıcı olmalıdır!');
          return;
        }
      }

      setLoading(true);
      await apiService.deleteUser(userId);
      await loadUsers();
      message.success('Kullanıcı silindi!');
    } catch (error: any) {
      console.error('Kullanıcı silinemedi:', error);
      
      // Daha açıklayıcı hata mesajları
      let errorMessage = 'Kullanıcı silinemedi';
      
      if (error.message) {
        if (error.message.includes('500') || error.message.includes('Sunucu hatası')) {
          errorMessage = 'Sunucu hatası! Kullanıcının bağlı olduğu veriler olabilir. Lütfen backend log\'larını kontrol edin.';
        } else if (error.message.includes('foreign key') || error.message.includes('constraint')) {
          errorMessage = 'Bu kullanıcı başka kayıtlarla ilişkili olduğu için silinemez. Önce bağlı verileri temizleyin.';
        } else {
          errorMessage = error.message;
        }
      }
      
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      if (editingUser) {
        // Rol güncelleme
        await apiService.updateUserRole(editingUser.id, values.role);
        await loadUsers();
        message.success('Kullanıcı güncellendi!');
      } else {
        // Yeni kullanıcı ekleme
        await apiService.register(values.username, values.password, values.role);
        await loadUsers();
        message.success('Kullanıcı eklendi!');
      }
      setModalVisible(false);
      form.resetFields();
    } catch (error: any) {
      console.error('İşlem başarısız:', error);
      message.error(error.message || 'İşlem başarısız');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordResetSubmit = async (values: any) => {
    if (!resettingUser) return;
    
    try {
      setSubmitting(true);
      await apiService.resetUserPassword(resettingUser.id, values.newPassword);
      await loadUsers();
      message.success('Şifre başarıyla sıfırlandı');
      setPasswordResetModalVisible(false);
      passwordResetForm.resetFields();
      setResettingUser(null);
    } catch (error: any) {
      console.error('Şifre sıfırlama başarısız:', error);
      let errorMessage = 'Şifre sıfırlama başarısız';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.error) {
        errorMessage = error.error;
      }
      
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
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
      width: 200,
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
          <Button
            size="small"
            icon={<KeyOutlined />}
            onClick={() => handlePasswordReset(record)}
          >
            Şifre Sıfırla
          </Button>
          <Popconfirm
            title="Kullanıcıyı silmek istediğinizden emin misiniz?"
            description={
              record.id === user?.id 
                ? "Kendi hesabınızı silemezsiniz!"
                : record.role === 'admin' && users.filter(u => u.role === 'admin').length <= 1
                ? "Son admin kullanıcı silinemez!"
                : "Bu işlem geri alınamaz."
            }
            onConfirm={() => handleDeleteUser(record.id)}
            okText="Evet"
            cancelText="Hayır"
            okButtonProps={{ danger: true }}
            disabled={record.id === user?.id || (record.role === 'admin' && users.filter(u => u.role === 'admin').length <= 1)}
          >
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              disabled={record.id === user?.id || (record.role === 'admin' && users.filter(u => u.role === 'admin').length <= 1)}
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
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadUsers}
              loading={loading}
            >
              Yenile
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddUser}
            >
              Yeni Kullanıcı
            </Button>
          </Space>
        }
        style={{ borderRadius: 12 }}
      >
        {/* Filtreleme ve Arama */}
        <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }} size="middle">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={10}>
              <Search
                placeholder="Kullanıcı adı, ad soyad veya e-posta ile ara..."
                allowClear
                enterButton={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onSearch={setSearchText}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="Rol filtrele"
                style={{ width: '100%' }}
                value={roleFilter}
                onChange={setRoleFilter}
                allowClear
              >
                <Option value="all">Tüm Roller</Option>
                <Option value="admin">Yönetici</Option>
                <Option value="user">Kullanıcı</Option>
              </Select>
            </Col>
            <Col xs={24} sm={24} md={8}>
              <Space>
                <Text type="secondary">
                  {filteredUsers.length} / {users.length} kullanıcı
                </Text>
              </Space>
            </Col>
          </Row>
        </Space>

        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          loading={loading}
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Toplam ${total} kullanıcı`
          }}
          locale={{ emptyText: searchText || roleFilter !== 'all' ? 'Filtre kriterlerine uygun kullanıcı bulunamadı' : 'Henüz kullanıcı yok' }}
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

          {!editingUser && (
            <Form.Item
              name="password"
              label="Şifre"
              help="Şifre en az 8 karakter olmalı ve en az bir büyük harf, bir küçük harf, bir rakam ve bir özel karakter içermelidir."
              rules={[
                { required: true, message: 'Şifre gerekli!' },
                { min: 8, message: 'Şifre en az 8 karakter olmalı!' },
                { 
                  validator: (_, value) => {
                    if (!value) {
                      return Promise.resolve();
                    }
                    const hasUpperCase = /[A-Z]/.test(value);
                    const hasLowerCase = /[a-z]/.test(value);
                    const hasNumbers = /\d/.test(value);
                    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
                    
                    if (!hasUpperCase) {
                      return Promise.reject(new Error('Şifre en az bir büyük harf içermeli!'));
                    }
                    if (!hasLowerCase) {
                      return Promise.reject(new Error('Şifre en az bir küçük harf içermeli!'));
                    }
                    if (!hasNumbers) {
                      return Promise.reject(new Error('Şifre en az bir rakam içermeli!'));
                    }
                    if (!hasSpecialChar) {
                      return Promise.reject(new Error('Şifre en az bir özel karakter içermeli!'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <Input.Password placeholder="Şifre girin" />
            </Form.Item>
          )}

          <Form.Item
            name="name"
            label="Ad Soyad"
          >
            <Input placeholder="Ad soyad girin (opsiyonel)" />
          </Form.Item>

          <Form.Item
            name="email"
            label="E-posta"
            rules={[
              { type: 'email', message: 'Geçerli bir e-posta adresi girin!' }
            ]}
          >
            <Input placeholder="E-posta adresi girin (opsiyonel)" />
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
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }} disabled={submitting}>
                İptal
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingUser ? 'Güncelle' : 'Ekle'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Şifre Sıfırlama Modal */}
      <Modal
        title="Şifre Sıfırla"
        open={passwordResetModalVisible}
        onCancel={() => {
          setPasswordResetModalVisible(false);
          passwordResetForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        {resettingUser && (
          <div style={{ marginBottom: 16 }}>
            <Text strong>{resettingUser.username}</Text> kullanıcısı için yeni şifre belirleyin.
          </div>
        )}
        <Form
          form={passwordResetForm}
          layout="vertical"
          onFinish={handlePasswordResetSubmit}
        >
          <Form.Item
            name="newPassword"
            label="Yeni Şifre"
            help="Şifre en az 8 karakter olmalı ve en az bir büyük harf, bir küçük harf, bir rakam ve bir özel karakter içermelidir."
            rules={[
              { required: true, message: 'Yeni şifre gerekli!' },
              { min: 8, message: 'Şifre en az 8 karakter olmalı!' },
              { 
                validator: (_, value) => {
                  if (!value) {
                    return Promise.resolve();
                  }
                  const hasUpperCase = /[A-Z]/.test(value);
                  const hasLowerCase = /[a-z]/.test(value);
                  const hasNumbers = /\d/.test(value);
                  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
                  
                  if (!hasUpperCase) {
                    return Promise.reject(new Error('Şifre en az bir büyük harf içermeli!'));
                  }
                  if (!hasLowerCase) {
                    return Promise.reject(new Error('Şifre en az bir küçük harf içermeli!'));
                  }
                  if (!hasNumbers) {
                    return Promise.reject(new Error('Şifre en az bir rakam içermeli!'));
                  }
                  if (!hasSpecialChar) {
                    return Promise.reject(new Error('Şifre en az bir özel karakter (!@#$%^&*(),.?":{}|<>) içermeli!'));
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <Input.Password placeholder="Yeni şifre girin" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Şifre Tekrar"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Şifre tekrarı gerekli!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Şifreler eşleşmiyor!'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Şifreyi tekrar girin" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setPasswordResetModalVisible(false);
                passwordResetForm.resetFields();
              }} disabled={submitting}>
                İptal
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Şifreyi Sıfırla
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;
