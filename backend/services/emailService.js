const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');
const EmailTemplate = require('../models/EmailTemplate');

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
};

const renderTemplate = (template, variables) => {
  let subject = template.subject;
  let html = template.htmlBody;
  let text = template.textBody || '';

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(regex, value);
    html = html.replace(regex, value);
    text = text.replace(regex, value);
  });
  return { subject, html, text };
};

const sendEmail = async ({ to, from, subject, html, text, subscription, template, reminderInterval, triggeredBy = 'cron', transportOptions }) => {
  console.log('[EmailService] sendEmail ->', { to, from, subject, triggeredBy });
  // Create initial log
  const log = new EmailLog({
    subscription: subscription?._id,
    template: template?._id,
    to,
    subject,
    status: 'pending',
    reminderInterval,
    triggeredBy,
    domain: subscription?.domain,
  });
  await log.save();

  try {
    const transporter = transportOptions ? nodemailer.createTransport(transportOptions) : getTransporter();
    const info = await transporter.sendMail({
      from: from || `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to,
      subject,
      html,
      text,
    });

    log.status = 'sent';
    log.messageId = info.messageId || info.response || null;
    log.sentAt = new Date();
    await log.save();
    return { success: true, info, log };
  } catch (error) {
    // Persist full error for inspection (include SMTP response if present)
    const errMsg = error && (error.response || error.message || JSON.stringify(error));
    log.status = 'failed';
    log.errorMessage = typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg);
    log.sentAt = new Date();
    await log.save();
    console.error('Email send failed:', errMsg);
    return { success: false, error: errMsg, log };
  }
};

const sendReminderEmail = async (subscription, daysUntilExpiry) => {
  try {
    // Choose template by interval or default
    const template = await EmailTemplate.findOne({ type: `reminder_${daysUntilExpiry}` }) || await EmailTemplate.findOne({ isDefault: true });
    if (!template) throw new Error('No email template configured');

    const vars = { domain: subscription.domain, days: String(daysUntilExpiry) };
    const { subject, html, text } = renderTemplate(template, vars);

    const res = await sendEmail({
      to: subscription.email,
      subject,
      html,
      text,
      subscription,
      template,
      reminderInterval: daysUntilExpiry,
      triggeredBy: 'cron',
    });

    return res;
  } catch (error) {
    console.error('sendReminderEmail error:', error);
    return { success: false, error: error.message || String(error) };
  }
};

const verifyConnection = async () => {
  // ... (aapka existing code same rahega)
};

// ========== NEW FUNCTION FOR VERIFICATION EMAIL ==========
const sendVerificationEmail = async (to, token) => {
  const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
  console.log('[EmailService] sendVerificationEmail ->', { to, token });

  const subject = 'Verify your email - MailBot';
  const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to MailBot!</h2>
          <p>Click the button below to verify your email address:</p>
          <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 6px;">Verify Email</a>
          <p style="margin-top: 20px; color: #6b7280;">Or use this link: ${verificationUrl}</p>
          <p>This link will expire in 1 hour.</p>
        </div>`;
  const text = `Verify your email by visiting: ${verificationUrl}`;

  const res = await sendEmail({ to, subject, html, text, triggeredBy: 'verification' });
  if (res.success) return { success: true, messageId: res.info?.messageId, log: res.log };
  // forward the error so calling code can react
  throw new Error(res.error || 'Failed to send verification email');
};
// ==========================================================

module.exports = { sendEmail, sendReminderEmail, verifyConnection, renderTemplate, sendVerificationEmail };