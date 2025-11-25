// ============================================================================
// PhilSMS Service
// ============================================================================
// Handles all API communication with PhilSMS
// Includes error handling, retry logic, and mock mode support

import axios, { AxiosError } from "axios";
import { smsConfig, SMSStatus } from "../config/sms.config";

/**
 * PhilSMS API Request Interface
 */
interface PhilSMSRequest {
  recipient: string; // Format: 639171234567
  sender_id: string; // Max 11 chars for alphanumeric
  type: "plain" | "unicode";
  message: string;
}

/**
 * PhilSMS API Response Interface
 */
interface PhilSMSResponse {
  status: "success" | "error";
  data?: any;
  message?: string;
}

/**
 * SMS Send Result Interface
 */
export interface SMSSendResult {
  success: boolean;
  status: SMSStatus;
  messageId?: string;
  providerResponse?: any;
  error?: string;
}

/**
 * PhilSMS Service Class
 * Handles all SMS sending operations via PhilSMS API
 */
export class PhilSMSService {
  private apiUrl: string;
  private apiToken: string;
  private senderId: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;

  constructor() {
    this.apiUrl = smsConfig.api.url;
    this.apiToken = smsConfig.api.token;
    this.senderId = smsConfig.api.senderId;
    this.timeout = smsConfig.api.timeout;
    this.retryAttempts = smsConfig.retry.attempts;
    this.retryDelay = smsConfig.retry.delayMs;
  }

  /**
   * Send SMS to a single recipient
   * @param mobileNumber - Philippine mobile number (639XXXXXXXXX)
   * @param message - SMS message content
   * @returns Promise with send result
   */
  async sendSMS(mobileNumber: string, message: string): Promise<SMSSendResult> {
    // Validate inputs
    if (!this.validateMobileNumber(mobileNumber)) {
      return {
        success: false,
        status: SMSStatus.FAILED,
        error: "Invalid mobile number format. Expected: 639XXXXXXXXX",
      };
    }

    if (!message || message.trim().length === 0) {
      return {
        success: false,
        status: SMSStatus.FAILED,
        error: "Message content is empty",
      };
    }

    // Check if SMS is enabled
    if (!smsConfig.enabled) {
      console.log("[PhilSMS] SMS disabled, skipping send");
      return {
        success: false,
        status: SMSStatus.FAILED,
        error: "SMS service is disabled",
      };
    }

    // Mock mode for development
    if (smsConfig.development.mockMode) {
      return this.mockSend(mobileNumber, message);
    }

    // Attempt to send with retry logic
    let lastError: string = "";

    for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[PhilSMS] Retry attempt ${attempt} for ${mobileNumber}`);
          await this.delay(this.retryDelay);
        }

        const result = await this.callPhilSMSAPI(mobileNumber, message);

        if (result.success) {
          console.log(`[PhilSMS] SMS sent successfully to ${mobileNumber}`);
          return result;
        }

        lastError = result.error || "Unknown error";
      } catch (error) {
        lastError = this.extractErrorMessage(error);
        console.error(`[PhilSMS] Attempt ${attempt + 1} failed:`, lastError);
      }
    }

    // All attempts failed
    console.error(
      `[PhilSMS] Failed to send SMS after ${this.retryAttempts + 1} attempts`
    );
    return {
      success: false,
      status: SMSStatus.FAILED,
      error: lastError,
    };
  }

  /**
   * Call PhilSMS API
   * @private
   */
  private async callPhilSMSAPI(
    mobileNumber: string,
    message: string
  ): Promise<SMSSendResult> {
    const payload: PhilSMSRequest = {
      recipient: mobileNumber,
      sender_id: this.senderId,
      type: "plain",
      message: message,
    };

    try {
      const response = await axios.post<PhilSMSResponse>(this.apiUrl, payload, {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: this.timeout,
      });

      // Check response status
      if (response.data.status === "success") {
        return {
          success: true,
          status: SMSStatus.SENT,
          messageId: this.extractMessageId(response.data.data),
          providerResponse: response.data,
        };
      } else {
        return {
          success: false,
          status: SMSStatus.FAILED,
          error: response.data.message || "API returned error status",
          providerResponse: response.data,
        };
      }
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);
      return {
        success: false,
        status: SMSStatus.FAILED,
        error: errorMessage,
        providerResponse:
          error instanceof AxiosError ? error.response?.data : undefined,
      };
    }
  }

  /**
   * Mock SMS sending for development
   * @private
   */
  private mockSend(mobileNumber: string, message: string): SMSSendResult {
    console.log("=".repeat(80));
    console.log("[PhilSMS MOCK MODE]");
    console.log(`To: ${mobileNumber}`);
    console.log(`From: ${this.senderId}`);
    console.log(`Message: ${message}`);
    console.log("=".repeat(80));

    return {
      success: true,
      status: SMSStatus.MOCK,
      messageId: `mock_${Date.now()}`,
      providerResponse: {
        status: "mock",
        message: "Mock mode - SMS not actually sent",
      },
    };
  }

  /**
   * Validate Philippine mobile number format
   * @private
   */
  private validateMobileNumber(mobileNumber: string): boolean {
    // Expected format: 639XXXXXXXXX (13 digits starting with 639)
    const regex = /^639\d{9}$/;
    return regex.test(mobileNumber);
  }

  /**
   * Extract message ID from provider response
   * @private
   */
  private extractMessageId(data: any): string | undefined {
    if (!data) return undefined;

    // PhilSMS might return message ID in different formats
    // Adjust based on actual API response structure
    if (typeof data === "string") return data;
    if (data.uid) return data.uid;
    if (data.message_id) return data.message_id;
    if (data.id) return data.id;

    return undefined;
  }

  /**
   * Extract error message from various error types
   * @private
   */
  private extractErrorMessage(error: unknown): string {
    if (error instanceof AxiosError) {
      if (error.response) {
        // API responded with error status
        const data = error.response.data;
        if (data?.message) return data.message;
        return `API Error: ${error.response.status} ${error.response.statusText}`;
      } else if (error.request) {
        // Request made but no response
        return "No response from PhilSMS API (timeout or network error)";
      }
    }

    if (error instanceof Error) {
      return error.message;
    }

    return "Unknown error occurred";
  }

  /**
   * Delay helper for retry logic
   * @private
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get service status
   */
  getStatus(): object {
    return {
      enabled: smsConfig.enabled,
      mockMode: smsConfig.development.mockMode,
      senderId: this.senderId,
      retryAttempts: this.retryAttempts,
    };
  }
}

// Export singleton instance
export const philSMSService = new PhilSMSService();
