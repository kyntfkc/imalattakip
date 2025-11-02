// Input sanitization utilities - XSS ve injection koruması

/**
 * HTML karakterlerini escape et (XSS koruması)
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  
  return String(text).replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * String input'u temizle (trim, whitespace kontrolü)
 */
export function sanitizeString(input: string | null | undefined, maxLength?: number): string {
  if (!input) return '';
  
  let sanitized = String(input).trim();
  
  // Maksimum uzunluk kontrolü
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Sayı input'unu temizle ve validate et
 */
export function sanitizeNumber(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === '') {
    return null;
  }
  
  const num = typeof input === 'number' ? input : parseFloat(String(input));
  
  if (isNaN(num) || !isFinite(num)) {
    return null;
  }
  
  return num;
}

/**
 * Pozitif sayı kontrolü
 */
export function sanitizePositiveNumber(input: string | number | null | undefined): number | null {
  const num = sanitizeNumber(input);
  
  if (num !== null && num > 0) {
    return num;
  }
  
  return null;
}

/**
 * Email formatını validate et ve temizle
 */
export function sanitizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  
  const sanitized = sanitizeString(email);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (emailRegex.test(sanitized)) {
    return sanitized.toLowerCase();
  }
  
  return null;
}

/**
 * URL'yi validate et ve temizle
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  const sanitized = sanitizeString(url);
  
  try {
    const parsedUrl = new URL(sanitized);
    // Sadece http ve https protokollerine izin ver
    if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
      return sanitized;
    }
  } catch {
    // URL formatı geçersiz
    return null;
  }
  
  return null;
}

/**
 * SQL injection karakterlerini filtrele (defensive)
 * Not: Backend'de de validation olmalı
 */
export function sanitizeSqlInput(input: string | null | undefined): string {
  if (!input) return '';
  
  const dangerousChars = /['";\\\x00\n\r]/g;
  return String(input).replace(dangerousChars, '');
}

/**
 * XSS karakterlerini filtrele
 */
export function sanitizeXssInput(input: string | null | undefined): string {
  if (!input) return '';
  
  const xssPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
  const htmlPattern = /<[^>]+>/g;
  
  let sanitized = String(input);
  sanitized = sanitized.replace(xssPattern, '');
  sanitized = sanitized.replace(htmlPattern, '');
  
  return sanitized;
}

/**
 * Genel input sanitization (çoklu kontrol)
 */
export function sanitizeInput(
  input: string | null | undefined,
  options?: {
    maxLength?: number;
    allowHtml?: boolean;
    allowSpecialChars?: boolean;
  }
): string {
  if (!input) return '';
  
  let sanitized = sanitizeString(input, options?.maxLength);
  
  // HTML'i temizle
  if (!options?.allowHtml) {
    sanitized = sanitizeXssInput(sanitized);
  }
  
  // Özel karakterleri temizle
  if (!options?.allowSpecialChars) {
    sanitized = sanitizeSqlInput(sanitized);
  }
  
  return sanitized;
}

/**
 * Object içindeki string değerleri sanitize et
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  options?: {
    maxLength?: number;
    allowHtml?: boolean;
    allowSpecialChars?: boolean;
  }
): T {
  const sanitized = { ...obj };
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeInput(sanitized[key], options) as any;
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key], options) as any;
    }
  }
  
  return sanitized;
}

/**
 * Input validation - boş, null, undefined kontrolü
 */
export function isValidInput(input: any): boolean {
  if (input === null || input === undefined) {
    return false;
  }
  
  if (typeof input === 'string' && input.trim().length === 0) {
    return false;
  }
  
  return true;
}

/**
 * Minimum ve maksimum uzunluk kontrolü
 */
export function validateLength(
  input: string,
  minLength?: number,
  maxLength?: number
): boolean {
  if (!input) return minLength === undefined || minLength === 0;
  
  const length = input.length;
  
  if (minLength !== undefined && length < minLength) {
    return false;
  }
  
  if (maxLength !== undefined && length > maxLength) {
    return false;
  }
  
  return true;
}

export default {
  escapeHtml,
  sanitizeString,
  sanitizeNumber,
  sanitizePositiveNumber,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeSqlInput,
  sanitizeXssInput,
  sanitizeInput,
  sanitizeObject,
  isValidInput,
  validateLength
};

