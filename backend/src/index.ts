import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { testConnection, supabase } from "./config/database";

import { authRoutes } from "./routes/auth";
import { attendanceRoutes } from "./routes/attendance";
import { adminRoutes } from "./routes/admin";
import { dashboardRoutes } from "./routes/dashboard";

// SMS Integration imports
import { initializeSMSEventHandler } from "./services/SMSEventHandler";
import { validateSMSConfig } from "./config/sms.config";

// Load environment variables FIRST
dotenv.config();

// Set timezone from environment variable
if (process.env.TZ) {
  process.env.TZ = process.env.TZ;
}

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
    localTime: new Date().toLocaleString("en-US", {
      timeZone: process.env.TZ || "UTC",
    }),
    timezone: process.env.TZ || "UTC",
    service: "attendance-system-api",
    database: dbConnected ? "Connected" : "Disconnected",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/dashboard", dashboardRoutes);

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

app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

// Start server with database connection test and SMS initialization
app.listen(PORT, async () => {
  console.log("=".repeat(80));
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Timezone: ${process.env.TZ || "UTC"}`);
  console.log("=".repeat(80));

  // Test database connection
  console.log("🔌 Testing database connection...");
  const dbConnected = await testConnection();

  if (!dbConnected) {
    console.error("⚠️  Server started but database connection failed!");
  }

  console.log("=".repeat(80));

  // Initialize SMS Event Handler
  try {
    console.log("📱 Initializing SMS Event Handler...");

    // Validate SMS configuration
    const smsConfigValid = validateSMSConfig();

    if (smsConfigValid) {
      // Initialize the event handler with Supabase client
      const smsHandler = initializeSMSEventHandler(supabase);
      console.log("✅ SMS Event Handler initialized successfully");
      console.log(`📋 SMS Status:`, smsHandler.getStatus());
    } else {
      console.log(
        "⚠️  SMS Event Handler not initialized (configuration invalid or disabled)"
      );
    }
  } catch (error) {
    console.error("❌ Failed to initialize SMS Event Handler:", error);
    console.log("⚠️  Server will continue without SMS functionality");
  }

  console.log("=".repeat(80));
  console.log("✅ Server initialization complete!");
  console.log("=".repeat(80));
});
