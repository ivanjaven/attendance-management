// ============================================================================
// SMS Event Handler
// ============================================================================
// Orchestrates SMS sending flow for attendance notifications
// Coordinates between database, template service, and PhilSMS service

import { EventEmitter } from "events";
import { SupabaseClient } from "@supabase/supabase-js";
import { smsTemplateService, SMSMessageResult } from "./SMSTemplateService";
import { philSMSService, SMSSendResult } from "./PhilSMSService";
import { smsConfig, SMSStatus } from "../config/sms.config";

/**
 * Attendance Event Data Interface
 */
export interface AttendanceEventData {
  attendanceLogId: number;
  studentId: number;
  attendanceDate: Date;
  timeIn: string;
  isLate: boolean;
  lateMinutes: number;
}

/**
 * SMS Event Handler Class
 * Handles the complete flow of sending SMS notifications for attendance
 */
export class SMSEventHandler {
  private supabase: SupabaseClient;
  private eventEmitter: EventEmitter;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.eventEmitter = new EventEmitter();

    // Register event listener
    this.eventEmitter.on(
      "attendance:time-in",
      this.handleTimeInEvent.bind(this)
    );

    console.log(
      "[SMS Event Handler] Initialized and listening for attendance events"
    );
  }

  /**
   * Emit time-in event (called from attendance controller)
   */
  emitTimeInEvent(data: AttendanceEventData): void {
    console.log(
      `[SMS Event Handler] Time-in event emitted for student ID: ${data.studentId}`
    );

    // Emit event asynchronously (non-blocking)
    setImmediate(() => {
      this.eventEmitter.emit("attendance:time-in", data);
    });
  }

  /**
   * Handle time-in event
   * @private
   */
  private async handleTimeInEvent(data: AttendanceEventData): Promise<void> {
    console.log(
      `[SMS Event Handler] Processing time-in SMS for student ID: ${data.studentId}`
    );

    try {
      // Step 1: Fetch student data with mobile number
      const student = await this.fetchStudentData(data.studentId);
      if (!student) {
        console.warn(
          `[SMS Event Handler] Student not found: ${data.studentId}`
        );
        return;
      }

      if (!student.mobile_number) {
        console.log(
          `[SMS Event Handler] Student ${data.studentId} has no mobile number, skipping SMS`
        );
        return;
      }

      // Step 2: Get late tracking data for current quarter
      const lateTracking = await this.fetchLateTrackingData(
        data.studentId,
        data.attendanceDate
      );

      // Step 3: Build SMS message
      const messageResult: SMSMessageResult =
        smsTemplateService.buildTimeInMessage(
          student,
          {
            attendance_date: data.attendanceDate,
            time_in: data.timeIn,
            is_late: data.isLate,
            late_minutes: data.lateMinutes,
          },
          lateTracking
        );

      if (!messageResult.shouldSend) {
        console.log(
          `[SMS Event Handler] SMS not sent: ${messageResult.reason}`
        );
        return;
      }

      // Step 4: Send SMS via PhilSMS
      const sendResult: SMSSendResult = await philSMSService.sendSMS(
        student.mobile_number,
        messageResult.message
      );

      // Step 5: Log SMS result to database
      await this.logSMSResult(
        data.attendanceLogId,
        data.studentId,
        student.mobile_number,
        messageResult,
        sendResult
      );

      // Log success or failure
      if (sendResult.success) {
        console.log(
          `[SMS Event Handler] ✓ SMS sent successfully to ${student.mobile_number}`
        );
      } else {
        console.error(`[SMS Event Handler] ✗ SMS failed: ${sendResult.error}`);
      }
    } catch (error) {
      console.error("[SMS Event Handler] Error processing SMS event:", error);
      // Don't throw - we don't want to crash the app if SMS fails
    }
  }

  /**
   * Fetch student data from database
   * @private
   */
  private async fetchStudentData(studentId: number): Promise<any> {
    const { data, error } = await this.supabase
      .from("students")
      .select("id, first_name, last_name, mobile_number")
      .eq("id", studentId)
      .is("deleted_at", null)
      .single();

    if (error) {
      console.error("[SMS Event Handler] Error fetching student:", error);
      return null;
    }

    return data;
  }

  /**
   * Fetch or calculate late tracking data for current quarter
   * @private
   */
  private async fetchLateTrackingData(
    studentId: number,
    attendanceDate: Date
  ): Promise<any> {
    try {
      // Step 1: Get current quarter based on attendance date
      const { data: quarter, error: quarterError } = await this.supabase
        .from("quarters")
        .select("id, start_date, end_date")
        .lte("start_date", attendanceDate.toISOString().split("T")[0])
        .gte("end_date", attendanceDate.toISOString().split("T")[0])
        .is("deleted_at", null)
        .single();

      if (quarterError || !quarter) {
        console.warn(
          "[SMS Event Handler] No active quarter found, using default values"
        );
        return {
          total_late_minutes: 0,
          quarter_limit: smsConfig.lateTracking.quarterLimitMinutes,
        };
      }

      // Step 2: Get or create student late tracking record
      const { data: tracking, error: trackingError } = await this.supabase
        .from("student_late_tracking")
        .select("total_late_minutes")
        .eq("student_id", studentId)
        .eq("quarter_id", quarter.id)
        .single();

      if (trackingError) {
        // Record doesn't exist yet, will be created by attendance logic
        return {
          total_late_minutes: 0,
          quarter_limit: smsConfig.lateTracking.quarterLimitMinutes,
        };
      }

      return {
        total_late_minutes: tracking.total_late_minutes || 0,
        quarter_limit: smsConfig.lateTracking.quarterLimitMinutes,
      };
    } catch (error) {
      console.error("[SMS Event Handler] Error fetching late tracking:", error);
      return {
        total_late_minutes: 0,
        quarter_limit: smsConfig.lateTracking.quarterLimitMinutes,
      };
    }
  }

  /**
   * Log SMS result to database
   * @private
   */
  private async logSMSResult(
    attendanceLogId: number,
    studentId: number,
    mobileNumber: string,
    messageResult: SMSMessageResult,
    sendResult: SMSSendResult
  ): Promise<void> {
    try {
      const logData = {
        attendance_log_id: attendanceLogId,
        student_id: studentId,
        mobile_number: mobileNumber,
        message: messageResult.message,
        message_type: messageResult.messageType,
        status: sendResult.status,
        provider_response: sendResult.providerResponse || null,
        provider_message_id: sendResult.messageId || null,
        error_message: sendResult.error || null,
        retry_count: 0,
        sent_at: sendResult.success ? new Date().toISOString() : null,
      };

      const { error } = await this.supabase.from("sms_logs").insert(logData);

      if (error) {
        console.error("[SMS Event Handler] Error logging SMS result:", error);
      } else {
        console.log(`[SMS Event Handler] SMS result logged to database`);
      }
    } catch (error) {
      console.error("[SMS Event Handler] Error in logSMSResult:", error);
      // Don't throw - logging failure shouldn't crash the handler
    }
  }

  /**
   * Get handler status (for health checks)
   */
  getStatus(): object {
    return {
      listening: true,
      eventEmitterActive:
        this.eventEmitter.listenerCount("attendance:time-in") > 0,
      smsServiceStatus: philSMSService.getStatus(),
    };
  }

  /**
   * Manually trigger SMS for testing (useful for debugging)
   */
  async testSMS(studentId: number, mobileNumber: string): Promise<void> {
    console.log("[SMS Event Handler] Test SMS triggered");

    const testMessage = `Hi! This is a test message from Rizal High School attendance system. Sent at ${new Date().toLocaleTimeString()}.`;

    const sendResult = await philSMSService.sendSMS(mobileNumber, testMessage);

    console.log("[SMS Event Handler] Test result:", sendResult);
  }
}

// Note: Instance will be created in server initialization with Supabase client
export let smsEventHandler: SMSEventHandler | null = null;

/**
 * Initialize SMS Event Handler
 * Called during server startup
 */
export function initializeSMSEventHandler(
  supabase: SupabaseClient
): SMSEventHandler {
  if (!smsEventHandler) {
    smsEventHandler = new SMSEventHandler(supabase);
    console.log("[SMS] Event handler initialized successfully");
  }
  return smsEventHandler;
}

/**
 * Get SMS Event Handler instance
 * Throws error if not initialized
 */
export function getSMSEventHandler(): SMSEventHandler {
  if (!smsEventHandler) {
    throw new Error(
      "SMS Event Handler not initialized. Call initializeSMSEventHandler first."
    );
  }
  return smsEventHandler;
}
