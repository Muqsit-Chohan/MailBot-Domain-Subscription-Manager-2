const { test } = require('node:test');
const assert = require('node:assert/strict');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { generateTemplateFromPrompt } = require('../services/aiTemplateService');

const template = { name: 'Reminder', subject: 'Renew', htmlBody: '<p>Renew</p>', textBody: 'Renew', type: 'custom' };

test('generation recovers from a temporary Gemini overload', async t => {
  let calls = 0;
  t.mock.method(GoogleGenerativeAI.prototype, 'getGenerativeModel', (_config, options) => {
    assert.equal(options.timeout, 18000);
    return { async generateContent() {
      if (++calls === 1) throw Object.assign(new Error('Overloaded'), { status: 503 });
      return { response: { text: () => JSON.stringify(template) } };
    } };
  });
  assert.deepEqual(await generateTemplateFromPrompt('Renewal'), template);
  assert.equal(calls, 2);
});

test('persistent overload is bounded and exposes a friendly 503', async t => {
  let calls = 0;
  t.mock.method(GoogleGenerativeAI.prototype, 'getGenerativeModel', () => ({
    async generateContent() {
      calls++;
      throw Object.assign(new Error('Internal provider details'), { status: 503 });
    }
  }));
  await assert.rejects(generateTemplateFromPrompt('Renewal'), error =>
    error.status === 503 && !error.message.includes('Internal provider details'));
  assert.equal(calls, 2);
});

test('permanent provider errors are not retried', async t => {
  let calls = 0;
  t.mock.method(GoogleGenerativeAI.prototype, 'getGenerativeModel', () => ({
    async generateContent() {
      calls++;
      throw Object.assign(new Error('Invalid key'), { status: 400 });
    }
  }));
  await assert.rejects(generateTemplateFromPrompt('Renewal'), { status: 502 });
  assert.equal(calls, 1);
});

test('generate endpoint preserves availability status and retry guidance', async t => {
  const service = require('../services/aiTemplateService');
  t.mock.method(service, 'generateTemplateFromPrompt', async () => {
    throw Object.assign(new Error('Please try again shortly.'), { status: 503 });
  });
  delete require.cache[require.resolve('../routes/templates')];
  const router = require('../routes/templates');
  t.after(() => { delete require.cache[require.resolve('../routes/templates')]; });
  const handler = router.stack.find(layer => layer.route?.path === '/generate').route.stack.at(-1).handle;
  const res = {
    headers: {},
    set(key, value) { this.headers[key] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  await handler({ body: { prompt: 'Renewal' } }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.headers['Retry-After'], '30');
  assert.equal(res.body.message, 'Please try again shortly.');
});
