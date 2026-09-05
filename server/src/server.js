const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const config = require('./config/env');
const prisma = require('./config/prisma');
const { notFound, errorHandler } = require('./middleware/error.middleware');

const app = express();
const PORT = config.PORT;

// Core Middlewares
app.use(
  cors({
    origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(cookieParser());

// Request Logging
if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health Check Endpoint
app.get(['/health', '/api/v1/health'], async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = `unavailable (${err.message})`;
  }

  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      database: dbStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

// Root API Endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Odoo Hackathon 2026 API',
      version: '1.0.0',
      status: 'active',
      environment: config.NODE_ENV,
    },
  });
});

// ==========================================
// MOUNT FEATURE MODULES HERE
// ==========================================
const authRoutes = require('./modules/auth/auth.routes');
const employeeRoutes = require('./modules/employee/employee.routes');
const departmentRoutes = require('./modules/department/department.routes');
const jobPositionRoutes = require('./modules/jobPosition/jobPosition.routes');

app.use(['/api/v1/auth', '/api/auth'], authRoutes);
app.use(['/api/v1/employees', '/api/employees'], employeeRoutes);
app.use(['/api/v1/departments', '/api/departments'], departmentRoutes);
app.use(['/api/v1/job-positions', '/api/job-positions'], jobPositionRoutes);

// Global Error Handling
app.use(notFound);
app.use(errorHandler);

// Start Server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running in ${config.NODE_ENV} mode on port ${PORT}`);
  console.log(`📡 Health check available at http://localhost:${PORT}/api/v1/health`);
});

// Graceful Shutdown
const handleShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log('Database connection closed.');
    } catch (e) {
      console.error('Error disconnecting from database:', e);
    }
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

module.exports = { app, server };
