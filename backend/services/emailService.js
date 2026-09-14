const nodemailer = require('nodemailer');
const dns = require('dns');
const EmailLog = require('../models/EmailLog');
const EmailTemplate = require('../models/EmailTemplate');
const Template = require('../models/Template');

const isResendEnabled = () => Boolean(process.env.RESEND_API_KEY?.trim());

const sendWithResend = async ({ to, subject, html, text }) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({
      // SMTP senders may not be verified in Resend. Use a dedicated sender.
      from: process.env.EMAIL_FROM?.trim() || 'MailBot <onboarding@resend.dev>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Resend: ${data?.message || `Email request failed (HTTP ${response.status})`}`);
  }
  if (!data?.id) throw new Error('Resend returned no email ID');
  return { messageId: data.id };
};

const buildTransportOptions = (config = {}) => {
  const host = config.host || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(config.port || process.env.SMTP_PORT || '465', 10);
  const secure = port === 465;
  const user = config.username || config.user || process.env.SMTP_USER || 'yourgmail@gmail.com';
  const pass = (config.password || config.pass || process.env.SMTP_PASS || '').replace(/\s/g, '');

  return {
    host,
    port,
    secure,
    family: 4,
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 20000,
    auth: {
      user,
      pass,
    },
  };
};

const resolveIpv4TransportOptions = async (options) => {
  if (!options?.host) return options;

  const address = await dns.promises.lookup(options.host, { family: 4 });
  return {
    ...options,
    host: address.address,
    tls: {
      ...options.tls,
      servername: options.host,
    },
  };
};

const getTransporter = async (userId = null) => {
  try {
    const SmtpSettings = require('../models/SmtpSettings');
    let saved = null;
    if (userId) {
      saved = await SmtpSettings.findOne({ user: userId });
    }
    // Verification and cron jobs have no current user. Use the latest admin
    // configuration saved in Settings, then fall back to service-level SMTP.
    if (!saved && !userId) {
      saved = await SmtpSettings.findOne().sort('-updatedAt');
    }

    if (saved && saved.host && saved.username && saved.password) {
      const transportOptions = await resolveIpv4TransportOptions(buildTransportOptions({
        host: saved.host,
        port: saved.port,
        secure: saved.secure,
        username: saved.username,
        password: saved.password,
      }));
      return {
        transporter: nodemailer.createTransport(transportOptions),
        from: `"${saved.senderName || 'MailBot'}" <${saved.senderEmail || saved.username}>`,
      };
    }
  } catch (err) {
    console.error('Error fetching DB SMTP settings:', err.message);
  }

  const transportOptions = await resolveIpv4TransportOptions(buildTransportOptions());
  return {
    transporter: nodemailer.createTransport(transportOptions),
    from: `"${process.env.SMTP_FROM_NAME || 'MailBot'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'your@yourdomain.com'}>`,
  };
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

const sendEmail = async ({ to, from, subject, html, text, subscription, template, reminderInterval, triggeredBy = 'cron', transportOptions, userId = null }) => {
  console.log('[EmailService] sendEmail ->', {
    provider: isResendEnabled() ? 'resend' : 'smtp',
    to, subject, triggeredBy,
  });
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
    let info;
    if (isResendEnabled()) {
      info = await sendWithResend({ to, subject, html, text });
    } else {
      let mailTransporter;
      let defaultFrom;

      if (transportOptions) {
        const ipv4TransportOptions = await resolveIpv4TransportOptions(transportOptions);
        mailTransporter = nodemailer.createTransport(ipv4TransportOptions);
        defaultFrom = from;
      } else {
        const resolved = await getTransporter(userId);
        mailTransporter = resolved.transporter;
        defaultFrom = resolved.from;
      }

      info = await mailTransporter.sendMail({
        from: from || defaultFrom,
        to,
        subject,
        html,
        text,
      });
    }

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
    if (!subscription.createdBy) throw new Error('Subscription has no owner configured');
    const template = await Template.findOne({ user: subscription.createdBy, type: `reminder_${daysUntilExpiry}` })
      || await Template.findOne({ user: subscription.createdBy, isDefault: true })
      || await EmailTemplate.findOne({ createdBy: subscription.createdBy, type: `reminder_${daysUntilExpiry}` })
      || await EmailTemplate.findOne({ createdBy: subscription.createdBy, isDefault: true });
    if (!template) throw new Error('No email template configured');

    const vars = { domain: subscription.domain, days: String(daysUntilExpiry),
      owner: subscription.owner || '', registrar: subscription.registrar || '',
      expiryDate: new Date(subscription.expiryDate).toLocaleDateString() };
    const { subject, html, text } = renderTemplate(template, vars);

    const res = await sendEmail({
      to: subscription.ownerEmail,
      subject,
      html,
      text,
      subscription,
      template,
      reminderInterval: daysUntilExpiry,
      triggeredBy: 'cron',
      userId: subscription.createdBy,
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
  const clientUrl = process.env.CLIENT_URL || (process.env.FRONTEND_URL || '').split(',')[0] || 'http://localhost:5173';
  const verificationUrl = `${clientUrl.replace(/\/$/, '')}/verify-email?token=${token}`;
  console.log('[EmailService] sendVerificationEmail ->', { to });

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
// ========== NEW FUNCTION FOR PASSWORD RESET EMAIL ==========
const sendPasswordResetEmail = async (to, token) => {
  const baseUrl = process.env.CLIENT_URL || (process.env.FRONTEND_URL || '').split(',')[0] || 'http://localhost:5173';
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  console.log('[EmailService] sendPasswordResetEmail ->', { to, token });

  const subject = 'Password Reset Request - MailBot';
  const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #4f46e5;">Reset Your MailBot Password</h2>
          <p>We received a request to reset your password.</p>
          <div style="margin: 25px 0;">
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link in your browser:<br/><a href="${resetUrl}" style="color: #4f46e5;">${resetUrl}</a></p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">This link will expire in 1 hour. If you did not request this, please ignore this email.</p>
        </div>`;
  const text = `Reset your password by visiting: ${resetUrl}`;

  const res = await sendEmail({ to, subject, html, text, triggeredBy: 'manual' });
  if (res.success) return { success: true, messageId: res.info?.messageId, log: res.log };
  throw new Error(res.error || 'Failed to send password reset email');
};
// ==========================================================

module.exports = { sendEmail, sendReminderEmail, verifyConnection, renderTemplate, sendVerificationEmail, sendPasswordResetEmail, isResendEnabled };
