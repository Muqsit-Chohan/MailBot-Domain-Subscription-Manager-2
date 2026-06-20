const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate' },
  to: { type: String, required: true },
  subject: { type: String, required: true },
  status: { type: String, enum: ['sent', 'failed', 'pending'], default: 'pending' },
  errorMessage: { type: String },
  reminderInterval: { type: Number }, // days before expiry
  messageId: { type: String },
  domain: { type: String },
  sentAt: { type: Date },
  triggeredBy: { type: String, enum: ['cron', 'manual', 'test', 'verification'], default: 'cron' },
}, { timestamps: true });

module.exports = mongoose.model('EmailLog', emailLogSchema);
