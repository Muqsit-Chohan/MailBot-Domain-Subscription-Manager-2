// backend/routes/templates.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');   // ← destructure auth
const Template = require('../models/Template');
const { generateTemplateFromPrompt } = require('../services/aiTemplateService');

router.get('/', auth, async (req, res) => {
  try {
    const templates = await Template.find({ user: req.user._id });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, type, subject, htmlBody, textBody, isDefault } = req.body;
    const template = new Template({
      name,
      type,
      subject,
      htmlBody,
      textBody,
      isDefault,
      user: req.user._id,
    });
    await template.save();
    res.status(201).json(template);
  } catch (err) {
    res.status(500).json({ message: 'Error creating template' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const template = await Template.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true }
    );
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json(template);
  } catch (err) {
    res.status(500).json({ message: 'Error updating template' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const template = await Template.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json({ message: 'Template deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting template' });
  }
});

router.post('/seed-defaults', auth, async (req, res) => {
  const defaults = [
    { type: 'reminder_30', name: '30-Day Expiry Reminder', subject: '{{domain}} will expire in {{days}} days', htmlBody: '<h1>Domain Expiry Notice</h1><p>Dear {{owner}}, your domain {{domain}} will expire on {{expiryDate}}. Please renew to avoid downtime.</p>', textBody: 'Dear {{owner}}, your domain {{domain}} will expire on {{expiryDate}}. Renew now.' },
    { type: 'reminder_7', name: '7-Day Expiry Reminder', subject: '⚠️ {{domain}} expires in one week!', htmlBody: '<h2>One Week Left!</h2><p>Domain {{domain}} expires {{expiryDate}}. Act now.</p>', textBody: 'Domain {{domain}} expires in 7 days.' },
    { type: 'reminder_1', name: 'Final Notice: 1 Day Left', subject: 'URGENT: {{domain}} expires tomorrow!', htmlBody: '<p>{{domain}} expires tomorrow. Renew immediately.</p>', textBody: '{{domain}} expires tomorrow!' },
    { type: 'expired', name: 'Domain Expired', subject: '{{domain}} has expired', htmlBody: '<p>Domain {{domain}} expired on {{expiryDate}}. Your services may be down.</p>', textBody: 'Domain {{domain}} has expired.' },
  ];
  try {
    for (const tpl of defaults) {
      await Template.findOneAndUpdate(
        { user: req.user._id, type: tpl.type, isDefault: true },
        { ...tpl, user: req.user._id },
        { upsert: true, new: true }
      );
    }
    res.json({ message: 'Default templates seeded' });
  } catch (err) {
    res.status(500).json({ message: 'Seed failed' });
  }
});

router.post('/generate', auth, async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ message: 'A valid prompt is required.' });
  }

  try {
    const generatedTemplate = await generateTemplateFromPrompt(prompt);
    res.json(generatedTemplate);
  } catch (error) {
    if (error.status === 503) res.set('Retry-After', '30');
    res.status(error.status === 503 ? 503 : 502).json({ message: error.message });
  }
});

module.exports = router;
