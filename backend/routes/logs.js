const express = require('express');
const router = express.Router();
const EmailLog = require('../models/EmailLog');
const Subscription = require('../models/Subscription');
const { auth } = require('../middleware/auth');

// Legacy logs are visible only when their subscription proves ownership.
const ownedLogs = async userId => ({ $or: [
  { user: userId },
  { user: null, subscription: { $in: await Subscription.distinct('_id', { createdBy: userId }) } },
] });

// GET /api/logs
router.get('/', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    const query = { $and: [await ownedLogs(req.user._id)] };
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
      .populate({ path: 'subscription', select: 'domain', match: { createdBy: req.user._id } })
      .populate({ path: 'template', select: 'name', match: { createdBy: req.user._id } });

    res.json({ logs, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/logs/stats
router.get('/stats', auth, async (req, res) => {
  try {
    const query = await ownedLogs(req.user._id);
    const [total, sent, failed, pending] = await Promise.all([
      EmailLog.countDocuments(query),
      EmailLog.countDocuments({ ...query, status: 'sent' }),
      EmailLog.countDocuments({ ...query, status: 'failed' }),
      EmailLog.countDocuments({ ...query, status: 'pending' }),
    ]);
    res.json({ total, sent, failed, pending });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/logs/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const log = await EmailLog.findOneAndDelete({ _id: req.params.id, ...await ownedLogs(req.user._id) });
    if (!log) return res.status(404).json({ message: 'Log not found' });
    res.json({ message: 'Log deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
