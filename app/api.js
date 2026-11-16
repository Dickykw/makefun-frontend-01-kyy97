// make.fun's public API: read-only GET requests, open to any origin (CORS).
// Full description: https://make.fun/api/openapi.json
// One request per view, answered from a 45-second in-memory cache: the API's
// ETags are bound to the minute, so re-fetching inside the same minute buys
// nothing. Every call is counted and shown in the header, so the cost of a
// view is visible instead of hidden.

const API = 'https://make.fun/api';

const cache = new Map();
const TTL = 45000;
let requests = 0;
let cacheHits = 0;

export function stats() {
  return { requests, cacheHits };
}

/** Empty the cache: the board's Refresh button re-reads the API for real. */
export function dropCache() {
  cache.clear();
}

async function get(path) {
  const now = Date.now();
  const hit = cache.get(path);
  if (hit && now - hit.at < TTL) {
    cacheHits++;
    return hit.data;
  }
  requests++;
  const res = await fetch(API + path);
  if (!res.ok) throw new Error(`make.fun API ${res.status} for ${path}`);
  const data = await res.json();
  cache.set(path, { at: now, data });
  return data;
}

/** All bounties, newest first by deadline: the board sorts and filters them. */
export const getBounties = () => get('/competitions?limit=50');

/** One bounty, by slug: summary, description, rewards, dates, entries. */
export const getBounty = (slug) => get(`/competitions/${encodeURIComponent(slug)}`);

/** A bounty's leaderboard: ranked entries with judge win rates and sizes. */
export const getLeaderboard = (slug) => get(`/competitions/${encodeURIComponent(slug)}/leaderboard`);

/** An account's public profile: bio, record and entered solutions. */
export const getProfile = (handle) => get(`/profiles/${encodeURIComponent(handle)}`);
