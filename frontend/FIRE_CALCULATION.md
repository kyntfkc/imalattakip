# 🔥 Fire Hesaplama Sistemi

## Genel Bakış

İndigo İmalat Takip Uygulaması, **Gerçek Zamanlı Fire Hesaplama** mantığı kullanır.

## Fire Hesaplama Formülü

```
Fire = Toplam Giriş - Toplam Çıkış
```

### Örnek Hesaplama

**Tezgah Birimi - 18K:**
- Toplam Giriş: 10 gr (Lazer Kesimden gelen transfer)
- Toplam Çıkış: 9.8 gr (Cilaya giden transfer)
- **Fire = 10 - 9.8 = 0.2 gr**

**Ana Kasa - 18K:**
- Toplam Giriş: 1000 gr
- Toplam Çıkış: 950 gr
- **Fire = 0 gr** (Ana Kasada fire hesaplanmaz)
- **Mevcut Stok = 1000 - 950 = 50 gr**

## Birim Kategorileri

### 🔥 Fire Olan Birimler
Bu birimlerde **işlem sırasında fire oluşur**:
- **Lazer Kesim**: Kesim işlemi sırasında fire (Giriş - Çıkış)
- **Tezgah**: İşleme sırasında fire (Giriş - Çıkış)
- **Cila**: Cilalama işlemi sırasında fire (Giriş - Çıkış)

### ✅ Fire Olmayan Birimler
Bu birimlerde **sadece stok takibi** yapılır:
- **Ana Kasa**: Depolama, fire hesaplanmaz (Mevcut Stok = Giriş - Çıkış)
- **Yarımamül**: Depolama, fire hesaplanmaz (Mevcut Stok = Giriş - Çıkış)
- **Dış Kasa**: Dış firma, fire hesaplanmaz (Mevcut Stok = Giriş - Çıkış)

## Has Karşılığı Hesaplama

Her ayar için has karşılığı:

```typescript
14K: Miktar × 0.583 (14/24)
18K: Miktar × 0.750 (18/24)
22K: Miktar × 0.917 (22/24)
24K: Miktar × 1.000 (Has)
```

## Veri Yapısı

### Transfer Kaydı
```typescript
{
  id: "T1234567890",
  fromUnit: "ana-kasa",
  toUnit: "lazer-kesim",
  karat: "18K",
  amount: 100,
  date: "2024-01-15T10:30:00Z",
  notes: "İsteğe bağlı notlar"
}
```

### Birim Stok Durumu
```typescript
{
  unitId: "lazer-kesim",
  unitName: "Lazer Kesim",
  karat: "18K",
  totalInput: 1000,      // Toplam giriş
  totalOutput: 900,      // Toplam çıkış
  currentStock: 88,      // Mevcut stok
  fire: 12               // Otomatik hesaplanan fire
}
```

## Kullanım Akışı

1. **Transfer İşlemi**: Kullanıcı birimler arası transfer yapar
2. **Otomatik Kayıt**: Transfer Context'e kaydedilir
3. **Fire Hesaplama**: Her transfer sonrası fire otomatik hesaplanır
4. **LocalStorage**: Veriler tarayıcıda saklanır (offline çalışma)
5. **Görselleştirme**: Dashboard'da güncel fire miktarları gösterilir

## Önemli Notlar

✅ **Fire Hesaplama**: 
- **Fire olan birimler** (Lazer Kesim, Tezgah, Cila): Fire = Giriş - Çıkış
- **Fire olmayan birimler** (Ana Kasa, Yarımamül, Dış Kasa): Mevcut Stok = Giriş - Çıkış

💾 **Veri Saklama**:
- Tüm transferler LocalStorage'da saklanır
- Tarayıcı geçmişi silinirse veriler kaybolur
- Gelecekte backend entegrasyonu önerilir

🔄 **Fire Güncellemesi**:
- Fire, her yeni transfer sonrası otomatik yeniden hesaplanır
- Geriye dönük düzeltme yapmak için transfer geçmişi düzenlenebilir

## Teknik Detaylar

### Dosya Yapısı
```
src/
├── types/
│   └── index.ts                 # Tip tanımlamaları
├── utils/
│   └── fireCalculations.ts      # Fire hesaplama fonksiyonları
├── context/
│   └── TransferContext.tsx      # Global state yönetimi
└── components/
    ├── TransferForm.tsx         # Transfer işlemi formu
    ├── UnitDashboard.tsx        # Birim durumları
    └── Reports.tsx              # Raporlama
```

### Ana Fonksiyonlar

**`calculateFire(totalInput, totalOutput, currentStock)`**
- Fire hesabını yapar

**`calculateUnitStocks(transfers)`**
- Transfer geçmişinden birim stoklarını hesaplar

**`calculateUnitSummaries(transfers)`**
- Her birim için özet bilgileri üretir

**`addTransfer(existingTransfers, newTransfer)`**
- Yeni transfer ekler ve ID/tarih atar

