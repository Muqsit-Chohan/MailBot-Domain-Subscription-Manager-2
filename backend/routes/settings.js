const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const { verifyConnection } = require('../services/emailService');
const { processReminders } = require('../services/cronService');

// POST /api/settings/test-email
router.post('/test-email', auth, async (req, res) => {
  try {
    const result = await verifyConnection();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/settings/run-cron
router.post('/run-cron', auth, adminOnly, async (req, res) => {
  try {
    const result = await processReminders();
    res.json({ message: 'Cron job executed', ...result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
