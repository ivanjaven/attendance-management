export interface TeacherTodaySummary {
  advisory_class: string; // e.g., "Grade 11 - ICT - Section A"
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

// Database result interfaces
export interface NotificationWithStudent {
  id: number;
  student_id: number;
  type: string;
  message: string;
  sent_at: string;
  status: string;
  metadata?: any;
  students: {
    student_id: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
  };
}

export interface AttendanceWithStudent {
  id: number;
  attendance_date: string;
  time_in?: string;
  time_out?: string;
  is_late: boolean;
  late_minutes: number;
  students: {
    student_id: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
  };
}
