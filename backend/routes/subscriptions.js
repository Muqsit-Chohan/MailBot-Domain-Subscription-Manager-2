const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Subscription = require('../models/Subscription');
const { auth } = require('../middleware/auth');
const SmtpSettings = require('../models/SmtpSettings'); // 👈 import model
const { sendEmail } = require('../services/emailService');

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

// POST /api/subscriptions/lookup (WHOIS/RDAP & SSL Inspection)
router.post('/lookup', auth, async (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ message: 'Domain name is required' });

    const { lookupDomain } = require('../services/whoisService');
    const result = await lookupDomain(domain);
    res.json(result);
  } catch (err) {
    console.error('Lookup error:', err.message);
    res.status(500).json({ message: err.message || 'Failed to lookup domain' });
  }
});

// GET /api/subscriptions/export-csv
router.get('/export-csv', auth, async (req, res) => {
  try {
    const subscriptions = await Subscription.find().sort('-createdAt');
    
    // Build CSV
    const headers = ['Domain', 'Registrar', 'Owner', 'Owner Email', 'Subscription Type', 'Renewal Cycle', 'Expiry Date', 'Cost', 'Currency', 'SSL Valid', 'SSL Expiry', 'Status', 'Auto Renew'];
    const rows = subscriptions.map(sub => [
      `"${sub.domain || ''}"`,
      `"${sub.registrar || ''}"`,
      `"${sub.owner || ''}"`,
      `"${sub.ownerEmail || ''}"`,
      `"${sub.subscriptionType || 'Domain'}"`,
      `"${sub.renewalCycle || 'Yearly'}"`,
      `"${sub.expiryDate ? new Date(sub.expiryDate).toISOString().split('T')[0] : ''}"`,
      sub.cost || 0,
      `"${sub.currency || 'USD'}"`,
      sub.sslValid ? 'Yes' : 'No',
      `"${sub.sslExpiryDate ? new Date(sub.sslExpiryDate).toISOString().split('T')[0] : ''}"`,
      `"${sub.status || 'active'}"`,
      sub.autoRenew ? 'Yes' : 'No',
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=subscriptions-${new Date().toISOString().split('T')[0]}.csv`);
    res.status(200).send(csvContent);
  } catch (err) {
    res.status(500).json({ message: 'Failed to export CSV: ' + err.message });
  }
});

// POST /api/subscriptions/import-csv
router.post('/import-csv', auth, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Valid array of items is required' });
    }

    let createdCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (const item of items) {
      if (!item.domain || !item.ownerEmail || !item.expiryDate) {
        skippedCount++;
        errors.push(`Row missing required fields (domain, ownerEmail, expiryDate): ${JSON.stringify(item.domain || 'unknown')}`);
        continue;
      }

      try {
        await Subscription.create({
          domain: item.domain.trim().toLowerCase(),
          registrar: item.registrar?.trim() || '',
          owner: item.owner?.trim() || '',
          ownerEmail: item.ownerEmail.trim().toLowerCase(),
          ownerEmails: item.ownerEmails || [],
          subscriptionType: item.subscriptionType || 'Domain',
          renewalCycle: item.renewalCycle || 'Yearly',
          expiryDate: new Date(item.expiryDate),
          cost: parseFloat(item.cost) || 0,
          currency: item.currency ? item.currency.toUpperCase() : 'USD',
          reminderIntervals: item.reminderIntervals || [30, 15, 7, 1],
          notes: item.notes || '',
          autoRenew: item.autoRenew === true || item.autoRenew === 'true' || item.autoRenew === 'Yes',
          createdBy: req.user._id,
        });
        createdCount++;
      } catch (insertErr) {
        skippedCount++;
        errors.push(`${item.domain}: ${insertErr.message}`);
      }
    }

    res.json({
      message: `Import completed. ${createdCount} created, ${skippedCount} skipped.`,
      createdCount,
      skippedCount,
      errors,
    });
  } catch (err) {
    res.status(500).json({ message: 'Import failed: ' + err.message });
  }
});

// GET /api/subscriptions/stats
router.get('/stats', auth, async (req, res) => {
  try {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in15Days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

    const [total, active, expired, expiringSoon, allSubs] = await Promise.all([
      Subscription.countDocuments(),
      Subscription.countDocuments({ status: 'active' }),
      Subscription.countDocuments({ status: 'expired' }),
      Subscription.countDocuments({ status: 'expiring_soon' }),
      Subscription.find().select('cost currency renewalCycle sslExpiryDate sslValid'),
    ]);

    // Financial spend projections
    let totalYearlyCost = 0;
    let totalMonthlyCost = 0;
    let sslExpiringCount = 0;

    for (const sub of allSubs) {
      const cost = sub.cost || 0;
      if (sub.renewalCycle === 'Monthly') {
        totalMonthlyCost += cost;
        totalYearlyCost += cost * 12;
      } else if (sub.renewalCycle === 'Quarterly') {
        totalMonthlyCost += cost / 3;
        totalYearlyCost += cost * 4;
      } else {
        // Yearly or Custom default
        totalMonthlyCost += cost / 12;
        totalYearlyCost += cost;
      }

      if (sub.sslExpiryDate && new Date(sub.sslExpiryDate) <= in15Days && new Date(sub.sslExpiryDate) >= now) {
        sslExpiringCount++;
      }
    }

    const recentlyAdded = await Subscription.find()
      .sort('-createdAt')
      .limit(5)
      .select('domain expiryDate status owner cost currency');

    const upcomingExpiries = await Subscription.find({
      expiryDate: { $gte: now, $lte: in30Days },
    }).sort('expiryDate').limit(5).select('domain expiryDate owner ownerEmail status cost currency sslExpiryDate');

    res.json({
      total,
      active,
      expired,
      expiringSoon,
      sslExpiringCount,
      totalYearlyCost: Math.round(totalYearlyCost * 100) / 100,
      totalMonthlyCost: Math.round(totalMonthlyCost * 100) / 100,
      recentlyAdded,
      upcomingExpiries,
    });
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

// POST /api/subscriptions/:id/send-test (DYNAMIC SMTP)
router.post('/:id/send-test', auth, async (req, res) => {
  try {
    const sub = await Subscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ message: 'Subscription not found' });

    // 1. Load user's saved SMTP settings (if any)
    const saved = await SmtpSettings.findOne({ user: req.user._id });

    // 2. Use saved values or fallback to .env
    const host = saved?.host || process.env.SMTP_HOST;
    const port = saved?.port || parseInt(process.env.SMTP_PORT) || 587;
    const secure = saved?.secure || process.env.SMTP_SECURE === 'true';
    const user = saved?.username || process.env.SMTP_USER;
    const pass = saved?.password || process.env.SMTP_PASS;
    const fromEmail = saved?.senderEmail || process.env.SMTP_FROM_EMAIL;
    const fromName = saved?.senderName || process.env.SMTP_FROM_NAME || 'MailBot';

    // 3. Create transporter
    const daysUntil = Math.ceil((new Date(sub.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>MailBot Test Email</h2>
          <p>This is a test email for your domain <strong>${sub.domain}</strong>.</p>
          <p>It will expire in <strong>${daysUntil} day(s)</strong> on ${new Date(sub.expiryDate).toLocaleDateString()}.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 12px;">Sent by MailBot Domain Manager</p>
        </div>`;

    const response = await sendEmail({
      to: sub.ownerEmail,
      from: `"${fromName}" <${fromEmail}>`,
      subject: `Test reminder for ${sub.domain}`,
      html,
      text: `Test email for ${sub.domain}. Expires in ${daysUntil} day(s).`,
      subscription: sub,
      triggeredBy: 'test',
      transportOptions: {
        host,
        port,
        secure,
        auth: { user, pass },
      },
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to send test email');
    }

    res.json({ success: true, message: 'Test email sent!' });
  } catch (error) {
    console.error('Send test error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;