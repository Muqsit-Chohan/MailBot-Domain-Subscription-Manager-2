const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  subject: { type: String, required: true, trim: true },
  htmlBody: { type: String, required: true },
  textBody: { type: String },
  type: {
    type: String,
    enum: ['reminder_30', 'reminder_15', 'reminder_7', 'reminder_1', 'expired', 'custom'],
    default: 'custom'
  },
  variables: [{ type: String }], // list of variable names used like {{domain}}, {{days}}
  isDefault: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
