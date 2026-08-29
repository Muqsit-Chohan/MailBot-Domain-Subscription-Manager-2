const cron = require('node-cron');
const Subscription = require('../models/Subscription');
const { sendReminderEmail } = require('./emailService');

let cronJob = null;

const processReminders = async () => {
  console.log('[Cron] Running reminder check:', new Date().toISOString());
  try {
    const now = new Date();
    const subscriptions = await Subscription.find({
      notificationsEnabled: true,
      expiryDate: { $gt: now },
      status: { $ne: 'expired' },
    });

    let sent = 0, failed = 0;

    for (const sub of subscriptions) {
      const daysUntilExpiry = Math.ceil((new Date(sub.expiryDate) - now) / (1000 * 60 * 60 * 24));

      for (const interval of sub.reminderIntervals) {
        if (daysUntilExpiry === interval) {
          const alreadySent = sub.remindersSent?.some(
            r => r.interval === interval &&
              new Date(r.sentAt).toDateString() === now.toDateString()
          );

          if (!alreadySent) {
            const result = await sendReminderEmail(sub, interval);
            if (result.success) {
              sub.remindersSent = sub.remindersSent || [];
              sub.remindersSent.push({ interval, sentAt: now });
              sub.lastReminderSent = now;
              await sub.save();
              sent++;

              // Webhook notification if enabled on owner user
              try {
                if (sub.createdBy) {
                  const User = require('../models/User');
                  const user = await User.findById(sub.createdBy);
                  if (user?.webhookEnabled && user?.webhookUrl) {
                    const { sendWebhookNotification } = require('./webhookService');
                    await sendWebhookNotification(user.webhookUrl, {
                      title: `⏰ Renewal Reminder: ${sub.domain}`,
                      message: `Domain **${sub.domain}** is expiring in **${daysUntilExpiry} days** on ${new Date(sub.expiryDate).toLocaleDateString()}.`,
                      domain: sub.domain,
                      daysUntilExpiry,
                      expiryDate: sub.expiryDate,
                    });
                  }
                }
              } catch (webhookErr) {
                console.error('[Cron] Webhook trigger error:', webhookErr.message);
              }
            } else {
              failed++;
            }
          }
        }
      }
    }

    console.log(`[Cron] Done. Sent: ${sent}, Failed: ${failed}`);
    return { sent, failed };
  } catch (error) {
    console.error('[Cron] Error:', error);
    return { sent: 0, failed: 0, error: error.message };
  }
};

const startCron = () => {
  if (cronJob) cronJob.destroy();
  // Run every day at 8:00 AM
  cronJob = cron.schedule('0 8 * * *', processReminders, {
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
