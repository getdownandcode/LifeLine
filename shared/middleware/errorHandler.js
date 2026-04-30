const { fail } = require('../utils/response');

function notFound(req, res) {
  return fail(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
}

function errorHandler(error, req, res, _next) {
  const status = error.statusCode || error.status || 500;
  req.log?.error({ err: error }, error.message);
  return fail(res, status, status === 500 ? 'Internal server error' : error.message);
}

module.exports = { notFound, errorHandler };
