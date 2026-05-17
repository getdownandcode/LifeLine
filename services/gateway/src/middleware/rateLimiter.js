const rateLimit = require('express-rate-limit');

function limiter(options = {}) {
  const {
    rateLimitWindowMs = 900000,
    rateLimitMaxRequests = 100,
    rateLimitBypassInternalTokens = true
  } = options;

  return rateLimit({
    windowMs: rateLimitWindowMs,
    limit(req) {
      if (rateLimitBypassInternalTokens && req.header('x-internal-token') === process.env.INTERNAL_SERVICE_TOKEN) {
        return rateLimitMaxRequests * 1000;
      }
      if (req.user?.role === 'hospital_staff') return rateLimitMaxRequests * 10;
      return rateLimitMaxRequests;
    },
    standardHeaders: true,
    legacyHeaders: false
  });
}

module.exports = { limiter };
