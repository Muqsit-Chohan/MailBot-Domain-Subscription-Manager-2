const { test } = require('node:test');
const assert = require('node:assert/strict');

test('verification uses application SMTP without reading user SMTP settings', async t => {
  const keys = ['RESEND_API_KEY', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  t.after(() => { for (const key of keys) {
    if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
  } });
  delete process.env.RESEND_API_KEY;
  process.env.SMTP_HOST = 'smtp.example.com';
  process.env.SMTP_USER = 'app@example.com';
  process.env.SMTP_PASS = 'test-password';
  t.mock.method(require('../models/SmtpSettings'), 'findOne', () => { throw new Error('Must not read user settings'); });
  const settings = require('../models/SmtpSettings').findOne;
  t.mock.method(require('../models/EmailLog').prototype, 'save', async function () { return this; });
  t.mock.method(require('dns').promises, 'lookup', async () => ({ address: '127.0.0.1' }));
  t.mock.method(require('nodemailer'), 'createTransport', options => {
    assert.equal(options.auth.user, 'app@example.com');
    return { sendMail: async mail => {
      assert.equal(mail.to, 'new@example.com');
      assert.match(mail.text, /verify-email\?token=test-token/);
      return { messageId: 'mock-id' };
    } };
  });
  const result = await require('../services/emailService').sendVerificationEmail('new@example.com', 'test-token');
  assert.equal(result.success, true);
  assert.equal(settings.mock.callCount(), 0);
});
