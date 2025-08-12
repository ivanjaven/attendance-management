import { Router, Request, Response } from "express";
import { AttendanceService } from "../services/attendanceService";
import { QRScanRequest } from "../types/attendance";
import { authenticateToken, requireTeacherOrAdmin } from "../middleware/auth";

const router = Router();

/**
 * POST /api/attendance/scan
 * Process QR code scan with automatic time-in/time-out detection and late tracking
 */
router.post(
  "/scan",
  authenticateToken,
  requireTeacherOrAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const scanData: QRScanRequest = req.body;

      if (!scanData.qr_token) {
        res.status(400).json({
          success: false,
          error: "QR token is required",
        });
        return;
      }

      const result = await AttendanceService.processQRScan(scanData);

      const responseData: any = {
        student: result.student,
        attendance_log: result.attendanceLog,
        is_late: result.isLate,
        action: result.action,
      };

      // Add late tracking info if available
      if (result.lateMinutes !== undefined) {
        responseData.late_minutes = result.lateMinutes;
      }
      if (result.totalLateMinutes !== undefined) {
        responseData.total_late_minutes = result.totalLateMinutes;
      }
      if (result.notificationTriggered !== undefined) {
        responseData.notification_triggered = result.notificationTriggered;
      }

      let message = `${result.action.replace("_", " ")} processed successfully`;
      if (result.notificationTriggered) {
        message += ` - Late threshold notification sent`;
      }

      res.status(200).json({
        success: true,
        data: responseData,
        message,
      });
    } catch (error: any) {
      console.error("QR scan error:", error);
      res.status(400).json({
        success: false,
        error: error.message || "Failed to process QR scan",
      });
    }
  }
);

/**
 * GET /api/attendance/student/:studentId/today
 * Get today's attendance for a specific student
 */
router.get(
  "/student/:studentId/today",
  authenticateToken,
  requireTeacherOrAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      res.status(200).json({
        success: true,
        data: null,
        message: "Get today's attendance not implemented yet",
      });
    } catch (error: any) {
      console.error("Get attendance error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get attendance",
      });
    }
  }
);

export { router as attendanceRoutes };
