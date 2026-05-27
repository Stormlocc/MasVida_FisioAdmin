import { User, Patient, ClinicalHistory, SessionRecord, InvasiveProcedure } from './types';

// Configure the backend API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ApiError {
  message: string;
  status?: number;
}

class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.loadToken();
  }

  private loadToken() {
    const token = localStorage.getItem('auth_token');
    if (token) {
      this.token = token;
    }
  }

  private setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  private clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = 'Bearer ' + this.token;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error: ApiError = {
        message: `API error: ${response.statusText}`,
        status: response.status,
      };
      
      try {
        const data = await response.json();
        error.message = data.message || error.message;
      } catch {
        // Keep default error message
      }
      
      if (response.status === 401) {
        this.clearToken();
      }
      
      throw error;
    }

    const data = await response.json();
    return data;
  }

  // AUTH
  async login(dni: string, password: string): Promise<User> {
    const response = await this.request<{ user: User; token: string }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ dni, password }),
      }
    );
    
    this.setToken(response.token);
    return response.user;
  }

  async logout(): Promise<void> {
    this.clearToken();
  }

  getCurrentUser(): User | null {
    const userJson = localStorage.getItem('current_user');
    if (userJson) {
      try {
        return JSON.parse(userJson);
      } catch {
        return null;
      }
    }
    return null;
  }

  setCurrentUser(user: User | null): void {
    if (user) {
      localStorage.setItem('current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('current_user');
    }
  }

  // USERS
  async getUsers(): Promise<User[]> {
    return this.request<User[]>('/users');
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      return await this.request<User>(`/users/${id}`);
    } catch {
      return null;
    }
  }

  async getUserByDni(dni: string): Promise<User | null> {
    try {
      return await this.request<User>(`/users/dni/${dni}`);
    } catch {
      return null;
    }
  }

  async saveUser(user: User): Promise<User> {
    if (user.id && user.id.startsWith('u-')) {
      // Update existing user
      return this.request<User>(`/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify(user),
      });
    } else {
      // Create new user
      return this.request<User>('/users', {
        method: 'POST',
        body: JSON.stringify(user),
      });
    }
  }

  // PATIENTS
  async getPatients(): Promise<Patient[]> {
    return this.request<Patient[]>('/patients');
  }

  async getPatientById(id: string): Promise<Patient | null> {
    try {
      return await this.request<Patient>(`/patients/${id}`);
    } catch {
      return null;
    }
  }

  async savePatient(patient: Patient): Promise<Patient> {
    if (patient.id && patient.id.startsWith('p-')) {
      // Update existing patient
      return this.request<Patient>(`/patients/${patient.id}`, {
        method: 'PUT',
        body: JSON.stringify(patient),
      });
    } else {
      // Create new patient
      return this.request<Patient>('/patients', {
        method: 'POST',
        body: JSON.stringify(patient),
      });
    }
  }

  // CLINICAL HISTORIES
  async getHistoriesByPatientId(patientId: string): Promise<ClinicalHistory[]> {
    return this.request<ClinicalHistory[]>(
      `/patients/${patientId}/histories`
    );
  }

  async getCurrentHistory(patientId: string): Promise<ClinicalHistory | null> {
    try {
      const histories = await this.getHistoriesByPatientId(patientId);
      if (histories.length === 0) return null;
      return histories.sort((a, b) => b.createdAt - a.createdAt)[0];
    } catch {
      return null;
    }
  }

  async saveHistory(history: ClinicalHistory): Promise<ClinicalHistory> {
    if (history.id && history.id.startsWith('h-')) {
      // Update existing history
      return this.request<ClinicalHistory>(
        `/patients/${history.patientId}/histories/${history.id}`,
        {
          method: 'PUT',
          body: JSON.stringify(history),
        }
      );
    } else {
      // Create new history
      return this.request<ClinicalHistory>(
        `/patients/${history.patientId}/histories`,
        {
          method: 'POST',
          body: JSON.stringify(history),
        }
      );
    }
  }

  async deleteHistory(historyId: string, patientId: string): Promise<void> {
    return this.request<void>(
      `/patients/${patientId}/histories/${historyId}`,
      {
        method: 'DELETE',
      }
    );
  }

  // SESSIONS
  async getSessionsByPatientId(patientId: string): Promise<SessionRecord[]> {
    const sessions = await this.request<SessionRecord[]>(
      `/patients/${patientId}/sessions`
    );
    return sessions.sort((a, b) => b.signedAt - a.signedAt);
  }

  async getSessionsByHistoryId(historyId: string): Promise<SessionRecord[]> {
    const sessions = await this.request<SessionRecord[]>(
      `/sessions/history/${historyId}`
    );
    return sessions.sort((a, b) => b.signedAt - a.signedAt);
  }

  async saveSession(session: SessionRecord): Promise<SessionRecord> {
    if (session.id && session.id.startsWith('s-')) {
      // Update existing session
      return this.request<SessionRecord>(`/sessions/${session.id}`, {
        method: 'PUT',
        body: JSON.stringify(session),
      });
    } else {
      // Create new session
      return this.request<SessionRecord>('/sessions', {
        method: 'POST',
        body: JSON.stringify(session),
      });
    }
  }

  // INVASIVE PROCEDURES
  async getInvasiveProceduresByPatientId(patientId: string): Promise<InvasiveProcedure[]> {
    try {
      const procedures = await this.request<InvasiveProcedure[]>(
        `/patients/${patientId}/invasive-procedures`
      );
      return procedures.sort((a, b) => b.signedAt - a.signedAt);
    } catch {
      return [];
    }
  }

  async saveInvasiveProcedure(procedure: InvasiveProcedure): Promise<InvasiveProcedure> {
    if (procedure.id && procedure.id.startsWith('ip-')) {
      // Update existing procedure
      return this.request<InvasiveProcedure>(
        `/invasive-procedures/${procedure.id}`,
        {
          method: 'PUT',
          body: JSON.stringify(procedure),
        }
      );
    } else {
      // Create new procedure
      return this.request<InvasiveProcedure>('/invasive-procedures', {
        method: 'POST',
        body: JSON.stringify(procedure),
      });
    }
  }

  async deleteInvasiveProcedure(procedureId: string): Promise<void> {
    return this.request<void>(`/invasive-procedures/${procedureId}`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService(API_BASE_URL);

// Export a db-like interface for backward compatibility
export const db = {
  // Users
  getUsers: () => apiService.getUsers(),
  getUserById: (id: string) => apiService.getUserById(id),
  getUserByDni: (dni: string) => apiService.getUserByDni(dni),
  saveUser: (user: User) => apiService.saveUser(user),

  // Patients
  getPatients: () => apiService.getPatients(),
  getPatientById: (id: string) => apiService.getPatientById(id),
  savePatient: (patient: Patient) => apiService.savePatient(patient),

  // Histories
  getHistoriesByPatientId: (patientId: string) =>
    apiService.getHistoriesByPatientId(patientId),
  getCurrentHistory: (patientId: string) =>
    apiService.getCurrentHistory(patientId),
  saveHistory: (history: ClinicalHistory) =>
    apiService.saveHistory(history),
  deleteHistory: (historyId: string, patientId: string) =>
    apiService.deleteHistory(historyId, patientId),

  // Sessions
  getSessionsByPatientId: (patientId: string) =>
    apiService.getSessionsByPatientId(patientId),
  getSessionsByHistoryId: (historyId: string) =>
    apiService.getSessionsByHistoryId(historyId),
  saveSession: (session: SessionRecord) =>
    apiService.saveSession(session),

  // Invasive Procedures
  getInvasiveProceduresByPatientId: (patientId: string) =>
    apiService.getInvasiveProceduresByPatientId(patientId),
  saveInvasiveProcedure: (procedure: InvasiveProcedure) =>
    apiService.saveInvasiveProcedure(procedure),
  deleteInvasiveProcedure: (procedureId: string) =>
    apiService.deleteInvasiveProcedure(procedureId),
};
