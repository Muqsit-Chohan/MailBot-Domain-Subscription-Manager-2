const { test } = require('node:test');
const assert = require('node:assert/strict');

test('cron retries failed channels without resending successful channels', async t => {
  const email = require('../services/emailService');
  const webhook = require('../services/webhookService');
  const Subscription = require('../models/Subscription');
  const sub = { domain: 'example.com', createdBy: 'owner', expiryDate: new Date(Date.now() + 6.5 * 86400000), reminderIntervals: [7], async save() {} };
  t.mock.method(Subscription, 'find', async () => [sub]);
  let emailOk = false;
  const emailMock = t.mock.method(email, 'sendReminderEmail', async () => ({ success: emailOk }));
  const webhookMock = t.mock.method(webhook, 'sendReminderWebhook', async () => ({ success: true }));
  delete require.cache[require.resolve('../services/cronService')];
  const { processReminders } = require('../services/cronService');
  t.after(() => { delete require.cache[require.resolve('../services/cronService')]; });
  await processReminders();
  assert.equal(sub.webhookRemindersSent.length, 1);
  assert.equal(sub.remindersSent, undefined);
  emailOk = true;
  await processReminders();
  await processReminders();
  assert.equal(emailMock.mock.callCount(), 2);
  assert.equal(webhookMock.mock.callCount(), 1);
  sub.webhookRemindersSent = [];
  webhook.sendReminderWebhook = async () => ({ success: false, error: 'Rejected' });
  await processReminders();
  assert.equal(sub.webhookRemindersSent.length, 0);
  webhook.sendReminderWebhook = async () => ({ success: true });
  await processReminders();
  assert.equal(sub.webhookRemindersSent.length, 1);
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
