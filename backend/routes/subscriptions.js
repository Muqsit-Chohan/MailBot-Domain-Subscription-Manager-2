const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Subscription = require('../models/Subscription');
const { auth } = require('../middleware/auth');

// GET /api/subscriptions
router.get('/', auth, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (search) {
      query.$or = [
        { domain: { $regex: search, $options: 'i' } },
        { owner: { $regex: search, $options: 'i' } },
        { ownerEmail: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Subscription.countDocuments(query);
    const subscriptions = await Subscription.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('createdBy', 'name email');

    res.json({ subscriptions, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/subscriptions/stats
router.get('/stats', auth, async (req, res) => {
  try {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [total, active, expired, expiringSoon] = await Promise.all([
      Subscription.countDocuments(),
      Subscription.countDocuments({ status: 'active' }),
      Subscription.countDocuments({ status: 'expired' }),
      Subscription.countDocuments({ status: 'expiring_soon' }),
    ]);

    const recentlyAdded = await Subscription.find()
      .sort('-createdAt')
      .limit(5)
      .select('domain expiryDate status owner');

    const upcomingExpiries = await Subscription.find({
      expiryDate: { $gte: now, $lte: in30Days },
    }).sort('expiryDate').limit(5).select('domain expiryDate owner ownerEmail status');

    res.json({ total, active, expired, expiringSoon, recentlyAdded, upcomingExpiries });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/subscriptions/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const sub = await Subscription.findById(req.params.id).populate('createdBy', 'name email');
    if (!sub) return res.status(404).json({ message: 'Subscription not found' });
    res.json(sub);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/subscriptions
router.post('/', auth, [
  body('domain').trim().notEmpty().withMessage('Domain is required'),
  body('ownerEmail').isEmail().withMessage('Valid owner email required'),
  body('expiryDate').isDate().withMessage('Valid expiry date required'),
  body('reminderIntervals').isArray().withMessage('Reminder intervals must be an array'),
  body('reminderIntervals.*').isInt({ min: 1 }).withMessage('Reminder intervals must be positive integers'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const sub = await Subscription.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(sub);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Domain already exists' });
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/subscriptions/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const sub = await Subscription.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!sub) return res.status(404).json({ message: 'Subscription not found' });
    res.json(sub);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/subscriptions/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const sub = await Subscription.findByIdAndDelete(req.params.id);
    if (!sub) return res.status(404).json({ message: 'Subscription not found' });
    res.json({ message: 'Subscription deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/subscriptions/:id/send-test
router.post('/:id/send-test', auth, async (req, res) => {
  try {
    const sub = await Subscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ message: 'Subscription not found' });

    const { sendReminderEmail } = require('../services/emailService');
    const daysUntilExpiry = Math.ceil((new Date(sub.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    const result = await sendReminderEmail(sub, Math.max(daysUntilExpiry, 1));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
