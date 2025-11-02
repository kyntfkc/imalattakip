// Güvenli logging utility - Production'da console.log'ları kapatır

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

interface LogOptions {
  includeSensitiveData?: boolean;
  level?: 'log' | 'error' | 'warn' | 'info';
}

class Logger {
  private shouldLog(includeSensitiveData?: boolean): boolean {
    if (!includeSensitiveData) {
      return isDevelopment;
    }
    // Hassas bilgi içeren loglar sadece development'ta
    return isDevelopment;
  }

  log(message: string, data?: any, options?: LogOptions): void {
    if (!this.shouldLog(options?.includeSensitiveData)) {
      return;
    }
    
    if (data && options?.includeSensitiveData === false) {
      // Hassas bilgileri kaldır
      const sanitized = this.sanitizeData(data);
      console.log(message, sanitized);
    } else {
      console.log(message, data);
    }
  }

  error(message: string, error?: any, options?: LogOptions): void {
    if (!this.shouldLog(options?.includeSensitiveData)) {
      return;
    }
    
    if (error && options?.includeSensitiveData === false) {
      const sanitized = this.sanitizeError(error);
      console.error(message, sanitized);
    } else {
      console.error(message, error);
    }
  }

  warn(message: string, data?: any, options?: LogOptions): void {
    if (!this.shouldLog(options?.includeSensitiveData)) {
      return;
    }
    console.warn(message, data);
  }

  info(message: string, data?: any, options?: LogOptions): void {
    if (!this.shouldLog(options?.includeSensitiveData)) {
      return;
    }
    console.info(message, data);
  }

  // Hassas bilgileri temizle (username, password, token, userId vb.)
  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveKeys = ['username', 'password', 'token', 'authToken', 'userId', 'user_id', 'id', 'email'];
    const sanitized: any = Array.isArray(data) ? [] : {};

    for (const key in data) {
      if (sensitiveKeys.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof data[key] === 'object' && data[key] !== null) {
        sanitized[key] = this.sanitizeData(data[key]);
      } else {
        sanitized[key] = data[key];
      }
    }

    return sanitized;
  }

  // Error objelerinden hassas bilgileri temizle
  private sanitizeError(error: any): any {
    if (!error) return error;

    if (error instanceof Error) {
      const sanitized = new Error(error.message);
      return sanitized;
    }

    return this.sanitizeData(error);
  }
}

export const logger = new Logger();
export default logger;

