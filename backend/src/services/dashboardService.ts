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
   * Helper to get the current date in Philippines Time (YYYY-MM-DD)
   */
  private static getPhDate(): string {
    return new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Manila",
    });
  }

  /**
   * Helper to check if a specific date is a valid school day
   * Returns false for Weekends (Sat/Sun) and Holidays/No-Class days in calendar
   */
  private static async isSchoolDay(dateStr: string): Promise<boolean> {
    // 1. Check if Weekend (Saturday or Sunday)
    // We create a date object and force PH timezone interpretation
    const dateObj = new Date(dateStr);
    // Note: getDay() depends on local time, so we must be careful.
    // Since dateStr is YYYY-MM-DD, new Date(dateStr) is UTC midnight.
    // But Sat/Sun are Sat/Sun in UTC too.
    const dayOfWeek = dateObj.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }

    // 2. Check School Calendar (if table has data)
    // If table is empty, we assume weekdays are school days.
    const { data: calendarDay } = await supabase
      .from("school_calendar")
      .select("is_school_day")
      .eq("calendar_date", dateStr)
      .single();

    if (calendarDay) {
      return calendarDay.is_school_day;
    }

    // Default to true for weekdays if no calendar entry
    return true;
  }

  /**
   * Get teacher's today summary for advisory class
   */
  static async getTeacherTodaySummary(
    teacher: Teacher,
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

      // Fetch Class Details
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

      // Get Total Students
      const { data: students } = await supabase
        .from("students")
        .select("id")
        .eq("level_id", teacher.advisory_level_id)
        .eq("specialization_id", teacher.advisory_specialization_id)
        .eq("section_id", teacher.advisory_section_id)
        .is("deleted_at", null);

      const totalStudents = students?.length || 0;

      // FIX: Check if Today is a School Day
      const today = this.getPhDate();
      const isSchoolDay = await this.isSchoolDay(today);

      // If it is NOT a school day (Saturday/Sunday), return 0 absences
      if (!isSchoolDay || totalStudents === 0) {
        return {
          advisory_class: advisoryClass,
          total_students: totalStudents,
          present_today: 0,
          absent_today: 0, // 0 Absences because no class
          late_today: 0,
          attendance_percentage: 0,
        };
      }

      // If it IS a school day, calculate attendance
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
   * Get teacher's notifications
   */
  static async getTeacherNotifications(
    teacher: Teacher,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    notifications: TeacherNotification[];
    pagination: {
      current_page: number;
      total_pages: number;
      total_records: number;
      per_page: number;
    };
  }> {
    try {
      // FIX: Only check for NEW notifications if today is a School Day
      // This prevents generating alerts on weekends
      const today = this.getPhDate();
      if (await this.isSchoolDay(today)) {
        await this.check70MinuteNotifications(teacher.auth_id);
        await this.checkConsecutiveAbsenceNotifications(teacher);
      }

      // Get total count
      const { count: totalCount } = await supabase
        .from("notifications")
        .select("id", { count: "exact" })
        .eq("teacher_id", teacher.auth_id);

      const totalRecords = totalCount || 0;
      const totalPages = Math.ceil(totalRecords / limit);
      const offset = (page - 1) * limit;

      const { data: notifications } = await supabase
        .from("notifications")
        .select("id, student_id, type, message, sent_at, status")
        .eq("teacher_id", teacher.auth_id)
        .order("sent_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (!notifications) {
        return {
          notifications: [],
          pagination: {
            current_page: page,
            total_pages: 0,
            total_records: 0,
            per_page: limit,
          },
        };
      }

      // Get student details for each notification
      const result: TeacherNotification[] = [];

      for (const notification of notifications) {
        const { data: student } = await supabase
          .from("students")
          .select("student_id, first_name, last_name")
          .eq("id", notification.student_id)
          .single();

        if (student) {
          let notificationType: "EXCEEDED_70_MINUTES" | "CONSECUTIVE_ABSENCE";
          let metadata: any = {};

          if (notification.message.includes("70-minute")) {
            notificationType = "EXCEEDED_70_MINUTES";
            const match = notification.message.match(/(\d+) minutes total/);
            metadata.total_late_minutes = match ? parseInt(match[1]) : 0;
          } else {
            notificationType = "CONSECUTIVE_ABSENCE";
            metadata.consecutive_days = 3;
          }

          result.push({
            id: notification.id,
            student_name: `${student.first_name} ${student.last_name}`,
            student_id: student.student_id,
            type: notificationType,
            message: notification.message,
            sent_at: new Date(notification.sent_at),
            status: (notification.status === "Read" ? "READ" : "UNREAD") as
              | "UNREAD"
              | "READ",
            metadata,
          });
        }
      }

      return {
        notifications: result,
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_records: totalRecords,
          per_page: limit,
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to get teacher notifications: ${error.message}`);
    }
  }

  /**
   * Get all students in advisory class with their attendance status
   */
  static async getStudentRecords(
    teacher: Teacher,
    filters: StudentRecordsFilter,
  ): Promise<StudentRecordsResponse> {
    try {
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

      let studentsQuery = supabase
        .from("students")
        .select("id, student_id, first_name, last_name, middle_name")
        .eq("level_id", teacher.advisory_level_id)
        .eq("specialization_id", teacher.advisory_specialization_id)
        .eq("section_id", teacher.advisory_section_id)
        .is("deleted_at", null);

      if (filters.student_id) {
        studentsQuery = studentsQuery.eq("id", filters.student_id);
      }

      const { data: allStudents } = await studentsQuery;

      if (!allStudents || allStudents.length === 0) {
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

      const today = this.getPhDate();
      const dateFrom = filters.date_from || today;
      const dateTo = filters.date_to || today;

      const { data: schoolDays, error: calendarError } = await supabase
        .from("school_calendar")
        .select("calendar_date")
        .gte("calendar_date", dateFrom)
        .lte("calendar_date", dateTo)
        .eq("is_school_day", true)
        .order("calendar_date");

      if (calendarError) {
        throw new Error("Failed to fetch school calendar");
      }

      const validDates = schoolDays?.map((day) => day.calendar_date) || [];
      if (validDates.length === 0) {
        const fallbackDates = [];
        for (
          let date = new Date(dateFrom);
          date <= new Date(dateTo);
          date.setDate(date.getDate() + 1)
        ) {
          const dayOfWeek = date.getDay();
          // Filter out weekends from fallback logic
          if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            fallbackDates.push(date.toISOString().split("T")[0]);
          }
        }
        validDates.push(...fallbackDates);
      }

      const studentIds = allStudents.map((s) => s.id);
      const { data: attendanceRecords } = await supabase
        .from("attendance_log")
        .select(
          "student_id, attendance_date, time_in, time_out, is_late, late_minutes",
        )
        .in("student_id", studentIds)
        .gte("attendance_date", dateFrom)
        .lte("attendance_date", dateTo)
        .is("deleted_at", null);

      const attendanceMap = new Map<string, any>();
      attendanceRecords?.forEach((record) => {
        const key = `${record.student_id}-${record.attendance_date}`;
        attendanceMap.set(key, record);
      });

      const allRecords: StudentRecord[] = [];

      for (const student of allStudents) {
        const studentName = [
          student.first_name,
          student.middle_name,
          student.last_name,
        ]
          .filter(Boolean)
          .join(" ");

        for (const dateStr of validDates) {
          const attendanceKey = `${student.id}-${dateStr}`;
          const attendanceRecord = attendanceMap.get(attendanceKey);

          let status: "PRESENT" | "LATE" | "ABSENT" = "ABSENT";
          let timeIn: string | undefined = undefined;
          let timeOut: string | undefined = undefined;
          let isLate = false;
          let lateMinutes = 0;
          let recordId = 0;

          if (attendanceRecord) {
            recordId = Date.now() + Math.random();
            timeIn = attendanceRecord.time_in;
            timeOut = attendanceRecord.time_out;
            isLate = attendanceRecord.is_late;
            lateMinutes = attendanceRecord.late_minutes || 0;
            status = isLate ? "LATE" : "PRESENT";
          }

          allRecords.push({
            id: recordId || Date.now() + Math.random(),
            student_name: studentName,
            student_id: student.student_id,
            attendance_date: new Date(dateStr),
            time_in: timeIn,
            time_out: timeOut,
            is_late: isLate,
            late_minutes: lateMinutes,
            status,
          });
        }
      }

      const startIndex = (filters.page - 1) * filters.limit;
      const endIndex = startIndex + filters.limit;
      const paginatedRecords = allRecords.slice(startIndex, endIndex);

      const totalRecords = allRecords.length;
      const totalPages = Math.ceil(totalRecords / filters.limit);

      return {
        records: paginatedRecords,
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

  static async markNotificationAsRead(
    notificationId: number,
    teacherId: string,
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({
          status: "Read",
          updated_at: new Date().toISOString(),
        })
        .eq("id", notificationId)
        .eq("teacher_id", teacherId);

      if (error) throw error;
    } catch (error: any) {
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  // Helper Methods

  private static async getAdvisoryStudentIds(
    teacher: Teacher,
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
    const today = this.getPhDate();

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
    studentIds: number[],
  ): Promise<
    Array<{
      name: string;
      student_id: string;
      consecutive_days: number;
    }>
  > {
    const result = [];

    // Consecutive logic
    for (const studentId of studentIds) {
      let consecutiveDays = 0;
      let checkDate = new Date();

      for (let i = 0; i < 7; i++) {
        // Force date interpretation to PH Time
        const dateStr = checkDate.toLocaleDateString("en-CA", {
          timeZone: "Asia/Manila",
        });

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
      const today = this.getPhDate();

      // FIX: Check if Today is a School Day
      const isSchoolDay = await this.isSchoolDay(today);

      const { data: allStudents } = await supabase
        .from("students")
        .select("id")
        .is("deleted_at", null);

      const totalStudents = allStudents?.length || 0;

      // If NOT a school day, return 0 for everything
      if (!isSchoolDay || totalStudents === 0) {
        return {
          total_students: totalStudents,
          present_today: 0,
          absent_today: 0, // No absentees on weekend
          late_today: 0,
          on_time_today: 0,
          attendance_percentage: 0,
          late_percentage: 0,
        };
      }

      // If IS a school day
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
        `Failed to get school attendance stats: ${error.message}`,
      );
    }
  }

  // (Remaining methods getSchoolStudentsStats, updateSchoolStartTime, etc. kept same,
  // just need to ensure they are inside the class)

  static async getSchoolStudentsStats(
    filters: SchoolStudentsFilter,
  ): Promise<SchoolStudentsStats> {
    // ... [Same implementation as previous file]
    // To save space I am not repeating unchanged large blocks,
    // but in your file make sure to keep getSchoolStudentsStats logic here.
    try {
      // Build base query
      let query = supabase
        .from("students")
        .select(
          `id, student_id, first_name, last_name, middle_name, level_id, specialization_id, section_id, adviser_id`,
          { count: "exact" },
        )
        .is("deleted_at", null);

      if (filters.level_id) query = query.eq("level_id", filters.level_id);
      if (filters.specialization_id)
        query = query.eq("specialization_id", filters.specialization_id);
      if (filters.section_id)
        query = query.eq("section_id", filters.section_id);
      if (filters.search) {
        query = query.or(
          `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,student_id.ilike.%${filters.search}%`,
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

          const attendanceSummary = await this.getStudentAttendanceSummary(
            student.id,
          );

          studentRecords.push({
            id: student.id,
            student_id: student.student_id,
            full_name: `${student.first_name} ${student.middle_name ? student.middle_name + " " : ""}${student.last_name}`,
            level: levelData.data?.level || 0,
            specialization:
              specializationData.data?.specialization_name || "Unknown",
            section: sectionData.data?.section_name || "Unknown",
            adviser_name: adviserData.data
              ? `${adviserData.data.first_name} ${adviserData.data.last_name}`
              : "No Adviser",
            attendance_summary: attendanceSummary,
          });
        }
      }

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

  static async updateSchoolStartTime(schoolStartTime: string): Promise<void> {
    try {
      const currentQuarter = await this.getCurrentQuarter();
      if (!currentQuarter) throw new Error("No active quarter found");
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

  static async getCurrentQuarterInfo(): Promise<CurrentQuarter | null> {
    try {
      const quarter = await this.getCurrentQuarter();
      if (!quarter) return null;
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

  static async getTeacherUnreadNotificationCount(
    teacher: Teacher,
  ): Promise<number> {
    try {
      // FIX: Only generate new notifications on school days
      const today = this.getPhDate();
      if (await this.isSchoolDay(today)) {
        await this.check70MinuteNotifications(teacher.auth_id);
        await this.checkConsecutiveAbsenceNotifications(teacher);
      }

      const { data, error, count } = await supabase
        .from("notifications")
        .select("id", { count: "exact" })
        .eq("teacher_id", teacher.auth_id)
        .neq("status", "Read");
      if (error) throw error;
      return count || 0;
    } catch (error: any) {
      console.error("Error getting unread notification count:", error);
      return 0;
    }
  }

  static async markAllNotificationsAsRead(teacherId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ status: "Read", updated_at: new Date().toISOString() })
        .eq("teacher_id", teacherId)
        .neq("status", "Read");
      if (error) throw error;
    } catch (error: any) {
      throw new Error(
        `Failed to mark all notifications as read: ${error.message}`,
      );
    }
  }

  // ... [Other helper methods kept same as previous context]

  private static async getStudentAttendanceSummary(studentId: number) {
    const currentQuarter = await this.getCurrentQuarter();
    if (!currentQuarter)
      return {
        present_days: 0,
        late_days: 0,
        absent_days: 0,
        total_late_minutes: 0,
        attendance_percentage: 0,
      };

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

    const quarterSchoolDays = await this.calculateSchoolDaysInPeriod(
      currentQuarter.start_date,
      currentQuarter.end_date,
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
    filters: SchoolStudentsFilter,
  ): Promise<Array<{ level: number; count: number }>> {
    let query = supabase
      .from("students")
      .select("level_id")
      .is("deleted_at", null);
    if (filters.specialization_id)
      query = query.eq("specialization_id", filters.specialization_id);
    if (filters.section_id) query = query.eq("section_id", filters.section_id);
    if (filters.search)
      query = query.or(
        `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,student_id.ilike.%${filters.search}%`,
      );
    const { data: studentData } = await query;
    if (!studentData || studentData.length === 0) return [];
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
    filters: SchoolStudentsFilter,
  ): Promise<Array<{ specialization: string; count: number }>> {
    let query = supabase
      .from("students")
      .select("specialization_id")
      .is("deleted_at", null);
    if (filters.level_id) query = query.eq("level_id", filters.level_id);
    if (filters.section_id) query = query.eq("section_id", filters.section_id);
    if (filters.search)
      query = query.or(
        `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,student_id.ilike.%${filters.search}%`,
      );
    const { data: studentData } = await query;
    if (!studentData || studentData.length === 0) return [];
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
    filters: SchoolStudentsFilter,
  ): Promise<Array<{ section: string; count: number }>> {
    let query = supabase
      .from("students")
      .select("section_id")
      .is("deleted_at", null);
    if (filters.level_id) query = query.eq("level_id", filters.level_id);
    if (filters.specialization_id)
      query = query.eq("specialization_id", filters.specialization_id);
    if (filters.search)
      query = query.or(
        `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,student_id.ilike.%${filters.search}%`,
      );
    const { data: studentData } = await query;
    if (!studentData || studentData.length === 0) return [];
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
    if (filters.level_id) query = query.eq("level_id", filters.level_id);
    if (filters.specialization_id)
      query = query.eq("specialization_id", filters.specialization_id);
    if (filters.section_id) query = query.eq("section_id", filters.section_id);
    if (filters.search)
      query = query.or(
        `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,student_id.ilike.%${filters.search}%`,
      );
    const { count } = await query;
    return count || 0;
  }

  private static async calculateSchoolDaysInPeriod(
    startDate: string,
    endDate: string,
  ): Promise<number> {
    const { data: calendarDays, error } = await supabase
      .from("school_calendar")
      .select("calendar_date, is_school_day")
      .gte("calendar_date", startDate)
      .lte("calendar_date", endDate);
    if (error || !calendarDays || calendarDays.length === 0)
      return this.calculateSchoolDaysInPeriodFallback(startDate, endDate);
    return calendarDays.filter((day) => day.is_school_day).length;
  }

  private static calculateSchoolDaysInPeriodFallback(
    startDate: string,
    endDate: string,
  ): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let schoolDays = 0;
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) schoolDays++;
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return schoolDays;
  }

  private static async check70MinuteNotifications(
    teacherId: string,
  ): Promise<void> {
    try {
      const quarter = await this.getCurrentQuarter();
      if (!quarter) return;
      const { data: lateTrackingRecords } = await supabase
        .from("student_late_tracking")
        .select("student_id, total_late_minutes")
        .eq("quarter_id", quarter.id)
        .gte("total_late_minutes", 70)
        .eq("notification_sent", false);
      if (!lateTrackingRecords || lateTrackingRecords.length === 0) return;
      for (const record of lateTrackingRecords) {
        const { data: student } = await supabase
          .from("students")
          .select("id, first_name, last_name, student_id, adviser_id")
          .eq("id", record.student_id)
          .eq("adviser_id", teacherId)
          .single();
        if (student) {
          const message = `${student.first_name} ${student.last_name} has exceeded the 70-minute late limit with ${record.total_late_minutes} minutes total.`;
          await supabase
            .from("notifications")
            .insert({
              student_id: student.id,
              teacher_id: teacherId,
              type: "Alert",
              message,
              sent_at: new Date().toISOString(),
              status: "Sent",
            });
          await supabase
            .from("student_late_tracking")
            .update({ notification_sent: true })
            .eq("student_id", record.student_id)
            .eq("quarter_id", quarter.id);
        }
      }
    } catch (error) {
      console.error("Error checking 70-minute notifications:", error);
    }
  }

  private static async checkConsecutiveAbsenceNotifications(
    teacher: Teacher,
  ): Promise<void> {
    try {
      const advisoryStudents = await this.getAdvisoryStudentIds(teacher);
      if (advisoryStudents.length === 0) return;
      for (const studentId of advisoryStudents) {
        const lastThreeSchoolDays = await this.getLastSchoolDays(3);
        const { data: attendanceRecords } = await supabase
          .from("attendance_log")
          .select("attendance_date")
          .eq("student_id", studentId)
          .in("attendance_date", lastThreeSchoolDays)
          .is("deleted_at", null);
        const attendedDays =
          attendanceRecords?.map((r) => r.attendance_date) || [];
        const absentDays = lastThreeSchoolDays.filter(
          (day) => !attendedDays.includes(day),
        );
        if (absentDays.length === 3) {
          const { data: existingNotification } = await supabase
            .from("notifications")
            .select("id")
            .eq("student_id", studentId)
            .eq("teacher_id", teacher.auth_id)
            .eq("type", "Alert")
            .like("message", "%consecutive%")
            .gte("sent_at", `${lastThreeSchoolDays[0]}T00:00:00`)
            .single();
          if (!existingNotification) {
            const { data: student } = await supabase
              .from("students")
              .select("first_name, last_name, student_id")
              .eq("id", studentId)
              .single();
            if (student) {
              const message = `${student.first_name} ${student.last_name} has been absent for 3 consecutive school days.`;
              await supabase
                .from("notifications")
                .insert({
                  student_id: studentId,
                  teacher_id: teacher.auth_id,
                  type: "Alert",
                  message,
                  sent_at: new Date().toISOString(),
                  status: "Sent",
                });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error checking consecutive absence notifications:", error);
    }
  }

  private static async getLastSchoolDays(count: number): Promise<string[]> {
    const schoolDays: string[] = [];
    let currentDate = new Date();
    while (schoolDays.length < count) {
      currentDate.setDate(currentDate.getDate() - 1);
      const phDateStr = currentDate.toLocaleDateString("en-CA", {
        timeZone: "Asia/Manila",
      });
      const phDate = new Date(phDateStr);
      const dayOfWeek = phDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const { data: calendarEntry } = await supabase
          .from("school_calendar")
          .select("is_school_day")
          .eq("calendar_date", phDateStr)
          .single();
        if (!calendarEntry || calendarEntry.is_school_day) {
          schoolDays.unshift(phDateStr);
        }
      }
    }
    return schoolDays;
  }
}
