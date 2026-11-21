const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const healthRoutes = require("./routes/healthRoutes");
const schoolRoutes = require("./modules/schools/schoolRoutes");
const authRoutes = require("./modules/users/authRoutes");
const studentRoutes = require("./modules/students/studentRoutes");
const attendanceRoutes = require("./modules/attendance/attendanceRoutes");
const faceRecognitionRoutes = require("./modules/faceRecognition/faceRecognitionRoutes");
const authorizedDeviceRoutes = require("./modules/deviceManagement/authorizedDeviceRoutes");
const assignmentRoutes = require("./modules/assignments/assignmentRoutes");
const centralMonitoringRoutes = require("./modules/centralMonitoring/centralMonitoringRoutes");
const auditRoutes = require("./modules/audit/auditRoutes");
const protectedTestRoutes = require("./routes/protectedTestRoutes");
const {
  notFound,
  errorHandler,
} = require("./middlewares/errorMiddleware");

const app = express();

// Security headers

app.use(
  helmet({
    // Face model assets are public static resources consumed by the allowlisted client origin.
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "script-src": ["'self'"],
        "script-src-attr": ["'none'"],
      },
    },
  })
);


// Development setup.
// Production-এ অনুমোদিত frontend origin নির্দিষ্ট করতে হবে।
const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Non-browser clients may not send an Origin header.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// Request body parsing
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
// Serve face recognition models
const path = require("path");

// Serve public frontend files
app.use(express.static(path.join(__dirname, "../public")));

// API routes
app.use("/api/health", healthRoutes);
app.use("/api/schools", schoolRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/face", faceRecognitionRoutes);
app.use("/api/devices", authorizedDeviceRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/central", centralMonitoringRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/test", protectedTestRoutes);

// Unknown routes and error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;