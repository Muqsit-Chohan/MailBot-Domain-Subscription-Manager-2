const { test } = require('node:test');
const assert = require('node:assert/strict');
const withTimeout = require('../utils/withTimeout');

test('deadline releases a stalled operation and preserves success/errors', async () => {
  await assert.rejects(withTimeout(() => new Promise(() => {}), 10, 'Delivery timed out'), /Delivery timed out/);
  assert.equal(await withTimeout(async () => 'sent', 100, 'timeout'), 'sent');
  await assert.rejects(withTimeout(async () => { throw new Error('Provider rejected'); }, 100, 'timeout'), /Provider rejected/);
});

test('registration keeps failed delivery pending and supports retry', async t => {
  const User = require('../models/User');
  const Pending = require('../models/PendingVerification');
  const service = require('../services/emailService');
  t.mock.method(User, 'findOne', async () => null);
  t.mock.method(User, 'countDocuments', async () => 1);
  let pending;
  t.mock.method(Pending, 'findOne', async () => pending);
  t.mock.method(Pending.prototype, 'save', async function () { pending = this; return this; });
  let fail = true;
  t.mock.method(service, 'sendVerificationEmail', async () => {
    if (fail) throw new Error('Provider unavailable');
    return { success: true };
  });
  delete require.cache[require.resolve('../routes/auth')];
  const router = require('../routes/auth');
  t.after(() => { delete require.cache[require.resolve('../routes/auth')]; });
  const handler = router.stack.find(layer => layer.route?.path === '/register').route.stack[0].handle;
  const invoke = async () => {
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await handler({ body: { name: 'Test', email: 'test@example.com', password: 'password123' } }, res);
    return res;
  };
  const failed = await invoke();
  assert.equal(failed.statusCode, 503);
  assert.equal(failed.body.emailSent, false);
  assert.ok(pending);
  const oldToken = pending.verificationToken;
  fail = false;
  const retried = await invoke();
  assert.equal(retried.statusCode, 201);
  assert.equal(retried.body.emailSent, true);
  assert.notEqual(pending.verificationToken, oldToken);
});
