import { ref } from "vue";
import api from "@/services/api";

export interface TeacherSummary {
  advisory_class: string;
  total_students: number;
  present_today: number;
  absent_today: number;
  late_today: number;
  attendance_percentage: number;
}

export interface TeacherNotification {
  id: number;
  student_name: string;
  student_id: string;
  type: "LATE_TODAY" | "EXCEEDED_70_MINUTES" | "CONSECUTIVE_ABSENCE";
  message: string;
  sent_at: Date | string;
  status: "UNREAD" | "READ";
  metadata?: {
    late_minutes?: number;
    total_late_minutes?: number;
    consecutive_days?: number;
  };
}

export interface StudentRecord {
  id: number;
  student_name: string;
  student_id: string;
  attendance_date: Date | string;
  time_in?: string;
  time_out?: string;
  is_late: boolean;
  late_minutes: number;
  status: "PRESENT" | "LATE" | "ABSENT";
}

export interface StudentRecordsResponse {
  records: StudentRecord[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_records: number;
    per_page: number;
  };
}

export interface StudentRecordsFilter {
  student_id?: number;
  date_from?: string;
  date_to?: string;
  page: number;
  limit: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export const useDashboardApi = () => {
  const loading = ref(false);
  const error = ref<string | undefined>(undefined);

  const handleApiCall = async <T>(
    apiCall: () => Promise<any>
  ): Promise<ApiResponse<T>> => {
    loading.value = true;
    error.value = undefined;

    try {
      const response = await apiCall();
      return response.data;
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error || err.message || "An error occurred";
      error.value = errorMessage;
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      loading.value = false;
    }
  };

  // Teacher Dashboard APIs
  const getTeacherSummary = async (): Promise<ApiResponse<TeacherSummary>> => {
    return handleApiCall(() => api.get("/dashboard/teacher/summary"));
  };

  const getTeacherNotifications = async (): Promise<
    ApiResponse<TeacherNotification[]>
  > => {
    return handleApiCall(() => api.get("/dashboard/teacher/notifications"));
  };

  const getStudentRecords = async (
    filters: StudentRecordsFilter
  ): Promise<ApiResponse<StudentRecordsResponse>> => {
    const params = new URLSearchParams();

    params.append("page", filters.page.toString());
    params.append("limit", filters.limit.toString());

    if (filters.student_id) {
      params.append("student_id", filters.student_id.toString());
    }
    if (filters.date_from && filters.date_from.trim()) {
      params.append("date_from", filters.date_from);
    }
    if (filters.date_to && filters.date_to.trim()) {
      params.append("date_to", filters.date_to);
    }

    return handleApiCall(() =>
      api.get(`/dashboard/teacher/student-records?${params.toString()}`)
    );
  };

  const markNotificationAsRead = async (
    notificationId: number
  ): Promise<ApiResponse<void>> => {
    return handleApiCall(() =>
      api.put(`/dashboard/teacher/notifications/${notificationId}/read`)
    );
  };

  // Admin/Staff Dashboard APIs
  const getSchoolAttendanceStats = async (): Promise<ApiResponse<any>> => {
    return handleApiCall(() => api.get("/dashboard/school/attendance-stats"));
  };

  const getSchoolStudentsStats = async (
    filters: any
  ): Promise<ApiResponse<any>> => {
    const params = new URLSearchParams();

    params.append("page", filters.page.toString());
    params.append("limit", filters.limit.toString());

    if (filters.level_id) {
      params.append("level_id", filters.level_id.toString());
    }
    if (filters.specialization_id) {
      params.append("specialization_id", filters.specialization_id.toString());
    }
    if (filters.section_id) {
      params.append("section_id", filters.section_id.toString());
    }
    if (filters.search && filters.search.trim()) {
      params.append("search", filters.search);
    }

    return handleApiCall(() =>
      api.get(`/dashboard/admin/students-stats?${params.toString()}`)
    );
  };

  const updateSchoolStartTime = async (
    schoolStartTime: string
  ): Promise<ApiResponse<void>> => {
    return handleApiCall(() =>
      api.put("/dashboard/admin/school-start-time", {
        school_start_time: schoolStartTime,
      })
    );
  };

  const getCurrentQuarterInfo = async (): Promise<ApiResponse<any>> => {
    return handleApiCall(() => api.get("/dashboard/admin/current-quarter"));
  };

  return {
    loading,
    error,
    // Teacher APIs
    getTeacherSummary,
    getTeacherNotifications,
    getStudentRecords,
    markNotificationAsRead,
    // Admin/Staff APIs
    getSchoolAttendanceStats,
    getSchoolStudentsStats,
    updateSchoolStartTime,
    getCurrentQuarterInfo,
  };
};
