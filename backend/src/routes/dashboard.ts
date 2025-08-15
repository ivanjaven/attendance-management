import { Router, Request, Response } from "express";
import { DashboardService } from "../services/dashboardService";
import {
  authenticateToken,
  requireAdmin,
  requireTeacher,
  requireStaff,
  requireTeacherOrAdminOrStaff,
} from "../middleware/auth";
import { Teacher, Admin, Staff } from "../types/auth";

const router = Router();

/**
 * GET /api/dashboard/summary
 * Get basic dashboard summary (available to all authenticated users)
 */
router.get(
  "/summary",
  authenticateToken,
  requireTeacherOrAdminOrStaff,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const summary = await DashboardService.getDashboardSummary();

      res.status(200).json({
        success: true,
        data: summary,
        message: "Dashboard summary retrieved successfully",
      });
    } catch (error: any) {
      console.error("Dashboard Summary Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get dashboard summary",
      });
    }
  }
);

/**
 * GET /api/dashboard/teacher
 * Get teacher-specific dashboard data
 */
router.get(
  "/teacher",
  authenticateToken,
  requireTeacher,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const teacher = req.user as Teacher;
      const dashboardData = await DashboardService.getTeacherDashboard(teacher);

      res.status(200).json({
        success: true,
        data: dashboardData,
        message: "Teacher dashboard data retrieved successfully",
      });
    } catch (error: any) {
      console.error("Teacher Dashboard Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get teacher dashboard data",
      });
    }
  }
);

/**
 * GET /api/dashboard/admin
 * Get admin-specific dashboard data
 */
router.get(
  "/admin",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const dashboardData = await DashboardService.getAdminDashboard();

      res.status(200).json({
        success: true,
        data: dashboardData,
        message: "Admin dashboard data retrieved successfully",
      });
    } catch (error: any) {
      console.error("Admin Dashboard Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get admin dashboard data",
      });
    }
  }
);

/**
 * GET /api/dashboard/staff
 * Get staff-specific dashboard data
 */
router.get(
  "/staff",
  authenticateToken,
  requireStaff,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const dashboardData = await DashboardService.getStaffDashboard();

      res.status(200).json({
        success: true,
        data: dashboardData,
        message: "Staff dashboard data retrieved successfully",
      });
    } catch (error: any) {
      console.error("Staff Dashboard Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get staff dashboard data",
      });
    }
  }
);

/**
 * PUT /api/dashboard/notifications/:id/read
 * Mark notification as read (teachers only)
 */
router.put(
  "/notifications/:id/read",
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
