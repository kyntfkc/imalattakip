import React, { useState } from 'react';
import { Button, Dropdown, Tag, Space, Upload, Modal, Typography, Tooltip, message } from 'antd';
import {
  CloudSyncOutlined,
  SaveOutlined,
  DownloadOutlined,
  UploadOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useDataSync } from '../hooks/useDataSync';
import { useTransfers } from '../context/TransferContext';
import { useExternalVault } from '../context/ExternalVaultContext';
import { useCompanies } from '../context/CompanyContext';
import { useLog } from '../context/LogContext';
import type { MenuProps } from 'antd';

const { Text } = Typography;
const { confirm } = Modal;

interface DataSyncIndicatorProps {
  isMobile?: boolean;
}

const DataSyncIndicator: React.FC<DataSyncIndicatorProps> = ({ isMobile = false }) => {
  const {
    syncStatus,
    manualSave,
    exportBackup,
    importBackup,
    clearAllData,
    toggleAutoSave
  } = useDataSync();
  
  const { clearAllTransfers } = useTransfers();
  const { clearAllTransactions, clearAllStock } = useExternalVault();
  const { clearAllCompanies } = useCompanies();
  const { clearAllLogs } = useLog();

  const [uploading, setUploading] = useState(false);

  const formatLastSaved = () => {
    if (!syncStatus.lastSaved) return 'Henüz kaydedilmedi';
    
    const now = new Date();
    const diff = now.getTime() - syncStatus.lastSaved.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (seconds < 60) return 'Az önce';
    if (minutes < 60) return `${minutes} dakika önce`;
    if (hours < 24) return `${hours} saat önce`;
    
    return syncStatus.lastSaved.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleImport = (file: File) => {
    confirm({
      title: 'Yedeği Geri Yükle',
      icon: <ExclamationCircleOutlined />,
      content: 'Mevcut tüm veriler silinecek ve yedekten geri yüklenecek. Devam etmek istiyor musunuz?',
      okText: 'Evet, Geri Yükle',
      cancelText: 'İptal',
      okButtonProps: { danger: true },
      onOk: async () => {
        setUploading(true);
        try {
          await importBackup(file);
        } finally {
          setUploading(false);
        }
      }
    });
    return false; // Prevent auto upload
  };

  const handleClearData = () => {
    confirm({
      title: 'Tüm Verileri Sil',
      icon: <ExclamationCircleOutlined />,
      content: 'Tüm veriler kalıcı olarak silinecek. Bu işlem geri alınamaz! Devam etmek istiyor musunuz?',
      okText: 'Evet, Sil',
      cancelText: 'İptal',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          // Tüm context'leri temizle
          await Promise.all([
            clearAllTransfers().catch(err => console.error('Transfer temizleme hatası:', err)),
            clearAllTransactions().catch(err => console.error('Dış kasa işlem temizleme hatası:', err)),
            clearAllStock().catch(err => console.error('Dış kasa stok temizleme hatası:', err)),
            clearAllCompanies().catch(err => console.error('Firma temizleme hatası:', err)),
            clearAllLogs().catch(err => console.error('Log temizleme hatası:', err))
          ]);
          
          // localStorage'ı temizle
          clearAllData();
          
          message.success('Tüm veriler temizlendi');
          
          // Sayfayı yenile
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } catch (error) {
          console.error('Veri temizleme hatası:', error);
          message.error('Veriler temizlenirken bir hata oluştu');
        }
      }
    });
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'status',
      label: (
        <div style={{ padding: '8px 12px', minWidth: '250px' }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong style={{ fontSize: '13px' }}>Veri Durumu</Text>
              <Tag 
                color={syncStatus.isSaving ? 'processing' : 'success'}
                icon={syncStatus.isSaving ? <SyncOutlined spin /> : <CheckCircleOutlined />}
              >
                {syncStatus.isSaving ? 'Kaydediliyor' : 'Kaydedildi'}
              </Tag>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>Son kayıt:</Text>
              <Text style={{ fontSize: '12px' }}>{formatLastSaved()}</Text>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>Veri boyutu:</Text>
              <Text style={{ fontSize: '12px' }}>{syncStatus.dataSize.toFixed(2)} KB</Text>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>Otomatik kayıt:</Text>
              <Tag color={syncStatus.autoSaveEnabled ? 'success' : 'default'} style={{ margin: 0 }}>
                {syncStatus.autoSaveEnabled ? 'Açık' : 'Kapalı'}
              </Tag>
            </div>
          </Space>
        </div>
      ),
      disabled: true
    },
    {
      type: 'divider'
    },
    {
      key: 'save',
      icon: <SaveOutlined />,
      label: 'Manuel Kaydet',
      onClick: manualSave,
      disabled: syncStatus.isSaving
    },
    {
      key: 'auto-save',
      icon: syncStatus.autoSaveEnabled ? <CheckCircleOutlined /> : <SyncOutlined />,
      label: syncStatus.autoSaveEnabled ? 'Otomatik Kaydetmeyi Kapat' : 'Otomatik Kaydetmeyi Aç',
      onClick: toggleAutoSave
    },
    {
      type: 'divider'
    },
    {
      key: 'export',
      icon: <DownloadOutlined />,
      label: 'Yedeği İndir',
      onClick: exportBackup
    },
    {
      key: 'import',
      icon: <UploadOutlined />,
      label: (
        <Upload
          accept=".json"
          showUploadList={false}
          beforeUpload={handleImport}
          disabled={uploading}
        >
          <span>Yedeği Geri Yükle</span>
        </Upload>
      )
    },
    {
      type: 'divider'
    },
    {
      key: 'clear',
      icon: <DeleteOutlined />,
      label: 'Tüm Verileri Sil',
      danger: true,
      onClick: handleClearData
    }
  ];

  if (isMobile) {
    return (
      <Dropdown
        menu={{ items: menuItems }}
        placement="bottomRight"
        trigger={['click']}
      >
        <Button
          type="text"
          icon={
            syncStatus.isSaving ? (
              <SyncOutlined spin style={{ color: '#1890ff' }} />
            ) : syncStatus.hasUnsavedChanges ? (
              <CloudSyncOutlined style={{ color: '#faad14' }} />
            ) : (
              <DatabaseOutlined style={{ color: '#52c41a' }} />
            )
          }
          style={{
            height: '40px',
            width: '40px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        />
      </Dropdown>
    );
  }

  return (
    <Dropdown
      menu={{ items: menuItems }}
      placement="bottomRight"
      trigger={['click']}
    >
      <Tooltip title="Veri Yönetimi">
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
            border: '1px solid #e5e7eb'
          }}
        >
          {syncStatus.isSaving ? (
            <SyncOutlined spin style={{ color: '#1890ff', fontSize: '16px' }} />
          ) : syncStatus.hasUnsavedChanges ? (
            <CloudSyncOutlined style={{ color: '#faad14', fontSize: '16px' }} />
          ) : (
            <DatabaseOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
          )}
          <Space direction="vertical" size={0} style={{ alignItems: 'flex-start' }}>
            <Text style={{ fontSize: '12px', color: '#64748b', lineHeight: 1 }}>
              {syncStatus.isSaving ? 'Kaydediliyor...' : 'Kaydedildi'}
            </Text>
            <Text style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1 }}>
              {syncStatus.dataSize.toFixed(1)} KB
            </Text>
          </Space>
        </Button>
      </Tooltip>
    </Dropdown>
  );
};

export default DataSyncIndicator;

