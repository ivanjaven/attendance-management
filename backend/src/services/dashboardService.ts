import { supabase } from "../config/database";
import { Teacher } from "../types/auth";
import {
  DashboardSummary,
  TeacherDashboardData,
  AdminDashboardData,
  StaffDashboardData,
  AdvisoryClassData,
  SchoolWideData,
  NotificationData,
  RecentScanData,
  AttendanceLogWithStudent,
  NotificationWithStudent,
  StudentWithAdvisoryInfo,
  LevelData,
  SpecializationData,
  SectionData,
  AttendanceLogBasic,
} from "../types/dashboard";

export class DashboardService {
  /**
   * Get today's attendance summary for all roles
   */
  static async getDashboardSummary(): Promise<DashboardSummary> {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Get total students count
      const { data: totalStudents, error: studentsError } = await supabase
        .from("students")
        .select("id", { count: "exact" })
        .is("deleted_at", null);

      if (studentsError) throw studentsError;

      const totalStudentsCount = totalStudents?.length || 0;

      // Get today's attendance data
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance_log")
        .select("id, time_in, time_out, is_late, late_minutes")
        .eq("attendance_date", today)
        .is("deleted_at", null);

      if (attendanceError) throw attendanceError;

      const presentToday = attendanceData?.length || 0;
      const absentToday = totalStudentsCount - presentToday;
      const lateToday =
        attendanceData?.filter((log) => log.is_late).length || 0;
      const onTimeToday = presentToday - lateToday;
      const attendancePercentage =
        totalStudentsCount > 0
          ? Math.round((presentToday / totalStudentsCount) * 100)
          : 0;

      return {
        today_total_students: totalStudentsCount,
        today_present: presentToday,
        today_absent: absentToday,
        today_late: lateToday,
        today_on_time: onTimeToday,
        attendance_percentage: attendancePercentage,
      };
    } catch (error: any) {
      throw new Error(`Failed to get dashboard summary: ${error.message}`);
    }
  }

  /**
   * Get teacher-specific dashboard data
   */
  static async getTeacherDashboard(
    teacher: Teacher
  ): Promise<TeacherDashboardData> {
    try {
      const summary = await this.getDashboardSummary();
      const advisoryClass = await this.getTeacherAdvisoryClass(teacher);
      const notifications = await this.getTeacherNotifications(teacher.auth_id);

      return {
        summary,
        advisory_class: advisoryClass,
        notifications,
      };
    } catch (error: any) {
      throw new Error(`Failed to get teacher dashboard: ${error.message}`);
    }
  }

  /**
   * Get admin-specific dashboard data
   */
  static async getAdminDashboard(): Promise<AdminDashboardData> {
    try {
      const summary = await this.getDashboardSummary();
      const schoolWideData = await this.getSchoolWideData();

      return {
        summary,
        school_wide_data: schoolWideData,
      };
    } catch (error: any) {
      throw new Error(`Failed to get admin dashboard: ${error.message}`);
    }
  }

  /**
   * Get staff-specific dashboard data
   */
  static async getStaffDashboard(): Promise<StaffDashboardData> {
    try {
      const summary = await this.getDashboardSummary();
      const recentScans = await this.getRecentScans(10);

      return {
        summary,
        recent_scans: recentScans,
      };
    } catch (error: any) {
      throw new Error(`Failed to get staff dashboard: ${error.message}`);
    }
  }

  /**
   * Get teacher's advisory class information
   */
  private static async getTeacherAdvisoryClass(
    teacher: Teacher
  ): Promise<AdvisoryClassData> {
    try {
      if (
        !teacher.advisory_level_id ||
        !teacher.advisory_specialization_id ||
        !teacher.advisory_section_id
      ) {
        return {
          level: 0,
          specialization: "Not Assigned",
          section: "Not Assigned",
          total_students: 0,
          present_today: 0,
          absent_today: 0,
          late_today: 0,
        };
      }

      // Get level, specialization, and section info
      const { data: levelData } = (await supabase
        .from("levels")
        .select("level")
        .eq("id", teacher.advisory_level_id)
        .single()) as { data: LevelData | null };

      const { data: specializationData } = (await supabase
        .from("specializations")
        .select("specialization_name")
        .eq("id", teacher.advisory_specialization_id)
        .single()) as { data: SpecializationData | null };

      const { data: sectionData } = (await supabase
        .from("sections")
        .select("section_name")
        .eq("id", teacher.advisory_section_id)
        .single()) as { data: SectionData | null };

      // Get students in this advisory class
      const { data: advisoryStudents } = (await supabase
        .from("students")
        .select("id")
        .eq("level_id", teacher.advisory_level_id)
        .eq("specialization_id", teacher.advisory_specialization_id)
        .eq("section_id", teacher.advisory_section_id)
        .is("deleted_at", null)) as { data: StudentWithAdvisoryInfo[] | null };

      const totalStudents = advisoryStudents?.length || 0;

      // Get today's attendance for advisory students
      const today = new Date().toISOString().split("T")[0];
      const studentIds = advisoryStudents?.map((s) => s.id) || [];

      let presentToday = 0;
      let lateToday = 0;

      if (studentIds.length > 0) {
        const { data: todayAttendance } = (await supabase
          .from("attendance_log")
          .select("id, is_late")
          .in("student_id", studentIds)
          .eq("attendance_date", today)
          .is("deleted_at", null)) as { data: AttendanceLogBasic[] | null };

        presentToday = todayAttendance?.length || 0;
        lateToday = todayAttendance?.filter((log) => log.is_late).length || 0;
      }

      const absentToday = totalStudents - presentToday;

      return {
        level: levelData?.level || 0,
        specialization: specializationData?.specialization_name || "Unknown",
        section: sectionData?.section_name || "Unknown",
        total_students: totalStudents,
        present_today: presentToday,
        absent_today: absentToday,
        late_today: lateToday,
      };
    } catch (error: any) {
      throw new Error(`Failed to get advisory class data: ${error.message}`);
    }
  }

  /**
   * Get teacher's notifications
   */
  private static async getTeacherNotifications(
    teacherId: string
  ): Promise<NotificationData[]> {
    try {
      const { data: notifications, error } = (await supabase
        .from("notifications")
        .select(
          `
          id,
          type,
          message,
          sent_at,
          status,
          students!inner(first_name, last_name, middle_name)
        `
        )
        .eq("teacher_id", teacherId)
        .order("sent_at", { ascending: false })
        .limit(20)) as { data: NotificationWithStudent[] | null; error: any };

      if (error) throw error;

      return (
        notifications?.map((notification) => ({
          id: notification.id,
          student_name: `${notification.students.first_name} ${notification.students.last_name}`,
          message: notification.message,
          type: notification.type,
          sent_at: new Date(notification.sent_at),
          status: notification.status,
        })) || []
      );
    } catch (error: any) {
      throw new Error(`Failed to get teacher notifications: ${error.message}`);
    }
  }

  /**
   * Get school-wide data for admin
   */
  private static async getSchoolWideData(): Promise<SchoolWideData> {
    try {
      // Get total counts
      const [studentsResult, levelsResult, sectionsResult] = await Promise.all([
        supabase
          .from("students")
          .select("id", { count: "exact" })
          .is("deleted_at", null),
        supabase
          .from("levels")
          .select("id", { count: "exact" })
          .is("deleted_at", null),
        supabase
          .from("sections")
          .select("id", { count: "exact" })
          .is("deleted_at", null),
      ]);

      const recentScans = await this.getRecentScans(15);

      return {
        total_students: studentsResult.data?.length || 0,
        total_levels: levelsResult.data?.length || 0,
        total_sections: sectionsResult.data?.length || 0,
        recent_scans: recentScans,
      };
    } catch (error: any) {
      throw new Error(`Failed to get school-wide data: ${error.message}`);
    }
  }

  /**
   * Get recent scans for display
   */
  private static async getRecentScans(
    limit: number = 10
  ): Promise<RecentScanData[]> {
    try {
      const today = new Date().toISOString().split("T")[0];

      const { data: recentLogs, error } = (await supabase
        .from("attendance_log")
        .select(
          `
          id,
          time_in,
          time_out,
          is_late,
          late_minutes,
          created_at,
          updated_at,
          students!inner(student_id, first_name, last_name, middle_name)
        `
        )
        .eq("attendance_date", today)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(limit)) as {
        data: AttendanceLogWithStudent[] | null;
        error: any;
      };

      if (error) throw error;

      return (
        recentLogs?.map((log) => {
          // Determine if this was a time_in or time_out action
          const isTimeOut = log.time_out && log.updated_at !== log.created_at;

          return {
            id: log.id,
            student_name: `${log.students.first_name} ${log.students.last_name}`,
            student_id: log.students.student_id,
            action: isTimeOut
              ? "time_out"
              : ("time_in" as "time_in" | "time_out"),
            timestamp: new Date(isTimeOut ? log.updated_at : log.created_at),
            is_late: log.is_late,
            late_minutes: log.late_minutes || undefined,
          };
        }) || []
      );
    } catch (error: any) {
      throw new Error(`Failed to get recent scans: ${error.message}`);
    }
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(
    notificationId: number,
    teacherId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ status: "Read" })
        .eq("id", notificationId)
        .eq("teacher_id", teacherId);

      if (error) throw error;
    } catch (error: any) {
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }
}
