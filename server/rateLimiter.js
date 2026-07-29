/* ============================================================
   server/rateLimiter.js
   Tiny in-memory fixed-window rate limiter for Socket.IO events.
   No external dependencies (no express-rate-limit etc.) — this is
   deliberately simple, matching "avoid unnecessary abstractions".

   Only applied to low-frequency, abuse-prone events (room create/
   join/start, chat). NOT applied to `input`/`state-update-broadcast`,
   which legitimately fire ~30-60 times/sec during gameplay — rate
   limiting those would break the game, not secure it.
   ============================================================ */

function createRateLimiter(maxEvents, windowMs) {
  // key -> array of timestamps within the current window
  const hits = new Map();

  return {
    // Returns true if this call is allowed, false if the caller has
    // exceeded maxEvents within the trailing windowMs.
    allow(key) {
      const now = Date.now();
      let timestamps = hits.get(key);
      if (!timestamps) { timestamps = []; hits.set(key, timestamps); }

      // Drop timestamps outside the trailing window.
      while (timestamps.length && now - timestamps[0] > windowMs) timestamps.shift();

      if (timestamps.length >= maxEvents) return false;
      timestamps.push(now);
      return true;
    },

    // Call periodically (or on disconnect) to stop the map growing
    // unbounded from long-disconnected sockets.
    forget(key) {
      hits.delete(key);
    }
  };
}

module.exports = { createRateLimiter };
