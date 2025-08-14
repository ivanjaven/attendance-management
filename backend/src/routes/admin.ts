import { Router, Request, Response } from "express";
import { QRCodeGenerator } from "../utils/qrCodeGenerator";
import { supabase } from "../config/database";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

interface StudentWithRelations {
  id: number;
  student_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  level_id: number;
  specialization_id: number;
  section_id: number;
  created_at: string;
  levels: { level: number } | null;
  sections: { section_name: string } | null;
  specializations: { specialization_name: string } | null;
}

/**
 * GET /api/admin/students
 * Get all students for admin purposes
 */
router.get(
  "/students",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { data: students, error } = (await supabase
        .from("students")
        .select(
          `
          id,
          student_id,
          first_name,
          last_name,
          middle_name,
          level_id,
          specialization_id,
          section_id,
          created_at,
          levels!inner(level),
          sections!inner(section_name),
          specializations!inner(specialization_name)
        `
        )
        .is("deleted_at", null)
        .order("student_id")) as {
        data: StudentWithRelations[] | null;
        error: any;
      };

      if (error) {
        console.error("Database error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to fetch students",
        });
        return;
      }

      // Transform the data to flatten the relations
      const transformedStudents =
        students?.map((student: StudentWithRelations) => ({
          id: student.id,
          student_id: student.student_id,
          first_name: student.first_name,
          last_name: student.last_name,
          middle_name: student.middle_name,
          level_id: student.level_id,
          level: student.levels?.level,
          specialization_id: student.specialization_id,
          specialization_name: student.specializations?.specialization_name,
          section_id: student.section_id,
          section_name: student.sections?.section_name,
          created_at: student.created_at,
        })) || [];

      res.status(200).json({
        success: true,
        data: transformedStudents,
        message: "Students retrieved successfully",
      });
    } catch (error: any) {
      console.error("Get Students Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get students",
      });
    }
  }
);

/**
 * GET /api/admin/levels
 * Get all levels for dropdown
 */
router.get(
  "/levels",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { data: levels, error } = await supabase
        .from("levels")
        .select("id, level")
        .is("deleted_at", null)
        .order("level");

      if (error) {
        console.error("Database error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to fetch levels",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: levels || [],
        message: "Levels retrieved successfully",
      });
    } catch (error: any) {
      console.error("Get Levels Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get levels",
      });
    }
  }
);

/**
 * GET /api/admin/students/:studentId/qr-code
 * Generate QR code for a specific student
 */
router.get(
  "/students/:studentId/qr-code",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { studentId } = req.params;

      // Get student's qr_token from database
      const { data: student, error } = await supabase
        .from("students")
        .select("qr_token, student_id, first_name, last_name")
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
          student_name: `${student.first_name} ${student.last_name}`,
          qr_code_image: qrCodeImage,
        },
        message: "QR code generated successfully",
      });
    } catch (error: any) {
      console.error("QR Generation Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to generate QR code",
      });
    }
  }
);

/**
 * POST /api/admin/students/batch-qr-codes
 * Generate QR codes for multiple students
 */
router.post(
  "/students/batch-qr-codes",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { student_ids } = req.body; // Array of student IDs

      if (!student_ids || !Array.isArray(student_ids)) {
        res.status(400).json({
          success: false,
          error: "student_ids array is required",
        });
        return;
      }

      // Get students data
      const { data: students, error } = await supabase
        .from("students")
        .select("id, qr_token, student_id, first_name, last_name")
        .in("id", student_ids)
        .is("deleted_at", null);

      if (error || !students) {
        res.status(500).json({
          success: false,
          error: "Failed to fetch students",
        });
        return;
      }

      const qrCodes = await QRCodeGenerator.generateBatchQRCodes(students);

      res.status(200).json({
        success: true,
        data: qrCodes,
        message: `Generated ${qrCodes.length} QR codes`,
      });
    } catch (error: any) {
      console.error("Batch QR Generation Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to generate batch QR codes",
      });
    }
  }
);

export { router as adminRoutes };
