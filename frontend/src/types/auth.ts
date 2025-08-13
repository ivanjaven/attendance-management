export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "admin" | "teacher" | "student";
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
    token: string;
  };
  message?: string;
  error?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
