import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private API_BASE_URL = process.env.REACT_APP_API_URL || 'https://imalattakip-backend-production.up.railway.app/api';
  private WS_URL = this.API_BASE_URL.replace('/api', '');

  connect(token: string | null) {
    if (!token) {
      console.warn('Socket bağlantısı için token gerekli');
      return;
    }

    if (this.socket?.connected) {
      console.log('Socket zaten bağlı');
      return;
    }

    // Railway'da WebSocket desteği yok, sadece polling kullan
    // Eski socket bağlantısını kapat
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.socket = io(this.WS_URL, {
      auth: {
        token: token
      },
      transports: ['polling'], // SADECE polling - WebSocket yok
      upgrade: false, // WebSocket upgrade'i tamamen devre dışı
      rememberUpgrade: false,
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
      timeout: 30000,
      forceNew: true,
      rejectUnauthorized: false,
      autoConnect: true,
      withCredentials: true,
      // Polling transport ayarları
      transportsOptions: {
        polling: {
          extraHeaders: {},
          withCredentials: true
        }
      }
    });

    // WebSocket upgrade denemesini engelle
    this.socket.io.on('upgrade', () => {
      console.warn('WebSocket upgrade denemesi engellendi - polling kullanılıyor');
    });

    // WebSocket transport'u devre dışı bırak
    this.socket.io.on('upgradeError', () => {
      console.warn('WebSocket upgrade hatası (beklenen davranış)');
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket bağlantısı kuruldu:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket bağlantısı kesildi:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket bağlantı hatası:', error);
      // Hata mesajını kullanıcıya göster (debugging için)
      if (error.message) {
        console.warn('Bağlantı hatası detayı:', error.message);
      }
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('Socket bağlantısı kapatıldı');
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Event listeners
  on(event: string, callback: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Transfer events
  onTransferCreated(callback: (data: any) => void) {
    this.on('transfer:created', callback);
  }

  onTransferUpdated(callback: (data: any) => void) {
    this.on('transfer:updated', callback);
  }

  onTransferDeleted(callback: (data: { id: number }) => void) {
    this.on('transfer:deleted', callback);
  }

  // Company events
  onCompanyCreated(callback: (data: any) => void) {
    this.on('company:created', callback);
  }

  onCompanyUpdated(callback: (data: any) => void) {
    this.on('company:updated', callback);
  }

  onCompanyDeleted(callback: (data: { id: number }) => void) {
    this.on('company:deleted', callback);
  }

  // External Vault events
  onExternalVaultTransactionCreated(callback: (data: any) => void) {
    this.on('externalVault:transaction:created', callback);
  }

  onExternalVaultTransactionDeleted(callback: (data: { id: number }) => void) {
    this.on('externalVault:transaction:deleted', callback);
  }

  onExternalVaultStockUpdated(callback: (data: any) => void) {
    this.on('externalVault:stock:updated', callback);
  }

  // Cinsi events
  onCinsiCreated(callback: (data: any) => void) {
    this.on('cinsi:created', callback);
  }

  onCinsiUpdated(callback: (data: any) => void) {
    this.on('cinsi:updated', callback);
  }

  onCinsiDeleted(callback: (data: { id: number }) => void) {
    this.on('cinsi:deleted', callback);
  }
}

export const socketService = new SocketService();
export default socketService;

