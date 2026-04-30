function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

function created(res, data) {
  return ok(res, data, 201);
}

function fail(res, status, message, details) {
  return res.status(status).json({ success: false, error: { message, details } });
}

module.exports = { ok, created, fail };
