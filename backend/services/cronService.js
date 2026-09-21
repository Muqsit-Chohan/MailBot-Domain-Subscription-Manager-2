const cron = require('node-cron');
const Subscription = require('../models/Subscription');
const { sendReminderEmail } = require('./emailService');

let cronJob = null;

const processReminders = async ({ userId } = {}) => {
  console.log('[Cron] Running reminder check:', new Date().toISOString());
  try {
    const now = new Date();
    const subscriptions = await Subscription.find({
      ...(userId ? { createdBy: userId } : {}),
      notificationsEnabled: true,
      expiryDate: { $gt: now },
      status: { $ne: 'expired' },
    });

    let sent = 0, failed = 0;
    let webhookSentCount = 0, webhookFailed = 0, webhookSkipped = 0, due = 0;
    let whatsappSentCount = 0, whatsappFailed = 0, whatsappSkipped = 0;

    for (const sub of subscriptions) {
      const daysUntilExpiry = Math.ceil((new Date(sub.expiryDate) - now) / (1000 * 60 * 60 * 24));

      for (const interval of sub.reminderIntervals) {
        if (daysUntilExpiry === interval) {
          due++;
          const alreadySent = sub.remindersSent?.some(
            r => r.interval === interval &&
              new Date(r.sentAt).toDateString() === now.toDateString()
          );

          if (!alreadySent) {
            const result = await sendReminderEmail(sub, interval).catch(error => ({ success: false, error: error.message }));
            if (result.success) {
              sub.remindersSent = sub.remindersSent || [];
              sub.remindersSent.push({ interval, sentAt: now });
              sub.lastReminderSent = now;
              await sub.save();
              sent++;

            } else {
              failed++;
              console.error('[Cron] Email reminder failed:', result.error);
            }
          }
          const webhookSent = sub.webhookRemindersSent?.some(
            r => r.interval === interval && new Date(r.sentAt).toDateString() === now.toDateString()
          );
          if (!webhookSent) {
            const { sendReminderWebhook } = require('./webhookService');
            const webhook = await sendReminderWebhook(sub, daysUntilExpiry);
            if (webhook.success) {
              webhookSentCount++;
              sub.webhookRemindersSent = sub.webhookRemindersSent || [];
              sub.webhookRemindersSent.push({ interval, sentAt: now });
              await sub.save();
            } else if (!webhook.skipped) {
              webhookFailed++;
              console.error('[Cron] Reminder webhook failed:', webhook.error);
            } else {
              webhookSkipped++;
              console.log('[Cron] Reminder webhook skipped:', webhook.reason);
            }
          }
          const whatsappSent = sub.whatsappRemindersSent?.some(
            r => r.interval === interval && new Date(r.sentAt).toDateString() === now.toDateString()
          );
          if (!whatsappSent) {
            const { sendReminderWhatsApp } = require('./whatsappService');
            const whatsapp = await sendReminderWhatsApp(sub, daysUntilExpiry);
            if (whatsapp.success) {
              whatsappSentCount++;
              sub.whatsappRemindersSent = sub.whatsappRemindersSent || [];
              sub.whatsappRemindersSent.push({ interval, sentAt: now });
              await sub.save();
            } else if (!whatsapp.skipped) {
              whatsappFailed++;
              console.error('[Cron] Reminder WhatsApp failed:', whatsapp.error);
            } else {
              whatsappSkipped++;
              console.log('[Cron] Reminder WhatsApp skipped:', whatsapp.reason);
            }
          }
        }
      }
    }

    console.log(`[Cron] Done. Sent: ${sent}, Failed: ${failed}`);
    return { sent, failed, checked: subscriptions.length, due,
      webhookSent: webhookSentCount, webhookFailed, webhookSkipped,
      whatsappSent: whatsappSentCount, whatsappFailed, whatsappSkipped };
  } catch (error) {
    console.error('[Cron] Error:', error);
    return { sent: 0, failed: 0, error: error.message };
  }
};

const startCron = () => {
  if (cronJob) cronJob.destroy();
  // Run every day at 8:00 AM
  cronJob = cron.schedule('0 8 * * *', () => processReminders(), {
    scheduled: true,
    timezone: 'UTC',
  });
  console.log('[Cron] Scheduler started - runs daily at 8:00 AM UTC');
};

const stopCron = () => {
  if (cronJob) {
    cronJob.destroy();
    cronJob = null;
    console.log('[Cron] Scheduler stopped');
  }
};

module.exports = { startCron, stopCron, processReminders };
