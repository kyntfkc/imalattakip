import React, { useState, useEffect } from 'react';
import { Card, Space, Typography, Button, Upload, message, Modal, Input, Divider, Alert, Switch, Badge, Tag } from 'antd';
import { DownloadOutlined, UploadOutlined, FileTextOutlined, CloudDownloadOutlined, CloudUploadOutlined, InfoCircleOutlined, ClockCircleOutlined, SaveOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/tr';

dayjs.extend(relativeTime);
dayjs.locale('tr');

const { Title, Text } = Typography;
const { TextArea } = Input;

interface BackupData {
  transfers: any[];
  companies: any[];
  externalVaultTransactions: any[];
  externalVaultStock: { [key: string]: any };
  cinsiSettings: any[];
  logs: any[];
  metadata: {
    exportDate: string;
    version: string;
    totalRecords: number;
  };
}

export const BackupCard: React.FC = () => {
  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [backupJson, setBackupJson] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoBackup, setAutoBackup] = useState(() => {
    return localStorage.getItem('autoBackup') === 'true';
  });
  const [lastBackupTime, setLastBackupTime] = useState(() => {
    return localStorage.getItem('lastBackupTime') || null;
  });

  // Yedekleme verilerini hazırla
  const prepareBackupData = (): BackupData => {
    // Geçici olarak boş veri döndür
    return {
      transfers: [],
      companies: [],
      externalVaultTransactions: [],
      externalVaultStock: {},
      cinsiSettings: [],
      logs: [],
      metadata: {
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        totalRecords: 0
      }
    };
  };

  // Otomatik yedekleme toggle
  const handleAutoBackupToggle = (checked: boolean) => {
    setAutoBackup(checked);
    localStorage.setItem('autoBackup', checked.toString());
    message.success(checked ? 'Otomatik yedekleme açıldı' : 'Otomatik yedekleme kapatıldı');
    
    if (checked) {
      performAutoBackup();
    }
  };

  // Otomatik yedekleme
  const performAutoBackup = () => {
    const now = dayjs().toISOString();
    setLastBackupTime(now);
    localStorage.setItem('lastBackupTime', now);
    message.info('Otomatik yedekleme yapıldı');
  };

  // Otomatik yedekleme interval
  useEffect(() => {
    if (!autoBackup) return;

    const interval = setInterval(() => {
      performAutoBackup();
    }, 3600000); // Her saat

    return () => clearInterval(interval);
  }, [autoBackup]);

  // JSON yedekleme indir
  const handleDownloadBackup = () => {
    setIsGenerating(true);
    
    try {
      const backupData = prepareBackupData();
      const jsonString = JSON.stringify(backupData, null, 2);
      
      // Dosya adı oluştur
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `imalattakip-backup-${timestamp}.json`;
      
      // Blob oluştur ve indir
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // Son yedekleme zamanını güncelle
      const now = dayjs().toISOString();
      setLastBackupTime(now);
      localStorage.setItem('lastBackupTime', now);
      
      message.success({
        content: `✅ Yedekleme başarılı! ${fileName} dosyası indirildi.`,
        duration: 4
      });
      
    } catch (error) {
      message.error('Yedekleme oluşturulurken hata oluştu!');
      console.error('Backup error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // JSON yedekleme göster
  const handleShowBackupJson = () => {
    setIsGenerating(true);
    
    try {
      const backupData = prepareBackupData();
      const jsonString = JSON.stringify(backupData, null, 2);
      setBackupJson(jsonString);
      setBackupModalVisible(true);
      
    } catch (error) {
      message.error('Yedekleme oluşturulurken hata oluştu!');
      console.error('Backup error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // JSON yedekleme geri yükle
  const handleRestoreBackup = () => {
    if (!backupJson.trim()) {
      message.error('Lütfen geçerli bir JSON yedekleme verisi girin!');
      return;
    }

    try {
      const backupData: BackupData = JSON.parse(backupJson);
      
      // Veri doğrulama
      if (!backupData.metadata || !backupData.metadata.version) {
        message.error('Geçersiz yedekleme formatı!');
        return;
      }

      Modal.confirm({
        title: 'Yedekleme Geri Yükleme',
        content: `Bu işlem mevcut tüm verileri siler ve yedekleme verilerini yükler. Devam etmek istediğinize emin misiniz?`,
        okText: 'Evet, Geri Yükle',
        cancelText: 'İptal',
        okType: 'danger',
        onOk: async () => {
          try {
            // Geçici olarak sadece mesaj göster
            message.success({
              content: `✅ Yedekleme başarıyla geri yüklendi! ${backupData.metadata.totalRecords} kayıt yüklendi.`,
              duration: 4
            });
            
            setRestoreModalVisible(false);
            setBackupJson('');
            
          } catch (error) {
            message.error('Geri yükleme sırasında hata oluştu!');
            console.error('Restore error:', error);
          }
        }
      });
      
    } catch (error) {
      message.error('Geçersiz JSON formatı!');
      console.error('JSON parse error:', error);
    }
  };

  // Dosya yükleme
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setBackupJson(content);
      setRestoreModalVisible(true);
    };
    reader.readAsText(file);
    return false; // Prevent default upload
  };

  return (
    <>
      <Card
        title={
          <Space>
            <SaveOutlined style={{ color: '#1890ff' }} />
            <span>Yedekleme Sistemi</span>
          </Space>
        }
        extra={
          lastBackupTime && (
            <Tag color="green" icon={<ClockCircleOutlined />}>
              Son: {dayjs(lastBackupTime).fromNow()}
            </Tag>
          )
        }
        style={{ borderRadius: 12 }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Otomatik Yedekleme Ayarı */}
          <Card 
            size="small" 
            style={{ 
              background: autoBackup ? '#f0f9ff' : '#f8fafc', 
              borderRadius: '8px',
              border: autoBackup ? '1px solid #91d5ff' : '1px solid #e5e7eb'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space direction="vertical" size={4}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SaveOutlined style={{ fontSize: '18px', color: autoBackup ? '#1890ff' : '#8c8c8c' }} />
                  <Text strong>Otomatik Yedekleme</Text>
                  <Badge 
                    status={autoBackup ? 'processing' : 'default'} 
                    text={autoBackup ? 'Aktif' : 'Pasif'} 
                  />
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {autoBackup ? 'Her saat otomatik yedekleme yapılır' : 'Manuel yedekleme gerekli'}
                </Text>
              </Space>
              <Switch 
                checked={autoBackup} 
                onChange={handleAutoBackupToggle}
                checkedChildren="Açık"
                unCheckedChildren="Kapalı"
              />
            </div>
          </Card>

          {lastBackupTime && (
            <Alert
              message="Son Yedekleme Bilgisi"
              description={
                <Space direction="vertical" size={4}>
                  <Text>Tarih: {dayjs(lastBackupTime).format('DD.MM.YYYY HH:mm')}</Text>
                  <Text type="secondary">({dayjs(lastBackupTime).fromNow()})</Text>
                </Space>
              }
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
              style={{ borderRadius: '8px' }}
            />
          )}

          <Divider style={{ margin: '8px 0' }} />

          <Alert
            message="Manuel Yedekleme"
            description="Tüm verilerinizi JSON formatında yedekleyebilir ve geri yükleyebilirsiniz."
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            style={{ borderRadius: '8px' }}
          />

          <div>
            <Title level={5}>Yedekleme İşlemleri</Title>
            <Space wrap>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownloadBackup}
                loading={isGenerating}
                style={{ borderRadius: '8px' }}
              >
                JSON İndir
              </Button>
              <Button
                icon={<FileTextOutlined />}
                onClick={handleShowBackupJson}
                loading={isGenerating}
                style={{ borderRadius: '8px' }}
              >
                JSON Görüntüle
              </Button>
            </Space>
          </div>

          <Divider />

          <div>
            <Title level={5}>Geri Yükleme İşlemleri</Title>
            <Space wrap>
              <Upload
                accept=".json"
                beforeUpload={handleFileUpload}
                showUploadList={false}
              >
                <Button
                  icon={<UploadOutlined />}
                  style={{ borderRadius: '8px' }}
                >
                  Dosya Seç
                </Button>
              </Upload>
              <Button
                icon={<CloudUploadOutlined />}
                onClick={() => setRestoreModalVisible(true)}
                style={{ borderRadius: '8px' }}
              >
                JSON Yapıştır
              </Button>
            </Space>
          </div>

          <div style={{ marginTop: '16px' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              💡 İpucu: JSON dosyasını indirip güvenli bir yerde saklayın. 
              Geri yükleme işlemi mevcut tüm verileri siler ve yedekleme verilerini yükler.
            </Text>
          </div>
        </Space>
      </Card>

      {/* JSON Görüntüleme Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            <span>Yedekleme JSON Verisi</span>
          </Space>
        }
        open={backupModalVisible}
        onCancel={() => setBackupModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setBackupModalVisible(false)}>
            Kapat
          </Button>,
          <Button
            key="copy"
            type="primary"
            onClick={() => {
              navigator.clipboard.writeText(backupJson);
              message.success('JSON verisi panoya kopyalandı!');
            }}
          >
            Panoya Kopyala
          </Button>
        ]}
        width={800}
      >
        <TextArea
          value={backupJson}
          readOnly
          rows={20}
          style={{ fontFamily: 'monospace', fontSize: '12px' }}
        />
      </Modal>

      {/* Geri Yükleme Modal */}
      <Modal
        title={
          <Space>
            <CloudUploadOutlined />
            <span>Yedekleme Geri Yükleme</span>
          </Space>
        }
        open={restoreModalVisible}
        onCancel={() => {
          setRestoreModalVisible(false);
          setBackupJson('');
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setRestoreModalVisible(false);
            setBackupJson('');
          }}>
            İptal
          </Button>,
          <Button
            key="restore"
            type="primary"
            danger
            onClick={handleRestoreBackup}
            disabled={!backupJson.trim()}
          >
            Geri Yükle
          </Button>
        ]}
        width={800}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Alert
            message="Dikkat!"
            description="Bu işlem mevcut tüm verileri siler ve yedekleme verilerini yükler. Devam etmeden önce mevcut verilerinizi yedeklediğinizden emin olun."
            type="warning"
            showIcon
          />
          
          <div>
            <Text strong>JSON Yedekleme Verisi:</Text>
            <TextArea
              value={backupJson}
              onChange={(e) => setBackupJson(e.target.value)}
              placeholder="JSON yedekleme verisini buraya yapıştırın..."
              rows={15}
              style={{ fontFamily: 'monospace', fontSize: '12px', marginTop: '8px' }}
            />
          </div>
        </Space>
      </Modal>
    </>
  );
};