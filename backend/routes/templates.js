const express = require('express');
const router = express.Router();
const EmailTemplate = require('../models/EmailTemplate');
const { auth } = require('../middleware/auth');

// GET /api/templates
router.get('/', auth, async (req, res) => {
  try {
    const templates = await EmailTemplate.find().populate('createdBy', 'name email').sort('-createdAt');
    res.json(templates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/templates/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const tmpl = await EmailTemplate.findById(req.params.id);
    if (!tmpl) return res.status(404).json({ message: 'Template not found' });
    res.json(tmpl);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/templates
router.post('/', auth, async (req, res) => {
  try {
    if (req.body.isDefault) {
      await EmailTemplate.updateMany({ type: req.body.type }, { isDefault: false });
    }
    const tmpl = await EmailTemplate.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(tmpl);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Template name already exists' });
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/templates/:id
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.body.isDefault) {
      await EmailTemplate.updateMany({ type: req.body.type, _id: { $ne: req.params.id } }, { isDefault: false });
    }
    const tmpl = await EmailTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!tmpl) return res.status(404).json({ message: 'Template not found' });
    res.json(tmpl);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/templates/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const tmpl = await EmailTemplate.findByIdAndDelete(req.params.id);
    if (!tmpl) return res.status(404).json({ message: 'Template not found' });
    res.json({ message: 'Template deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/templates/seed-defaults - seed default templates
router.post('/seed-defaults', auth, async (req, res) => {
  try {
    const defaults = [
      {
        name: '30-Day Reminder', type: 'reminder_30', isDefault: true,
        subject: '⚠️ Domain {{domain}} expires in 30 days',
        htmlBody: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
<h2 style="color:#f59e0b">30-Day Domain Expiry Notice</h2>
<p>Hello {{owner}},</p>
<p>Your domain <strong>{{domain}}</strong> will expire in <strong>30 days</strong> on <strong>{{expiryDate}}</strong>.</p>
<p>Please contact your registrar <strong>{{registrar}}</strong> to renew your domain.</p>
<hr/><p style="color:#9ca3af;font-size:12px">MailBot Automated Reminder</p></div>`,
        variables: ['domain', 'owner', 'expiryDate', 'registrar'],
      },
      {
        name: '15-Day Reminder', type: 'reminder_15', isDefault: true,
        subject: '🔔 Urgent: Domain {{domain}} expires in 15 days',
        htmlBody: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
<h2 style="color:#f97316">15-Day Expiry Warning</h2>
<p>Hello {{owner}},</p>
<p><strong>Action required!</strong> Your domain <strong>{{domain}}</strong> expires in <strong>15 days</strong> on <strong>{{expiryDate}}</strong>.</p>
<p>Registrar: <strong>{{registrar}}</strong></p>
<hr/><p style="color:#9ca3af;font-size:12px">MailBot Automated Reminder</p></div>`,
        variables: ['domain', 'owner', 'expiryDate', 'registrar'],
      },
      {
        name: '7-Day Reminder', type: 'reminder_7', isDefault: true,
        subject: '🚨 Critical: Domain {{domain}} expires in 7 days!',
        htmlBody: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;border-top:4px solid #ef4444">
<h2 style="color:#ef4444">⚠️ 7-Day Critical Warning</h2>
<p>Hello {{owner}},</p>
<p>URGENT: Your domain <strong>{{domain}}</strong> expires in just <strong>7 days</strong> on <strong>{{expiryDate}}</strong>.</p>
<p>Renew immediately through your registrar: <strong>{{registrar}}</strong></p>
<hr/><p style="color:#9ca3af;font-size:12px">MailBot Automated Reminder</p></div>`,
        variables: ['domain', 'owner', 'expiryDate', 'registrar'],
      },
      {
        name: '1-Day Reminder', type: 'reminder_1', isDefault: true,
        subject: '🔴 FINAL NOTICE: Domain {{domain}} expires TOMORROW!',
        htmlBody: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;border-top:4px solid #7c3aed">
<h2 style="color:#7c3aed">🔴 FINAL EXPIRY NOTICE</h2>
<p>Hello {{owner}},</p>
<p>This is your FINAL notice. Domain <strong>{{domain}}</strong> expires <strong>TOMORROW</strong> on <strong>{{expiryDate}}</strong>.</p>
<p>If you do not renew immediately, your domain will expire and services may go offline.</p>
<p>Registrar: <strong>{{registrar}}</strong></p>
<hr/><p style="color:#9ca3af;font-size:12px">MailBot Automated Reminder</p></div>`,
        variables: ['domain', 'owner', 'expiryDate', 'registrar'],
      },
    ];

    const results = [];
    for (const d of defaults) {
      const existing = await EmailTemplate.findOne({ type: d.type, name: d.name });
      if (!existing) {
        const created = await EmailTemplate.create({ ...d, createdBy: req.user._id });
        results.push(created);
      }
    }
    res.json({ message: `Seeded ${results.length} default templates`, templates: results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
