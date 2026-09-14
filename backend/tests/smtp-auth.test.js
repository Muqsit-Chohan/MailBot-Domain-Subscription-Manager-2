const { test } = require('node:test');
const assert = require('node:assert/strict');
const dns = require('dns');
const nodemailer = require('nodemailer');
const SmtpSettings = require('../models/SmtpSettings');
const EmailLog = require('../models/EmailLog');
const service = require('../services/emailService');
const routes = require('../routes/settings');

const saveSettings = async body => {
  const route = routes.stack.find(layer => layer.route?.path === '/smtp' && layer.route.methods.put);
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; } };
  await route.route.stack.at(-1).handle({ user: { _id: 'owner' }, body }, res);
  return res;
};

test('SMTP settings are verified before saving; rejected credentials preserve existing settings', async t => {
  t.mock.method(dns.promises, 'lookup', async () => ({ address: '127.0.0.1' }));
  let rejected = true;
  let closed = 0;
  const events = [];
  t.mock.method(nodemailer, 'createTransport', options => {
    assert.equal(options.auth.user, 'sender@gmail.com');
    assert.equal(options.auth.pass, 'abcdefghijklmnop');
    assert.equal(options.secure, false);
    return { verify: async () => {
      events.push('verify');
      if (rejected) throw Object.assign(new Error('Invalid login'), {
        code: 'EAUTH', responseCode: 535, response: '535-5.7.8 Username and Password not accepted. gsmtp',
      });
    }, close: () => { closed++; } };
  });
  const save = t.mock.method(SmtpSettings, 'findOneAndUpdate', async (query, config) => {
    events.push('save');
    assert.equal(query.user, 'owner');
    assert.equal(config.host, 'smtp.gmail.com');
    assert.equal(config.password, 'abcdefghijklmnop');
    assert.equal(config.secure, false);
    return config;
  });
  const body = { host: ' smtp.gmail.com ', port: 587, username: ' sender@gmail.com ',
    password: 'abcd efgh ijkl mnop', senderEmail: 'sender@gmail.com', secure: true };
  const failed = await saveSettings(body);
  assert.equal(failed.statusCode, 502);
  assert.match(failed.body.message, /App Password/);
  assert.equal(save.mock.callCount(), 0);
  rejected = false;
  assert.equal((await saveSettings(body)).statusCode, 200);
  assert.deepEqual(events, ['verify', 'verify', 'save']);
  assert.equal(closed, 2);
  assert.equal((await saveSettings({ ...body, port: 70000 })).statusCode, 400);
  assert.equal(save.mock.callCount(), 1);
});

test('Gmail login failure gives recovery steps and records a failed email', async t => {
  const previous = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  t.after(() => { if (previous === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previous; });
  t.mock.method(dns.promises, 'lookup', async () => ({ address: '127.0.0.1' }));
  t.mock.method(EmailLog.prototype, 'save', async function () { return this; });
  t.mock.method(nodemailer, 'createTransport', () => ({ sendMail: async () => {
    throw Object.assign(new Error('Invalid login'), { code: 'EAUTH', response: '535 5.7.8 BadCredentials - gsmtp' });
  } }));
  const result = await service.sendEmail({ to: 'recipient@example.com', subject: 'Reminder',
    transportOptions: { host: 'smtp.gmail.com', auth: { user: 'sender@gmail.com', pass: 'invalid' } } });
  assert.equal(result.success, false);
  assert.match(result.error, /Email Settings.*App Password/);
  assert.equal(result.log.status, 'failed');
  assert.match(result.log.errorMessage, /535 5.7.8/);
});

test('password normalization preserves significant spaces for non-Gmail servers', () => {
  assert.equal(service.normalizeSmtpPassword('smtp.example.com', ' pass word '), ' pass word ');
  assert.equal(service.normalizeSmtpPassword(' SMTP.GMAIL.COM ', 'abcd efgh ijkl mnop'), 'abcdefghijklmnop');
});
