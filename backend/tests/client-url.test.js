const { test } = require('node:test');
const assert = require('node:assert/strict');
const getClientUrl = require('../utils/clientUrl');

test('mobile email links use the public frontend despite stale localhost CLIENT_URL', () => {
  for (const host of ['localhost', '127.0.0.1', '[::1]']) {
    assert.equal(getClientUrl({
      CLIENT_URL: `http://${host}:5173`,
      FRONTEND_URL: 'http://localhost:4173, https://mailbot-flash.vercel.app/ ',
      NODE_ENV: 'production',
    }), 'https://mailbot-flash.vercel.app');
  }
});

test('explicit public client URL retains priority', () => {
  assert.equal(getClientUrl({ CLIENT_URL: ' https://app.example.com/ ', FRONTEND_URL: 'https://other.example.com' }), 'https://app.example.com');
});

test('local development works but production cannot send localhost links', () => {
  assert.equal(getClientUrl({}), 'http://localhost:5173');
  assert.throws(() => getClientUrl({ NODE_ENV: 'production', CLIENT_URL: 'http://localhost:5173' }), /public frontend URL/);
});
