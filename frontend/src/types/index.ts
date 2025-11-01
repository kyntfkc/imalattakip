// Ayar tipleri
export type KaratType = '14K' | '18K' | '22K' | '24K';

// Birim tipleri
export type UnitType = 'ana-kasa' | 'yarimamul' | 'lazer-kesim' | 'tezgah' | 'cila' | 'dokum' | 'tedarik' | 'dis-kasa' | 'satis';

// Transfer işlemi
export interface Transfer {
  id: string;
  fromUnit: UnitType;
  toUnit: UnitType;
  karat: KaratType;
  amount: number;
  date: string;
  cinsi?: string;
  notes?: string;
  user?: string;
}

// Birim stok bilgisi
export interface UnitStock {
  unitId: UnitType;
  unitName: string;
  karat: KaratType;
  totalInput: number;      // Toplam giriş
  totalOutput: number;     // Toplam çıkış
  currentStock: number;    // Mevcut stok
  fire: number;           // Fire = totalInput - totalOutput - currentStock
}

// Birim özet bilgisi
export interface UnitSummary {
  unitId: UnitType;
  unitName: string;
  totalStock: number;      // Tüm ayarların toplamı
  totalFire: number;       // Toplam fire
  hasEquivalent: number;   // Has karşılığı
  stockByKarat: {
    [key in KaratType]: {
      totalInput: number;
      totalOutput: number;
      currentStock: number;
      fire: number;
      hasEquivalent: number;
    };
  };
  lastUpdate: string;
}

// Ayar has karşılıkları
export const KARAT_HAS_RATIOS: { [key in KaratType]: number } = {
  '14K': 0.583,  // 14/24
  '18K': 0.750,  // 18/24
  '22K': 0.917,  // 22/24
  '24K': 1.000   // 24/24 (Has)
};

// Fire olan birimler
export const FIRE_UNITS: UnitType[] = ['lazer-kesim', 'tezgah', 'cila'];

// Fire olmayan birimler
export const NO_FIRE_UNITS: UnitType[] = ['ana-kasa', 'dokum', 'tedarik', 'dis-kasa', 'satis'];

// Yarı mamul birimi (ana kasadan ayrı hesaplanır)
export const SEMI_FINISHED_UNITS: UnitType[] = ['yarimamul'];

// Sadece çıkış olan birimler (firma dışından ürün alınan yerler)
export const OUTPUT_ONLY_UNITS: UnitType[] = ['satis'];

// Dışarıdan gelen mamülleri sisteme sokan birimler
export const INPUT_UNITS: UnitType[] = ['dokum', 'tedarik'];

// İşlem birimleri (stok tutmayan, geçici işlem yapan birimler)
export const PROCESSING_UNITS: UnitType[] = ['tezgah', 'cila', 'lazer-kesim'];

// Birim isimleri
export const UNIT_NAMES: { [key in UnitType]: string } = {
  'ana-kasa': 'Ana Kasa',
  'yarimamul': 'Yarımamül',
  'lazer-kesim': 'Lazer Kesim',
  'tezgah': 'Tezgah',
  'cila': 'Cila',
  'dokum': 'Döküm',
  'tedarik': 'Tedarik',
  'dis-kasa': 'Dış Kasa',
  'satis': 'Satış'
};

