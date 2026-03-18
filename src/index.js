require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const driverRoutes = require('./routes/driver');
const rideRoutes = require('./routes/rides');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message, err.stack?.split('\n').slice(0, 3).join('\n'));
  res.status(500).json({ error: err.message || 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`EcoMove API running on http://localhost:${PORT}`);
});
