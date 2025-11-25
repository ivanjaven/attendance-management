// ============================================================================
// SMS Template Service
// ============================================================================
// Handles SMS message formatting and personalization
// Builds appropriate messages based on attendance status and late tracking

import { smsConfig, SMSMessageType } from "../config/sms.config";

/**
 * Student Data Interface
 */
interface StudentData {
  id: number;
  first_name: string;
  last_name: string;
  mobile_number?: string;
}

/**
 * Attendance Data Interface
 */
interface AttendanceData {
  attendance_date: Date;
  time_in: string; // Format: "HH:MM:SS"
  is_late: boolean;
  late_minutes: number;
}

/**
 * Late Tracking Data Interface
 */
interface LateTrackingData {
  total_late_minutes: number;
  quarter_limit: number;
}

/**
 * SMS Message Result Interface
 */
export interface SMSMessageResult {
  message: string;
  messageType: SMSMessageType;
  shouldSend: boolean;
  reason?: string;
}

/**
 * SMS Template Service Class
 * Generates personalized SMS messages for attendance notifications
 */
export class SMSTemplateService {
  private readonly quarterLimit: number;
  private readonly criticalThreshold: number;
  private readonly moderateThreshold: number;

  constructor() {
    this.quarterLimit = smsConfig.lateTracking.quarterLimitMinutes;
    this.criticalThreshold = smsConfig.lateTracking.warningThresholds.critical;
    this.moderateThreshold = smsConfig.lateTracking.warningThresholds.moderate;
  }

  /**
   * Build time-in SMS message
   * @param student - Student information
   * @param attendance - Attendance record data
   * @param lateTracking - Late tracking data for current quarter
   * @returns SMS message result
   */
  buildTimeInMessage(
    student: StudentData,
    attendance: AttendanceData,
    lateTracking: LateTrackingData
  ): SMSMessageResult {
    // Check if student has mobile number
    if (!student.mobile_number) {
      return {
        message: "",
        messageType: SMSMessageType.TIME_IN_SUCCESS,
        shouldSend: false,
        reason: "Student has no mobile number",
      };
    }

    // Format time for display
    const formattedTime = this.formatTime(attendance.time_in);
    const formattedDate = this.formatDate(attendance.attendance_date);

    // Build message based on late status
    if (attendance.is_late) {
      return this.buildLateMessage(
        student,
        formattedTime,
        formattedDate,
        attendance.late_minutes,
        lateTracking
      );
    } else {
      return this.buildSuccessMessage(student, formattedTime, formattedDate);
    }
  }

  /**
   * Build success message (not late)
   * @private
   */
  private buildSuccessMessage(
    student: StudentData,
    time: string,
    date: string
  ): SMSMessageResult {
    const message = `Hi ${student.first_name}! Time-in recorded at ${time} on ${date}. Have a great day!`;

    return {
      message,
      messageType: SMSMessageType.TIME_IN_SUCCESS,
      shouldSend: true,
    };
  }

  /**
   * Build late message with warnings
   * @private
   */
  private buildLateMessage(
    student: StudentData,
    time: string,
    date: string,
    lateMinutes: number,
    lateTracking: LateTrackingData
  ): SMSMessageResult {
    const totalLate = lateTracking.total_late_minutes;
    const remaining = this.quarterLimit - totalLate;

    // Base message
    let message = `Hi ${student.first_name}! `;
    message += `Time-in recorded at ${time} on ${date}. `;
    message += `You are ${lateMinutes} min late today. `;
    message += `Total late this quarter: ${totalLate}/${this.quarterLimit} min. `;

    // Determine message type and add warning if needed
    let messageType: SMSMessageType;

    if (remaining <= this.criticalThreshold) {
      // Critical warning
      message += `⚠️ WARNING: Only ${remaining} min remaining!`;
      messageType = SMSMessageType.TIME_IN_LATE_CRITICAL;
    } else if (remaining <= this.moderateThreshold) {
      // Moderate warning
      message += `Note: ${remaining} min remaining this quarter.`;
      messageType = SMSMessageType.TIME_IN_LATE;
    } else {
      // Just informational
      messageType = SMSMessageType.TIME_IN_LATE;
    }

    return {
      message,
      messageType,
      shouldSend: true,
    };
  }

  /**
   * Format time from HH:MM:SS to human-readable format
   * @private
   */
  private formatTime(timeString: string): string {
    try {
      const [hours, minutes] = timeString.split(":");
      const hour = parseInt(hours, 10);
      const min = minutes;

      // Convert to 12-hour format with AM/PM
      if (hour === 0) {
        return `12:${min} AM`;
      } else if (hour < 12) {
        return `${hour}:${min} AM`;
      } else if (hour === 12) {
        return `12:${min} PM`;
      } else {
        return `${hour - 12}:${min} PM`;
      }
    } catch (error) {
      return timeString; // Return original if parsing fails
    }
  }

  /**
   * Format date to human-readable format
   * @private
   */
  private formatDate(date: Date): string {
    try {
      const dateObj = new Date(date);
      const options: Intl.DateTimeFormatOptions = {
        month: "short",
        day: "numeric",
        year: "numeric",
      };
      return dateObj.toLocaleDateString("en-US", options);
    } catch (error) {
      return date.toString();
    }
  }

  /**
   * Validate message content
   * Checks for empty messages and SMS length limits
   */
  validateMessage(message: string): { valid: boolean; error?: string } {
    if (!message || message.trim().length === 0) {
      return { valid: false, error: "Message is empty" };
    }

    // PhilSMS typically supports up to 160 characters for single SMS
    // Messages longer than 160 chars are sent as multiple parts
    const maxLength = 160;
    if (message.length > maxLength * 3) {
      // Warn if message is excessively long (3 SMS parts)
      console.warn(
        `[SMS Template] Message is very long: ${message.length} chars`
      );
    }

    return { valid: true };
  }

  /**
   * Get message preview (for testing/debugging)
   */
  getMessagePreview(
    studentName: string,
    isLate: boolean,
    lateMinutes: number,
    totalLateMinutes: number
  ): string {
    const student: StudentData = {
      id: 1,
      first_name: studentName,
      last_name: "Test",
      mobile_number: "639171234567",
    };

    const attendance: AttendanceData = {
      attendance_date: new Date(),
      time_in: "08:15:00",
      is_late: isLate,
      late_minutes: lateMinutes,
    };

    const lateTracking: LateTrackingData = {
      total_late_minutes: totalLateMinutes,
      quarter_limit: this.quarterLimit,
    };

    const result = this.buildTimeInMessage(student, attendance, lateTracking);
    return result.message;
  }
}

// Export singleton instance
export const smsTemplateService = new SMSTemplateService();
