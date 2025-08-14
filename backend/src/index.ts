import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { testConnection } from "./config/database";

import { authRoutes } from "./routes/auth";
import { attendanceRoutes } from "./routes/attendance";
import { adminRoutes } from "./routes/admin";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(morgan("combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/api/health", async (req, res) => {
  const dbConnected = await testConnection();
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "attendance-system-api",
    database: dbConnected ? "Connected" : "Disconnected",
  });
});

// Auth routes
app.use("/api/auth", authRoutes);

// Attendance routes
app.use("/api/attendance", attendanceRoutes);

// Admin routes
app.use("/api/admin", adminRoutes);

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

// Start server with database connection test
app.listen(PORT, async () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log("🔌 Testing database connection...");
  await testConnection();
});
