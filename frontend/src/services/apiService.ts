// API Service for Backend Communication
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://imalattakip-backend-production.up.railway.app/api';

class ApiService {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage
    this.token = localStorage.getItem('authToken');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Sunucu hatası' }));
      throw new Error(error.error || 'Bir hata oluştu');
    }

    return response.json();
  }

  // Auth methods
  async login(username: string, password: string) {
    const response = await this.request<{
      message: string;
      token: string;
      user: { id: number; username: string; role: string };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    this.token = response.token;
    localStorage.setItem('authToken', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    
    return response;
  }

  async register(username: string, password: string, role: string = 'user') {
    const response = await this.request<{
      message: string;
      userId: number;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, role }),
    });

    return response;
  }

  async verifyToken() {
    if (!this.token) return null;
    
    try {
      const response = await this.request<{
        valid: boolean;
        user: { id: number; username: string; role: string };
      }>('/auth/verify');
      return response;
    } catch {
      this.logout();
      return null;
    }
  }

  logout() {
    this.token = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }

  // Transfer methods
  async getTransfers() {
    return this.request<any[]>('/transfers');
  }

  async createTransfer(transfer: {
    fromUnit: string;
    toUnit: string;
    amount: number;
    karat: number;
    notes?: string;
  }) {
    return this.request<{ message: string; transferId: number }>('/transfers', {
      method: 'POST',
      body: JSON.stringify(transfer),
    });
  }

  async updateTransfer(id: number, transfer: {
    fromUnit: string;
    toUnit: string;
    amount: number;
    karat: number;
    notes?: string;
  }) {
    return this.request<{ message: string }>(`/transfers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(transfer),
    });
  }

  async deleteTransfer(id: number) {
    return this.request<{ message: string }>(`/transfers/${id}`, {
      method: 'DELETE',
    });
  }

  // Unit methods
  async getUnitStats() {
    return this.request<any[]>('/units/stats');
  }

  async getUnitTransfers(unitId: string) {
    return this.request<any[]>(`/units/${unitId}/transfers`);
  }

  // Report methods
  async getReports() {
    return this.request<any>('/reports');
  }

  // External Vault methods
  async getExternalVaultTransactions() {
    return this.request<any[]>('/external-vault/transactions');
  }

  async getExternalVaultStock() {
    return this.request<any[]>('/external-vault/stock');
  }

  async createExternalVaultTransaction(transaction: {
    type: 'deposit' | 'withdrawal';
    amount: number;
    karat: number;
    notes?: string;
  }) {
    return this.request<{ message: string; transactionId: number }>('/external-vault/transactions', {
      method: 'POST',
      body: JSON.stringify(transaction),
    });
  }

  async deleteExternalVaultTransaction(id: number) {
    return this.request<{ message: string }>(`/external-vault/transactions/${id}`, {
      method: 'DELETE',
    });
  }

  async updateExternalVaultStock(karat: number, amount: number) {
    return this.request<{ message: string }>('/external-vault/stock', {
      method: 'PUT',
      body: JSON.stringify({ karat, amount }),
    });
  }

  async syncExternalVaultStock() {
    return this.request<{ message: string }>('/external-vault/stock/sync', {
      method: 'POST',
    });
  }

  // User methods (admin only)
  async getUsers() {
    return this.request<any[]>('/users');
  }

  async updateUserRole(userId: number, role: string) {
    return this.request<{ message: string }>(`/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  async deleteUser(userId: number) {
    return this.request<{ message: string }>(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // Cinsi methods
  async getCinsiOptions() {
    return this.request<any[]>('/cinsi');
  }

  async createCinsi(cinsi: {
    value: string;
    label: string;
  }) {
    return this.request<{ message: string; cinsi: any }>('/cinsi', {
      method: 'POST',
      body: JSON.stringify(cinsi),
    });
  }

  async updateCinsi(id: number, cinsi: {
    value: string;
    label: string;
  }) {
    return this.request<{ message: string; cinsi: any }>(`/cinsi/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cinsi),
    });
  }

  async deleteCinsi(id: number) {
    return this.request<{ message: string }>(`/cinsi/${id}`, {
      method: 'DELETE',
    });
  }

  async resetCinsiToDefaults() {
    return this.request<{ message: string }>('/cinsi/reset', {
      method: 'POST',
    });
  }

  // Company methods
  async getCompanies() {
    return this.request<any[]>('/companies');
  }

  async getCompanyById(id: number) {
    return this.request<any>(`/companies/${id}`);
  }

  async createCompany(company: {
    name: string;
    type: 'company' | 'person';
    contact?: string;
    notes?: string;
  }) {
    return this.request<any>('/companies', {
      method: 'POST',
      body: JSON.stringify(company),
    });
  }

  async updateCompany(id: number, company: {
    name: string;
    type: 'company' | 'person';
    contact?: string;
    notes?: string;
  }) {
    return this.request<any>(`/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(company),
    });
  }

  async deleteCompany(id: number) {
    return this.request<{ message: string }>(`/companies/${id}`, {
      method: 'DELETE',
    });
  }

  async getCompanyStats() {
    return this.request<{
      total: number;
      companies: number;
      persons: number;
    }>('/companies/stats/summary');
  }

  // Log methods
  async getLogs(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    
    const query = queryParams.toString();
    return this.request<{
      logs: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(`/logs${query ? `?${query}` : ''}`);
  }

  async getLogById(id: number) {
    return this.request<any>(`/logs/${id}`);
  }

  async createLog(log: {
    user?: string;
    action: string;
    entityType?: string;
    entityName?: string;
    details?: string;
  }) {
    return this.request<any>('/logs', {
      method: 'POST',
      body: JSON.stringify(log),
    });
  }

  async deleteLog(id: number) {
    return this.request<{ message: string }>(`/logs/${id}`, {
      method: 'DELETE',
    });
  }

  async clearAllLogs() {
    return this.request<{ message: string; deletedCount: number }>('/logs/clear', {
      method: 'DELETE',
    });
  }

  async getLogStats() {
    return this.request<{
      total: number;
      uniqueUsers: number;
      todayCount: number;
      weekCount: number;
    }>('/logs/stats/summary');
  }

  async getRecentActivity() {
    return this.request<any[]>('/logs/recent/activity');
  }

  // Dashboard Settings methods
  async getDashboardSettings() {
    return this.request<{ settings: any }>('/dashboard-settings');
  }

  async saveDashboardSettings(settings: any) {
    return this.request<{ message: string; settings: any }>('/dashboard-settings', {
      method: 'POST',
      body: JSON.stringify({ settings }),
    });
  }

  async resetDashboardSettings() {
    return this.request<{ message: string; settings: any }>('/dashboard-settings/reset', {
      method: 'POST',
    });
  }

  // Health check
  async healthCheck() {
    return this.request<{
      status: string;
      timestamp: string;
      uptime: number;
      version: string;
    }>('/health');
  }
}

export const apiService = new ApiService();
export default apiService;
