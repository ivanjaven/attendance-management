import { supabase } from "../config/database";
import { QRSecurityService } from "./qrSecurityService";
import {
  QRScanRequest,
  Student,
  AttendanceLog,
  Quarter,
  StudentLateTracking,
  NotificationInput,
} from "../types/attendance";

export class AttendanceService {
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
      // Validate and decode the QR code first
      const originalQRToken = await QRSecurityService.validateAndDecodeQRCode(
        scanData.qr_token
      );

      if (!originalQRToken) {
        throw new Error(
          "Invalid or tampered QR code. Please contact administrator."
        );
      }

      const student = await this.findStudentByQRToken(originalQRToken);
      if (!student) {
        throw new Error("Invalid QR code. Student not found.");
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
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      throw new Error(errorMessage);
    }
  }

  private static async processTimeIn(
    student: Student,
    today: string,
    existingLog: AttendanceLog | null
  ): Promise<{
    student: any;
    attendanceLog: AttendanceLog;
    isLate: boolean;
    action: "time_in";
    lateMinutes?: number;
    totalLateMinutes?: number;
    notificationTriggered?: boolean;
  }> {
    const currentTime = new Date();
    const timeIn = currentTime.toTimeString().split(" ")[0]; // HH:MM:SS format

    const { isLate, lateMinutes } = await this.calculateLateStatus(
      currentTime,
      today
    );

    let attendanceLog: AttendanceLog;

    if (existingLog) {
      attendanceLog = await this.updateAttendanceLog(existingLog.id, {
        time_in: timeIn,
        is_late: isLate,
        late_minutes: lateMinutes,
      });
    } else {
      attendanceLog = await this.createAttendanceLog({
        student_id: student.id,
        attendance_date: new Date(today),
        time_in: timeIn,
        is_late: isLate,
        late_minutes: lateMinutes,
      });
    }

    let totalLateMinutes: number | undefined;
    let notificationTriggered = false;

    if (isLate && lateMinutes > 0) {
      const lateTrackingResult = await this.updateLateTracking(
        student.id,
        lateMinutes,
        today
      );
      totalLateMinutes = lateTrackingResult.totalLateMinutes;
      notificationTriggered = lateTrackingResult.notificationTriggered;
    }

    const studentWithDetails = await this.getStudentWithDetails(student.id);

    return {
      student: studentWithDetails,
      attendanceLog,
      isLate,
      action: "time_in",
      lateMinutes: isLate ? lateMinutes : undefined,
      totalLateMinutes,
      notificationTriggered,
    };
  }

  private static async processTimeOut(
    student: Student,
    existingLog: AttendanceLog
  ): Promise<{
    student: any;
    attendanceLog: AttendanceLog;
    isLate: boolean;
    action: "time_out";
  }> {
    const currentTime = new Date();
    const timeOut = currentTime.toTimeString().split(" ")[0]; // HH:MM:SS format

    const attendanceLog = await this.updateAttendanceLog(existingLog.id, {
      time_out: timeOut,
    });

    const studentWithDetails = await this.getStudentWithDetails(student.id);

    return {
      student: studentWithDetails,
      attendanceLog,
      isLate: existingLog.is_late,
      action: "time_out",
    };
  }

  private static async calculateLateStatus(
    currentTime: Date,
    date: string
  ): Promise<{ isLate: boolean; lateMinutes: number }> {
    try {
      const currentQuarter = await this.getCurrentQuarter(date);
      if (!currentQuarter) {
        return { isLate: false, lateMinutes: 0 };
      }

      const schoolStartTime = currentQuarter.school_start_time;
      const currentTimeString = currentTime.toTimeString().split(" ")[0];

      if (currentTimeString <= schoolStartTime) {
        return { isLate: false, lateMinutes: 0 };
      }

      const schoolStart = new Date(`1970-01-01T${schoolStartTime}`);
      const currentTimeForComparison = new Date(
        `1970-01-01T${currentTimeString}`
      );

      const timeDifferenceMs =
        currentTimeForComparison.getTime() - schoolStart.getTime();
      const lateMinutes = Math.floor(timeDifferenceMs / (1000 * 60));

      return { isLate: true, lateMinutes };
    } catch (error) {
      return { isLate: false, lateMinutes: 0 };
    }
  }

  private static async getCurrentQuarter(
    date: string
  ): Promise<Quarter | null> {
    const { data, error } = await supabase
      .from("quarters")
      .select("*")
      .lte("start_date", date)
      .gte("end_date", date)
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

  private static async updateLateTracking(
    studentId: number,
    lateMinutes: number,
    date: string
  ): Promise<{
    totalLateMinutes: number;
    notificationTriggered: boolean;
  }> {
    try {
      const currentQuarter = await this.getCurrentQuarter(date);
      if (!currentQuarter) {
        return { totalLateMinutes: lateMinutes, notificationTriggered: false };
      }

      const { data: existingTracking, error: fetchError } = await supabase
        .from("student_late_tracking")
        .select("*")
        .eq("student_id", studentId)
        .eq("quarter_id", currentQuarter.id)
        .single();

      let totalLateMinutes: number;
      let notificationTriggered = false;

      if (fetchError || !existingTracking) {
        totalLateMinutes = lateMinutes;
        const { error: insertError } = await supabase
          .from("student_late_tracking")
          .insert({
            student_id: studentId,
            quarter_id: currentQuarter.id,
            total_late_minutes: totalLateMinutes,
            notification_sent: totalLateMinutes >= 70,
          });

        if (insertError) {
          throw insertError;
        }

        if (totalLateMinutes >= 70) {
          notificationTriggered = await this.sendLateNotification(
            studentId,
            totalLateMinutes
          );
        }
      } else {
        totalLateMinutes = existingTracking.total_late_minutes + lateMinutes;
        const shouldSendNotification =
          totalLateMinutes >= 70 && !existingTracking.notification_sent;

        const { error: updateError } = await supabase
          .from("student_late_tracking")
          .update({
            total_late_minutes: totalLateMinutes,
            notification_sent:
              existingTracking.notification_sent || shouldSendNotification,
            last_updated: new Date().toISOString(),
          })
          .eq("student_id", studentId)
          .eq("quarter_id", currentQuarter.id);

        if (updateError) {
          throw updateError;
        }

        if (shouldSendNotification) {
          notificationTriggered = await this.sendLateNotification(
            studentId,
            totalLateMinutes
          );
        }
      }

      return { totalLateMinutes, notificationTriggered };
    } catch (error) {
      return { totalLateMinutes: lateMinutes, notificationTriggered: false };
    }
  }

  private static async sendLateNotification(
    studentId: number,
    totalLateMinutes: number
  ): Promise<boolean> {
    try {
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select(
          `
          first_name,
          last_name,
          adviser_id
        `
        )
        .eq("id", studentId)
        .is("deleted_at", null)
        .single();

      if (studentError || !student || !student.adviser_id) {
        return false;
      }

      const message = `${student.first_name} ${student.last_name} has exceeded the late threshold with ${totalLateMinutes} minutes of tardiness this quarter.`;

      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          student_id: studentId,
          teacher_id: student.adviser_id,
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

  private static async getStudentWithDetails(studentId: number): Promise<any> {
    const { data: studentData, error } = await supabase
      .from("students")
      .select(
        `
        *,
        levels!inner(level),
        sections!inner(section_name),
        specializations!inner(specialization_name),
        teachers!inner(first_name, last_name, middle_name)
      `
      )
      .eq("id", studentId)
      .is("deleted_at", null)
      .single();

    if (error || !studentData) {
      throw new Error("Student not found");
    }

    const level = Array.isArray(studentData.levels)
      ? studentData.levels[0]
      : studentData.levels;
    const section = Array.isArray(studentData.sections)
      ? studentData.sections[0]
      : studentData.sections;
    const specialization = Array.isArray(studentData.specializations)
      ? studentData.specializations[0]
      : studentData.specializations;
    const adviser = Array.isArray(studentData.teachers)
      ? studentData.teachers[0]
      : studentData.teachers;

    return {
      id: studentData.id,
      student_id: studentData.student_id,
      first_name: studentData.first_name,
      last_name: studentData.last_name,
      middle_name: studentData.middle_name,
      level: level ? level.level : null,
      section: section ? section.section_name : null,
      specialization: specialization
        ? specialization.specialization_name
        : null,
      adviser: adviser
        ? {
            first_name: adviser.first_name,
            last_name: adviser.last_name,
            middle_name: adviser.middle_name,
          }
        : null,
      created_at: new Date(studentData.created_at),
      updated_at: new Date(studentData.updated_at),
    };
  }

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
      .update(updates)
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
