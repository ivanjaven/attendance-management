import { supabase } from "../config/database";
import {
  QRScanRequest,
  Student,
  AttendanceLog,
  Quarter,
  StudentLateTracking,
  NotificationInput,
} from "../types/attendance";

export class AttendanceService {
  /**
   * Process QR scan with automatic time-in/time-out detection and late tracking
   */
  static async processQRScan(scanData: QRScanRequest): Promise<{
    student: Student;
    attendanceLog: AttendanceLog;
    isLate: boolean;
    action: "time_in" | "time_out";
    lateMinutes?: number;
    totalLateMinutes?: number;
    notificationTriggered?: boolean;
  }> {
    try {
      const student = await this.findStudentByQRToken(scanData.qr_token);
      if (!student) {
        throw new Error("Invalid QR code or student not found");
      }

      const today = new Date().toISOString().split("T")[0];
      const existingLog = await this.getAttendanceLogForDate(student.id, today);

      if (!existingLog || !existingLog.time_in) {
        return await this.processTimeIn(student, today, existingLog);
      } else if (existingLog.time_in && !existingLog.time_out) {
        return await this.processTimeOut(student, existingLog);
      } else {
        throw new Error("Student has already completed attendance for today");
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get current active quarter
   */
  private static async getCurrentQuarter(): Promise<Quarter | null> {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("quarters")
      .select("*")
      .lte("start_date", today)
      .gte("end_date", today)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      quarter_name: data.quarter_name,
      start_date: new Date(data.start_date),
      end_date: new Date(data.end_date),
      school_start_time: data.school_start_time,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }

  /**
   * Calculate late minutes
   */
  private static calculateLateMinutes(
    timeIn: string,
    schoolStartTime: string
  ): number {
    if (timeIn <= schoolStartTime) return 0;

    const [timeInHours, timeInMinutes] = timeIn.split(":").map(Number);
    const [startHours, startMinutes] = schoolStartTime.split(":").map(Number);

    const timeInTotalMinutes = timeInHours * 60 + timeInMinutes;
    const startTotalMinutes = startHours * 60 + startMinutes;

    return Math.max(0, timeInTotalMinutes - startTotalMinutes);
  }

  /**
   * Update student late tracking
   */
  private static async updateLateTracking(
    studentId: number,
    quarterId: number,
    lateMinutes: number
  ): Promise<{ totalLateMinutes: number; notificationTriggered: boolean }> {
    // Insert or update late tracking record
    const { data, error } = await supabase
      .from("student_late_tracking")
      .upsert(
        {
          student_id: studentId,
          quarter_id: quarterId,
          total_late_minutes: lateMinutes,
        },
        {
          onConflict: "student_id,quarter_id",
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) {
      // If upsert failed, try to update existing record
      const { data: existingData } = await supabase
        .from("student_late_tracking")
        .select("total_late_minutes, notification_sent")
        .eq("student_id", studentId)
        .eq("quarter_id", quarterId)
        .single();

      if (existingData) {
        const newTotal = existingData.total_late_minutes + lateMinutes;
        const { data: updatedData } = await supabase
          .from("student_late_tracking")
          .update({
            total_late_minutes: newTotal,
            last_updated: new Date().toISOString(),
          })
          .eq("student_id", studentId)
          .eq("quarter_id", quarterId)
          .select()
          .single();

        return {
          totalLateMinutes: newTotal,
          notificationTriggered: await this.checkAndSendNotification(
            studentId,
            quarterId,
            newTotal,
            existingData.notification_sent
          ),
        };
      }
    }

    if (data) {
      return {
        totalLateMinutes: data.total_late_minutes,
        notificationTriggered: await this.checkAndSendNotification(
          studentId,
          quarterId,
          data.total_late_minutes,
          data.notification_sent
        ),
      };
    }

    return { totalLateMinutes: lateMinutes, notificationTriggered: false };
  }

  /**
   * Check threshold and send notification if needed
   */
  private static async checkAndSendNotification(
    studentId: number,
    quarterId: number,
    totalLateMinutes: number,
    notificationSent: boolean
  ): Promise<boolean> {
    if (totalLateMinutes >= 70 && !notificationSent) {
      await this.sendLateNotification(studentId, totalLateMinutes);

      // Mark notification as sent
      await supabase
        .from("student_late_tracking")
        .update({ notification_sent: true })
        .eq("student_id", studentId)
        .eq("quarter_id", quarterId);

      return true;
    }
    return false;
  }

  /**
   * Send late notification to teacher
   */
  private static async sendLateNotification(
    studentId: number,
    totalLateMinutes: number
  ): Promise<void> {
    // Get student and adviser info
    const { data: studentData } = await supabase
      .from("students")
      .select("first_name, last_name, adviser_id")
      .eq("id", studentId)
      .single();

    if (studentData && studentData.adviser_id) {
      const message = `${studentData.first_name} ${studentData.last_name} has exceeded the 70-minute late limit with ${totalLateMinutes} total minutes this quarter.`;

      await supabase.from("notifications").insert({
        student_id: studentId,
        teacher_id: studentData.adviser_id,
        type: "Alert",
        message,
        sent_at: new Date().toISOString(),
        status: "Sent",
      });
    }
  }

  /**
   * Process time-in scan
   */
  private static async processTimeIn(
    student: Student,
    date: string,
    existingLog?: AttendanceLog | null
  ): Promise<{
    student: Student;
    attendanceLog: AttendanceLog;
    isLate: boolean;
    action: "time_in";
    lateMinutes?: number;
    totalLateMinutes?: number;
    notificationTriggered?: boolean;
  }> {
    const now = new Date();
    const philippineTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Manila" })
    );
    const currentTime = philippineTime.toTimeString().split(" ")[0];

    const quarter = await this.getCurrentQuarter();
    if (!quarter) {
      throw new Error("No active quarter found");
    }

    const schoolStartTime = quarter.school_start_time;
    const isLate = currentTime > schoolStartTime;
    const lateMinutes = isLate
      ? this.calculateLateMinutes(currentTime, schoolStartTime)
      : 0;

    const attendanceLog = existingLog
      ? await this.updateAttendanceLog(existingLog.id, {
          time_in: currentTime,
          is_late: isLate,
          late_minutes: lateMinutes,
        })
      : await this.createAttendanceLog({
          student_id: student.id,
          attendance_date: new Date(date),
          time_in: currentTime,
          is_late: isLate,
          late_minutes: lateMinutes,
        });

    let totalLateMinutes: number | undefined;
    let notificationTriggered: boolean | undefined;

    if (isLate && lateMinutes > 0) {
      const trackingResult = await this.updateLateTracking(
        student.id,
        quarter.id,
        lateMinutes
      );
      totalLateMinutes = trackingResult.totalLateMinutes;
      notificationTriggered = trackingResult.notificationTriggered;
    }

    return {
      student,
      attendanceLog,
      isLate,
      action: "time_in",
      lateMinutes: lateMinutes > 0 ? lateMinutes : undefined,
      totalLateMinutes,
      notificationTriggered,
    };
  }

  /**
   * Process time-out scan
   */
  private static async processTimeOut(
    student: Student,
    existingLog: AttendanceLog
  ): Promise<{
    student: Student;
    attendanceLog: AttendanceLog;
    isLate: boolean;
    action: "time_out";
  }> {
    const now = new Date();
    const philippineTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Manila" })
    );
    const currentTime = philippineTime.toTimeString().split(" ")[0];

    const attendanceLog = await this.updateAttendanceLog(existingLog.id, {
      time_out: currentTime,
    });

    return {
      student,
      attendanceLog,
      isLate: existingLog.is_late,
      action: "time_out",
    };
  }

  /**
   * Find student by QR token
   */
  private static async findStudentByQRToken(
    qrToken: string
  ): Promise<Student | null> {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("qr_token", qrToken)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      student_id: data.student_id,
      qr_token: data.qr_token,
      first_name: data.first_name,
      last_name: data.last_name,
      middle_name: data.middle_name,
      level_id: data.level_id,
      specialization_id: data.specialization_id,
      section_id: data.section_id,
      adviser_id: data.adviser_id,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }

  /**
   * Get attendance log for specific date
   */
  private static async getAttendanceLogForDate(
    studentId: number,
    date: string
  ): Promise<AttendanceLog | null> {
    const { data, error } = await supabase
      .from("attendance_log")
      .select("*")
      .eq("student_id", studentId)
      .eq("attendance_date", date)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      student_id: data.student_id,
      attendance_date: new Date(data.attendance_date),
      time_in: data.time_in,
      time_out: data.time_out,
      is_late: data.is_late,
      late_minutes: data.late_minutes || 0,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }

  /**
   * Create new attendance log
   */
  private static async createAttendanceLog(logData: {
    student_id: number;
    attendance_date: Date;
    time_in: string;
    is_late: boolean;
    late_minutes: number;
  }): Promise<AttendanceLog> {
    const { data, error } = await supabase
      .from("attendance_log")
      .insert({
        student_id: logData.student_id,
        attendance_date: logData.attendance_date.toISOString().split("T")[0],
        time_in: logData.time_in,
        is_late: logData.is_late,
        late_minutes: logData.late_minutes,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error("Failed to create attendance log");
    }

    return {
      id: data.id,
      student_id: data.student_id,
      attendance_date: new Date(data.attendance_date),
      time_in: data.time_in,
      time_out: data.time_out,
      is_late: data.is_late,
      late_minutes: data.late_minutes || 0,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }

  /**
   * Update existing attendance log
   */
  private static async updateAttendanceLog(
    logId: number,
    updates: {
      time_in?: string;
      time_out?: string;
      is_late?: boolean;
      late_minutes?: number;
    }
  ): Promise<AttendanceLog> {
    const { data, error } = await supabase
      .from("attendance_log")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", logId)
      .select()
      .single();

    if (error || !data) {
      throw new Error("Failed to update attendance log");
    }

    return {
      id: data.id,
      student_id: data.student_id,
      attendance_date: new Date(data.attendance_date),
      time_in: data.time_in,
      time_out: data.time_out,
      is_late: data.is_late,
      late_minutes: data.late_minutes || 0,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }
}
