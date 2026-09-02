const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const PendingVerification = require('../models/PendingVerification');
const { sendVerificationEmail } = require('../services/emailService');
const { auth } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    if (!name?.trim()) {
      return res.status(400).json({ message: 'Name is required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    const userCount = await User.countDocuments();

    // If this is the FIRST user in the system -> make them verified Admin immediately
    if (userCount === 0) {
      const adminUser = new User({
        name: name || 'Admin',
        email: cleanEmail,
        password,
        role: 'admin',
        isActive: true,
        isVerified: true,
      });
      await adminUser.save();

      const jwtToken = jwt.sign({ id: adminUser._id, role: adminUser.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

      return res.status(201).json({
        message: 'Admin account created successfully! You can now configure SMTP settings in the Settings page.',
        token: jwtToken,
        user: { id: adminUser._id, name: adminUser.name, email: adminUser.email, role: adminUser.role },
      });
    }

    // Subsequent users -> verification flow
    const existingPending = await PendingVerification.findOne({ email: cleanEmail });
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = Date.now() + 3600000; // 1 hour

    if (existingPending) {
      existingPending.name = name;
      existingPending.password = password;
      existingPending.verificationToken = verificationToken;
      existingPending.verificationTokenExpiry = verificationTokenExpiry;
      await existingPending.save();
    } else {
      const pending = new PendingVerification({
        name,
        email: cleanEmail,
        password,
        verificationToken,
        verificationTokenExpiry,
      });
      await pending.save();
    }

    // Do not make account registration wait for a slow SMTP connection.
    res.status(201).json({
      message: 'Account created! Please check your email to verify your account.',
    });

    sendVerificationEmail(cleanEmail, verificationToken).catch((emailErr) => {
      const verifyLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
      console.log(`\n========================================\n[SMTP Notice] Email failed to send (${emailErr.message}).\nDirect Verification URL:\n${verifyLink}\n========================================\n`);
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
});

// GET /api/auth/verify-email?token=xxx
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ message: 'Invalid token.' });
    }

    const pending = await PendingVerification.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gt: Date.now() },
    });

    if (!pending) {
      return res.status(400).json({ message: 'Token is invalid or expired.' });
    }

    const existingUser = await User.findOne({ email: pending.email });
    if (existingUser) {
      await pending.deleteOne();
      return res.status(400).json({ message: 'This email is already verified. Please log in.' });
    }

    const user = new User({
      name: pending.name,
      email: pending.email,
      password: pending.password,
      isActive: true,
      isVerified: true,
    });
    await user.save();
    await pending.deleteOne();

    // Auto-login (optional): generate JWT and return
    const jwtToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Email verified successfully.',
      token: jwtToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/login (modified to check isVerified)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email before logging in.' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        webhookUrl: user.webhookUrl,
        webhookEnabled: user.webhookEnabled,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Return success message anyway to prevent user enumeration attacks
      return res.json({ message: 'If that email exists in our system, a password reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const { sendPasswordResetEmail } = require('../services/emailService');
    await sendPasswordResetEmail(user.email, resetToken);

    res.json({ message: 'If that email exists in our system, a password reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Failed to send password reset email: ' + err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password has been reset successfully! You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/auth/profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, webhookUrl, webhookEnabled } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (typeof webhookUrl !== 'undefined') user.webhookUrl = webhookUrl;
    if (typeof webhookEnabled !== 'undefined') user.webhookEnabled = webhookEnabled;

    await user.save();
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        webhookUrl: user.webhookUrl,
        webhookEnabled: user.webhookEnabled,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;