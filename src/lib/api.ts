const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

interface APIResponse<T> {
  data?: T;
  error?: string;
  status?: number;
}

async function apiCall<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: any,
): Promise<APIResponse<T>> {
  const token = localStorage.getItem("accessToken");

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const err = await response.json();
        if (typeof err.detail === 'string') {
          detail = err.detail;
        } else if (Array.isArray(err.detail)) {
          detail = err.detail.map((e: any) => e.msg).join('. ');
        }
      } catch {}
      return { error: detail, status: response.status };
    }

    if (response.status === 204) {
      return { data: undefined as any, status: response.status };
    }

    return { data: await response.json(), status: response.status };
  } catch (error) {
    return { error: String(error) };
  }
}

// Auth
export const authAPI = {
  login: (dni: string, password: string) =>
    apiCall<{ access_token: string; user: any; ephemeral: boolean }>("/auth/login", "POST", { dni, password }),
  logout: () => apiCall("/auth/logout", "POST"),
  me: () => apiCall<any>("/auth/me"),
};

// Users
export const usersAPI = {
  list: (page = 1, limit = 100, search?: string, role?: string, active?: boolean) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set("search", search);
    if (role) params.set("role", role);
    if (active !== undefined) params.set("active", String(active));
    return apiCall<{ items: any[]; total: number }>(`/users?${params.toString()}`);
  },
  get: (id: string) => apiCall<any>(`/users/${id}`),
  create: (data: { fullName: string; dni: string; password: string; role: string; gender?: string }) =>
    apiCall<any>("/users", "POST", data),
  update: (id: string, data: { fullName?: string; password?: string; gender?: string; active?: boolean }) =>
    apiCall<any>(`/users/${id}`, "PUT", data),
  delete: (id: string) => apiCall<void>(`/users/${id}`, "DELETE"),
};

// Patients
export const patientsAPI = {
  list: (page = 1, limit = 100, search = "", status = "") =>
    apiCall<{ items: any[]; total: number }>(
      `/patients?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ""}${status ? `&status=${status}` : ""}`,
    ),
  get: (id: string) => apiCall<any>(`/patients/${id}`),
  create: (data: any) => apiCall<any>("/patients", "POST", data),
  update: (id: string, data: any) => apiCall<any>(`/patients/${id}`, "PUT", data),
  delete: (id: string) => apiCall<void>(`/patients/${id}`, "DELETE"),
};

// Historiales
export const historiesAPI = {
  list: (patientId: string) => apiCall<any[]>(`/patients/${patientId}/histories`),
  get: (id: string) => apiCall<any>(`/histories/${id}`),
  create: (patientId: string, data: any) =>
    apiCall<any>(`/patients/${patientId}/histories`, "POST", data),
  update: (id: string, data: any) => apiCall<any>(`/histories/${id}`, "PUT", data),
  delete: (id: string) => apiCall<void>(`/histories/${id}`, "DELETE"),
  progress: (historyId: string) => apiCall<any>(`/histories/${historyId}/progress`),
  searchCie10: (query: string) =>
    apiCall<{ results: { code: string; description: string }[] }>(`/cie10/search?query=${encodeURIComponent(query)}`),
};

// Sesiones
export const sessionsAPI = {
  list: (historyId: string) => apiCall<any[]>(`/histories/${historyId}/sessions`),
  create: (historyId: string, data: any) =>
    apiCall<any>(`/histories/${historyId}/sessions`, "POST", data),
  /**
   * Crea una sesión firmada server-side. El backend valida (signerDni, signerPassword)
   * y registra al firmante como therapistId. Reemplaza el swap inseguro de tokens.
   */
  createSigned: (
    historyId: string,
    data: {
      signerDni: string;
      signerPassword: string;
      technique: string[];
      description: string;
      attentionDescription?: string;
      scheduledDate?: string | null;
    },
  ) => apiCall<any>(`/histories/${historyId}/sessions/signed`, "POST", data),
  update: (id: string, data: any) => apiCall<any>(`/sessions/${id}`, "PUT", data),
  delete: (id: string) => apiCall<void>(`/sessions/${id}`, "DELETE"),
};

// Catálogo
export const catalogAPI = {
  techniques: () => apiCall<string[]>('/catalog/techniques'),
};

// Procedimientos
export const proceduresAPI = {
  list: (patientId: string) => apiCall<any[]>(`/patients/${patientId}/procedures`),
  create: (patientId: string, data: any) =>
    apiCall<any>(`/patients/${patientId}/procedures`, "POST", data),
  update: (id: string, data: { description?: string; notes?: string }) =>
    apiCall<any>(`/procedures/${id}`, "PUT", data),
  delete: (id: string) => apiCall<void>(`/procedures/${id}`, "DELETE"),
};

// Dashboard
export const dashboardAPI = {
  alerts: (threshold = 2) =>
    apiCall<{ items: { patient: any; historyId: string; cie10Description: string; remaining: number }[]; total: number }>(
      `/dashboard/alerts?threshold=${threshold}`,
    ),
};
