export interface TeacherSummary {
  advisory_class: string;
  total_students: number;
  present_today: number;
  absent_today: number;
  late_today: number;
  attendance_percentage: number;
}

export interface TeacherNotification {
  id: number;
  student_name: string;
  student_id: string;
  type: "LATE_TODAY" | "EXCEEDED_70_MINUTES" | "CONSECUTIVE_ABSENCE";
  message: string;
  sent_at: Date;
  status: "UNREAD" | "READ";
  metadata?: {
    late_minutes?: number;
    total_late_minutes?: number;
    consecutive_days?: number;
  };
}

export interface StudentRecord {
  id: number;
  student_name: string;
  student_id: string;
  attendance_date: Date;
  time_in?: string;
  time_out?: string;
  is_late: boolean;
  late_minutes: number;
  status: "PRESENT" | "LATE" | "ABSENT";
}

export interface StudentRecordsResponse {
  records: StudentRecord[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_records: number;
    per_page: number;
  };
}

export interface StudentRecordsFilter {
  student_id?: number;
  date_from?: string;
  date_to?: string;
  page: number;
  limit: number;
}

export interface SchoolAttendanceStats {
  total_students: number;
  present_today: number;
  absent_today: number;
  late_today: number;
  on_time_today: number;
  attendance_percentage: number;
  late_percentage: number;
}

export interface SchoolStudentsStats {
  students: SchoolStudentRecord[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_records: number;
    per_page: number;
  };
  summary: {
    total_students: number;
    by_level: Array<{ level: number; count: number }>;
    by_specialization: Array<{ specialization: string; count: number }>;
    by_section: Array<{ section: string; count: number }>;
  };
}

export interface SchoolStudentRecord {
  id: number;
  student_id: string;
  full_name: string;
  level: number;
  specialization: string;
  section: string;
  adviser_name: string;
  attendance_summary: {
    present_days: number;
    late_days: number;
    absent_days: number;
    total_late_minutes: number;
    attendance_percentage: number;
  };
}

export interface QuarterInfo {
  id: number;
  quarter_name: string;
  start_date: string;
  end_date: string;
  school_start_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
