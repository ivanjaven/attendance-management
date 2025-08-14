import api from "./api";

export interface Student {
  id: number;
  student_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  level_id: number;
  level?: number;
  specialization_id: number;
  specialization_name?: string;
  section_id: number;
  section_name?: string;
  created_at: string;
}

export interface Level {
  id: number;
  level: number;
}

export interface QRCodeResponse {
  success: boolean;
  data?: {
    student_id: string;
    student_name: string;
    qr_code_image: string;
  };
  message?: string;
  error?: string;
}

export interface BatchQRResponse {
  success: boolean;
  data?: Array<{
    studentId: string;
    qrCodeImage: string;
  }>;
  message?: string;
  error?: string;
}

export class AdminService {
  /**
   * Get all students for admin purposes
   */
  static async getStudents(): Promise<Student[]> {
    try {
      const response = await api.get<{
        success: boolean;
        data: Student[];
        message: string;
      }>("/admin/students");

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error("Failed to fetch students");
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        throw new Error("Admin access required");
      }
      throw new Error(
        error.response?.data?.error || "Failed to fetch students"
      );
    }
  }

  /**
   * Get all levels for dropdown
   */
  static async getLevels(): Promise<Level[]> {
    try {
      const response = await api.get<{
        success: boolean;
        data: Level[];
        message: string;
      }>("/admin/levels");

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error("Failed to fetch levels");
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        throw new Error("Admin access required");
      }
      throw new Error(error.response?.data?.error || "Failed to fetch levels");
    }
  }

  /**
   * Generate QR code for a single student
   */
  static async generateStudentQRCode(
    studentId: number
  ): Promise<QRCodeResponse> {
    try {
      const response = await api.get<QRCodeResponse>(
        `/admin/students/${studentId}/qr-code`
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 403) {
        throw new Error("Admin access required");
      } else if (error.response?.status === 404) {
        throw new Error("Student not found");
      }
      throw new Error(
        error.response?.data?.error || "Failed to generate QR code"
      );
    }
  }

  /**
   * Generate QR codes for multiple students
   */
  static async generateBatchQRCodes(
    studentIds: number[]
  ): Promise<BatchQRResponse> {
    try {
      const response = await api.post<BatchQRResponse>(
        "/admin/students/batch-qr-codes",
        { student_ids: studentIds }
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 403) {
        throw new Error("Admin access required");
      }
      throw new Error(
        error.response?.data?.error || "Failed to generate batch QR codes"
      );
    }
  }
}
