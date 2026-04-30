const rateLimit = require('express-rate-limit');

function limiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    limit(req) {
      if (req.header('x-internal-token') === process.env.INTERNAL_SERVICE_TOKEN) return 100000;
      if (req.user?.role === 'hospital_staff') return 1000;
      return 100;
    },
    standardHeaders: true,
    legacyHeaders: false
  });
}

module.exports = { limiter };
