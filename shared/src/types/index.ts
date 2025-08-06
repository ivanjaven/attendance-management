// Authentication types
export interface AuthUser {
  auth_id: number;
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

// User types based on your schema
export interface User {
  auth_id: number;
  type: 'Teacher' | 'Admin' | 'Staff';
  status: 'Active' | 'Banned';
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Teacher extends User {
  first_name: string;
  last_name: string;
  middle_name?: string;
  advisory_level_id: number;
  advisory_specialization_id: number;
  advisory_section_id: number;
}

export interface Admin extends User {
  name: string;
}

export interface Student {
  id: number;
  student_id: string;
  qr_token: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  level_id: number;
  specialization_id: number;
  section_id: number;
  adviser_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface AttendanceLog {
  id: number;
  student_id: number;
  attendance_date: Date;
  time_in: string;
  time_out?: string;
  is_late: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Level {
  id: number;
  level: number;
  created_at: Date;
  updated_at: Date;
}

export interface Section {
  id: number;
  section_name: string;
  created_at: Date;
  updated_at: Date;
}

export interface Specialization {
  id: number;
  specialization_name: string;
  created_at: Date;
  updated_at: Date;
}

export interface Notification {
  id: number;
  student_id: number;
  teacher_id: number;
  type: 'Alert' | 'Reminder';
  message: string;
  sent_at: Date;
  status: 'Sent' | 'Delivered' | 'Read';
  created_at: Date;
  updated_at: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// QR Code scanning
export interface QRScanRequest {
  qr_token: string;
  scan_type: 'time_in' | 'time_out';
}

export interface QRScanResponse extends ApiResponse {
  student?: Student;
  attendance_log?: AttendanceLog;
  is_late?: boolean;
}
