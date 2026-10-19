/**
 * Tiny dependency-free in-memory rate limiter.
 *
 * This project has no rate-limiting library, so this keeps a fixed-window
 * counter in process memory. It is deliberately simple: it protects the
 * question endpoints from accidental spam / bursts (the strict two-pending
 * rule is the real invariant, enforced in the database). For a multi-instance
 * deployment swap this for a Redis-backed limiter.
 *
 * Usage: router.post('/x', requireAuth, rateLimit({ windowMs, max }), handler)
 * Must run AFTER requireAuth when keying on req.user.id.
 */
function rateLimit({ windowMs = 60_000, max = 30, message = 'Too many requests. Please slow down and try again shortly.', keyFn } = {}) {
  const hits = new Map();

  // Opportunistic cleanup so the map cannot grow without bound.
  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits.entries()) {
      if (now > entry.resetAt) hits.delete(key);
    }
  }, Math.max(windowMs, 60_000));
  if (typeof sweeper.unref === 'function') sweeper.unref();

  return function limiter(req, res, next) {
    const now = Date.now();
    const key = keyFn ? keyFn(req) : `${req.user?.id ?? req.ip}:${req.baseUrl}${req.route?.path || req.path}`;

    const entry = hits.get(key);
    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= max) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: message, code: 'RATE_LIMITED', retry_after_seconds: retryAfter });
    }

    entry.count += 1;
    return next();
  };
}

module.exports = { rateLimit };
