import api from "./api";

export interface QRScanRequest {
  qr_token: string;
}

export interface QRScanResponse {
  success: boolean;
  data?: {
    student: {
      id: number;
      student_id: string;
      first_name: string;
      last_name: string;
      middle_name?: string;
      level?: number;
      section?: string;
      specialization?: string;
      adviser?: {
        first_name: string;
        last_name: string;
        middle_name?: string;
      };
    };
    attendance_log: {
      id: number;
      time_in: string;
      time_out?: string;
      is_late: boolean;
    };
    action: "time_in" | "time_out";
    is_late: boolean;
    late_minutes?: number;
    total_late_minutes?: number;
    notification_triggered?: boolean;
  };
  message?: string;
  error?: string;
}

export class AttendanceService {
  static async scanQR(qrToken: string): Promise<QRScanResponse> {
    try {
      const response = await api.post<QRScanResponse>("/attendance/scan", {
        qr_token: qrToken,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data?.error || "Invalid QR code");
      } else if (error.response?.status >= 500) {
        throw new Error("Server error. Please try again later.");
      } else {
        throw new Error(error.response?.data?.error || "QR scan failed");
      }
    }
  }
}
