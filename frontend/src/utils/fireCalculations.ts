import { Transfer, UnitStock, UnitSummary, UnitType, KaratType, KARAT_HAS_RATIOS, FIRE_UNITS, UNIT_NAMES, OUTPUT_ONLY_UNITS, SEMI_FINISHED_UNITS, PROCESSING_UNITS, INPUT_UNITS } from '../types';

/**
 * Fire hesaplama fonksiyonu
 * Fire = Toplam Giriş - Toplam Çıkış - Mevcut Stok
 */
export const calculateFire = (
  totalInput: number,
  totalOutput: number,
  currentStock: number
): number => {
  return totalInput - totalOutput - currentStock;
};

/**
 * Has karşılığı hesaplama
 */
export const calculateHasEquivalent = (amount: number, karat: KaratType): number => {
  return amount * KARAT_HAS_RATIOS[karat];
};

/**
 * Transfer geçmişinden birim stoklarını hesapla
 */
/**
 * Optimized fire calculation with memoization
 */
const calculationCache = new Map<string, any>();

export const calculateUnitStocks = (transfers: Transfer[]): Map<string, UnitStock> => {
  // Cache key based on transfers length and last transfer date
  const cacheKey = `${transfers.length}-${transfers[transfers.length - 1]?.date || 'empty'}`;
  
  if (calculationCache.has(cacheKey)) {
    return calculationCache.get(cacheKey);
  }

  const stocks = new Map<string, UnitStock>();

  // Her transfer için giriş ve çıkışları hesapla
  transfers.forEach(transfer => {
    const fromKey = `${transfer.fromUnit}-${transfer.karat}`;
    const toKey = `${transfer.toUnit}-${transfer.karat}`;

    // Çıkış birimi - OUTPUT artır
    if (!stocks.has(fromKey)) {
      stocks.set(fromKey, {
        unitId: transfer.fromUnit,
        unitName: UNIT_NAMES[transfer.fromUnit],
        karat: transfer.karat,
        totalInput: 0,
        totalOutput: 0,
        currentStock: 0,
        fire: 0
      });
    }
    const fromStock = stocks.get(fromKey)!;
    
    // OUTPUT_ONLY_UNITS için özel hesaplama: sadece çıkış, giriş yok
    if (OUTPUT_ONLY_UNITS.includes(transfer.fromUnit)) {
      fromStock.totalOutput += transfer.amount;
      fromStock.currentStock = fromStock.totalOutput; // Mevcut stok = toplam çıkış
    } else {
      fromStock.totalOutput += transfer.amount;
    }

    // Giriş birimi - INPUT artır
    if (!stocks.has(toKey)) {
      stocks.set(toKey, {
        unitId: transfer.toUnit,
        unitName: UNIT_NAMES[transfer.toUnit],
        karat: transfer.karat,
        totalInput: 0,
        totalOutput: 0,
        currentStock: 0,
        fire: 0
      });
    }
    const toStock = stocks.get(toKey)!;
    
    // OUTPUT_ONLY_UNITS için özel hesaplama: giriş olmaz
    if (!OUTPUT_ONLY_UNITS.includes(transfer.toUnit)) {
      toStock.totalInput += transfer.amount;
    }
  });

  // Fire hesapla
  stocks.forEach((stock, key) => {
    if (PROCESSING_UNITS.includes(stock.unitId)) {
      // İşlem birimleri: Tezgah, Cila
      // Bu birimlerde stok tutulmaz, sadece geçici işlem yapılır
      // Fire = Toplam Giriş - Toplam Çıkış (işlem sırasında kaybolan miktar)
      stock.currentStock = 0; // Stok tutulmaz
      stock.fire = stock.totalInput - stock.totalOutput;
    } else if (FIRE_UNITS.includes(stock.unitId)) {
      // Fire olan birimler: Lazer Kesim
      // Fire = Toplam Giriş - Toplam Çıkış (işlem sırasında kaybolan miktar)
      // Mevcut stok = 0 (fire olan birimlerde stok tutulmaz)
      stock.fire = stock.totalInput - stock.totalOutput;
      stock.currentStock = 0;
    } else if (INPUT_UNITS.includes(stock.unitId)) {
      // Dışarıdan gelen mamülleri sisteme sokan birimler: Döküm, Tedarik
      // Bu birimlerde stok tutulmaz, sadece giriş-çıkış dengesi tutulur
      stock.currentStock = stock.totalInput - stock.totalOutput;
      stock.fire = 0; // Fire hesaplanmaz
    } else if (OUTPUT_ONLY_UNITS.includes(stock.unitId)) {
      if (stock.unitId === 'satis') {
        // Satış birimi: Transfer edilenler = Toplam Satış
        stock.currentStock = stock.totalInput; // Mevcut stok = toplam satış (giriş)
        stock.fire = 0;
      }
    } else if (SEMI_FINISHED_UNITS.includes(stock.unitId)) {
      // Yarı mamul birimi: Ana kasadan ayrı hesaplanır
      // Sadece giriş-çıkış dengesi tutulur, fire hesaplanmaz
      stock.currentStock = stock.totalInput - stock.totalOutput;
      stock.fire = 0;
    } else {
      // Fire olmayan birimler: Ana Kasa, Dış Kasa
      // Sadece giriş-çıkış dengesi tutulur
      stock.currentStock = stock.totalInput - stock.totalOutput;
      stock.fire = 0;
    }
  });

  // Cache the result
  calculationCache.set(cacheKey, stocks);
  
  // Clear cache if it gets too large (keep only last 10 calculations)
  if (calculationCache.size > 10) {
    const firstKey = calculationCache.keys().next().value;
    calculationCache.delete(firstKey);
  }

  return stocks;
};

/**
 * Birim özetlerini hesapla
 */
export const calculateUnitSummaries = (transfers: Transfer[]): UnitSummary[] => {
  const stocks = calculateUnitStocks(transfers);
  const summaryMap = new Map<UnitType, UnitSummary>();

  // Her birim için özet oluştur
  stocks.forEach((stock) => {
    if (!summaryMap.has(stock.unitId)) {
      summaryMap.set(stock.unitId, {
        unitId: stock.unitId,
        unitName: stock.unitName,
        totalStock: 0,
        totalFire: 0,
        hasEquivalent: 0,
        stockByKarat: {
          '14K': { totalInput: 0, totalOutput: 0, currentStock: 0, fire: 0, hasEquivalent: 0 },
          '18K': { totalInput: 0, totalOutput: 0, currentStock: 0, fire: 0, hasEquivalent: 0 },
          '22K': { totalInput: 0, totalOutput: 0, currentStock: 0, fire: 0, hasEquivalent: 0 },
          '24K': { totalInput: 0, totalOutput: 0, currentStock: 0, fire: 0, hasEquivalent: 0 }
        },
        lastUpdate: new Date().toISOString()
      });
    }

    const summary = summaryMap.get(stock.unitId)!;
    
    // Ayar bazlı bilgileri güncelle
    summary.stockByKarat[stock.karat] = {
      totalInput: stock.totalInput,
      totalOutput: stock.totalOutput,
      currentStock: stock.currentStock,
      fire: stock.fire,
      hasEquivalent: calculateHasEquivalent(stock.currentStock, stock.karat)
    };

    // Toplamları güncelle
    summary.totalStock += stock.currentStock;
    summary.totalFire += stock.fire;
    summary.hasEquivalent += calculateHasEquivalent(stock.currentStock, stock.karat);
  });

  return Array.from(summaryMap.values());
};

/**
 * Yeni transfer ekle ve fire'ı otomatik hesapla
 */
export const addTransfer = (
  existingTransfers: Transfer[],
  newTransfer: Omit<Transfer, 'id' | 'date'>
): Transfer[] => {
  const transfer: Transfer = {
    ...newTransfer,
    id: `T${Date.now()}`,
    date: new Date().toISOString()
  };

  return [...existingTransfers, transfer];
};

/**
 * Toplam fire hesapla
 */
export const calculateTotalFire = (transfers: Transfer[]): number => {
  const summaries = calculateUnitSummaries(transfers);
  return summaries.reduce((total, summary) => total + summary.totalFire, 0);
};

/**
 * Toplam stok hesapla (has karşılığı)
 */
export const calculateTotalHasEquivalent = (transfers: Transfer[]): number => {
  const summaries = calculateUnitSummaries(transfers);
  return summaries.reduce((total, summary) => total + summary.hasEquivalent, 0);
};

