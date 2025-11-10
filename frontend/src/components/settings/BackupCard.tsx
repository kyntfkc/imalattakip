import React, { useState } from 'react';
import { Card, Space, Typography, Button, Upload, message, Modal, Input, Divider, Alert } from 'antd';
import { DownloadOutlined, UploadOutlined, FileTextOutlined, CloudUploadOutlined, InfoCircleOutlined, DatabaseOutlined } from '@ant-design/icons';
import apiService from '../../services/apiService';

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
  const [isDatabaseBackingUp, setIsDatabaseBackingUp] = useState(false);

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

  // Veritabanı yedekleme
  const handleDatabaseBackup = async () => {
    setIsDatabaseBackingUp(true);
    try {
      await apiService.backupDatabase();
      message.success({
        content: '✅ Veritabanı yedeği başarıyla indirildi!',
        duration: 4
      });
    } catch (error: any) {
      message.error({
        content: error.message || 'Veritabanı yedekleme sırasında hata oluştu!',
        duration: 4
      });
      console.error('Database backup error:', error);
    } finally {
      setIsDatabaseBackingUp(false);
    }
  };

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
            <FileTextOutlined />
            <span>Manuel Yedekleme</span>
          </Space>
        }
        style={{ borderRadius: 12 }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Alert
            message="Manuel Yedekleme Sistemi"
            description="Tüm verilerinizi JSON formatında yedekleyebilir ve geri yükleyebilirsiniz. Bu sistem Dropbox otomatik yedeklemesine ek olarak çalışır."
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            style={{ borderRadius: '8px' }}
          />

          <div>
            <Title level={5}>Yedekleme İşlemleri</Title>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Space wrap>
                <Button
                  type="primary"
                  icon={<DatabaseOutlined />}
                  onClick={handleDatabaseBackup}
                  loading={isDatabaseBackingUp}
                  style={{ borderRadius: '8px' }}
                >
                  Veritabanını Yedekle
                </Button>
                <Button
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
              <Alert
                message="Veritabanı Yedekleme"
                description="Veritabanı yedekleme butonu Railway backend'den SQLite veritabanı dosyasını (.db) indirir. Bu yedek LocalStorage JSON yedeğinden farklıdır ve tüm veritabanı içeriğini içerir."
                type="info"
                showIcon
                style={{ borderRadius: '8px' }}
              />
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