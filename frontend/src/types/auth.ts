export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  auth_id: string;
  email: string;
  type: "Teacher" | "Admin" | "Staff";
  status: "Active" | "Inactive";
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
  // Role-specific fields
  name?: string; // for Admin/Staff
  first_name?: string; // for Teacher
  last_name?: string; // for Teacher
  middle_name?: string; // for Teacher
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
