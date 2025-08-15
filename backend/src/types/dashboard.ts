// Dashboard summary types
export interface DashboardSummary {
  today_total_students: number;
  today_present: number;
  today_absent: number;
  today_late: number;
  today_on_time: number;
  attendance_percentage: number;
}

export interface TeacherDashboardData {
  summary: DashboardSummary;
  advisory_class: AdvisoryClassData;
  notifications: NotificationData[];
}

export interface AdminDashboardData {
  summary: DashboardSummary;
  school_wide_data: SchoolWideData;
}

export interface StaffDashboardData {
  summary: DashboardSummary;
  recent_scans: RecentScanData[];
}

export interface AdvisoryClassData {
  level: number;
  specialization: string;
  section: string;
  total_students: number;
  present_today: number;
  absent_today: number;
  late_today: number;
}

export interface SchoolWideData {
  total_students: number;
  total_levels: number;
  total_sections: number;
  recent_scans: RecentScanData[];
}

export interface NotificationData {
  id: number;
  student_name: string;
  message: string;
  type: "Alert" | "Reminder";
  sent_at: Date;
  status: "Sent" | "Delivered" | "Read";
}

export interface RecentScanData {
  id: number;
  student_name: string;
  student_id: string;
  action: "time_in" | "time_out";
  timestamp: Date;
  is_late: boolean;
  late_minutes?: number;
}

// Supabase query result interfaces
export interface AttendanceLogWithStudent {
  id: number;
  time_in: string;
  time_out?: string;
  is_late: boolean;
  late_minutes: number;
  created_at: string;
  updated_at: string;
  students: {
    student_id: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
  };
}

export interface NotificationWithStudent {
  id: number;
  type: "Alert" | "Reminder";
  message: string;
  sent_at: string;
  status: "Sent" | "Delivered" | "Read";
  students: {
    first_name: string;
    last_name: string;
    middle_name?: string;
  };
}

export interface StudentWithAdvisoryInfo {
  id: number;
}

export interface LevelData {
  level: number;
}

export interface SpecializationData {
  specialization_name: string;
}

export interface SectionData {
  section_name: string;
}

export interface AttendanceLogBasic {
  id: number;
  is_late: boolean;
}
