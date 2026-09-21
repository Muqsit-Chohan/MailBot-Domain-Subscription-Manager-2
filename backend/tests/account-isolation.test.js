const { test } = require('node:test');
const assert = require('node:assert/strict');
const Subscription = require('../models/Subscription');
const EmailLog = require('../models/EmailLog');
const Template = require('../models/Template');

const invoke = async (router, method, path, overrides = {}) => {
  const req = { user: { _id: 'alice', role: 'admin' }, query: {}, params: { id: 'bob-record' }, body: {}, ...overrides };
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }, send(body) { this.body = body; return this; }, setHeader() {} };
  await router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route.stack.at(-1).handle(req, res);
  return res;
};

function matches(row, query = {}) {
  return Object.entries(query).every(([key, value]) => {
    if (key === '$and') return value.every(q => matches(row, q));
    if (key === '$or') return value.some(q => matches(row, q));
    if (value === null) return row[key] == null;
    if (value && typeof value === 'object') {
      if ('$in' in value) return value.$in.includes(row[key]);
      if ('$regex' in value) return new RegExp(value.$regex, value.$options).test(row[key]);
      return Object.entries(value).every(([op, operand]) => op === '$gte' ? row[key] >= operand : op === '$lte' ? row[key] <= operand : op === '$gt' ? row[key] > operand : op === '$ne' ? row[key] !== operand : false);
    }
    return row[key] === value;
  });
}

const chain = result => ({ sort() { return this; }, skip() { return this; }, limit() { return this; },
  select() { return this; }, populate() { return this; }, then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); } });

test('subscriptions, dashboard, export and ID operations isolate two accounts, including admins', async t => {
  const rows = ['alice', 'bob', undefined].map((createdBy, i) => ({
    _id: `${createdBy || 'orphan'}-record`, createdBy, domain: `${createdBy || 'orphan'}.com`,
    status: 'active', expiryDate: new Date(Date.now() + 86400000), cost: (i + 1) * 12, currency: 'USD',
  }));
  t.mock.method(Subscription, 'find', query => chain(rows.filter(row => matches(row, query))));
  t.mock.method(Subscription, 'countDocuments', async query => rows.filter(row => matches(row, query)).length);
  t.mock.method(Subscription, 'findOne', query => chain(rows.find(row => matches(row, query)) || null));
  t.mock.method(Subscription, 'findOneAndDelete', async query => rows.find(row => matches(row, query)) || null);
  t.mock.method(Subscription, 'findOneAndUpdate', async (query, update) => {
    const row = rows.find(row => matches(row, query));
    if (row) Object.assign(row, update.$set);
    return row || null;
  });
  const router = require('../routes/subscriptions');
  const newUser = { _id: 'new-user', role: 'user' };
  const emptyList = await invoke(router, 'get', '/', { user: newUser });
  assert.equal(emptyList.body.total, 0);
  assert.deepEqual(emptyList.body.subscriptions, []);
  const emptyStats = await invoke(router, 'get', '/stats', { user: newUser });
  assert.equal(emptyStats.body.total, 0);
  assert.equal(emptyStats.body.active, 0);
  assert.equal(emptyStats.body.expired, 0);
  assert.equal(emptyStats.body.expiringSoon, 0);
  assert.deepEqual(emptyStats.body.currencyTotals, {});
  assert.deepEqual(emptyStats.body.recentlyAdded, []);
  assert.deepEqual(emptyStats.body.upcomingExpiries, []);
  for (const user of [{ _id: 'alice', role: 'admin' }, { _id: 'bob', role: 'user' }]) {
    const list = await invoke(router, 'get', '/', { user, query: { search: '.com' } });
    assert.equal(list.body.total, 1);
    assert.equal(list.body.subscriptions[0].createdBy, user._id);
    const stats = await invoke(router, 'get', '/stats', { user });
    assert.equal(stats.body.total, 1);
    assert.equal(stats.body.recentlyAdded[0].createdBy, user._id);
    assert.equal(stats.body.upcomingExpiries[0].createdBy, user._id);
    assert.equal(stats.body.currencyTotals.USD.yearly, user._id === 'alice' ? 12 : 24);
    const csv = await invoke(router, 'get', '/export-csv', { user });
    assert.ok(csv.body.includes(`${user._id}.com`));
    assert.ok(!csv.body.includes(user._id === 'alice' ? 'bob.com' : 'alice.com'));
  }
  for (const [method, path] of [['get', '/:id'], ['put', '/:id'], ['delete', '/:id'], ['post', '/:id/send-test']]) {
    assert.equal((await invoke(router, method, path)).statusCode, 404);
  }
  const update = await invoke(router, 'put', '/:id', { params: { id: 'alice-record' },
    body: { domain: 'updated.com', createdBy: 'bob', $set: { createdBy: 'bob' }, $unset: { createdBy: 1 }, 'createdBy.x': 'bob' } });
  assert.equal(update.body.createdBy, 'alice');
  assert.equal(update.body.domain, 'updated.com');
  assert.equal(update.body.$set, undefined);
});

test('logs and counts isolate owners and safely retain attributable legacy logs', async t => {
  const rows = [
    { _id: 'a', user: 'alice', subject: 'match', status: 'sent' },
    { _id: 'b', user: 'bob', subject: 'match', status: 'failed' },
    { _id: 'legacy-a', subscription: 'alice-sub', subject: 'match', status: 'sent' },
    { _id: 'legacy-b', subscription: 'bob-sub', subject: 'match', status: 'sent' },
    { _id: 'orphan', subject: 'match', status: 'sent' },
    { _id: 'explicit-b', user: 'bob', subscription: 'alice-sub', subject: 'match', status: 'sent' },
  ];
  t.mock.method(Subscription, 'distinct', async (_field, query) => [`${query.createdBy}-sub`]);
  t.mock.method(EmailLog, 'find', query => chain(rows.filter(row => matches(row, query))));
  t.mock.method(EmailLog, 'countDocuments', async query => rows.filter(row => matches(row, query)).length);
  t.mock.method(EmailLog, 'findOneAndDelete', async query => rows.find(row => matches(row, query)) || null);
  const router = require('../routes/logs');
  const list = await invoke(router, 'get', '/', { query: { search: 'match' } });
  assert.deepEqual(list.body.logs.map(row => row._id), ['a', 'legacy-a']);
  assert.deepEqual((await invoke(router, 'get', '/stats')).body, { total: 2, sent: 2, failed: 0, pending: 0 });
  for (const id of ['b', 'legacy-b', 'orphan', 'explicit-b']) {
    assert.equal((await invoke(router, 'delete', '/:id', { params: { id } })).statusCode, 404);
  }
  assert.equal((await invoke(router, 'delete', '/:id', { params: { id: 'legacy-a' } })).statusCode, 200);
});

test('templates cannot be transferred or edited by another account', async t => {
  const row = { _id: 'alice-template', user: 'alice', name: 'Original' };
  t.mock.method(Template, 'findOneAndUpdate', async (query, update) => {
    if (!matches(row, query)) return null;
    assert.deepEqual(update, { $set: { name: 'Updated' } });
    return { ...row, ...update.$set };
  });
  const router = require('../routes/templates');
  assert.equal((await invoke(router, 'put', '/:id')).statusCode, 404);
  const result = await invoke(router, 'put', '/:id', { params: { id: row._id },
    body: { name: 'Updated', user: 'bob', $set: { user: 'bob' } } });
  assert.equal(result.body.user, 'alice');
});

test('manual reminders select only the requesting account while scheduled runs cover all', async t => {
  const queries = [];
  t.mock.method(Subscription, 'find', async query => { queries.push(query); return []; });
  const { processReminders } = require('../services/cronService');
  await processReminders({ userId: 'alice' });
  await processReminders();
  assert.equal(queries[0].createdBy, 'alice');
  assert.equal(queries[1].createdBy, undefined);
});

test('new subscriptions and CSV imports force the authenticated owner', async t => {
  const created = [];
  t.mock.method(Subscription, 'create', async data => { created.push(data); return data; });
  const router = require('../routes/subscriptions');
  const body = { domain: 'new.com', ownerEmail: 'client@example.com', expiryDate: '2027-01-01',
    reminderIntervals: [7], createdBy: 'bob', _id: 'bob-record', $set: { createdBy: 'bob' } };
  assert.equal((await invoke(router, 'post', '/', { body })).statusCode, 201);
  assert.equal((await invoke(router, 'post', '/import-csv', { body: { items: [body] } })).body.createdCount, 1);
  for (const record of created) {
    assert.equal(record.createdBy, 'alice');
    assert.equal(record._id, undefined);
    assert.equal(record.$set, undefined);
  }
});
