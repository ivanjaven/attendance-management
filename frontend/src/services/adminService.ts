import api from "./api";

export interface Student {
  id: number;
  student_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  level_id: number;
  level?: number; // Added from flattened response
  specialization_id: number;
  specialization_name?: string; // Added from flattened response
  section_id: number;
  section_name?: string; // Added from flattened response
  created_at: string;
}

export interface Level {
  id: number;
  level: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface StudentsResponse {
  success: boolean;
  data: Student[];
  pagination?: PaginationMeta;
  message?: string;
}

export const AdminService = {
  /**
   * Get all students with pagination
   * @param page Page number (default 1)
   * @param limit Items per page (default 20)
   */
  async getStudents(page = 1, limit = 20): Promise<StudentsResponse> {
    try {
      // Pass pagination params to the backend
      const response = await api.get(
        `/admin/students?page=${page}&limit=${limit}`,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get all levels for dropdown
   */
  async getLevels(): Promise<Level[]> {
    try {
      const response = await api.get("/admin/levels");
      return response.data.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Generate QR code for a specific student
   */
  async generateStudentQRCode(studentId: number) {
    try {
      const response = await api.get(`/admin/students/${studentId}/qr-code`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Generate QR codes for a batch of students
   */
  async generateBatchQRCodes(studentIds: number[]) {
    try {
      const response = await api.post("/admin/students/batch-qr-codes", {
        student_ids: studentIds,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};
