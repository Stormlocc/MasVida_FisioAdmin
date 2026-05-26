// API client para conectar React con FastAPI backend
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

interface APIResponse<T> {
  data?: T;
  error?: string;
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

    if (response.status === 401) {
      localStorage.removeItem("accessToken");
      window.location.href = "/login";
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return { data: await response.json() };
  } catch (error) {
    return { error: String(error) };
  }
}

// Auth
export const authAPI = {
  login: (dni: string, password: string) =>
    apiCall<{ access_token: string; user: any }>("/auth/login", "POST", {
      dni,
      password,
    }),
  logout: () => apiCall("/auth/logout", "POST"),
};

// Patients
export const patientsAPI = {
  list: (page = 1, limit = 50, search = "", status = "") =>
    apiCall(
      `/patients?page=${page}&limit=${limit}&search=${search}&status=${status}`,
    ),
  get: (id: string) => apiCall(`/patients/${id}`),
  create: (data: any) => apiCall("/patients", "POST", data),
  update: (id: string, data: any) => apiCall(`/patients/${id}`, "PUT", data),
};

// Historiales
export const historiesAPI = {
  list: (patientId: string) => apiCall(`/patients/${patientId}/histories`),
  get: (id: string) => apiCall(`/histories/${id}`),
  create: (patientId: string, data: any) =>
    apiCall(`/patients/${patientId}/histories`, "POST", data),
};

// Sesiones
export const sessionsAPI = {
  list: (historyId: string) => apiCall(`/histories/${historyId}/sessions`),
  create: (historyId: string, data: any) =>
    apiCall(`/histories/${historyId}/sessions`, "POST", data),
  update: (id: string, data: any) => apiCall(`/sessions/${id}`, "PUT", data),
};

// Procedimientos
export const proceduresAPI = {
  list: (patientId: string) => apiCall(`/patients/${patientId}/procedures`),
  create: (patientId: string, data: any) =>
    apiCall(`/patients/${patientId}/procedures`, "POST", data),
};
