/**
 * Send WhatsApp Notification via CallMeBot (https://www.callmebot.com/blog/free-api-whatsapp-messages/)
 * Free, no business account required — the recipient activates their own API key once
 * by messaging the CallMeBot bot, then the backend delivers messages with a simple HTTP GET.
 */
async function sendWhatsAppNotification(phone, apiKey, message) {
  if (!phone || !apiKey) return { success: false, error: 'Missing WhatsApp phone number or API key' };

  try {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(15000),
    });

    const bodyText = await res.text();
    // CallMeBot returns HTTP 200 with an error message in the body on failure.
    if (!res.ok || /error/i.test(bodyText)) {
      return { success: false, error: bodyText || `WhatsApp API responded with status ${res.status}` };
    }

    return { success: true };
  } catch (err) {
    console.error('WhatsApp dispatch error:', err);
    return { success: false, error: err.message };
  }
}

async function sendReminderWhatsApp(subscription, daysUntilExpiry, userId = subscription.createdBy) {
  try {
    if (!userId) return { success: false, skipped: true, reason: 'Subscription has no owner' };
    const user = await require('../models/User').findById(userId);
    if (!user) return { success: false, skipped: true, reason: 'Subscription owner not found' };
    if (!user.whatsappEnabled) return { success: false, skipped: true, reason: 'WhatsApp notifications disabled for owner' };
    if (!user.whatsappNumber || !user.whatsappApiKey) return { success: false, skipped: true, reason: 'Owner has no saved WhatsApp number/API key' };

    const expiry = subscription.expiryDate ? new Date(subscription.expiryDate).toLocaleDateString() : 'N/A';
    const message = `⚠️ MailBot Renewal Reminder\n\n${subscription.domain} expires in ${daysUntilExpiry} day(s).\nExpiry date: ${expiry}`;

    return await sendWhatsAppNotification(user.whatsappNumber, user.whatsappApiKey, message);
  } catch (error) {
    return { success: false, error: 'Could not deliver reminder WhatsApp message' };
  }
}

module.exports = { sendWhatsAppNotification, sendReminderWhatsApp };
