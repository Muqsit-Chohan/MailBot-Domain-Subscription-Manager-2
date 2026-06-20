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

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    const existingPending = await PendingVerification.findOne({ email });
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
        email,
        password,
        verificationToken,
        verificationTokenExpiry,
      });
      await pending.save();
    }

    // Send verification email
    await sendVerificationEmail(email, verificationToken);

    res.status(201).json({
      message: 'Registration initiated! Please check your email to verify your account.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
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
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ... aapke baaki jo routes pehle se the (e.g., profile, etc.) unhe yahin rakhein

module.exports = router;