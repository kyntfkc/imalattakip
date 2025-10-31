import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private API_BASE_URL = process.env.REACT_APP_API_URL || 'https://imalattakip-backend-production.up.railway.app/api';
  // Railway URL'ini tam olarak kullan - /api olmadan
  private WS_URL = process.env.REACT_APP_API_URL 
    ? process.env.REACT_APP_API_URL.replace('/api', '')
    : 'https://imalattakip-backend-production.up.railway.app';

  connect(token: string | null) {
    if (!token) {
      console.warn('Socket bağlantısı için token gerekli');
      return;
    }

    if (this.socket?.connected) {
      console.log('Socket zaten bağlı');
      return;
    }

    // Eski socket bağlantısını kapat
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Railway URL'ini tam olarak kullan - /api olmadan
    const socketUrl = this.WS_URL;
    
    console.log('🔌 Socket.io bağlantı URL:', socketUrl);

    this.socket = io(socketUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'], // Önce websocket, sonra polling fallback
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
      timeout: 30000,
      forceNew: false,
      autoConnect: true,
      withCredentials: true
    } as any);

    this.socket.on('connect', () => {
      console.log('✅ Socket bağlantısı kuruldu:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket bağlantısı kesildi:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket bağlantı hatası:', error);
      if (error.message) {
        console.warn('Bağlantı hatası detayı:', error.message);
      }
    });

    // Railway test mesajı
    this.socket.on('hello', (message) => {
      console.log('🔌 Socket.io mesajı:', message);
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

