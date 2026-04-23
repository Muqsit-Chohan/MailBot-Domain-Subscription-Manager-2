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

const sendEmail = async ({ to, subject, html, text, subscription, template, reminderInterval, triggeredBy = 'cron' }) => {
  const log = await EmailLog.create({
    subscription: subscription?._id,
    template: template?._id,
    to,
    subject,
    status: 'pending',
    reminderInterval,
    domain: subscription?.domain,
    triggeredBy,
  });

  try {
    const info = await getTransporter().sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to,
      subject,
      html,
      text,
    });

    await EmailLog.findByIdAndUpdate(log._id, {
      status: 'sent',
      messageId: info.messageId,
      sentAt: new Date(),
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    await EmailLog.findByIdAndUpdate(log._id, {
      status: 'failed',
      errorMessage: error.message,
    });
    return { success: false, error: error.message };
  }
};

const sendReminderEmail = async (subscription, daysUntilExpiry) => {
  const typeMap = { 30: 'reminder_30', 15: 'reminder_15', 7: 'reminder_7', 1: 'reminder_1' };
  const templateType = typeMap[daysUntilExpiry] || 'custom';

  let template = await EmailTemplate.findOne({ type: templateType, isDefault: true });
  if (!template) {
    template = await EmailTemplate.findOne({ isDefault: true });
  }

  let subject, html, text;

  if (template) {
    const vars = {
      domain: subscription.domain,
      days: daysUntilExpiry,
      expiryDate: new Date(subscription.expiryDate).toLocaleDateString(),
      owner: subscription.owner || 'Domain Owner',
      registrar: subscription.registrar || 'N/A',
    };
    ({ subject, html, text } = renderTemplate(template, vars));
  } else {
    subject = `⚠️ Domain ${subscription.domain} expires in ${daysUntilExpiry} day(s)`;
    html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e11d48;">Domain Expiry Reminder</h2>
        <p>Hello ${subscription.owner || 'Domain Owner'},</p>
        <p>Your domain <strong>${subscription.domain}</strong> is expiring in <strong>${daysUntilExpiry} day(s)</strong>.</p>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Domain</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${subscription.domain}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Expiry Date</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${new Date(subscription.expiryDate).toLocaleDateString()}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Registrar</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${subscription.registrar || 'N/A'}</td></tr>
        </table>
        <p>Please renew your domain to avoid service interruption.</p>
        <p style="color: #6b7280; font-size: 12px;">This is an automated reminder from MailBot.</p>
      </div>`;
    text = `Domain ${subscription.domain} expires in ${daysUntilExpiry} day(s) on ${new Date(subscription.expiryDate).toLocaleDateString()}.`;
  }

  return sendEmail({
    to: subscription.ownerEmail,
    subject,
    html,
    text,
    subscription,
    template,
    reminderInterval: daysUntilExpiry,
    triggeredBy: 'cron',
  });
};

const verifyConnection = async () => {
  try {
    await getTransporter().verify();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmail, sendReminderEmail, verifyConnection, renderTemplate };
