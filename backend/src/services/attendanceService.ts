// backend/src/services/attendanceService.ts
import { supabase } from "../config/database";
import { QRSecurityService } from "./qrSecurityService";
import {
  QRScanRequest,
  Student,
  AttendanceLog,
  Quarter,
} from "../types/attendance";
import { getSMSEventHandler } from "./SMSEventHandler";

export class AttendanceService {
  /**
   * Helper to get the current date in Philippines Time (YYYY-MM-DD)
   * This guarantees that 1:00 AM Jan 31st is recorded as Jan 31st.
   */
  private static getPhDate(): string {
    return new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Manila",
    });
  }

  /**
   * Helper to get the current time in Philippines Time (HH:MM:SS)
   */
  private static getPhTime(): string {
    return new Date().toLocaleTimeString("en-GB", {
      timeZone: "Asia/Manila",
      hour12: false,
    });
  }

  static async processQRScan(scanData: QRScanRequest): Promise<{
    student: any;
    attendanceLog: AttendanceLog;
    isLate: boolean;
    action: "time_in" | "time_out";
    lateMinutes?: number;
    totalLateMinutes?: number;
    notificationTriggered?: boolean;
  }> {
    try {
      const originalQRToken = await QRSecurityService.validateAndDecodeQRCode(
        scanData.qr_token,
      );

      if (!originalQRToken) {
        throw new Error(
          "Invalid or tampered QR code. Please contact administrator.",
        );
      }

      const student = await this.findStudentByQRToken(originalQRToken);
      if (!student) {
        throw new Error("Invalid QR code. Student not found.");
      }

      // FIX: Use explicit PH Date
      const today = this.getPhDate();
      const existingLog = await this.getAttendanceLogForDate(student.id, today);

      if (!existingLog || !existingLog.time_in) {
        return await this.processTimeIn(student, today, existingLog);
      } else if (existingLog.time_in && !existingLog.time_out) {
        return await this.processTimeOut(student, existingLog);
      } else {
        throw new Error("Student has already completed attendance for today");
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      throw new Error(errorMessage);
    }
  }

  private static async processTimeIn(
    student: Student,
    today: string,
    existingLog: AttendanceLog | null,
  ): Promise<{
    student: any;
    attendanceLog: AttendanceLog;
    isLate: boolean;
    action: "time_in";
    lateMinutes?: number;
    totalLateMinutes?: number;
    notificationTriggered?: boolean;
  }> {
    // FIX: Use explicit PH Time
    const timeString = this.getPhTime();

    const currentQuarter = await this.getCurrentQuarter();
    if (!currentQuarter) {
      throw new Error("No active quarter found");
    }

    const schoolStartTime = currentQuarter.school_start_time;
    const isLate = this.calculateIsLate(timeString, schoolStartTime);
    const lateMinutes = isLate
      ? this.calculateLateMinutes(timeString, schoolStartTime)
      : 0;

    let attendanceLog: AttendanceLog;
    if (existingLog) {
      const { data, error } = await supabase
        .from("attendance_log")
        .update({
          time_in: timeString,
          is_late: isLate,
          late_minutes: lateMinutes,
          updated_at: new Date().toISOString(), // Standard UTC timestamp for system auditing is fine
        })
        .eq("id", existingLog.id)
        .select()
        .single();

      if (error) {
        throw new Error("Failed to update attendance log");
      }
      attendanceLog = data;
    } else {
      const { data, error } = await supabase
        .from("attendance_log")
        .insert({
          student_id: student.id,
          attendance_date: today,
          time_in: timeString,
          is_late: isLate,
          late_minutes: lateMinutes,
        })
        .select()
        .single();

      if (error) {
        throw new Error("Failed to create attendance log");
      }
      attendanceLog = data;
    }

    let totalLateMinutes = 0;
    let notificationTriggered = false;

    if (isLate && lateMinutes > 0) {
      const lateTrackingResult = await this.updateLateTracking(
        student.id,
        currentQuarter.id,
        lateMinutes,
      );
      totalLateMinutes = lateTrackingResult.totalLateMinutes;

      if (totalLateMinutes >= 70 && !lateTrackingResult.notificationSent) {
        notificationTriggered = await this.sendLateThresholdNotification(
          student.id,
          student.adviser_id,
          totalLateMinutes,
        );

        if (notificationTriggered) {
          await this.markNotificationSent(student.id, currentQuarter.id);
        }
      }
    }

    const studentWithDetails = await this.getStudentWithDetails(student.id);

    // SMS EVENT EMISSION
    try {
      const smsHandler = getSMSEventHandler();
      smsHandler.emitTimeInEvent({
        attendanceLogId: attendanceLog.id,
        studentId: student.id,
        attendanceDate: new Date(today),
        timeIn: timeString,
        isLate: isLate,
        lateMinutes: lateMinutes,
      });
      console.log(
        `[Attendance Service] SMS event emitted for student ${student.id}`,
      );
    } catch (error) {
      console.error("[Attendance Service] Failed to emit SMS event:", error);
    }

    return {
      student: studentWithDetails,
      attendanceLog,
      isLate,
      action: "time_in",
      lateMinutes: lateMinutes > 0 ? lateMinutes : undefined,
      totalLateMinutes: totalLateMinutes > 0 ? totalLateMinutes : undefined,
      notificationTriggered,
    };
  }

  private static async processTimeOut(
    student: Student,
    existingLog: AttendanceLog,
  ): Promise<{
    student: any;
    attendanceLog: AttendanceLog;
    isLate: boolean;
    action: "time_out";
  }> {
    // FIX: Use explicit PH Time
    const timeString = this.getPhTime();

    const { data, error } = await supabase
      .from("attendance_log")
      .update({
        time_out: timeString,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingLog.id)
      .select()
      .single();

    if (error) {
      throw new Error("Failed to update time out");
    }

    const studentWithDetails = await this.getStudentWithDetails(student.id);

    return {
      student: studentWithDetails,
      attendanceLog: data,
      isLate: data.is_late,
      action: "time_out",
    };
  }

  private static async findStudentByQRToken(
    qrToken: string,
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

  private static async getStudentWithDetails(studentId: number): Promise<any> {
    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .select("*")
      .eq("id", studentId)
      .is("deleted_at", null)
      .single();

    if (studentError || !studentData) {
      throw new Error("Student not found");
    }

    const [levelResult, sectionResult, specializationResult, teacherResult] =
      await Promise.all([
        supabase
          .from("levels")
          .select("level")
          .eq("id", studentData.level_id)
          .single(),
        supabase
          .from("sections")
          .select("section_name")
          .eq("id", studentData.section_id)
          .single(),
        supabase
          .from("specializations")
          .select("specialization_name")
          .eq("id", studentData.specialization_id)
          .single(),
        studentData.adviser_id
          ? supabase
              .from("teachers")
              .select("first_name, last_name, middle_name")
              .eq("auth_id", studentData.adviser_id)
              .single()
          : Promise.resolve({ data: null, error: null }),
      ]);

    return {
      id: studentData.id,
      student_id: studentData.student_id,
      first_name: studentData.first_name,
      last_name: studentData.last_name,
      middle_name: studentData.middle_name,
      level: levelResult.data?.level || null,
      section: sectionResult.data?.section_name || null,
      specialization: specializationResult.data?.specialization_name || null,
      adviser: teacherResult.data
        ? {
            first_name: teacherResult.data.first_name,
            last_name: teacherResult.data.last_name,
            middle_name: teacherResult.data.middle_name,
          }
        : null,
    };
  }

  private static async getAttendanceLogForDate(
    studentId: number,
    date: string,
  ): Promise<AttendanceLog | null> {
    const { data, error } = await supabase
      .from("attendance_log")
      .select("*")
      .eq("student_id", studentId)
      .eq("attendance_date", date)
      .is("deleted_at", null)
      .single();

    if (error) {
      return null;
    }

    return {
      id: data.id,
      student_id: data.student_id,
      attendance_date: new Date(data.attendance_date),
      time_in: data.time_in,
      time_out: data.time_out,
      is_late: data.is_late,
      late_minutes: data.late_minutes,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }

  private static async getCurrentQuarter(): Promise<Quarter | null> {
    // FIX: Use PH Date for Quarter checking
    const today = this.getPhDate();
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

  private static calculateIsLate(
    arrivalTime: string,
    schoolStartTime: string,
  ): boolean {
    const arrival = new Date(`1970-01-01T${arrivalTime}`);
    const schoolStart = new Date(`1970-01-01T${schoolStartTime}`);

    // Add 1-minute grace period (60,000 milliseconds) Can be change
    const graceTimeMs = 60 * 1000;
    const schoolStartWithGrace = new Date(schoolStart.getTime() + graceTimeMs);

    return arrival > schoolStartWithGrace;
  }

  private static calculateLateMinutes(
    arrivalTime: string,
    schoolStartTime: string,
  ): number {
    const arrival = new Date(`1970-01-01T${arrivalTime}`);
    const schoolStart = new Date(`1970-01-01T${schoolStartTime}`);

    // Add 1-minute grace period
    const graceTimeMs = 60 * 1000;
    const schoolStartWithGrace = new Date(schoolStart.getTime() + graceTimeMs);

    const diffMs = arrival.getTime() - schoolStartWithGrace.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60)));
  }

  private static async updateLateTracking(
    studentId: number,
    quarterId: number,
    lateMinutes: number,
  ): Promise<{ totalLateMinutes: number; notificationSent: boolean }> {
    const { data: existingTracking, error: fetchError } = await supabase
      .from("student_late_tracking")
      .select("*")
      .eq("student_id", studentId)
      .eq("quarter_id", quarterId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      throw new Error("Failed to fetch late tracking");
    }

    let totalLateMinutes = lateMinutes;
    let notificationSent = false;

    if (existingTracking) {
      totalLateMinutes = existingTracking.total_late_minutes + lateMinutes;
      notificationSent = existingTracking.notification_sent;

      const { error: updateError } = await supabase
        .from("student_late_tracking")
        .update({
          total_late_minutes: totalLateMinutes,
          last_updated: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingTracking.id);

      if (updateError) {
        throw new Error("Failed to update late tracking");
      }
    } else {
      const { error: insertError } = await supabase
        .from("student_late_tracking")
        .insert({
          student_id: studentId,
          quarter_id: quarterId,
          total_late_minutes: totalLateMinutes,
          notification_sent: false,
          last_updated: new Date().toISOString(),
        });

      if (insertError) {
        throw new Error("Failed to create late tracking");
      }
    }

    return { totalLateMinutes, notificationSent };
  }

  private static async sendLateThresholdNotification(
    studentId: number,
    teacherId: number,
    totalLateMinutes: number,
  ): Promise<boolean> {
    try {
      const message = `Student has exceeded the 70-minute late threshold with ${totalLateMinutes} minutes of tardiness this quarter.`;

      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          student_id: studentId,
          teacher_id: teacherId,
          type: "Alert",
          message,
          sent_at: new Date().toISOString(),
          status: "Sent",
        });

      return !notificationError;
    } catch (error) {
      return false;
    }
  }

  private static async markNotificationSent(
    studentId: number,
    quarterId: number,
  ): Promise<void> {
    const { error } = await supabase
      .from("student_late_tracking")
      .update({
        notification_sent: true,
        updated_at: new Date().toISOString(),
      })
      .eq("student_id", studentId)
      .eq("quarter_id", quarterId);

    if (error) {
      throw new Error("Failed to mark notification as sent");
    }
  }
}
