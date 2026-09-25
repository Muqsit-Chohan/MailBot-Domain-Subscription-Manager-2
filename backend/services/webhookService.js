/**
 * Send Webhook Notification (supports Slack, Discord, and Generic JSON webhooks)
 */
async function sendWebhookNotification(webhookUrl, { title, message, domain, expiryDate, daysUntilExpiry, fields = [] }) {
  if (!webhookUrl) return { success: false, error: 'No webhook URL provided' };

  try {
    const isDiscord = webhookUrl.includes('discord.com');
    const isSlack = webhookUrl.includes('slack.com');

    let payload = {};

    if (isDiscord) {
      payload = {
        username: 'MailMate Alert',
        avatar_url: 'https://cdn-icons-png.flaticon.com/512/281/281769.png',
        embeds: [
          {
            title: title || `⚠️ Expiry Alert: ${domain}`,
            description: message,
            color: daysUntilExpiry <= 7 ? 0xef4444 : 0xf59e0b, // red or orange
            fields: [
              { name: '🌐 Domain', value: domain || 'N/A', inline: true },
              { name: '⏳ Days Remaining', value: `${daysUntilExpiry} days`, inline: true },
              { name: '📅 Expiry Date', value: expiryDate ? new Date(expiryDate).toLocaleDateString() : 'N/A', inline: true },
              ...fields,
            ],
            footer: { text: 'MailMate Subscription Manager' },
            timestamp: new Date().toISOString(),
          },
        ],
      };
    } else if (isSlack) {
      payload = {
        text: `*${title || '⚠️ MailMate Alert'}*\n${message}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${title || '⚠️ MailMate Expiry Alert'}*\n${message}\n*Domain:* \`${domain}\` | *Expires in:* \`${daysUntilExpiry} days\` (${expiryDate ? new Date(expiryDate).toLocaleDateString() : ''})`,
            },
          },
        ],
      };
    } else {
      // Generic Webhook
      payload = {
        event: 'subscription_expiry_alert',
        title,
        message,
        domain,
        daysUntilExpiry,
        expiryDate,
        fields,
        timestamp: new Date().toISOString(),
      };
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Webhook responded with status ${res.status}: ${errText}` };
    }

    return { success: true };
  } catch (err) {
    console.error('Webhook dispatch error:', err);
    return { success: false, error: err.message };
  }
}

async function sendReminderWebhook(subscription, daysUntilExpiry, userId = subscription.createdBy) {
  try {
    if (!userId) return { success: false, skipped: true, reason: 'Subscription has no owner' };
    const user = await require('../models/User').findById(userId);
    if (!user) return { success: false, skipped: true, reason: 'Subscription owner not found' };
    if (!user.webhookEnabled) return { success: false, skipped: true, reason: 'Webhook notifications disabled for owner' };
    if (!user.webhookUrl) return { success: false, skipped: true, reason: 'Owner has no saved webhook URL' };
    return await sendWebhookNotification(user.webhookUrl, {
      title: `Renewal Reminder: ${subscription.domain}`,
      message: `${subscription.domain} expires in ${daysUntilExpiry} days.`,
      domain: subscription.domain,
      expiryDate: subscription.expiryDate,
      daysUntilExpiry,
    });
  } catch (error) {
    return { success: false, error: 'Could not deliver reminder webhook' };
  }
}

module.exports = { sendWebhookNotification, sendReminderWebhook };
