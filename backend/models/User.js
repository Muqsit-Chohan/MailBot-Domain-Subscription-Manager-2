const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  isActive: { type: Boolean, default: true },
  // ===== NEW FIELDS FOR EMAIL VERIFICATION =====
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  verificationTokenExpiry: Date,
  // ===== PASSWORD RESET =====
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  // ===== WEBHOOK NOTIFICATIONS =====
  webhookUrl: { type: String, trim: true },
  webhookEnabled: { type: Boolean, default: false },
  // ============================================
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  if (/^\$2[aby]\$/.test(this.password)) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);