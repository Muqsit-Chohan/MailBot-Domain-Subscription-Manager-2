const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const SmtpSettings = require('../models/SmtpSettings');
const { sendEmail } = require('../services/emailService');

// GET /api/settings/smtp – load saved SMTP config
router.get('/smtp', auth, async (req, res) => {
  try {
    const settings = await SmtpSettings.findOne({ user: req.user._id });
    res.json(settings || {});
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/settings/smtp – save SMTP config
router.put('/smtp', auth, async (req, res) => {
  try {
    const { host, port, username, password, senderEmail, senderName, secure } = req.body;
    if (!host || !port || !username || !password || !senderEmail) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const settings = await SmtpSettings.findOneAndUpdate(
      { user: req.user._id },
      { host, port, username, password, senderEmail, senderName, secure },
      { upsert: true, new: true }
    );

    res.json({ message: 'SMTP configuration saved!', settings });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Manually run cron
router.post('/run-cron', auth, async (req, res) => {
  try {
    const result = await require('../services/scheduler').processReminders();
    res.json({ sent: result.sent, failed: result.failed, error: result.error || null });
  } catch (err) {
    res.status(500).json({ message: 'Failed to run cron: ' + err.message });
  }
});

// POST /api/settings/test-email – send test email
router.post('/test-email', auth, async (req, res) => {
  try {
    const { host, port, username, password, senderEmail, senderName, secure, to } = req.body;

    if (!to) {
      return res.status(400).json({ message: 'Recipient email required' });
    }

    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>✅ MailBot SMTP Test</h2>
          <p>This is a test email from your MailBot SMTP configuration.</p>
          <p>If you received this, your settings are correct!</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 12px;">Sent at: ${new Date().toLocaleString()}</p>
        </div>
      `;

    const response = await sendEmail({
      to,
      from: `"${senderName || 'MailBot'}" <${senderEmail}>`,
      subject: 'MailBot – Test Email',
      html,
      text: 'MailBot SMTP test email – Your configuration is working!',
      triggeredBy: 'test',
      transportOptions: {
        host,
        port: parseInt(port),
        secure: secure,
        auth: { user: username, pass: password },
      },
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to send test email');
    }

    res.json({ message: 'Test email sent successfully!' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send test email: ' + err.message });
  }
});

module.exports = router;