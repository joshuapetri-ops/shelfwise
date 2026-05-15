import { anthropic } from './_lib/anthropic.js';
import { rateLimit } from './_lib/ratelimit.js';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body ?? {};
  const { action, did } = body;

  if (!action) {
    return res.status(400).json({ error: 'Missing action' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.headers['x-real-ip']
    || 'unknown';
  const limitKey = did ? `${ip}:${did}` : ip;

  let limit;
  try {
    limit = await rateLimit(action, limitKey);
  } catch (err) {
    console.error('[/api/claude] rate-limit error', err);
    limit = { success: true, remaining: 0, reset: Date.now() + 60_000 };
  }

  if (!limit.success) {
    res.setHeader('Retry-After', Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000)));
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }
  if (Number.isFinite(limit.remaining)) {
    res.setHeader('X-RateLimit-Remaining', String(limit.remaining));
  }

  try {
    switch (action) {
      case 'recommendations':
        return res.status(200).json(await anthropic.recommendations(body));
      case 'search':
        return res.status(200).json(await anthropic.search(body));
      case 'search-web':
        return res.status(200).json(await anthropic.searchWeb(body));
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error('[/api/claude]', action, err);
    const status = err?.status >= 400 && err?.status < 600 ? err.status : 502;
    return res.status(status).json({ error: 'Upstream error' });
  }
}
