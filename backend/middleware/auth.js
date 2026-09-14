const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { accountRole } = require('../utils/accountRole');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Access denied. No token.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) return res.status(401).json({ message: 'Invalid token.' });

    // 🔐 Naya check: kya user ka email verify hua hai?
    if (!user.isVerified) {
      return res.status(403).json({ message: 'Email not verified. Please verify your email first.' });
    }

    user.role = accountRole(user.email);
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token.' });
  }
};

const adminOnly = (req, res, next) => {
  if (accountRole(req.user?.email) !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  next();
};

module.exports = { auth, adminOnly };
