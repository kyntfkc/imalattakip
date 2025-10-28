import React, { useState, Suspense, lazy, useEffect } from 'react';
import { Layout, Menu, Card, Row, Col, Typography, Space, Button, Dropdown, Avatar } from 'antd';
import type { MenuProps } from 'antd';
import {
  HomeOutlined,
  SwapOutlined,
  BarChartOutlined,
  SettingOutlined,
  GoldOutlined,
  ToolOutlined,
  ThunderboltOutlined,
  CrownOutlined,
  BankOutlined,
  FileTextOutlined,
  LogoutOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TransferProvider } from './context/TransferContext';
import { ExternalVaultProvider } from './context/ExternalVaultContext';
import { CompanyProvider } from './context/CompanyContext';
import { DashboardSettingsProvider } from './context/DashboardSettingsContext';
import { CinsiSettingsProvider } from './context/CinsiSettingsContext';
import { LogProvider } from './context/LogContext';
import { useBackendStatus } from './hooks/useBackendStatus';
import Login from './components/Login';
import TransferModal from './components/TransferModal';
import UnitDashboard from './components/UnitDashboard';
import { UnitType } from './types';
import { colors, commonStyles } from './styles/theme';
import './App.css';
import './styles/animations.css';

// Lazy load heavy components
const UnitPage = lazy(() => import('./components/UnitPage'));
const Reports = lazy(() => import('./components/Reports'));
const ExternalVault = lazy(() => import('./components/ExternalVault'));
const Companies = lazy(() => import('./components/Companies'));
const Settings = lazy(() => import('./components/Settings'));
const Logs = lazy(() => import('./components/Logs'));
const UserManagement = lazy(() => import('./components/UserManagement'));

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

type MenuItem = Required<MenuProps>['items'][number];

const App: React.FC = () => {
  return (
    <AuthProvider>
      <LogProvider>
        <TransferProvider>
          <ExternalVaultProvider>
            <CompanyProvider>
              <DashboardSettingsProvider>
                <CinsiSettingsProvider>
                  <AppContent />
                </CinsiSettingsProvider>
              </DashboardSettingsProvider>
            </CompanyProvider>
          </ExternalVaultProvider>
        </TransferProvider>
      </LogProvider>
    </AuthProvider>
  );
};

const AppContent: React.FC = () => {
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const { isBackendOnline, isChecking } = useBackendStatus();
  const [selectedMenu, setSelectedMenu] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + T: Yeni Transfer
      if ((event.ctrlKey || event.metaKey) && event.key === 't') {
        event.preventDefault();
        setTransferModalOpen(true);
      }
      
      // Ctrl/Cmd + 1-9: Menu navigation
      if ((event.ctrlKey || event.metaKey) && event.key >= '1' && event.key <= '9') {
        event.preventDefault();
        const menuIndex = parseInt(event.key) - 1;
        const menuItems = ['dashboard', 'units', 'reports', 'external-vault', 'companies', 'settings', 'logs', 'user-management'];
        if (menuItems[menuIndex]) {
          setSelectedMenu(menuItems[menuIndex]);
        }
      }
      
      // Escape: Close modals
      if (event.key === 'Escape') {
        setTransferModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mobile detection with proper breakpoints
  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      // Mobile: < 768px
      // Tablet: 768px - 991px  
      // Desktop: >= 992px
      setIsMobile(width < 768);
      
      // Auto-collapse sidebar on mobile
      if (width < 768 && !collapsed) {
        setCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [collapsed]);

  // Loading durumunda spinner göster
  if (isLoading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${colors.primary.main} 0%, ${colors.secondary.main} 100%)`
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <CrownOutlined style={{ fontSize: 48, marginBottom: 16 }} />
          <div style={{ fontSize: 18 }}>Yükleniyor...</div>
        </div>
      </div>
    );
  }

  // Giriş yapılmamışsa login sayfasını göster
  if (!isAuthenticated) {
    return <Login />;
  }

  const menuItems: MenuItem[] = [
    {
      key: 'dashboard',
      icon: <HomeOutlined />,
      label: 'Dashboard'
    },
    {
      key: 'divider-1',
      type: 'divider' as const
    },
    {
      key: 'units-group',
      label: 'ÜRETİM BİRİMLERİ',
      type: 'group' as const,
      children: [
        {
          key: 'ana-kasa',
          icon: <BankOutlined />,
          label: 'Ana Kasa'
        },
        {
          key: 'yarimamul',
          icon: <GoldOutlined />,
          label: 'Yarımamül'
        },
        {
          key: 'lazer-kesim',
          icon: <ThunderboltOutlined />,
          label: 'Lazer Kesim'
        },
        {
          key: 'tezgah',
          icon: <ToolOutlined />,
          label: 'Tezgah'
        },
        {
          key: 'cila',
          icon: <CrownOutlined />,
          label: 'Cila'
        }
      ]
    },
    {
      key: 'divider-2',
      type: 'divider' as const
    },
    {
      key: 'external-vault',
      icon: <BankOutlined />,
      label: 'Dış Kasa'
    },
    {
      key: 'dokum',
      icon: <GoldOutlined />,
      label: 'Döküm'
    },
    {
      key: 'tedarik',
      icon: <GoldOutlined />,
      label: 'Tedarik'
    },
    {
      key: 'satis',
      icon: <ShoppingCartOutlined />,
      label: 'Satış'
    },
    {
      key: 'divider-3',
      type: 'divider' as const
    },
    {
      key: 'reports',
      icon: <BarChartOutlined />,
      label: 'Raporlar'
    },
    {
      key: 'companies',
      icon: <TeamOutlined />,
      label: 'Firmalar'
    },
    {
      key: 'logs',
      icon: <FileTextOutlined />,
      label: 'Sistem Logları'
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Ayarlar'
    },
    {
      key: 'divider-4',
      type: 'divider' as const
    },
    {
      key: 'user-management',
      icon: <UserOutlined />,
      label: 'Kullanıcı Yönetimi'
    }
  ];

  const renderContent = () => {
    const LoadingFallback = () => (
      <div style={{
        height: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        borderRadius: '12px',
        margin: '20px'
      }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <CrownOutlined style={{ fontSize: 32, marginBottom: 8 }} />
          <div style={{ fontSize: 14 }}>Yükleniyor...</div>
        </div>
      </div>
    );

    switch (selectedMenu) {
      case 'dashboard':
        return <UnitDashboard />;
      case 'ana-kasa':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <UnitPage unitId="ana-kasa" />
          </Suspense>
        );
      case 'yarimamul':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <UnitPage unitId="yarimamul" />
          </Suspense>
        );
      case 'lazer-kesim':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <UnitPage unitId="lazer-kesim" />
          </Suspense>
        );
      case 'tezgah':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <UnitPage unitId="tezgah" />
          </Suspense>
        );
      case 'cila':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <UnitPage unitId="cila" />
          </Suspense>
        );
      case 'tedarik':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <UnitPage unitId="tedarik" />
          </Suspense>
        );
      case 'satis':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <UnitPage unitId="satis" />
          </Suspense>
        );
      case 'dokum':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <UnitPage unitId="dokum" />
          </Suspense>
        );
      case 'external-vault':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <ExternalVault />
          </Suspense>
        );
      case 'companies':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <Companies />
          </Suspense>
        );
      case 'reports':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <Reports />
          </Suspense>
        );
      case 'logs':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <Logs />
          </Suspense>
        );
      case 'settings':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <Settings />
          </Suspense>
        );
      case 'user-management':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <UserManagement />
          </Suspense>
        );
      default:
        return <UnitDashboard />;
    }
  };

  return (
    <>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider
          collapsible 
          collapsed={collapsed} 
          onCollapse={setCollapsed}
          width={240}
          collapsedWidth={isMobile ? 0 : 80}
          trigger={null}
          style={{
            background: '#ffffff',
            borderRight: '1px solid #e5e7eb',
            boxShadow: isMobile && !collapsed ? '4px 0 12px rgba(0, 0, 0, 0.15)' : '2px 0 8px rgba(0, 0, 0, 0.02)'
          }}
          breakpoint="lg"
          onBreakpoint={(broken) => {
            setIsMobile(broken);
            if (broken) {
              setCollapsed(true);
            }
          }}
        >
          <div style={{ 
            height: 72, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            borderBottom: '1px solid #e5e7eb',
            padding: '16px',
            background: '#ffffff'
          }}>
            {collapsed ? (
              <div style={{
                background: '#ffffff',
                borderRadius: '10px',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px'
              }}>
                <img 
                  src="/logo.png" 
                  alt="İndigo" 
                  style={{ 
                    height: '40px', 
                    width: '40px',
                    objectFit: 'contain',
                    display: 'block'
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<span style="font-size: 24px">💍</span>';
                  }}
                />
              </div>
            ) : (
              <div style={{
                background: '#ffffff',
                borderRadius: '10px',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%'
              }}>
                <img 
                  src="/logo.png" 
                  alt="İndigo İmalat Takip" 
                  style={{ 
                    height: '48px', 
                    width: 'auto',
                    maxWidth: '100%',
                    objectFit: 'contain',
                    display: 'block'
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<div style="text-align: center;"><div style="font-size: 24px; margin-bottom: 4px;">💍</div><div style="color: #1f2937; font-size: 14px; font-weight: 700;">İndigo İmalat</div></div>';
                  }}
                />
              </div>
            )}
          </div>
          <Menu
            mode="inline"
            selectedKeys={[selectedMenu]}
            items={menuItems}
            onClick={({ key }) => {
              setSelectedMenu(key);
              // Auto-collapse menu on mobile after selection
              if (isMobile) {
                setCollapsed(true);
              }
            }}
            style={{
              border: 'none',
              background: '#ffffff',
              padding: '8px',
              fontSize: '14px'
            }}
            theme="light"
          />
        </Sider>
        
        {isMobile && !collapsed && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.45)',
              zIndex: 999,
            }}
            onClick={() => setCollapsed(true)}
          />
        )}
        
        <Layout>
          <Header style={{ 
            background: colors.background.main,
            padding: isMobile ? '0 16px' : '0 32px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${colors.neutral[200]}`,
            height: isMobile ? '60px' : '72px',
            zIndex: 100
          }}>
            <Space>
              {isMobile && (
                <Button
                  type="text"
                  onClick={() => setCollapsed(!collapsed)}
                  style={{
                    fontSize: '20px',
                    padding: '0 8px',
                    height: '40px'
                  }}
                >
                  ☰
                </Button>
              )}
              <Title level={2} style={{ 
                margin: 0, 
                color: '#1f2937',
                fontWeight: 700,
                fontSize: isMobile ? '18px' : '24px'
              }}>
                İmalat Takip
              </Title>
            </Space>
            <Space size={isMobile ? 8 : 16}>
              {!isMobile && (
                <Button 
                  type="primary" 
                  icon={<SwapOutlined />} 
                  onClick={() => setTransferModalOpen(true)}
                  size="large"
                  style={{
                    borderRadius: '12px',
                    height: '44px',
                    padding: '0 24px',
                    fontWeight: 600
                  }}
                >
                  Yeni Transfer
                </Button>
              )}
              
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'profile',
                      icon: <UserOutlined />,
                      label: `${user?.username} (${user?.role === 'admin' ? 'Yönetici' : 'Kullanıcı'})`,
                      disabled: true
                    },
                    {
                      type: 'divider'
                    },
                    {
                      key: 'logout',
                      icon: <LogoutOutlined />,
                      label: 'Çıkış Yap',
                      onClick: logout
                    }
                  ]
                }}
                placement="bottomRight"
                arrow
              >
                {isMobile ? (
                  <Button
                    type="text"
                    style={{
                      height: '40px',
                      padding: '0 8px',
                      borderRadius: '12px'
                    }}
                  >
                    <Avatar 
                      size="default" 
                      icon={<UserOutlined />}
                      style={{
                        background: '#64748b',
                        color: 'white'
                      }}
                    />
                  </Button>
                ) : (
                  <Button
                    type="text"
                    style={{
                      height: '44px',
                      padding: '0 16px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: '#f8fafc',
                      border: '1px solid #e5e7eb',
                      color: '#64748b'
                    }}
                  >
                    <Avatar 
                      size="small" 
                      icon={<UserOutlined />}
                      style={{
                        background: '#64748b',
                        color: 'white'
                      }}
                    />
                    <span style={{ color: '#64748b', fontWeight: '500' }}>
                      {user?.name}
                    </span>
                  </Button>
                )}
              </Dropdown>
              
              {isMobile && (
                <Button 
                  type="primary" 
                  icon={<SwapOutlined />} 
                  onClick={() => setTransferModalOpen(true)}
                  size="large"
                  shape="circle"
                  style={{
                    borderRadius: '50%',
                    height: '44px',
                    width: '44px',
                    fontWeight: 600
                  }}
                />
              )}
            </Space>
          </Header>
          
          <Content style={{ 
            margin: isMobile ? '0' : '24px', 
            padding: 0, 
            background: colors.background.alt,
            minHeight: 'calc(100vh - 112px)',
            width: '100%',
            overflow: 'hidden'
          }}>
            <div className="fade-in" style={{ padding: isMobile ? '12px' : '24px' }}>
              {renderContent()}
            </div>
          </Content>
          
          {/* Backend Durumu - Sağ Alt */}
          {!isChecking && (
            <div style={{
              position: 'fixed',
              bottom: isMobile ? '10px' : '20px',
              right: isMobile ? '10px' : '20px',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              padding: isMobile ? '6px 12px' : '8px 16px',
              borderRadius: '24px',
              fontSize: isMobile ? '11px' : '13px',
              fontWeight: '600',
              backgroundColor: isBackendOnline ? '#dcfce7' : '#fee2e2',
              color: isBackendOnline ? '#166534' : '#991b1b',
              border: `2px solid ${isBackendOnline ? '#22c55e' : '#ef4444'}`,
              minWidth: isMobile ? '100px' : '140px',
              justifyContent: 'center',
              boxShadow: isBackendOnline 
                ? '0 4px 12px rgba(34, 197, 94, 0.3)' 
                : '0 4px 12px rgba(239, 68, 68, 0.3)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                width: isMobile ? '6px' : '8px',
                height: isMobile ? '6px' : '8px',
                borderRadius: '50%',
                backgroundColor: isBackendOnline ? '#22c55e' : '#ef4444',
                marginRight: '6px',
                animation: isBackendOnline ? 'pulse 2s infinite' : 'none',
                boxShadow: isBackendOnline 
                  ? '0 0 12px rgba(34, 197, 94, 0.8)' 
                  : '0 0 12px rgba(239, 68, 68, 0.8)'
              }} />
              {isMobile ? (isBackendOnline ? 'Aktif' : 'Kapalı') : (isBackendOnline ? 'Backend Aktif' : 'Backend Kapalı')}
            </div>
          )}
        </Layout>
      </Layout>
      
      <TransferModal 
        open={transferModalOpen} 
        onClose={() => setTransferModalOpen(false)} 
      />
    </>
  );
};

export default App;