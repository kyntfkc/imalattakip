// Number formatting utilities for Turkish locale
export const formatNumberForDisplay = (value: number | string): string => {
  if (typeof value === 'string') {
    // Eğer string ise, önce parseFloat ile sayıya çevir
    const numValue = parseFloat(value.replace(',', '.'));
    return numValue.toFixed(2).replace('.', ',');
  }
  return value.toFixed(2).replace('.', ',');
};

export const parseNumberFromInput = (value: string): number => {
  // Türkçe formatındaki sayıyı (10,5) İngilizce formata (10.5) çevir
  return parseFloat(value.replace(',', '.'));
};

export const isValidNumber = (value: string): boolean => {
  // Türkçe sayı formatını kontrol et (örn: 10,5 veya 10.5)
  const turkishFormat = /^\d+,\d+$/;
  const englishFormat = /^\d+\.\d+$/;
  const integerFormat = /^\d+$/;
  
  return turkishFormat.test(value) || englishFormat.test(value) || integerFormat.test(value);
};
