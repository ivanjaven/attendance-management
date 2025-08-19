import { supabase } from "../config/database";
import { Teacher } from "../types/auth";
import {
  TeacherTodaySummary,
  TeacherNotification,
  StudentRecord,
  StudentRecordsResponse,
  StudentRecordsFilter,
} from "../types/dashboard";

export class DashboardService {
  /**
   * Get teacher's today summary for advisory class
   */
  static async getTeacherTodaySummary(
    teacher: Teacher
  ): Promise<TeacherTodaySummary> {
    try {
      if (
        !teacher.advisory_level_id ||
        !teacher.advisory_specialization_id ||
        !teacher.advisory_section_id
      ) {
        return {
          advisory_class: "No Advisory Class Assigned",
          total_students: 0,
          present_today: 0,
          absent_today: 0,
          late_today: 0,
          attendance_percentage: 0,
        };
      }

      const [levelResult, specializationResult, sectionResult] =
        await Promise.all([
          supabase
            .from("levels")
            .select("level")
            .eq("id", teacher.advisory_level_id)
            .single(),
          supabase
            .from("specializations")
            .select("specialization_name")
            .eq("id", teacher.advisory_specialization_id)
            .single(),
          supabase
            .from("sections")
            .select("section_name")
            .eq("id", teacher.advisory_section_id)
            .single(),
        ]);

      const level = levelResult.data?.level || 0;
      const specialization =
        specializationResult.data?.specialization_name || "Unknown";
      const section = sectionResult.data?.section_name || "Unknown";
      const advisoryClass = `Grade ${level} - ${specialization} - ${section}`;

      const { data: students } = await supabase
        .from("students")
        .select("id")
        .eq("level_id", teacher.advisory_level_id)
        .eq("specialization_id", teacher.advisory_specialization_id)
        .eq("section_id", teacher.advisory_section_id)
        .is("deleted_at", null);

      const totalStudents = students?.length || 0;

      if (totalStudents === 0) {
        return {
          advisory_class: advisoryClass,
          total_students: 0,
          present_today: 0,
          absent_today: 0,
          late_today: 0,
          attendance_percentage: 0,
        };
      }

      // Get today's attendance
      const today = new Date().toISOString().split("T")[0];
      const studentIds = students?.map((s) => s.id) || [];

      const { data: todayAttendance } = await supabase
        .from("attendance_log")
        .select("id, is_late")
        .in("student_id", studentIds)
        .eq("attendance_date", today)
        .is("deleted_at", null);

      const presentToday = todayAttendance?.length || 0;
      const absentToday = totalStudents - presentToday;
      const lateToday =
        todayAttendance?.filter((log) => log.is_late).length || 0;
      const attendancePercentage =
        totalStudents > 0
          ? Math.round((presentToday / totalStudents) * 100)
          : 0;

      return {
        advisory_class: advisoryClass,
        total_students: totalStudents,
        present_today: presentToday,
        absent_today: absentToday,
        late_today: lateToday,
        attendance_percentage: attendancePercentage,
      };
    } catch (error: any) {
      throw new Error(`Failed to get teacher today summary: ${error.message}`);
    }
  }

  /**
   * Get teacher's notifications for today
   */
  static async getTeacherNotifications(
    teacher: Teacher
  ): Promise<TeacherNotification[]> {
    try {
      const notifications: TeacherNotification[] = [];
      const today = new Date().toISOString().split("T")[0];

      if (
        !teacher.advisory_level_id ||
        !teacher.advisory_specialization_id ||
        !teacher.advisory_section_id
      ) {
        return notifications;
      }

      const advisoryStudents = await this.getAdvisoryStudentIds(teacher);
      if (advisoryStudents.length === 0) return notifications;

      // 1. Get late students for today
      const { data: lateStudents } = await supabase
        .from("attendance_log")
        .select("student_id, late_minutes")
        .in("student_id", advisoryStudents)
        .eq("attendance_date", today)
        .eq("is_late", true)
        .is("deleted_at", null);

      if (lateStudents && lateStudents.length > 0) {
        for (const record of lateStudents) {
          // Get student info separately
          const { data: student } = await supabase
            .from("students")
            .select("student_id, first_name, last_name")
            .eq("id", record.student_id)
            .single();

          if (student) {
            const studentName = `${student.first_name} ${student.last_name}`;
            notifications.push({
              id: 0, // Real-time notification
              student_name: studentName,
              student_id: student.student_id,
              type: "LATE_TODAY",
              message: `${studentName} arrived ${record.late_minutes} minutes late today`,
              sent_at: new Date(),
              status: "UNREAD",
              metadata: {
                late_minutes: record.late_minutes,
              },
            });
          }
        }
      }

      // 2. Get students who exceeded 70-minute rule
      const currentQuarter = await this.getCurrentQuarter();
      if (currentQuarter) {
        const { data: exceededStudents } = await supabase
          .from("student_late_tracking")
          .select("student_id, total_late_minutes")
          .in("student_id", advisoryStudents)
          .eq("quarter_id", currentQuarter.id)
          .gte("total_late_minutes", 70);

        if (exceededStudents && exceededStudents.length > 0) {
          for (const record of exceededStudents) {
            // Get student info separately
            const { data: student } = await supabase
              .from("students")
              .select("student_id, first_name, last_name")
              .eq("id", record.student_id)
              .single();

            if (student) {
              const studentName = `${student.first_name} ${student.last_name}`;
              notifications.push({
                id: 0, // Real-time notification
                student_name: studentName,
                student_id: student.student_id,
                type: "EXCEEDED_70_MINUTES",
                message: `${studentName} has exceeded the 70-minute late limit with ${record.total_late_minutes} minutes`,
                sent_at: new Date(),
                status: "UNREAD",
                metadata: {
                  total_late_minutes: record.total_late_minutes,
                },
              });
            }
          }
        }
      }

      // 3. Get students absent for 3+ consecutive days
      const consecutiveAbsent = await this.getConsecutiveAbsentStudents(
        advisoryStudents
      );
      consecutiveAbsent.forEach((student) => {
        notifications.push({
          id: 0, // Real-time notification
          student_name: student.name,
          student_id: student.student_id,
          type: "CONSECUTIVE_ABSENCE",
          message: `${student.name} has been absent for ${student.consecutive_days} consecutive days`,
          sent_at: new Date(),
          status: "UNREAD",
          metadata: {
            consecutive_days: student.consecutive_days,
          },
        });
      });

      // Also get existing notifications from database
      const { data: existingNotifications } = await supabase
        .from("notifications")
        .select("id, student_id, type, message, sent_at, status, metadata")
        .eq("teacher_id", teacher.auth_id)
        .gte("sent_at", `${today}T00:00:00`)
        .order("sent_at", { ascending: false });

      // Add existing notifications
      if (existingNotifications && existingNotifications.length > 0) {
        for (const notification of existingNotifications) {
          const { data: student } = await supabase
            .from("students")
            .select("student_id, first_name, last_name")
            .eq("id", notification.student_id)
            .single();

          if (student) {
            const studentName = `${student.first_name} ${student.last_name}`;
            notifications.push({
              id: notification.id,
              student_name: studentName,
              student_id: student.student_id,
              type: notification.type as any,
              message: notification.message,
              sent_at: new Date(notification.sent_at),
              status: notification.status as any,
              metadata: notification.metadata,
            });
          }
        }
      }

      return notifications.sort(
        (a, b) => b.sent_at.getTime() - a.sent_at.getTime()
      );
    } catch (error: any) {
      throw new Error(`Failed to get teacher notifications: ${error.message}`);
    }
  }

  /**
   * Get all attendance records for teacher's advisory students
   */
  static async getStudentRecords(
    teacher: Teacher,
    filters: StudentRecordsFilter
  ): Promise<StudentRecordsResponse> {
    try {
      // Check if teacher has advisory assignment
      if (
        !teacher.advisory_level_id ||
        !teacher.advisory_specialization_id ||
        !teacher.advisory_section_id
      ) {
        return {
          records: [],
          pagination: {
            current_page: filters.page,
            total_pages: 0,
            total_records: 0,
            per_page: filters.limit,
          },
        };
      }

      const advisoryStudents = await this.getAdvisoryStudentIds(teacher);
      if (advisoryStudents.length === 0) {
        return {
          records: [],
          pagination: {
            current_page: filters.page,
            total_pages: 0,
            total_records: 0,
            per_page: filters.limit,
          },
        };
      }

      let query = supabase
        .from("attendance_log")
        .select(
          "id, student_id, attendance_date, time_in, time_out, is_late, late_minutes",
          { count: "exact" }
        )
        .in("student_id", advisoryStudents)
        .is("deleted_at", null);

      if (filters.student_id) {
        query = query.eq("student_id", filters.student_id);
      }
      if (filters.date_from) {
        query = query.gte("attendance_date", filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte("attendance_date", filters.date_to);
      }

      // Apply pagination
      const offset = (filters.page - 1) * filters.limit;
      query = query
        .order("attendance_date", { ascending: false })
        .range(offset, offset + filters.limit - 1);

      const { data: records, error, count } = await query;
      if (error) throw error;

      // Map to response format with student info
      const mappedRecords: StudentRecord[] = [];

      if (records && records.length > 0) {
        for (const record of records) {
          // Get student info separately
          const { data: student } = await supabase
            .from("students")
            .select("student_id, first_name, last_name")
            .eq("id", record.student_id)
            .single();

          if (student) {
            const studentName = `${student.first_name} ${student.last_name}`;
            let status: "PRESENT" | "LATE" | "ABSENT" = "ABSENT";

            if (record.time_in) {
              status = record.is_late ? "LATE" : "PRESENT";
            }

            mappedRecords.push({
              id: record.id,
              student_name: studentName,
              student_id: student.student_id,
              attendance_date: new Date(record.attendance_date),
              time_in: record.time_in,
              time_out: record.time_out,
              is_late: record.is_late,
              late_minutes: record.late_minutes,
              status,
            });
          }
        }
      }

      const totalRecords = count || 0;
      const totalPages = Math.ceil(totalRecords / filters.limit);

      return {
        records: mappedRecords,
        pagination: {
          current_page: filters.page,
          total_pages: totalPages,
          total_records: totalRecords,
          per_page: filters.limit,
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to get student records: ${error.message}`);
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
        .update({
          status: "READ",
          updated_at: new Date().toISOString(),
        })
        .eq("id", notificationId)
        .eq("teacher_id", teacherId);

      if (error) throw error;
    } catch (error: any) {
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  // Private helper methods
  private static async getAdvisoryStudentIds(
    teacher: Teacher
  ): Promise<number[]> {
    const { data: students } = await supabase
      .from("students")
      .select("id")
      .eq("level_id", teacher.advisory_level_id)
      .eq("specialization_id", teacher.advisory_specialization_id)
      .eq("section_id", teacher.advisory_section_id)
      .is("deleted_at", null);

    return students?.map((s) => s.id) || [];
  }

  private static async getCurrentQuarter() {
    const today = new Date().toISOString().split("T")[0];

    const { data: quarter } = await supabase
      .from("quarters")
      .select("*")
      .lte("start_date", today)
      .gte("end_date", today)
      .is("deleted_at", null)
      .single();

    return quarter;
  }

  private static async getConsecutiveAbsentStudents(
    studentIds: number[]
  ): Promise<
    Array<{
      name: string;
      student_id: string;
      consecutive_days: number;
    }>
  > {
    const result = [];
    const today = new Date();

    for (const studentId of studentIds) {
      let consecutiveDays = 0;
      let checkDate = new Date(today);

      // Check last 7 days
      for (let i = 0; i < 7; i++) {
        const dateStr = checkDate.toISOString().split("T")[0];

        const { data: attendance } = await supabase
          .from("attendance_log")
          .select("id")
          .eq("student_id", studentId)
          .eq("attendance_date", dateStr)
          .is("deleted_at", null)
          .single();

        if (attendance) {
          break;
        }

        consecutiveDays++;
        checkDate.setDate(checkDate.getDate() - 1);
      }

      if (consecutiveDays >= 3) {
        const { data: student } = await supabase
          .from("students")
          .select("student_id, first_name, last_name")
          .eq("id", studentId)
          .single();

        if (student) {
          result.push({
            name: `${student.first_name} ${student.last_name}`,
            student_id: student.student_id,
            consecutive_days: consecutiveDays,
          });
        }
      }
    }

    return result;
  }
}
