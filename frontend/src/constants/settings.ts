// Settings sayfası için sabitler
export const SETTINGS_CONSTANTS = {
  MESSAGES: {
    SUCCESS: {
      BACKUP_CREATED: '✅ Yedek oluşturuldu',
      BACKUP_RESTORED: '✅ Yedek geri yüklendi! Sayfa yenileniyor...',
      CINSI_ADDED: 'Cinsi başarıyla eklendi!',
      CINSI_UPDATED: 'Cinsi başarıyla güncellendi!',
      CINSI_DELETED: 'Cinsi başarıyla silindi!',
      CINSI_RESET: 'Cinsi ayarları varsayılan değerlere döndürüldü!',
      SETTINGS_RESET: 'Ayarlar sıfırlandı'
    },
    ERROR: {
      BACKUP_FAILED: '❌ Yedekleme başarısız!',
      RESTORE_FAILED: '❌ Yedek geri yükleme başarısız!',
      CINSI_VALIDATION: 'Lütfen tüm alanları doldurunuz!',
      CINSI_DUPLICATE_VALUE: 'Bu değer zaten mevcut!',
      CINSI_DUPLICATE_LABEL: 'Bu etiket zaten mevcut!',
      TOKEN_REQUIRED: 'Lütfen Access Token giriniz!'
    },
    WARNING: {
      BACKUP_OVERDUE: '⚠️ 24 saatten fazla zaman geçti',
      BACKUP_CURRENT: '✅ Yedek güncel'
    }
  },
  
  INTERVALS: {
    PERIODIC_BACKUP: 24 * 60 * 60 * 1000, // 24 saat
    AUTO_SYNC: 5 * 60 * 1000 // 5 dakika
  },
  
  VALIDATION: {
    REQUIRED_FIELDS: ['value', 'label'],
    FILE_TYPES: ['.json']
  }
};

export const SETTINGS_TEXTS = {
  TITLES: {
    AUTO_BACKUP: 'Otomatik Yedekleme',
    MANUAL_BACKUP: 'Manuel Yedekleme', 
    GOOGLE_DRIVE_INTEGRATION: 'Google Drive Entegrasyonu',
    DASHBOARD_SETTINGS: 'Dashboard Ayarları',
    AUTO_SYNC: 'Google Drive Otomatik Senkronizasyon',
    CINSI_SETTINGS: 'Cinsi Ayarları',
    DATA_STATS: 'Veri İstatistikleri'
  },
  
  DESCRIPTIONS: {
    AUTO_BACKUP: 'Program kapanırken ve her 24 saatte bir otomatik yedek al',
    MANUAL_BACKUP: 'Tüm verilerinizi JSON dosyası olarak indirin',
    GOOGLE_DRIVE_AUTO_BACKUP: 'Yedekler otomatik olarak Google Drive\'a yüklensin',
    GOOGLE_DRIVE_CONNECTED: 'Otomatik senkronizasyon aktif. Verileriniz her 5 dakikada bir Google Drive\'a yedeklenir.',
    GOOGLE_DRIVE_DISCONNECTED: 'Google Drive bağlantısı yapılmamış. Sadece LocalStorage kullanılıyor.',
    UNIT_VISIBILITY: 'Görmek istemediğiniz birimleri gizleyebilirsiniz',
    CINSI_VALUE_HINT: 'Bu değer sistemde saklanır. Küçük harf ve tire (-) kullanın.'
  },
  
  BUTTONS: {
    CREATE_BACKUP: 'Şimdi Yedekle',
    RESTORE_BACKUP: 'Yedek Geri Yükle',
    CONNECT_GOOGLE_DRIVE: 'Google Drive\'a Bağlan',
    DISCONNECT_GOOGLE_DRIVE: 'Bağlantıyı Kes',
    SYNC_TO_GOOGLE_DRIVE: 'Şimdi Google Drive\'a Yedekle',
    VIEW_GOOGLE_DRIVE_BACKUPS: 'Google Drive Yedeklerini Görüntüle',
    MANUAL_SYNC: 'Manuel Senkronizasyon',
    LOAD_FROM_GOOGLE_DRIVE: 'Google Drive\'tan Yükle',
    ADD_CINSI: 'Yeni Cinsi Ekle',
    RESET_DEFAULTS: 'Varsayılan Ayarlara Dön',
    RESET_CINSI_DEFAULTS: 'Varsayılan Ayarlara Dön',
    CANCEL: 'İptal',
    CONNECT: 'Bağlan',
    UPDATE: 'Güncelle',
    ADD: 'Ekle',
    DELETE: 'Sil',
    RESTORE: 'Geri Yükle'
  },
  
  PLACEHOLDERS: {
    GOOGLE_DRIVE_TOKEN: 'Google Drive Access Token\'ınızı buraya yapıştırın',
    CINSI_LABEL: 'Örn: Zincir',
    CINSI_VALUE: 'Örn: zincir'
  },
  
  ALERTS: {
    BACKUP_WARNING: 'Yedek geri yüklendiğinde mevcut tüm veriler silinecek ve yedekteki veriler ile değiştirilecektir.',
    GOOGLE_DRIVE_INTEGRATION: 'Yedek dosyaları otomatik olarak Google Drive\'a yüklenir.',
    GOOGLE_DRIVE_TIP: 'İpucu: Google Drive entegrasyonu sayesinde verileriniz her zaman güvende olur.',
    GOOGLE_DRIVE_TOKEN_REQUIRED: 'Google Drive\'a bağlanmak için bir Access Token\'a ihtiyacınız var. Aşağıdaki yönergeleri takip ederek token oluşturabilirsiniz.'
  }
};
