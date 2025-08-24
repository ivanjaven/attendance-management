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
   * Get teacher's notifications
   */
  static async getTeacherNotifications(
    teacher: Teacher
  ): Promise<TeacherNotification[]> {
    try {
      // First, check and create new notifications
      await this.check70MinuteNotifications(teacher.auth_id);
      await this.checkConsecutiveAbsenceNotifications(teacher);

      // Then fetch all existing notifications for today
      const today = new Date().toISOString().split("T")[0];

      const { data: notifications } = await supabase
        .from("notifications")
        .select("id, student_id, type, message, sent_at, status")
        .eq("teacher_id", teacher.auth_id)
        .gte("sent_at", `${today}T00:00:00`)
        .order("sent_at", { ascending: false });

      if (!notifications) return [];

      // Get student details separately
      const result: TeacherNotification[] = [];

      for (const notification of notifications) {
        const { data: student } = await supabase
          .from("students")
          .select("student_id, first_name, last_name")
          .eq("id", notification.student_id)
          .single();

        if (student) {
          // Determine notification type from message content
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

      return result;
    } catch (error: any) {
      throw new Error(`Failed to get teacher notifications: ${error.message}`);
    }
  }

  /**
   * Get all students in advisory class with their attendance status
   * This will show ALL students including absent ones
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

      // Get all students in the advisory class
      let studentsQuery = supabase
        .from("students")
        .select("id, student_id, first_name, last_name, middle_name")
        .eq("level_id", teacher.advisory_level_id)
        .eq("specialization_id", teacher.advisory_specialization_id)
        .eq("section_id", teacher.advisory_section_id)
        .is("deleted_at", null);

      // Apply student filter if specified
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

      // Set up date range (default to today if no filters)
      const today = new Date().toISOString().split("T")[0];
      const dateFrom = filters.date_from || today;
      const dateTo = filters.date_to || today;

      // Get all attendance records for these students in the date range
      const studentIds = allStudents.map((s) => s.id);
      const { data: attendanceRecords } = await supabase
        .from("attendance_log")
        .select(
          "student_id, attendance_date, time_in, time_out, is_late, late_minutes"
        )
        .in("student_id", studentIds)
        .gte("attendance_date", dateFrom)
        .lte("attendance_date", dateTo)
        .is("deleted_at", null);

      // Create a map of attendance records by student and date
      const attendanceMap = new Map<string, any>();
      attendanceRecords?.forEach((record) => {
        const key = `${record.student_id}-${record.attendance_date}`;
        attendanceMap.set(key, record);
      });

      // Generate all date-student combinations
      const allRecords: StudentRecord[] = [];
      const startDate = new Date(dateFrom);
      const endDate = new Date(dateTo);

      for (const student of allStudents) {
        const studentName = [
          student.first_name,
          student.middle_name,
          student.last_name,
        ]
          .filter(Boolean)
          .join(" ");

        // Generate records for each date in the range
        for (
          let date = new Date(startDate);
          date <= endDate;
          date.setDate(date.getDate() + 1)
        ) {
          const dateStr = date.toISOString().split("T")[0];
          const attendanceKey = `${student.id}-${dateStr}`;
          const attendanceRecord = attendanceMap.get(attendanceKey);

          let status: "PRESENT" | "LATE" | "ABSENT" = "ABSENT";
          let timeIn: string | undefined = undefined;
          let timeOut: string | undefined = undefined;
          let isLate = false;
          let lateMinutes = 0;
          let recordId = 0;

          if (attendanceRecord) {
            recordId = Date.now() + Math.random(); // Generate unique ID
            timeIn = attendanceRecord.time_in;
            timeOut = attendanceRecord.time_out;
            isLate = attendanceRecord.is_late;
            lateMinutes = attendanceRecord.late_minutes || 0;
            status = isLate ? "LATE" : "PRESENT";
          } else {
            // Create a unique ID for absent records
            recordId = Date.now() + Math.random();
          }

          allRecords.push({
            id: recordId,
            student_name: studentName,
            student_id: student.student_id,
            attendance_date: new Date(dateStr),
            time_in: timeIn,
            time_out: timeOut,
            is_late: isLate,
            late_minutes: lateMinutes,
            status: status,
          });
        }
      }

      // Sort records by date (newest first) then by student name
      allRecords.sort((a, b) => {
        const dateCompare =
          new Date(b.attendance_date).getTime() -
          new Date(a.attendance_date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return a.student_name.localeCompare(b.student_name);
      });

      // Apply pagination to the final records
      const totalRecords = allRecords.length;
      const startIndex = (filters.page - 1) * filters.limit;
      const endIndex = startIndex + filters.limit;
      const paginatedRecords = allRecords.slice(startIndex, endIndex);

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

  /**
   * Check and create 70-minute exceeded notifications
   */
  private static async check70MinuteNotifications(
    teacherId: string
  ): Promise<void> {
    try {
      // Get current quarter
      const quarter = await this.getCurrentQuarter();
      if (!quarter) return;

      // Find students who exceeded 70 minutes but haven't been notified
      const { data: lateTrackingRecords } = await supabase
        .from("student_late_tracking")
        .select("student_id, total_late_minutes")
        .eq("quarter_id", quarter.id)
        .gte("total_late_minutes", 70)
        .eq("notification_sent", false);

      if (!lateTrackingRecords || lateTrackingRecords.length === 0) return;

      // Check each student belongs to this teacher and create notifications
      for (const record of lateTrackingRecords) {
        // Get student info and check if they belong to this teacher
        const { data: student } = await supabase
          .from("students")
          .select("id, first_name, last_name, student_id, adviser_id")
          .eq("id", record.student_id)
          .eq("adviser_id", teacherId)
          .single();

        if (student) {
          const message = `${student.first_name} ${student.last_name} has exceeded the 70-minute late limit with ${record.total_late_minutes} minutes total.`;

          // Insert notification
          await supabase.from("notifications").insert({
            student_id: student.id,
            teacher_id: teacherId,
            type: "Alert",
            message,
            sent_at: new Date().toISOString(),
            status: "Sent",
          });

          // Mark as notified
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

  /**
   * Check and create 3-consecutive-day absence notifications
   */
  private static async checkConsecutiveAbsenceNotifications(
    teacher: Teacher
  ): Promise<void> {
    try {
      // Get teacher's advisory students
      const advisoryStudents = await this.getAdvisoryStudentIds(teacher);
      if (advisoryStudents.length === 0) return;

      // Check each student's last 3 school days
      for (const studentId of advisoryStudents) {
        const lastThreeSchoolDays = await this.getLastSchoolDays(3);

        // Check if student was absent all 3 days
        const { data: attendanceRecords } = await supabase
          .from("attendance_log")
          .select("attendance_date")
          .eq("student_id", studentId)
          .in("attendance_date", lastThreeSchoolDays)
          .is("deleted_at", null);

        const attendedDays =
          attendanceRecords?.map((r) => r.attendance_date) || [];
        const absentDays = lastThreeSchoolDays.filter(
          (day) => !attendedDays.includes(day)
        );

        // If absent all 3 days, check if notification already sent
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
            // Get student info
            const { data: student } = await supabase
              .from("students")
              .select("first_name, last_name, student_id")
              .eq("id", studentId)
              .single();

            if (student) {
              const message = `${student.first_name} ${student.last_name} has been absent for 3 consecutive school days.`;

              await supabase.from("notifications").insert({
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

  /**
   * Get last N school days (excluding weekends and holidays)
   */
  private static async getLastSchoolDays(count: number): Promise<string[]> {
    const schoolDays: string[] = [];
    let currentDate = new Date();

    while (schoolDays.length < count) {
      currentDate.setDate(currentDate.getDate() - 1);
      const dayOfWeek = currentDate.getDay();

      // Skip weekends (Sunday = 0, Saturday = 6)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const dateStr = currentDate.toISOString().split("T")[0];

        // Check if it's a school day (if you have school_calendar data)
        const { data: calendarEntry } = await supabase
          .from("school_calendar")
          .select("is_school_day")
          .eq("calendar_date", dateStr)
          .single();

        // If no calendar entry, assume it's a school day
        if (!calendarEntry || calendarEntry.is_school_day) {
          schoolDays.unshift(dateStr); // Add to beginning to maintain chronological order
        }
      }
    }

    return schoolDays;
  }
}
