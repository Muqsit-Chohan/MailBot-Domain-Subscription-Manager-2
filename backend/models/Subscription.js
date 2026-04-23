const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  domain: { type: String, required: true, trim: true },
  registrar: { type: String, trim: true },
  owner: { type: String, trim: true },
  ownerEmail: { type: String, required: true, lowercase: true, trim: true },
  expiryDate: { type: Date, required: true },
  reminderIntervals: {
    type: [Number],
    default: [30, 15, 7, 1],
    validate: {
      validator: arr => arr.every(n => Number.isInteger(n) && n > 0),
      message: 'Reminder intervals must be positive integers'
    }
  },
  status: { type: String, enum: ['active', 'expired', 'expiring_soon'], default: 'active' },
  notes: { type: String, trim: true },
  autoRenew: { type: Boolean, default: false },
  notificationsEnabled: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastReminderSent: { type: Date },
  remindersSent: [{ interval: Number, sentAt: Date }],
}, { timestamps: true });

subscriptionSchema.pre('save', async function () {
  const now = new Date();
  const expiry = new Date(this.expiryDate);
  const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  if (expiry < now) this.status = 'expired';
  else if (daysUntilExpiry <= 30) this.status = 'expiring_soon';
  else this.status = 'active';
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
