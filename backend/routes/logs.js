const express = require('express');
const router = express.Router();
const EmailLog = require('../models/EmailLog');
const { auth } = require('../middleware/auth');

// GET /api/logs
router.get('/', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (search) {
      query.$or = [
        { to: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { domain: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await EmailLog.countDocuments(query);
    const logs = await EmailLog.find(query)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('subscription', 'domain')
      .populate('template', 'name');

    res.json({ logs, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/logs/stats
router.get('/stats', auth, async (req, res) => {
  try {
    const [total, sent, failed, pending] = await Promise.all([
      EmailLog.countDocuments(),
      EmailLog.countDocuments({ status: 'sent' }),
      EmailLog.countDocuments({ status: 'failed' }),
      EmailLog.countDocuments({ status: 'pending' }),
    ]);
    res.json({ total, sent, failed, pending });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/logs/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await EmailLog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Log deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
