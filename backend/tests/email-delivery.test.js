const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const EmailLog = require('../models/EmailLog');
const EmailTemplate = require('../models/EmailTemplate');
const Subscription = require('../models/Subscription');
const SmtpSettings = require('../models/SmtpSettings');
const nodemailer = require('nodemailer');
const dns = require('dns');
const emailService = require('../services/emailService');
const subscriptionRoutes = require('../routes/subscriptions');
const settingsRoutes = require('../routes/settings');

const invoke = async (router, path, req) => {
  const layer = router.stack.find(layer => layer.route?.path === path && layer.route.methods.post);
  const handler = layer.route.stack.at(-1).handle;
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await handler(req, res);
  return res;
};

test('email routes and reminders select the correct transport and recipient', async t => {
  t.mock.method(require('../models/Template'), 'findOne', async () => null);
  t.mock.method(require('../models/User'), 'findById', async () => null);
  const previousKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.EMAIL_FROM;
  t.after(() => {
    for (const [key, value] of Object.entries({ RESEND_API_KEY: previousKey, EMAIL_FROM: previousFrom })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    t.mock.restoreAll();
  });
  process.env.RESEND_API_KEY = 're_fake_test';
  delete process.env.EMAIL_FROM;
  const sub = { _id: new mongoose.Types.ObjectId(), domain: 'example.com', ownerEmail: 'owner@example.com', expiryDate: new Date(), createdBy: new mongoose.Types.ObjectId() };
  t.mock.method(Subscription, 'findOne', async query => { assert.equal(String(query.createdBy), String(sub.createdBy)); return sub; });
  t.mock.method(EmailLog.prototype, 'save', async function () {
    const error = this.validateSync();
    if (error) throw error;
    assert.equal(String(this.user), String(sub.createdBy));
    return this;
  });
  const requests = [];
  t.mock.method(global, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    requests.push(JSON.parse(options.body));
    return { ok: true, json: async () => ({ id: 'test-message' }) };
  });
  t.mock.method(SmtpSettings, 'findOne', () => { throw new Error('Resend must bypass SMTP settings'); });
  const smtp = t.mock.method(nodemailer, 'createTransport', () => { throw new Error('Unexpected SMTP'); });
  const req = { params: { id: String(sub._id) }, user: { _id: sub.createdBy }, body: { to: sub.ownerEmail } };
  assert.equal((await invoke(settingsRoutes, '/test-email', req)).statusCode, 200);
  assert.equal((await invoke(subscriptionRoutes, '/:id/send-test', req)).body.success, true);
  assert.deepEqual(requests.map(r => r.to), [[sub.ownerEmail], [sub.ownerEmail]]);
  assert.ok(requests.every(r => r.from === 'MailMate <onboarding@resend.dev>'));
  t.mock.method(EmailTemplate, 'findOne', async () => ({ subject: '{{domain}} expires', htmlBody: '{{days}} days' }));
  assert.equal((await emailService.sendReminderEmail(sub, 7)).success, true);
  assert.deepEqual(requests.at(-1).to, [sub.ownerEmail]);
  assert.equal(smtp.mock.callCount(), 0);

  global.fetch = async () => ({ ok: false, status: 403, json: async () => ({ message: 'Testing recipients only' }) });
  const rejected = await invoke(subscriptionRoutes, '/:id/send-test', req);
  assert.equal(rejected.statusCode, 502);
  assert.match(rejected.body.error, /Testing recipients only/);
  assert.equal(smtp.mock.callCount(), 0);

  delete process.env.RESEND_API_KEY;
  const saved = { host: 'smtp.gmail.com', port: 587, username: 'sender@example.com', password: 'abcd efgh', senderEmail: 'sender@example.com' };
  SmtpSettings.findOne = async () => saved;
  t.mock.method(dns.promises, 'lookup', async () => ({ address: '127.0.0.1' }));
  let options;
  nodemailer.createTransport = config => { options = config; return { sendMail: async () => ({ messageId: 'smtp-test' }) }; };
  assert.equal((await invoke(subscriptionRoutes, '/:id/send-test', req)).body.success, true);
  assert.equal(options.secure, false);
  assert.equal(options.auth.pass, 'abcdefgh');
  saved.port = 465;
  await invoke(subscriptionRoutes, '/:id/send-test', req);
  assert.equal(options.secure, true);
  saved.port = 70000;
  assert.equal((await invoke(subscriptionRoutes, '/:id/send-test', req)).statusCode, 400);
});

test('Run Cron uses the existing cron service', async t => {
  const cron = require('../services/cronService');
  t.mock.method(cron, 'processReminders', async options => { assert.equal(options.userId, 'owner'); return { sent: 1, failed: 0, webhookSent: 0, webhookFailed: 1, webhookSkipped: 2 }; });
  const res = await invoke(settingsRoutes, '/run-cron', { user: { _id: 'owner' } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.sent, 1);
  assert.equal(res.body.webhookFailed, 1);
  assert.equal(res.body.webhookSkipped, 2);
});
