require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const { connectDB } = require("./config/database");
const { initSocket } = require("./utils/socket");

// Initialize Express app
const app = express();

// Connect to MySQL
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Serve uploaded images as static files
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
  console.error("Server error:", err);
  res.status(500).json({
    success: false,
    error: " Internal server error",
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
