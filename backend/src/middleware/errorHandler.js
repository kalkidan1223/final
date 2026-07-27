// PostgreSQL unique_violation code
const PG_UNIQUE_VIOLATION = '23505';

function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
}

// Must be registered LAST, after all routes.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(err);

  if (err.code === PG_UNIQUE_VIOLATION) {
    return res.status(409).json({ error: 'A record with this value already exists' });
  }

  const status = err.statusCode || 500;
  const message = status === 500 ? 'Internal server error' : err.message;
  res.status(status).json({ error: message });
}

module.exports = { notFoundHandler, errorHandler };
