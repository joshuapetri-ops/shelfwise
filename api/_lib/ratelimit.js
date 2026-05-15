import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let redis;
try {
  redis = Redis.fromEnv();
} catch {
  console.warn('[ratelimit] Upstash env vars missing — rate limiting is DISABLED. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.');
  redis = null;
}

const limiters = redis
  ? {
      recommendations: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m'), prefix: 'rl:rec', analytics: true }),
      search:          new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1 m'), prefix: 'rl:srch', analytics: true }),
      'search-web':    new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5,  '1 m'), prefix: 'rl:web', analytics: true }),
    }
  : null;

export async function rateLimit(action, key) {
  if (!limiters) {
    return { success: true, remaining: Infinity, reset: Date.now() + 60_000 };
  }
  const limiter = limiters[action] ?? limiters.recommendations;
  return limiter.limit(key);
}
