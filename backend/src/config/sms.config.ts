// ============================================================================
// SMS Configuration
// ============================================================================
// Centralizes all SMS-related configuration for PhilSMS integration
// Includes API settings, message templates, and feature flags

/**
 * SMS Provider Configuration
 */
export const smsConfig = {
  // PhilSMS API Configuration
  api: {
    url:
      process.env.PHILSMS_API_URL ||
      "https://dashboard.philsms.com/api/v3/sms/send",
    token: process.env.PHILSMS_API_TOKEN || "",
    senderId: process.env.PHILSMS_SENDER_ID || "RizalHigh",
    timeout: parseInt(process.env.SMS_TIMEOUT_MS || "5000", 10),
  },

  // Feature Flags
  enabled: process.env.PHILSMS_ENABLED === "true",

  // Retry Configuration
  retry: {
    attempts: parseInt(process.env.SMS_RETRY_ATTEMPTS || "1", 10),
    delayMs: 30000,
  },

  // Late Tracking Configuration
  lateTracking: {
    quarterLimitMinutes: 70,
    warningThresholds: {
      critical: 15,
      moderate: 30,
    },
  },

  // Development/Testing
  development: {
    mockMode:
      process.env.NODE_ENV === "development" &&
      process.env.PHILSMS_MOCK === "true",
    logMessages: process.env.NODE_ENV === "development",
  },
};

/**
 * Validates SMS configuration
 */
export const validateSMSConfig = (): boolean => {
  if (!smsConfig.enabled) {
    console.log("[SMS Config] SMS notifications are disabled");
    return false;
  }

  if (!smsConfig.api.token) {
    console.error("[SMS Config] PHILSMS_API_TOKEN is not configured");
    return false;
  }

  if (!smsConfig.api.url) {
    console.error("[SMS Config] PHILSMS_API_URL is not configured");
    return false;
  }

  console.log("[SMS Config] SMS configuration validated successfully");
  console.log(`[SMS Config] Sender ID: ${smsConfig.api.senderId}`);
  console.log(`[SMS Config] Mock Mode: ${smsConfig.development.mockMode}`);

  return true;
};

/**
 * SMS Message Types
 */
export enum SMSMessageType {
  TIME_IN_SUCCESS = "TIME_IN_SUCCESS",
  TIME_IN_LATE = "TIME_IN_LATE",
  TIME_IN_LATE_CRITICAL = "TIME_IN_LATE_CRITICAL",
}

/**
 * SMS Status Types
 */
export enum SMSStatus {
  PENDING = "pending",
  SENT = "sent",
  FAILED = "failed",
  MOCK = "mock",
}
