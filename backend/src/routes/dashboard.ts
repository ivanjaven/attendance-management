import { Router, Request, Response } from "express";
import { DashboardService } from "../services/dashboardService";
import {
  authenticateToken,
  requireAdmin,
  requireAdminOrStaff,
  requireTeacher,
} from "../middleware/auth";
import { Teacher } from "../types/auth";

const router = Router();

/**
 * GET /api/dashboard/teacher/summary
 * Get teacher's advisory class attendance summary for today
 */
router.get(
  "/teacher/summary",
  authenticateToken,
  requireTeacher,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const teacher = req.user as Teacher;
      const summary = await DashboardService.getTeacherTodaySummary(teacher);

      res.status(200).json({
        success: true,
        data: summary,
        message: "Teacher summary retrieved successfully",
      });
    } catch (error: any) {
      console.error("Teacher Summary Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get teacher summary",
      });
    }
  }
);

/**
 * GET /api/dashboard/teacher/notifications
 * Get teacher's notifications for today
 */
router.get(
  "/teacher/notifications",
  authenticateToken,
  requireTeacher,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const teacher = req.user as Teacher;
      const notifications = await DashboardService.getTeacherNotifications(
        teacher
      );

      res.status(200).json({
        success: true,
        data: notifications,
        message: "Notifications retrieved successfully",
      });
    } catch (error: any) {
      console.error("Teacher Notifications Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get notifications",
      });
    }
  }
);

/**
 * GET /api/dashboard/teacher/student-records
 * Get all attendance records for teacher's advisory students
 */
router.get(
  "/teacher/student-records",
  authenticateToken,
  requireTeacher,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const teacher = req.user as Teacher;
      const {
        page = 1,
        limit = 20,
        student_id,
        date_from,
        date_to,
      } = req.query;

      const filters = {
        student_id: student_id ? parseInt(student_id as string) : undefined,
        date_from: date_from as string,
        date_to: date_to as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      };

      const records = await DashboardService.getStudentRecords(
        teacher,
        filters
      );

      res.status(200).json({
        success: true,
        data: records,
        message: "Student records retrieved successfully",
      });
    } catch (error: any) {
      console.error("Student Records Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get student records",
      });
    }
  }
);

/**
 * PUT /api/dashboard/teacher/notifications/:id/read
 * Mark notification as read
 */
router.put(
  "/teacher/notifications/:id/read",
  authenticateToken,
  requireTeacher,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const notificationId = parseInt(req.params.id);
      const teacher = req.user as Teacher;

      if (isNaN(notificationId)) {
        res.status(400).json({
          success: false,
          error: "Invalid notification ID",
        });
        return;
      }

      await DashboardService.markNotificationAsRead(
        notificationId,
        teacher.auth_id
      );

      res.status(200).json({
        success: true,
        message: "Notification marked as read",
      });
    } catch (error: any) {
      console.error("Mark Notification Read Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to mark notification as read",
      });
    }
  }
);

/**
 * GET /api/dashboard/school/attendance-stats
 * Get school-wide attendance stats for today (Admin & Staff)
 */
router.get(
  "/school/attendance-stats",
  authenticateToken,
  requireAdminOrStaff,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await DashboardService.getSchoolAttendanceStats();

      res.status(200).json({
        success: true,
        data: stats,
        message: "School attendance stats retrieved successfully",
      });
    } catch (error: any) {
      console.error("School Attendance Stats Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get school attendance stats",
      });
    }
  }
);

/**
 * GET /api/dashboard/admin/students-stats
 * Get all school students stats with filters (Admin only)
 */
router.get(
  "/admin/students-stats",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = 1,
        limit = 20,
        level_id,
        specialization_id,
        section_id,
        search,
      } = req.query;

      const filters = {
        level_id: level_id ? parseInt(level_id as string) : undefined,
        specialization_id: specialization_id
          ? parseInt(specialization_id as string)
          : undefined,
        section_id: section_id ? parseInt(section_id as string) : undefined,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
      };

      const stats = await DashboardService.getSchoolStudentsStats(filters);

      res.status(200).json({
        success: true,
        data: stats,
        message: "School students stats retrieved successfully",
      });
    } catch (error: any) {
      console.error("School Students Stats Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get school students stats",
      });
    }
  }
);

/**
 * PUT /api/dashboard/admin/school-start-time
 * Update school start time for current quarter (Admin only)
 */
router.put(
  "/admin/school-start-time",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { school_start_time } = req.body;

      if (!school_start_time) {
        res.status(400).json({
          success: false,
          error: "school_start_time is required",
        });
        return;
      }

      // Validate time format (HH:MM:SS)
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
      if (!timeRegex.test(school_start_time)) {
        res.status(400).json({
          success: false,
          error: "Invalid time format. Use HH:MM:SS",
        });
        return;
      }

      await DashboardService.updateSchoolStartTime(school_start_time);

      res.status(200).json({
        success: true,
        message: "School start time updated successfully",
      });
    } catch (error: any) {
      console.error("Update School Start Time Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to update school start time",
      });
    }
  }
);

/**
 * GET /api/dashboard/admin/current-quarter
 * Get current quarter info (Admin only)
 */
router.get(
  "/admin/current-quarter",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const quarter = await DashboardService.getCurrentQuarterInfo();

      res.status(200).json({
        success: true,
        data: quarter,
        message: "Current quarter retrieved successfully",
      });
    } catch (error: any) {
      console.error("Get Current Quarter Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get current quarter",
      });
    }
  }
);

export { router as dashboardRoutes };
