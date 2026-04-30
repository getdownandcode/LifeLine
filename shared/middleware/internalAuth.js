function internalAuth(req, res, next) {
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (!expected || req.header('x-internal-token') === expected) return next();
  return res.status(401).json({ success: false, error: { message: 'Invalid internal service token' } });
}

module.exports = { internalAuth };
