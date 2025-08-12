import { supabase } from "../config/database";
import { QRScanRequest, Student, AttendanceLog } from "../types/attendance";

export class AttendanceService {
  /**
   * Process QR scan with automatic time-in/time-out detection
   */
  static async processQRScan(scanData: QRScanRequest): Promise<{
    student: Student;
    attendanceLog: AttendanceLog;
    isLate: boolean;
    action: "time_in" | "time_out";
  }> {
    try {
      const student = await this.findStudentByQRToken(scanData.qr_token);
      if (!student) {
        throw new Error("Invalid QR code or student not found");
      }

      const today = new Date().toISOString().split("T")[0];
      const existingLog = await this.getAttendanceLogForDate(student.id, today);

      // Automatic detection logic
      if (!existingLog || !existingLog.time_in) {
        // No record or no time-in = TIME IN
        return await this.processTimeIn(student, today, existingLog);
      } else if (existingLog.time_in && !existingLog.time_out) {
        // Has time-in but no time-out = TIME OUT
        return await this.processTimeOut(student, existingLog);
      } else {
        // Already completed for the day
        throw new Error("Student has already completed attendance for today");
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get current school start time from quarters table
   */
  private static async getCurrentSchoolStartTime(): Promise<string> {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("quarters")
      .select("school_start_time")
      .lte("start_date", today)
      .gte("end_date", today)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      return "07:30:00"; // Default fallback
    }

    return data.school_start_time;
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
  }> {
    const now = new Date();
    const philippineTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Manila" })
    );
    const currentTime = philippineTime.toTimeString().split(" ")[0];

    const schoolStartTime = await this.getCurrentSchoolStartTime();
    const isLate = currentTime > schoolStartTime;

    const attendanceLog = existingLog
      ? await this.updateAttendanceLog(existingLog.id, {
          time_in: currentTime,
          is_late: isLate,
        })
      : await this.createAttendanceLog({
          student_id: student.id,
          attendance_date: new Date(date),
          time_in: currentTime,
          is_late: isLate,
        });

    return {
      student,
      attendanceLog,
      isLate,
      action: "time_in",
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
  }): Promise<AttendanceLog> {
    const { data, error } = await supabase
      .from("attendance_log")
      .insert({
        student_id: logData.student_id,
        attendance_date: logData.attendance_date.toISOString().split("T")[0],
        time_in: logData.time_in,
        is_late: logData.is_late,
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
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }
}
