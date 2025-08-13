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
      const student = await this.findStudentByQRToken(scanData.qr_token);
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
    } catch (error) {
      throw error;
    }
  }

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

  private static async processTimeIn(
    student: any,
    date: string,
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
    const quarter = await this.getCurrentQuarter();
    if (!quarter) {
      throw new Error("No active quarter found");
    }

    const now = new Date();
    const philippineTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Manila" })
    );
    const currentTime = philippineTime.toTimeString().split(" ")[0];

    const isLate = currentTime > quarter.school_start_time;
    const lateMinutes = isLate
      ? this.calculateLateMinutes(currentTime, quarter.school_start_time)
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
      student: this.maskStudentData(student),
      attendanceLog,
      isLate,
      action: "time_in",
      lateMinutes: lateMinutes > 0 ? lateMinutes : undefined,
      totalLateMinutes,
      notificationTriggered,
    };
  }

  private static async processTimeOut(
    student: any,
    existingLog: AttendanceLog
  ): Promise<{
    student: any;
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
      student: this.maskStudentData(student),
      attendanceLog,
      isLate: existingLog.is_late,
      action: "time_out",
    };
  }

  private static maskStudentData(student: any): any {
    const maskString = (str: string, visibleChars: number = 2): string => {
      if (!str || str.length <= visibleChars) return str;
      const visible = str.substring(0, visibleChars);
      const masked = "*".repeat(str.length - visibleChars);
      return visible + masked;
    };

    return {
      ...student,
      student_id: maskString(student.student_id, 4),
      first_name: maskString(student.first_name, 2),
      last_name: maskString(student.last_name, 2),
      middle_name: student.middle_name
        ? maskString(student.middle_name, 1)
        : undefined,
    };
  }

  private static async findStudentByQRToken(
    qrToken: string
  ): Promise<any | null> {
    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .select("*")
      .eq("qr_token", qrToken)
      .is("deleted_at", null)
      .single();

    if (studentError || !studentData) {
      return null;
    }

    const { data: level } = await supabase
      .from("levels")
      .select("level")
      .eq("id", studentData.level_id)
      .single();

    const { data: section } = await supabase
      .from("sections")
      .select("section_name")
      .eq("id", studentData.section_id)
      .single();

    const { data: specialization } = await supabase
      .from("specializations")
      .select("specialization_name")
      .eq("id", studentData.specialization_id)
      .single();

    const { data: adviser } = await supabase
      .from("teachers")
      .select("first_name, last_name, middle_name")
      .eq("auth_id", studentData.adviser_id)
      .single();

    return {
      id: studentData.id,
      student_id: studentData.student_id,
      qr_token: studentData.qr_token,
      first_name: studentData.first_name,
      last_name: studentData.last_name,
      middle_name: studentData.middle_name,
      level: level?.level,
      section: section?.section_name,
      specialization: specialization?.specialization_name,
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

  private static async updateLateTracking(
    studentId: number,
    quarterId: number,
    additionalMinutes: number
  ): Promise<{
    totalLateMinutes: number;
    notificationTriggered: boolean;
  }> {
    const { data: existing } = await supabase
      .from("student_late_tracking")
      .select("*")
      .eq("student_id", studentId)
      .eq("quarter_id", quarterId)
      .single();

    const currentTotal = existing?.total_late_minutes || 0;
    const newTotal = currentTotal + additionalMinutes;
    const notificationTriggered =
      !existing?.notification_sent && newTotal >= 70;

    if (existing) {
      await supabase
        .from("student_late_tracking")
        .update({
          total_late_minutes: newTotal,
          notification_sent: notificationTriggered
            ? true
            : existing.notification_sent,
          last_updated: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("student_late_tracking").insert({
        student_id: studentId,
        quarter_id: quarterId,
        total_late_minutes: newTotal,
        notification_sent: notificationTriggered,
      });
    }

    return {
      totalLateMinutes: newTotal,
      notificationTriggered,
    };
  }
}
