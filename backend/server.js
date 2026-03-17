require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { connectDB, sequelize } = require('./config/database');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routes
// Global redirector - must be first to catch /t/:tagId (no auth required)
app.use('/t', require('./routes/redirect'));

// API routes
app.use('/api/auth', require('./routes/auth')); // Authentication routes
app.use('/api/tenants', require('./routes/tenants'));
app.use('/api/cards', require('./routes/cards')); // Protected routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'NFC Platform API',
    database: 'MySQL'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Multi-Tenant NFC Business Card Platform API',
    version: '2.0.0',
    database: 'MySQL',
    endpoints: {
      auth: '/api/auth (register, login, me)',
      redirect: 'GET /t/:tagId',
      cards: '/api/cards (protected)',
      tenants: '/api/tenants',
      health: '/health'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error:' Internal server error'
  });
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  let databaseConnected = false;

  try {
    await connectDB();
    databaseConnected = true;

    await new Promise((resolve, reject) => {
      const server = app.listen(PORT, resolve);
      server.once('error', reject);
    });

    console.log(`
    ╔═══════════════════════════════════════════════╗
    ║  NFC Platform API Server Running              ║
    ║  Port: ${PORT}                                    ║
    ║  Environment: ${process.env.NODE_ENV || 'development'}                    ║
    ║  Database: MySQL                               ║
    ╚═══════════════════════════════════════════════╝
  `);
  } catch (error) {
    if (databaseConnected) {
      await sequelize.close().catch(() => null);
    }

    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Stop the existing backend process or change PORT in backend/.env.`);
    } else {
      console.error('Failed to start server:', error);
    }

    process.exit(1);
  }
};

startServer();

module.exports = app;
