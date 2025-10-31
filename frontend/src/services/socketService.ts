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

    // Railway'da Socket.io 404 hatası veriyor - geçici olarak devre dışı
    // Periyodik HTTP polling kullanılacak (TransferContext ve CompanyContext'te)
    console.warn('⚠️ Socket.io geçici olarak devre dışı - Railway 404 hatası. HTTP polling kullanılıyor.');
    return null;
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

