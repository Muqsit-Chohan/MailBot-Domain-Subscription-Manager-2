const mongoose = require('mongoose');

const smtpSettingsSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  host: String,
  port: Number,
  username: String,
  password: String,
  senderEmail: String,
  senderName: String,
  secure: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('SmtpSettings', smtpSettingsSchema);