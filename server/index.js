const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const jobsRoutes = require('./routes/jobs');
const applicationsRoutes = require('./routes/applications');
const notificationsRoutes = require('./routes/notifications');
const messagesRoutes = require('./routes/messages');
const resourcesRoutes = require('./routes/resources');
const interviewsRoutes = require('./routes/interviews');
const trainerRoutes = require('./routes/trainer');
const analyticsRoutes = require('./routes/analytics');
const managerRoutes = require('./routes/manager');

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Middleware
app.use(cors({
  origin: allowedOrigins.length
    ? (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Origin is not allowed by CORS'));
      }
    : true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api', applicationsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/interviews', interviewsRoutes);
app.use('/api/trainer', trainerRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/manager', managerRoutes);

// Root / Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'QTalk NextGen API',
    time: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚀 QTalk NextGen Server running on http://localhost:${PORT}`);
    console.log(`📡 Ready for client connections and demo operations\n`);
  });
}

module.exports = app;
