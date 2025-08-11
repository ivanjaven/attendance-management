import { Router, Request, Response } from "express";
import { AuthService } from "../services/authService";
import { LoginRequest, CreateUserRequest } from "../types/auth";
import { requireAdmin, authenticateToken } from "../middleware/auth";

const router = Router();

/**
 * POST /api/auth/login
 * Login for all user types (Admin, Teacher, Staff)
 */
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const loginData: LoginRequest = req.body;

    if (!loginData.email || !loginData.password) {
      res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
      return;
    }

    const result = await AuthService.login(loginData);

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        token: result.session.access_token,
      },
      message: "Login successful",
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(401).json({
      success: false,
      error: error.message || "Login failed",
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout current user
 */
router.post(
  "/logout",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      await AuthService.logout();

      res.status(200).json({
        success: true,
        message: "Logout successful",
      });
    } catch (error: any) {
      console.error("Logout error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Logout failed",
      });
    }
  }
);

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get(
  "/me",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      res.status(200).json({
        success: true,
        data: req.user,
        message: "User retrieved successfully",
      });
    } catch (error: any) {
      console.error("Get user error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get user",
      });
    }
  }
);

/**
 * POST /api/auth/create-user
 * Admin-only: Create new teacher or staff account
 */
router.post(
  "/create-user",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userData: CreateUserRequest = req.body;

      // Validate required fields
      if (!userData.email || !userData.password || !userData.type) {
        res.status(400).json({
          success: false,
          error: "Email, password, and type are required",
        });
        return;
      }

      // Validate role-specific required fields
      if (userData.type === "Admin" || userData.type === "Staff") {
        if (!userData.name) {
          res.status(400).json({
            success: false,
            error: `${userData.type} name is required`,
          });
          return;
        }
      }

      if (userData.type === "Teacher") {
        if (!userData.first_name || !userData.last_name) {
          res.status(400).json({
            success: false,
            error: "Teacher first name and last name are required",
          });
          return;
        }
      }

      const newUser = await AuthService.createUser(userData);

      res.status(201).json({
        success: true,
        data: newUser,
        message: `${userData.type} account created successfully`,
      });
    } catch (error: any) {
      console.error("Create user error:", error);
      res.status(400).json({
        success: false,
        error: error.message || "Failed to create user",
      });
    }
  }
);

/**
 * GET /api/auth/users
 * Admin-only: Get all users (for user management)
 */
router.get(
  "/users",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      // TODO: Implement user listing service
      res.status(200).json({
        success: true,
        data: [],
        message: "User listing not implemented yet",
      });
    } catch (error: any) {
      console.error("Get users error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get users",
      });
    }
  }
);

export { router as authRoutes };
