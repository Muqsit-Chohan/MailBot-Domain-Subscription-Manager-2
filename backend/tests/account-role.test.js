const { test } = require('node:test');
const assert = require('node:assert/strict');
const { accountRole } = require('../utils/accountRole');
const { adminOnly } = require('../middleware/auth');

test('only the designated account can have admin access', () => {
  assert.equal(accountRole(' MUQSIT816@gmail.com '), 'admin');
  assert.equal(accountRole('other@example.com'), 'user');
  let nextCalled = false;
  const res = { status(code) { this.code = code; return this; }, json() {} };
  adminOnly({ user: { email: 'other@example.com', role: 'admin' } }, res, () => { nextCalled = true; });
  assert.equal(res.code, 403);
  assert.equal(nextCalled, false);
  adminOnly({ user: { email: 'muqsit816@gmail.com', role: 'user' } }, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});
