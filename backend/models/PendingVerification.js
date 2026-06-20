const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const pendingVerificationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  verificationToken: { type: String, required: true },
  verificationTokenExpiry: { type: Date, required: true },
}, { timestamps: true });

pendingVerificationSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  if (/^\$2[aby]\$/.test(this.password)) return;
  this.password = await bcrypt.hash(this.password, 12);
});

module.exports = mongoose.model('PendingVerification', pendingVerificationSchema);
