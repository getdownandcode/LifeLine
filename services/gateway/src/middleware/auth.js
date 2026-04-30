const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  if (req.path === '/health' || req.path === '/ready') return next();
  if (process.env.NODE_ENV === 'development' && !process.env.REQUIRE_AUTH) return next();

  const header = req.header('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, error: { message: 'Missing bearer token' } });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (_error) {
    return res.status(401).json({ success: false, error: { message: 'Invalid bearer token' } });
  }
}

module.exports = { auth };
