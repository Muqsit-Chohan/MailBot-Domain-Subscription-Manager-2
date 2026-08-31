const { app, connectToDatabase } = require('../server');

module.exports = async (req, res) => {
  try {
    await connectToDatabase();
    return app(req, res);
  } catch (err) {
    console.error('Database connection failed:', err.message);
    return res.status(500).json({ message: 'Database connection failed' });
  }
};
