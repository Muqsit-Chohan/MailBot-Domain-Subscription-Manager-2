const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  domain: { type: String, required: true, trim: true },
  registrar: { type: String, trim: true },
  owner: { type: String, trim: true },

  // ✅ Primary email (backward compatible)
  ownerEmail: { type: String, required: true, lowercase: true, trim: true },

  // ✅ NEW: Multiple client emails
  ownerEmails: [{ type: String, lowercase: true, trim: true }],

  // ✅ NEW: Subscription type and renewal cycle
  subscriptionType: {
    type: String,
    enum: ['Domain', 'Hosting', 'SSL', 'Custom'],
    default: 'Domain',
  },
  renewalCycle: {
    type: String,
    enum: ['Monthly', 'Quarterly', 'Yearly', 'Custom'],
    default: 'Yearly',
  },

  expiryDate: { type: Date, required: true },
  reminderIntervals: {
    type: [Number],
    default: [30, 15, 7, 1],
    validate: {
      validator: arr => arr.every(n => Number.isInteger(n) && n > 0),
      message: 'Reminder intervals must be positive integers',
    },
  },
  status: { type: String, enum: ['active', 'expired', 'expiring_soon'], default: 'active' },
  notes: { type: String, trim: true },
  autoRenew: { type: Boolean, default: false },
  notificationsEnabled: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastReminderSent: { type: Date },
  remindersSent: [{ interval: Number, sentAt: Date }],
}, { timestamps: true });

// Pre-save hook (unchanged)
subscriptionSchema.pre('save', async function () {
  const now = new Date();
  const expiry = new Date(this.expiryDate);
  const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  if (expiry < now) this.status = 'expired';
  else if (daysUntilExpiry <= 30) this.status = 'expiring_soon';
  else this.status = 'active';
});

module.exports = mongoose.model('Subscription', subscriptionSchema);