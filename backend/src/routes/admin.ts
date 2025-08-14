// backend/src/routes/admin.ts (or create new route file)
import { Router, Request, Response } from "express";
import { QRCodeGenerator } from "../utils/qrCodeGenerator";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

router.get(
  "/students/:studentId/qr-code",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { studentId } = req.params;

      // Get student's qr_token from database
      const { supabase } = await import("../config/database");
      const { data: student, error } = await supabase
        .from("students")
        .select("qr_token, student_id")
        .eq("id", studentId)
        .is("deleted_at", null)
        .single();

      if (error || !student) {
        res.status(404).json({
          success: false,
          error: "Student not found",
        });
        return;
      }

      const qrCodeImage = await QRCodeGenerator.generateStudentQRCode(
        student.qr_token
      );

      res.status(200).json({
        success: true,
        data: {
          student_id: student.student_id,
          qr_code_image: qrCodeImage,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || "Failed to generate QR code",
      });
    }
  }
);

export { router as adminRoutes };
