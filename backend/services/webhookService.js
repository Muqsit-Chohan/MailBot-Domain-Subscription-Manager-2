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
        username: 'MailBot Alert',
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
            footer: { text: 'MailBot Subscription Manager' },
            timestamp: new Date().toISOString(),
          },
        ],
      };
    } else if (isSlack) {
      payload = {
        text: `*${title || '⚠️ MailBot Alert'}*\n${message}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${title || '⚠️ MailBot Expiry Alert'}*\n${message}\n*Domain:* \`${domain}\` | *Expires in:* \`${daysUntilExpiry} days\` (${expiryDate ? new Date(expiryDate).toLocaleDateString() : ''})`,
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

module.exports = { sendWebhookNotification };
