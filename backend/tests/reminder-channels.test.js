const { test } = require('node:test');
const assert = require('node:assert/strict');

test('cron retries failed channels without resending successful channels', async t => {
  const email = require('../services/emailService');
  const webhook = require('../services/webhookService');
  const whatsapp = require('../services/whatsappService');
  const Subscription = require('../models/Subscription');
  const sub = { domain: 'example.com', createdBy: 'owner', expiryDate: new Date(Date.now() + 6.5 * 86400000), reminderIntervals: [7], async save() {} };
  t.mock.method(Subscription, 'find', async () => [sub]);
  let emailOk = false;
  const emailMock = t.mock.method(email, 'sendReminderEmail', async () => ({ success: emailOk }));
  const webhookMock = t.mock.method(webhook, 'sendReminderWebhook', async () => ({ success: true }));
  const whatsappMock = t.mock.method(whatsapp, 'sendReminderWhatsApp', async () => ({ success: true }));
  delete require.cache[require.resolve('../services/cronService')];
  const { processReminders } = require('../services/cronService');
  t.after(() => { delete require.cache[require.resolve('../services/cronService')]; });
  await processReminders();
  assert.equal(sub.webhookRemindersSent.length, 1);
  assert.equal(sub.whatsappRemindersSent.length, 1);
  assert.equal(sub.remindersSent, undefined);
  emailOk = true;
  await processReminders();
  await processReminders();
  assert.equal(emailMock.mock.callCount(), 2);
  assert.equal(webhookMock.mock.callCount(), 1);
  assert.equal(whatsappMock.mock.callCount(), 1);
  sub.webhookRemindersSent = [];
  sub.whatsappRemindersSent = [];
  webhook.sendReminderWebhook = async () => ({ success: false, error: 'Rejected' });
  whatsapp.sendReminderWhatsApp = async () => ({ success: false, error: 'Rejected' });
  await processReminders();
  assert.equal(sub.webhookRemindersSent.length, 0);
  assert.equal(sub.whatsappRemindersSent.length, 0);
  webhook.sendReminderWebhook = async () => ({ success: true });
  whatsapp.sendReminderWhatsApp = async () => ({ success: true });
  await processReminders();
  assert.equal(sub.webhookRemindersSent.length, 1);
  assert.equal(sub.whatsappRemindersSent.length, 1);
  assert.equal(emailMock.mock.callCount(), 2);
});

test('webhook uses saved owner settings and respects disabled notifications', async t => {
  const User = require('../models/User');
  let enabled = false;
  t.mock.method(User, 'findById', async id => {
    assert.equal(id, 'owner');
    return { webhookEnabled: enabled, webhookUrl: 'https://discord.com/api/webhooks/test/fake' };
  });
  const request = t.mock.method(global, 'fetch', async (_url, options) => {
    assert.ok(options.signal);
    assert.equal(JSON.parse(options.body).embeds[0].fields[0].value, 'example.com');
    return { ok: true };
  });
  const { sendReminderWebhook } = require('../services/webhookService');
  const sub = { createdBy: 'owner', domain: 'example.com', expiryDate: new Date() };
  assert.equal((await sendReminderWebhook(sub, 7)).skipped, true);
  assert.equal(request.mock.callCount(), 0);
  enabled = true;
  assert.equal((await sendReminderWebhook(sub, 7)).success, true);
  assert.equal(request.mock.callCount(), 1);
});

test('whatsapp uses saved owner settings and respects disabled notifications', async t => {
  const User = require('../models/User');
  let enabled = false;
  t.mock.method(User, 'findById', async id => {
    assert.equal(id, 'owner');
    return { whatsappEnabled: enabled, whatsappNumber: '+923001234567', whatsappApiKey: 'test-key' };
  });
  const request = t.mock.method(global, 'fetch', async (url) => {
    assert.ok(url.includes('api.callmebot.com'));
    assert.ok(url.includes('phone=%2B923001234567'));
    assert.ok(url.includes('apikey=test-key'));
    return { ok: true, text: async () => 'Message queued' };
  });
  const { sendReminderWhatsApp } = require('../services/whatsappService');
  const sub = { createdBy: 'owner', domain: 'example.com', expiryDate: new Date() };
  assert.equal((await sendReminderWhatsApp(sub, 7)).skipped, true);
  assert.equal(request.mock.callCount(), 0);
  enabled = true;
  assert.equal((await sendReminderWhatsApp(sub, 7)).success, true);
  assert.equal(request.mock.callCount(), 1);
});
