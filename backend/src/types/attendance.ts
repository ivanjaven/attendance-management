// Student interface
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

// Attendance Log interface
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

// QR Scan request interface - simplified for automatic detection
export interface QRScanRequest {
  qr_token: string;
}

// QR Scan response interface
export interface QRScanResponse {
  success: boolean;
  data?: {
    student: Student;
    attendance_log: AttendanceLog;
    is_late: boolean;
    action: "time_in" | "time_out";
  };
  message?: string;
  error?: string;
}

// API Response interface
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Backend-specific attendance types
export interface AttendanceLogInput {
  student_id: number;
  attendance_date: Date;
  time_in: string;
  is_late: boolean;
}

export interface AttendanceLogUpdate {
  time_in?: string;
  time_out?: string;
  is_late?: boolean;
}
