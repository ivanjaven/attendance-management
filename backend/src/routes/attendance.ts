// backend/src/routes/attendance.ts
import { Router, Request, Response } from "express";
import { AttendanceService } from "../services/attendanceService";
import { QRScanRequest } from "../types/attendance";
import {
  authenticateToken,
  requireTeacherOrAdminOrStaff,
} from "../middleware/auth";

const router = Router();

router.post(
  "/scan",
  authenticateToken,
  requireTeacherOrAdminOrStaff,
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
      res.status(400).json({
        success: false,
        error: error.message || "Failed to process QR scan",
      });
    }
  }
);

router.get(
  "/student/:studentId/today",
  authenticateToken,
  requireTeacherOrAdminOrStaff,
  async (req: Request, res: Response): Promise<void> => {
    try {
      res.status(200).json({
        success: true,
        data: null,
        message: "Get today's attendance not implemented yet",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get attendance",
      });
    }
  }
);

export { router as attendanceRoutes };
