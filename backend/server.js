require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { startCron } = require('./services/cronService');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/settings', require('./routes/settings'));

app.get('/', (req, res) => res.json({ status: 'ok', service: 'mailbot-backend' }));
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

// Cache the MongoDB connection across warm Vercel function invocations.
let connectionPromise;
const connectToDatabase = async () => {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not configured');
  }
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI).catch((err) => {
      connectionPromise = undefined;
      throw err;
    });
  }
  await connectionPromise;
};

// Keep the traditional server behavior for local development.
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  connectToDatabase()
    .then(() => {
      console.log('MongoDB connected');
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        startCron();
      });
    })
    .catch(err => {
      console.error('MongoDB connection failed:', err.message);
      process.exit(1);
    });
}

module.exports = { app, connectToDatabase };
