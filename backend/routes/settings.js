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

    const normalizedPassword = password.replace(/\s/g, '');
    const settings = await SmtpSettings.findOneAndUpdate(
      { user: req.user._id },
      { host, port, username, password: normalizedPassword, senderEmail, senderName, secure },
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

    const smtpPort = Number.parseInt(port, 10);
    if (!host || !username || !password || !senderEmail || !Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
      return res.status(400).json({ message: 'Complete SMTP configuration is required' });
    }

    // Gmail app passwords are often copied with spaces between each group.
    const smtpPassword = password.replace(/\s/g, '');

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
        port: smtpPort,
        secure: secure === true || secure === 'true',
        family: 4, // Force IPv4 (disable IPv6)
        connectionTimeout: 20000,
        greetingTimeout: 20000,
        socketTimeout: 20000,
        auth: { user: username, pass: smtpPassword },
      },
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to send test email');
    }

    res.json({ message: 'Test email sent successfully!' });
  } catch (err) {
    console.error('SMTP test email failed:', err);
    res.status(502).json({ message: 'SMTP email failed: ' + err.message });
  }
});

// POST /api/settings/test-webhook – send test webhook alert
router.post('/test-webhook', auth, async (req, res) => {
  try {
    const { webhookUrl } = req.body;
    if (!webhookUrl) {
      return res.status(400).json({ message: 'Webhook URL is required' });
    }

    const { sendWebhookNotification } = require('../services/webhookService');
    const result = await sendWebhookNotification(webhookUrl, {
      title: '🔔 MailBot Webhook Test',
      message: 'This is a test notification from your MailBot Domain Manager. Webhook integration is working successfully!',
      domain: 'test-domain.com',
      daysUntilExpiry: 7,
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    if (!result.success) {
      return res.status(400).json({ message: result.error || 'Failed to trigger webhook' });
    }

    res.json({ message: 'Test webhook sent successfully!' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to test webhook: ' + err.message });
  }
});

module.exports = router;
