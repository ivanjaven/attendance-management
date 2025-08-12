// User role types
export type UserRole = "Teacher" | "Admin" | "Staff";
export type UserStatus = "Active" | "Inactive";

export interface AuthUser {
  auth_id: string;
  email: string;
}

export interface User extends AuthUser {
  type: UserRole;
  status: UserStatus;
  last_login?: Date;
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// Role-specific interfaces
export interface Admin extends User {
  name: string;
}

export interface Teacher extends User {
  first_name: string;
  last_name: string;
  middle_name?: string;
  advisory_level_id?: number;
  advisory_specialization_id?: number;
  advisory_section_id?: number;
}

export interface Staff extends User {
  name: string;
}

// API request/response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: Admin | Teacher | Staff;
  session: any;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  type: UserRole;
  // Role-specific data
  name?: string; // for Admin/Staff
  first_name?: string; // for Teacher
  last_name?: string; // for Teacher
  middle_name?: string; // for Teacher
  advisory_level_id?: number;
  advisory_specialization_id?: number;
  advisory_section_id?: number;
}
