import { Router, Request, Response } from "express";
import { DashboardService } from "../services/dashboardService";
import { authenticateToken, requireTeacher } from "../middleware/auth";
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

export { router as dashboardRoutes };
