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
  late_minutes: number;
  created_at: Date;
  updated_at: Date;
}

export interface StudentLateTracking {
  id: number;
  student_id: number;
  quarter_id: number;
  total_late_minutes: number;
  notification_sent: boolean;
  last_updated: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Quarter {
  id: number;
  quarter_name: string;
  start_date: Date;
  end_date: Date;
  school_start_time: string;
  created_at: Date;
  updated_at: Date;
}

export interface Notification {
  id: number;
  student_id: number;
  teacher_id: string;
  type: "Alert" | "Reminder";
  message: string;
  sent_at: Date;
  status: "Sent" | "Delivered" | "Read";
  created_at: Date;
  updated_at: Date;
}

export interface QRScanRequest {
  qr_token: string;
}

export interface QRScanResponse {
  success: boolean;
  data?: {
    student: Student;
    attendance_log: AttendanceLog;
    is_late: boolean;
    action: "time_in" | "time_out";
    late_minutes?: number;
    total_late_minutes?: number;
    notification_triggered?: boolean;
  };
  message?: string;
  error?: string;
}

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
  late_minutes: number;
}

export interface AttendanceLogUpdate {
  time_in?: string;
  time_out?: string;
  is_late?: boolean;
  late_minutes?: number;
}

export interface StudentLateTrackingInput {
  student_id: number;
  quarter_id: number;
  total_late_minutes: number;
}

export interface NotificationInput {
  student_id: number;
  teacher_id: string;
  type: "Alert" | "Reminder";
  message: string;
}
