import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Checkbox } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined, CrownOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { colors, commonStyles } from '../styles/theme';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberUsername, setRememberUsername] = useState(false);
  const { login } = useAuth();

  // Sayfa yüklendiğinde hatırlanan kullanıcı adını yükle
  useEffect(() => {
    const savedUsername = localStorage.getItem('rememberedUsername');
    const shouldRemember = localStorage.getItem('rememberUsername') === 'true';
    
    if (shouldRemember && savedUsername) {
      form.setFieldsValue({ username: savedUsername });
      setRememberUsername(true);
    }
  }, [form]);

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    setError('');

    try {
      const success = await login(values.username, values.password);
      if (!success) {
        setError('Kullanıcı adı veya şifre hatalı!');
      } else {
        // Başarılı giriş sonrası kullanıcı adını hatırla
        if (rememberUsername) {
          localStorage.setItem('rememberedUsername', values.username);
          localStorage.setItem('rememberUsername', 'true');
        } else {
          localStorage.removeItem('rememberedUsername');
          localStorage.removeItem('rememberUsername');
        }
      }
    } catch (error) {
      setError('Giriş sırasında bir hata oluştu!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
          border: 'none'
        }}
        bodyStyle={{ padding: '40px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: 100,
            height: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
            border: '2px solid #f0f0f0'
          }}>
            <img 
              src="/logo.png" 
              alt="İndigo İmalat Logo" 
              style={{ 
                width: '70px', 
                height: '70px',
                objectFit: 'contain'
              }}
              onError={(e) => {
                // Logo yüklenemezse varsayılan ikonu göster
                e.currentTarget.style.display = 'none';
                const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                if (nextElement) {
                  nextElement.style.display = 'flex';
                }
              }}
            />
            <div style={{ 
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              background: '#f8fafc',
              borderRadius: '14px',
              border: '1px solid #e5e7eb'
            }}>
              <CrownOutlined style={{ fontSize: 32, color: '#64748b' }} />
            </div>
          </div>
          <Title level={2} style={{ margin: 0, color: '#1f2937' }}>
            İmalat Takip Sistemi
          </Title>
          <Text type="secondary" style={{ fontSize: 16 }}>
            Üretim birimlerinizi takip edin
          </Text>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        <Form
          form={form}
          name="login"
          onFinish={handleLogin}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: 'Kullanıcı adı gerekli!' },
              { min: 3, message: 'Kullanıcı adı en az 3 karakter olmalı!' }
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#64748b' }} />}
              placeholder="Kullanıcı adı"
              style={{ borderRadius: commonStyles.borderRadiusSmall }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: 'Şifre gerekli!' },
              { min: 6, message: 'Şifre en az 6 karakter olmalı!' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#64748b' }} />}
              placeholder="Şifre"
              style={{ borderRadius: commonStyles.borderRadiusSmall }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Checkbox
              checked={rememberUsername}
              onChange={(e) => setRememberUsername(e.target.checked)}
              style={{ color: '#6b7280' }}
            >
              Kullanıcı adımı hatırla
            </Checkbox>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              icon={<LoginOutlined />}
              style={{
                height: 48,
                borderRadius: commonStyles.borderRadiusSmall,
                fontSize: 16,
                fontWeight: 600
              }}
            >
              Giriş Yap
            </Button>
          </Form.Item>
        </Form>

      </Card>
    </div>
  );
};

export default Login;
