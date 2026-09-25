const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const SmtpSettings = require('../models/SmtpSettings');
const { sendEmail, isResendEnabled, verifyConnection, normalizeSmtpPassword } = require('../services/emailService');

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

    const smtpPort = Number(port);
    if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
      return res.status(400).json({ message: 'SMTP port must be between 1 and 65535' });
    }
    const config = { host: host.trim(), port: smtpPort, username: username.trim(),
      password: normalizeSmtpPassword(host, password), senderEmail: senderEmail.trim(),
      senderName, secure: smtpPort === 465 };
    if (!config.host || !config.username || !config.password || !config.senderEmail) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const verification = await verifyConnection(config);
    if (!verification.success) {
      return res.status(502).json({ message: verification.error });
    }
    const settings = await SmtpSettings.findOneAndUpdate(
      { user: req.user._id },
      config,
      { upsert: true, new: true }
    );

    res.json({ message: 'SMTP connection verified and configuration saved!', settings });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Manually run cron
router.post('/run-cron', auth, async (req, res) => {
  try {
    const result = await require('../services/cronService').processReminders({ userId: req.user._id });
    res.json({ ...result, error: result.error || null });
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
    if (!isResendEnabled() && (!host || !username || !password || !senderEmail || !Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535)) {
      return res.status(400).json({ message: 'Complete SMTP configuration is required' });
    }

    // Gmail app passwords are often copied with spaces between each group.
    const smtpPassword = normalizeSmtpPassword(host, password);
    const useSecureConnection = smtpPort === 465;

    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>✅ MailMate SMTP Test</h2>
          <p>This is a test email from your MailMate SMTP configuration.</p>
          <p>If you received this, your settings are correct!</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 12px;">Sent at: ${new Date().toLocaleString()}</p>
        </div>
      `;

    const response = await sendEmail({
      to,
      from: `"${senderName || 'MailMate'}" <${senderEmail}>`,
      subject: 'MailMate – Test Email',
      html,
      text: 'MailMate SMTP test email – Your configuration is working!',
      triggeredBy: 'test',
      userId: req.user._id,
      transportOptions: {
        host,
        port: smtpPort,
        secure: useSecureConnection,
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
      title: '🔔 MailMate Webhook Test',
      message: 'This is a test notification from your MailMate Domain Manager. Webhook integration is working successfully!',
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

// POST /api/settings/test-whatsapp – send test WhatsApp alert
router.post('/test-whatsapp', auth, async (req, res) => {
  try {
    const { whatsappNumber, whatsappApiKey } = req.body;
    if (!whatsappNumber || !whatsappApiKey) {
      return res.status(400).json({ message: 'WhatsApp number and API key are required' });
    }

    const { sendWhatsAppNotification } = require('../services/whatsappService');
    const result = await sendWhatsAppNotification(
      whatsappNumber,
      whatsappApiKey,
      '🔔 MailMate WhatsApp Test\n\nThis is a test notification from your MailMate Domain Manager. WhatsApp integration is working successfully!'
    );

    if (!result.success) {
      return res.status(400).json({ message: result.error || 'Failed to send WhatsApp message' });
    }

    res.json({ message: 'Test WhatsApp message sent successfully!' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to test WhatsApp: ' + err.message });
  }
});

module.exports = router;
