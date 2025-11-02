import React, { useState, Suspense, lazy, useEffect, useRef, useMemo, useCallback } from 'react';
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
  TeamOutlined,
  CalculatorOutlined
} from '@ant-design/icons';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TransferProvider } from './context/TransferContext';
import { ExternalVaultProvider } from './context/ExternalVaultContext';
import { CompanyProvider } from './context/CompanyContext';
import { DashboardSettingsProvider } from './context/DashboardSettingsContext';
import { CinsiSettingsProvider } from './context/CinsiSettingsContext';
import { LogProvider } from './context/LogContext';
import { MenuSettingsProvider, useMenuSettings } from './context/MenuSettingsContext';
import { useBackendStatus } from './hooks/useBackendStatus';
import Login from './components/Login';
import TransferModal from './components/TransferModal';
import DataSyncIndicator from './components/DataSyncIndicator';
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
const RequiredHas = lazy(() => import('./components/RequiredHas'));

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

type MenuItem = Required<MenuProps>['items'][number];

const App: React.FC = () => {
  return (
    <AuthProvider>
      <MenuSettingsProvider>
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
      </MenuSettingsProvider>
    </AuthProvider>
  );
};

const AppContent: React.FC = () => {
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const { settings: menuSettings, isLoading: menuSettingsLoading } = useMenuSettings();
  const { isBackendOnline, isChecking } = useBackendStatus();
  const [selectedMenu, setSelectedMenu] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [logoError, setLogoError] = useState(false);
  const collapsedRef = useRef(collapsed);

  // collapsed değiştiğinde ref'i güncelle
  useEffect(() => {
    collapsedRef.current = collapsed;
  }, [collapsed]);

  // Mobilde menü açıkken body scroll'u engelle
  useEffect(() => {
    // Mobilde menü açıkken scroll'u engelleme - artık scroll'a izin veriyoruz
    // Sadece menü overlay'i kapatmak için tıklamaya izin veriyoruz
    if (isMobile && !collapsed) {
      // Scroll'u engellemeyelim, sadece overlay gösterelim
      // document.body.classList.add('menu-open'); // Kaldırıldı
    } else {
      document.body.classList.remove('menu-open');
    }
    
    return () => {
      document.body.classList.remove('menu-open');
    };
  }, [collapsed, isMobile]);

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

  // Mobile detection - flicker önleme
  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      const newIsMobile = width < 768;
      
      // Sadece state değiştiyse güncelle
      if (newIsMobile !== isMobile) {
        setIsMobile(newIsMobile);
        
        // Mobil ise ve menü açıksa kapat - ref kullanarak
        if (newIsMobile && !collapsedRef.current) {
          setCollapsed(true);
        }
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [isMobile, collapsedRef]);

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

  const isAdmin = user?.role === 'admin';

  // Rol bazlı varsayılan ayarlar (fallback için)
  const getDefaultVisibility = useCallback((key: string): boolean => {
    const defaultSettings = {
      admin: {
        dashboard: true, 'ana-kasa': true, 'yarimamul': true, 'lazer-kesim': true, 'tezgah': true, 'cila': true,
        'external-vault': true, 'dokum': true, 'tedarik': true, 'satis': true,
        'required-has': true, 'reports': true, 'companies': true, 'logs': true, 'settings': true, 'user-management': true,
      },
      user: {
        dashboard: true, 'ana-kasa': true, 'yarimamul': true, 'lazer-kesim': true, 'tezgah': true, 'cila': true,
        'external-vault': true, 'dokum': true, 'tedarik': true, 'satis': true,
        'required-has': true, 'reports': true, 'companies': true, 'logs': false, 'settings': true, 'user-management': false,
      },
    };
    return defaultSettings[isAdmin ? 'admin' : 'user'][key as keyof typeof defaultSettings.admin] ?? true;
  }, [isAdmin]);

  // Menü öğelerini ayarlara göre filtrele
  const isMenuVisible = useCallback((key: string): boolean => {
    // Admin-only menüler için rol kontrolü
    if (key === 'user-management' || key === 'logs') {
      // Admin-only menüler sadece admin için görünür
      if (!isAdmin) {
        return false;
      }
    }
    
    // Menü ayarları yüklenene kadar veya settings undefined ise rol bazlı varsayılan değerleri kullan
    if (menuSettingsLoading || !menuSettings || !menuSettings.visibleMenus) {
      return getDefaultVisibility(key);
    }
    
    // Ayarlara göre kontrol et - eğer false ise kesinlikle gizle
    const visibility = menuSettings.visibleMenus[key as keyof typeof menuSettings.visibleMenus];
    if (visibility === false) {
      return false;
    }
    
    // Ayar yoksa varsayılan değeri kullan
    return visibility !== undefined ? visibility : getDefaultVisibility(key);
  }, [menuSettings, menuSettingsLoading, isAdmin, getDefaultVisibility]);

  // menuSettings değiştiğinde menü öğelerini yeniden hesapla
  const menuItems: MenuItem[] = useMemo(() => {
    return [
    ...(isMenuVisible('dashboard') ? [{
      key: 'dashboard',
      icon: <HomeOutlined />,
      label: 'Dashboard'
    }] : []),
    ...(isMenuVisible('ana-kasa') || isMenuVisible('yarimamul') || isMenuVisible('lazer-kesim') || isMenuVisible('tezgah') || isMenuVisible('cila') ? [{
      key: 'divider-1',
      type: 'divider' as const
    }, {
      key: 'units-group',
      label: 'ÜRETİM BİRİMLERİ',
      type: 'group' as const,
      children: [
        ...(isMenuVisible('ana-kasa') ? [{
          key: 'ana-kasa',
          icon: <BankOutlined />,
          label: 'Ana Kasa'
        }] : []),
        ...(isMenuVisible('yarimamul') ? [{
          key: 'yarimamul',
          icon: <GoldOutlined />,
          label: 'Yarımamül'
        }] : []),
        ...(isMenuVisible('lazer-kesim') ? [{
          key: 'lazer-kesim',
          icon: <ThunderboltOutlined />,
          label: 'Lazer Kesim'
        }] : []),
        ...(isMenuVisible('tezgah') ? [{
          key: 'tezgah',
          icon: <ToolOutlined />,
          label: 'Tezgah'
        }] : []),
        ...(isMenuVisible('cila') ? [{
          key: 'cila',
          icon: <CrownOutlined />,
          label: 'Cila'
        }] : [])
      ].filter(item => item !== null)
    }] : []),
    ...(isMenuVisible('external-vault') || isMenuVisible('dokum') || isMenuVisible('tedarik') || isMenuVisible('satis') ? [{
      key: 'divider-2',
      type: 'divider' as const
    }, {
      key: 'other-units-group',
      label: 'DİĞER BİRİMLER',
      type: 'group' as const,
      children: [
        ...(isMenuVisible('external-vault') ? [{
          key: 'external-vault',
          icon: <BankOutlined />,
          label: 'Dış Kasa'
        }] : []),
        ...(isMenuVisible('dokum') ? [{
          key: 'dokum',
          icon: <GoldOutlined />,
          label: 'Döküm'
        }] : []),
        ...(isMenuVisible('tedarik') ? [{
          key: 'tedarik',
          icon: <GoldOutlined />,
          label: 'Tedarik'
        }] : []),
        ...(isMenuVisible('satis') ? [{
          key: 'satis',
          icon: <ShoppingCartOutlined />,
          label: 'Satış'
        }] : [])
      ].filter(item => item !== null)
    }] : []),
    ...(isMenuVisible('required-has') || isMenuVisible('reports') || isMenuVisible('companies') ? [{
      key: 'divider-3',
      type: 'divider' as const
    }, ...(isMenuVisible('required-has') ? [{
      key: 'required-has',
      icon: <CalculatorOutlined />,
      label: 'Gereken Has'
    }] : []), ...(isMenuVisible('reports') ? [{
      key: 'reports',
      icon: <BarChartOutlined />,
      label: 'Raporlar'
    }] : []), ...(isMenuVisible('companies') ? [{
      key: 'companies',
      icon: <TeamOutlined />,
      label: 'Firmalar'
    }] : [])] : []),
    // Admin-only menü öğeleri
    ...(isAdmin ? [
      ...(isMenuVisible('logs') ? [{
        key: 'logs',
        icon: <FileTextOutlined />,
        label: 'Sistem Logları'
      }] : []),
      ...(isMenuVisible('settings') ? [{
        key: 'settings',
        icon: <SettingOutlined />,
        label: 'Ayarlar'
      }] : []),
      ...(isMenuVisible('logs') || isMenuVisible('settings') || isMenuVisible('user-management') ? [{
        key: 'divider-4',
        type: 'divider' as const
      }] : []),
      ...(isMenuVisible('user-management') ? [{
        key: 'user-management',
        icon: <UserOutlined />,
        label: 'Kullanıcı Yönetimi'
      }] : [])
    ] : [
      ...(isMenuVisible('settings') ? [{
        key: 'settings',
        icon: <SettingOutlined />,
        label: 'Ayarlar'
      }] : []);
    }
  }, [menuSettings, menuSettingsLoading, isAdmin, isMenuVisible]);

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
      case 'required-has':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <RequiredHas />
          </Suspense>
        );
      case 'reports':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <Reports />
          </Suspense>
        );
      case 'logs':
        if (!isAdmin) {
          setSelectedMenu('dashboard');
          return <UnitDashboard />;
        }
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
        if (!isAdmin) {
          setSelectedMenu('dashboard');
          return <UnitDashboard />;
        }
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
            boxShadow: isMobile && !collapsed ? '4px 0 12px rgba(0, 0, 0, 0.15)' : '2px 0 8px rgba(0, 0, 0, 0.02)',
            position: isMobile && !collapsed ? 'fixed' : 'relative',
            height: isMobile && !collapsed ? '100vh' : 'auto',
            zIndex: isMobile && !collapsed ? 999 : 'auto',
            overflowY: isMobile && !collapsed ? 'auto' : 'visible'
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
                {!logoError ? (
                  <img 
                    src="/logo.png" 
                    alt="İndigo" 
                    style={{ 
                      height: '40px', 
                      width: '40px',
                      objectFit: 'contain',
                      display: 'block'
                    }}
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <span style={{ fontSize: '24px' }}>💍</span>
                )}
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
                {!logoError ? (
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
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>💍</div>
                    <div style={{ color: '#1f2937', fontSize: '14px', fontWeight: 700 }}>İndigo İmalat</div>
                  </div>
                )}
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
              padding: '8px 8px 8px 24px',
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
              background: 'rgba(0, 0, 0, 0.35)',
              zIndex: 998,
            }}
            onClick={() => setCollapsed(true)}
          />
        )}
        
        <Layout>
          <Header style={{ 
            background: '#ffffff',
            padding: 0,
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e5e7eb',
            height: isMobile ? '56px' : '72px',
            zIndex: 100,
            position: 'sticky',
            top: 0,
            overflow: 'hidden',
            width: '100%'
          }}>
            {/* Sol Kısım - Mobil Menü & Logo & Başlık */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              flex: '1 1 auto',
              height: '100%',
              paddingLeft: isMobile ? '12px' : '32px',
              paddingRight: isMobile ? '8px' : '16px',
              gap: isMobile ? '8px' : '16px',
              minWidth: 0,
              overflow: 'hidden'
            }}>
              {isMobile && (
                <Button
                  type="text"
                  onClick={() => setCollapsed(!collapsed)}
                  style={{
                    fontSize: '20px',
                    padding: 0,
                    height: '40px',
                    width: '40px',
                    minWidth: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px',
                    color: '#64748b'
                  }}
                >
                  ☰
                </Button>
              )}
              {/* Başlık */}
              <Title level={2} style={{ 
                margin: 0, 
                color: '#667eea',
                fontWeight: 700,
                fontSize: isMobile ? '14px' : '24px',
                lineHeight: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: '0 1 auto',
                minWidth: 0
              }}>
                {isMobile ? 'İmalat' : 'İmalat Takip'}
              </Title>
            </div>
            
            {/* Sağ Kısım - Action Buttons */}
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              flex: '0 0 auto',
              height: '100%',
              paddingRight: isMobile ? '12px' : '32px',
              paddingLeft: isMobile ? '4px' : '16px',
              gap: isMobile ? '6px' : '12px',
              flexShrink: 0
            }}>
              {!isMobile && <DataSyncIndicator isMobile={false} />}
              {isMobile && (
                <>
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
                  </Dropdown>
                  
                  <DataSyncIndicator isMobile={true} />
                  
                  <Button 
                    type="primary" 
                    icon={<SwapOutlined />} 
                    onClick={() => setTransferModalOpen(true)}
                    style={{
                      borderRadius: '10px',
                      height: '40px',
                      minWidth: 'auto',
                      width: 'auto',
                      padding: isMobile ? '0 8px' : '0 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                      fontSize: isMobile ? '11px' : '12px',
                      fontWeight: 600,
                      flexShrink: 0
                    }}
                  >
                    {isMobile ? 'T' : 'Transfer'}
                  </Button>
                </>
              )}
              
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
              
              {!isMobile && (
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
                </Dropdown>
              )}
            </div>
          </Header>
          
          <Content style={{ 
            margin: 0,
            padding: 0, 
            background: colors.background.alt,
            minHeight: isMobile ? 'calc(100vh - 60px)' : 'calc(100vh - 72px)',
            width: '100%',
            overflow: 'auto'
          }}>
            <div className="fade-in" style={{ 
              padding: isMobile ? '12px' : '24px 48px 24px 24px', 
              maxWidth: isMobile ? '100%' : '1600px',
              margin: '0 auto',
              width: '100%'
            }}>
              {renderContent()}
            </div>
          </Content>
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