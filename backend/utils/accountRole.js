const ADMIN_EMAIL = 'muqsit816@gmail.com';
const accountRole = email => typeof email === 'string' && email.trim().toLowerCase() === ADMIN_EMAIL ? 'admin' : 'user';
module.exports = { ADMIN_EMAIL, accountRole };
