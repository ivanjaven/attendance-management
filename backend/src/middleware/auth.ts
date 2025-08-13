import { Request, Response, NextFunction } from "express";
import { supabase } from "../config/database";
import { AuthService } from "../services/authService";
import { UserRole, Admin, Teacher, Staff } from "../types/auth";

declare global {
  namespace Express {
    interface Request {
      user?: Admin | Teacher | Staff;
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      res.status(401).json({
        success: false,
        error: "Access token required",
      });
      return;
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({
        success: false,
        error: "Invalid or expired token",
      });
      return;
    }

    const userData = await AuthService.getCurrentUser();

    if (!userData) {
      res.status(401).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    if (userData.status === "Inactive") {
      res.status(403).json({
        success: false,
        error: "Account is inactive",
      });
      return;
    }

    req.user = userData;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Authentication failed",
    });
  }
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    if (!allowedRoles.includes(req.user.type)) {
      res.status(403).json({
        success: false,
        error: "Insufficient permissions",
      });
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole(["Admin"]);
export const requireTeacher = requireRole(["Teacher"]);
export const requireStaff = requireRole(["Staff"]);
export const requireTeacherOrAdmin = requireRole(["Teacher", "Admin"]);
export const requireTeacherOrAdminOrStaff = requireRole([
  "Teacher",
  "Admin",
  "Staff",
]);
