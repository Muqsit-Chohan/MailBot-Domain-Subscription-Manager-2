const pick = (body, fields) => Object.fromEntries(
  fields.filter(key => Object.prototype.hasOwnProperty.call(body, key)).map(key => [key, body[key]])
);

exports.subscriptionFields = body => pick(body, [
  'domain', 'registrar', 'owner', 'ownerEmail', 'ownerEmails', 'subscriptionType',
  'customTypeName', 'renewalCycle', 'customCycleMonths', 'expiryDate', 'reminderIntervals',
  'status', 'cost', 'currency', 'sslExpiryDate', 'sslIssuer', 'sslValid', 'lastCheckedAt',
  'notes', 'autoRenew', 'notificationsEnabled',
]);
exports.templateFields = body => pick(body, ['name', 'type', 'subject', 'htmlBody', 'textBody', 'isDefault']);
