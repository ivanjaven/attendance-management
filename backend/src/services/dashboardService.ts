import { supabase } from "../config/database";
import { Teacher } from "../types/auth";
import {
  TeacherTodaySummary,
  TeacherNotification,
  StudentRecord,
  StudentRecordsResponse,
  StudentRecordsFilter,
  SchoolAttendanceStats,
  SchoolStudentsStats,
  SchoolStudentsFilter,
  SchoolStudentRecord,
  CurrentQuarter,
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

  /**
   * Get school-wide attendance stats for today (Admin & Staff)
   */
  static async getSchoolAttendanceStats(): Promise<SchoolAttendanceStats> {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Get total students count
      const { data: allStudents } = await supabase
        .from("students")
        .select("id")
        .is("deleted_at", null);

      const totalStudents = allStudents?.length || 0;

      if (totalStudents === 0) {
        return {
          total_students: 0,
          present_today: 0,
          absent_today: 0,
          late_today: 0,
          on_time_today: 0,
          attendance_percentage: 0,
          late_percentage: 0,
        };
      }

      // Get today's attendance
      const { data: todayAttendance } = await supabase
        .from("attendance_log")
        .select("id, is_late")
        .eq("attendance_date", today)
        .is("deleted_at", null);

      const presentToday = todayAttendance?.length || 0;
      const absentToday = totalStudents - presentToday;
      const lateToday =
        todayAttendance?.filter((log) => log.is_late).length || 0;
      const onTimeToday = presentToday - lateToday;

      const attendancePercentage =
        totalStudents > 0
          ? Math.round((presentToday / totalStudents) * 100)
          : 0;

      const latePercentage =
        presentToday > 0 ? Math.round((lateToday / presentToday) * 100) : 0;

      return {
        total_students: totalStudents,
        present_today: presentToday,
        absent_today: absentToday,
        late_today: lateToday,
        on_time_today: onTimeToday,
        attendance_percentage: attendancePercentage,
        late_percentage: latePercentage,
      };
    } catch (error: any) {
      throw new Error(
        `Failed to get school attendance stats: ${error.message}`
      );
    }
  }

  /**
   * Get all school students stats with filters (Admin only)
   */
  static async getSchoolStudentsStats(
    filters: SchoolStudentsFilter
  ): Promise<SchoolStudentsStats> {
    try {
      // Build base query
      let query = supabase
        .from("students")
        .select(
          `
          id,
          student_id,
          first_name,
          last_name,
          middle_name,
          level_id,
          specialization_id,
          section_id,
          adviser_id
        `,
          { count: "exact" }
        )
        .is("deleted_at", null);

      if (filters.level_id) {
        query = query.eq("level_id", filters.level_id);
      }
      if (filters.specialization_id) {
        query = query.eq("specialization_id", filters.specialization_id);
      }
      if (filters.section_id) {
        query = query.eq("section_id", filters.section_id);
      }
      if (filters.search) {
        query = query.or(
          `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,student_id.ilike.%${filters.search}%`
        );
      }

      const offset = (filters.page - 1) * filters.limit;
      query = query
        .order("last_name", { ascending: true })
        .range(offset, offset + filters.limit - 1);

      const { data: students, error, count } = await query;
      if (error) throw error;

      const studentRecords: SchoolStudentRecord[] = [];

      if (students && students.length > 0) {
        for (const student of students) {
          const [levelData, specializationData, sectionData, adviserData] =
            await Promise.all([
              supabase
                .from("levels")
                .select("level")
                .eq("id", student.level_id)
                .single(),
              supabase
                .from("specializations")
                .select("specialization_name")
                .eq("id", student.specialization_id)
                .single(),
              supabase
                .from("sections")
                .select("section_name")
                .eq("id", student.section_id)
                .single(),
              supabase
                .from("teachers")
                .select("first_name, last_name")
                .eq("id", student.adviser_id)
                .single(),
            ]);

          // Get attendance summary for current quarter
          const attendanceSummary = await this.getStudentAttendanceSummary(
            student.id
          );

          const fullName = `${student.first_name} ${
            student.middle_name ? student.middle_name + " " : ""
          }${student.last_name}`;
          const adviserName = adviserData.data
            ? `${adviserData.data.first_name} ${adviserData.data.last_name}`
            : "No Adviser";

          studentRecords.push({
            id: student.id,
            student_id: student.student_id,
            full_name: fullName,
            level: levelData.data?.level || 0,
            specialization:
              specializationData.data?.specialization_name || "Unknown",
            section: sectionData.data?.section_name || "Unknown",
            adviser_name: adviserName,
            attendance_summary: attendanceSummary,
          });
        }
      }

      // Get summary stats
      const summary = await this.getSchoolStudentsSummary(filters);

      const totalRecords = count || 0;
      const totalPages = Math.ceil(totalRecords / filters.limit);

      return {
        students: studentRecords,
        pagination: {
          current_page: filters.page,
          total_pages: totalPages,
          total_records: totalRecords,
          per_page: filters.limit,
        },
        summary,
      };
    } catch (error: any) {
      throw new Error(`Failed to get school students stats: ${error.message}`);
    }
  }

  /**
   * Update school start time for current quarter (Admin only)
   */
  static async updateSchoolStartTime(schoolStartTime: string): Promise<void> {
    try {
      const currentQuarter = await this.getCurrentQuarter();

      if (!currentQuarter) {
        throw new Error("No active quarter found");
      }

      const { error } = await supabase
        .from("quarters")
        .update({
          school_start_time: schoolStartTime,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentQuarter.id);

      if (error) throw error;
    } catch (error: any) {
      throw new Error(`Failed to update school start time: ${error.message}`);
    }
  }

  /**
   * Get current quarter info (Admin only)
   */
  static async getCurrentQuarterInfo(): Promise<CurrentQuarter | null> {
    try {
      const quarter = await this.getCurrentQuarter();

      if (!quarter) {
        return null;
      }

      return {
        id: quarter.id,
        quarter_name: quarter.quarter_name,
        start_date: quarter.start_date,
        end_date: quarter.end_date,
        school_start_time: quarter.school_start_time,
      };
    } catch (error: any) {
      throw new Error(`Failed to get current quarter info: ${error.message}`);
    }
  }

  // Private helper methods for admin/staff functionality
  private static async getStudentAttendanceSummary(studentId: number) {
    const currentQuarter = await this.getCurrentQuarter();

    if (!currentQuarter) {
      return {
        present_days: 0,
        late_days: 0,
        absent_days: 0,
        total_late_minutes: 0,
        attendance_percentage: 0,
      };
    }

    // Get attendance data for current quarter
    const { data: attendance } = await supabase
      .from("attendance_log")
      .select("id, is_late, late_minutes")
      .eq("student_id", studentId)
      .gte("attendance_date", currentQuarter.start_date)
      .lte("attendance_date", currentQuarter.end_date)
      .is("deleted_at", null);

    const presentDays = attendance?.length || 0;
    const lateDays = attendance?.filter((a) => a.is_late).length || 0;
    const totalLateMinutes =
      attendance?.reduce((sum, a) => sum + a.late_minutes, 0) || 0;

    // Calculate school days in quarter (simple weekday count)
    const quarterSchoolDays = this.calculateSchoolDaysInPeriod(
      currentQuarter.start_date,
      currentQuarter.end_date
    );

    const absentDays = Math.max(0, quarterSchoolDays - presentDays);
    const attendancePercentage =
      quarterSchoolDays > 0
        ? Math.round((presentDays / quarterSchoolDays) * 100)
        : 0;

    return {
      present_days: presentDays,
      late_days: lateDays,
      absent_days: absentDays,
      total_late_minutes: totalLateMinutes,
      attendance_percentage: attendancePercentage,
    };
  }

  private static async getSchoolStudentsSummary(filters: SchoolStudentsFilter) {
    // Get total counts by level, specialization, section
    const [levelCounts, specializationCounts, sectionCounts, totalCount] =
      await Promise.all([
        this.getLevelCounts(filters),
        this.getSpecializationCounts(filters),
        this.getSectionCounts(filters),
        this.getTotalStudentsCount(filters),
      ]);

    return {
      total_students: totalCount,
      by_level: levelCounts,
      by_specialization: specializationCounts,
      by_section: sectionCounts,
    };
  }

  private static async getLevelCounts(
    filters: SchoolStudentsFilter
  ): Promise<Array<{ level: number; count: number }>> {
    let query = supabase
      .from("students")
      .select("level_id")
      .is("deleted_at", null);

    // Apply filters (excluding level_id since we're counting by level)
    if (filters.specialization_id) {
      query = query.eq("specialization_id", filters.specialization_id);
    }
    if (filters.section_id) {
      query = query.eq("section_id", filters.section_id);
    }
    if (filters.search) {
      query = query.or(
        `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,student_id.ilike.%${filters.search}%`
      );
    }

    const { data: studentData } = await query;

    if (!studentData || studentData.length === 0) {
      return [];
    }

    const uniqueLevelIds = [
      ...new Set(studentData.map((item) => item.level_id)),
    ];

    const { data: levelData } = await supabase
      .from("levels")
      .select("id, level")
      .in("id", uniqueLevelIds);

    const counts: { [key: number]: number } = {};
    studentData.forEach((item) => {
      counts[item.level_id] = (counts[item.level_id] || 0) + 1;
    });

    return (
      levelData?.map((level) => ({
        level: level.level,
        count: counts[level.id] || 0,
      })) || []
    );
  }

  private static async getSpecializationCounts(
    filters: SchoolStudentsFilter
  ): Promise<Array<{ specialization: string; count: number }>> {
    let query = supabase
      .from("students")
      .select("specialization_id")
      .is("deleted_at", null);

    // Apply filters (excluding specialization_id since we're counting by specialization)
    if (filters.level_id) {
      query = query.eq("level_id", filters.level_id);
    }
    if (filters.section_id) {
      query = query.eq("section_id", filters.section_id);
    }
    if (filters.search) {
      query = query.or(
        `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,student_id.ilike.%${filters.search}%`
      );
    }

    const { data: studentData } = await query;

    if (!studentData || studentData.length === 0) {
      return [];
    }

    const uniqueSpecializationIds = [
      ...new Set(studentData.map((item) => item.specialization_id)),
    ];

    const { data: specializationData } = await supabase
      .from("specializations")
      .select("id, specialization_name")
      .in("id", uniqueSpecializationIds);

    const counts: { [key: number]: number } = {};
    studentData.forEach((item) => {
      counts[item.specialization_id] =
        (counts[item.specialization_id] || 0) + 1;
    });

    return (
      specializationData?.map((specialization) => ({
        specialization: specialization.specialization_name,
        count: counts[specialization.id] || 0,
      })) || []
    );
  }

  private static async getSectionCounts(
    filters: SchoolStudentsFilter
  ): Promise<Array<{ section: string; count: number }>> {
    let query = supabase
      .from("students")
      .select("section_id")
      .is("deleted_at", null);

    if (filters.level_id) {
      query = query.eq("level_id", filters.level_id);
    }
    if (filters.specialization_id) {
      query = query.eq("specialization_id", filters.specialization_id);
    }
    if (filters.search) {
      query = query.or(
        `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,student_id.ilike.%${filters.search}%`
      );
    }

    const { data: studentData } = await query;

    if (!studentData || studentData.length === 0) {
      return [];
    }

    const uniqueSectionIds = [
      ...new Set(studentData.map((item) => item.section_id)),
    ];

    const { data: sectionData } = await supabase
      .from("sections")
      .select("id, section_name")
      .in("id", uniqueSectionIds);

    const counts: { [key: number]: number } = {};
    studentData.forEach((item) => {
      counts[item.section_id] = (counts[item.section_id] || 0) + 1;
    });

    return (
      sectionData?.map((section) => ({
        section: section.section_name,
        count: counts[section.id] || 0,
      })) || []
    );
  }

  private static async getTotalStudentsCount(filters: SchoolStudentsFilter) {
    let query = supabase
      .from("students")
      .select("id", { count: "exact" })
      .is("deleted_at", null);

    if (filters.level_id) {
      query = query.eq("level_id", filters.level_id);
    }
    if (filters.specialization_id) {
      query = query.eq("specialization_id", filters.specialization_id);
    }
    if (filters.section_id) {
      query = query.eq("section_id", filters.section_id);
    }
    if (filters.search) {
      query = query.or(
        `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,student_id.ilike.%${filters.search}%`
      );
    }

    const { count } = await query;
    return count || 0;
  }

  private static calculateSchoolDaysInPeriod(
    startDate: string,
    endDate: string
  ): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let schoolDays = 0;
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      // Monday = 1, Friday = 5 (excluding weekends)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        schoolDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return schoolDays;
  }
}
