require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const { connectDB } = require("./config/database");
const { initSocket } = require("./utils/socket");

// Crash early if critical secrets are missing
if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is not set.");
  process.exit(1);
}

// Initialize Express app
const app = express();

// Connect to MySQL
connectDB();

// ── Security headers via helmet ──────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // allow image loads
    contentSecurityPolicy: false, // managed by frontend
  }),
);

// ── CORS ─────────────────────────────────────────────────
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000", "http://localhost:5173", "http://localhost:4173"];

app.use(
  cors({
    origin: (origin, cb) => {
      // Requests without an Origin header (curl, Postman, server-to-server proxy)
      // are allowed in development; blocked in production.
      if (!origin) {
        return process.env.NODE_ENV === "production"
          ? cb(null, false)
          : cb(null, true);
      }
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      // Reject with null (no error) — a thrown Error would cause a 500
      cb(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ── Body parsers (with size limits to prevent ReDoS / DoS) ─
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ── Logging ───────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ── Global rate limit (all API routes) ───────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests, please try again later." },
});
app.use("/api/", globalLimiter);

// ── Serve uploaded images as static files ────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API Docs — Swagger UI
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "NFC Platform API Docs",
    swaggerOptions: { persistAuthorization: true },
  }),
);

// Routes
// Global redirector - must be first to catch /t/:tagId and /card/:identifier (no auth required)
app.use("/", require("./routes/redirect"));

// API routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/tenants", require("./routes/tenants"));
app.use("/api/cards", require("./routes/cards"));
app.use("/api/card-templates", require("./routes/cardTemplates"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/manager", require("./routes/manager"));
app.use("/api/tenant", require("./routes/tenantPortal"));
app.use("/api/public", require("./routes/public"));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "NFC Platform API",
    database: "MySQL",
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Multi-Tenant NFC Business Card Platform API",
    version: "2.0.0",
    database: "MySQL",
    endpoints: {
      auth: "/api/auth (login, register, me)",
      redirect: "GET /t/:tagId",
      cards: "/api/cards (protected)",
      tenants: "/api/tenants",
      manager: "/api/manager (admin & manager)",
      upload: "/api/upload (image uploads)",
      health: "/health",
      docs: "/api-docs",
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

// Error handler
app.use((err, req, res, next) => {
  // Log full error internally; never expose stack traces to clients
  console.error("Server error:", err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message || "Internal server error",
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  console.log(`
    ╔═══════════════════════════════════════════════╗
    ║  NFC Platform API Server Running              ║
    ║  Port: ${PORT}                                    ║
    ║  Environment: ${process.env.NODE_ENV || "development"}                    ║
    ║  Database: MySQL                               ║
    ╚═══════════════════════════════════════════════╝
  `);
});

module.exports = app;
