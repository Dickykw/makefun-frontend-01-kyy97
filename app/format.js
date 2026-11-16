// Small helpers for showing API values. Everything here is pure: no DOM, no
// network, so a view can re-render a ticking countdown without re-fetching.

/** Text made safe to put inside HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** A dollar amount ('1000.00', 0.5, '615.00') as '$1,000' or '$0.50'. */
export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** A deadline as a date in UTC. */
export function date(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

/** Short date, for table cells: 'Nov 17, 19:30'. */
export function shortDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
}

/** Milliseconds until a deadline; negative once it has passed. */
export function msLeft(iso) {
  return new Date(iso).getTime() - Date.now();
}

/** The time until a deadline: '2d 4h left', '35m left', '42s left', 'ended'. */
export function timeLeft(iso) {
  const ms = msLeft(iso);
  if (ms <= 0) return 'ended';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m ${seconds}s left`;
  return `${seconds}s left`;
}

/** Whether a bounty still takes entries: judged by its deadline, never by its status alone. */
export function takesEntries(b) {
  return msLeft(b.deadline) > 0;
}

/** 'Closing soon' inside the last 6 hours, for the urgency pill. */
export function closingSoon(b) {
  const ms = msLeft(b.deadline);
  return ms > 0 && ms < 6 * 3600000;
}

/** A count as '1,234'. */
export function num(n) {
  return Number(n ?? 0).toLocaleString('en-US');
}

/** A leaderboard win rate stored in micros (950587) as '95.06%'. */
export function winRate(micro) {
  const n = Number(micro);
  if (!Number.isFinite(n)) return '—';
  return `${(n / 10000).toFixed(2)}%`;
}

/** Bytes as '660.8 KB'. */
export function bytes(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  if (v < 1024) return `${v} B`;
  if (v < 1048576) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / 1048576).toFixed(2)} MB`;
}

/** An avatar path from the API ('/api/avatars/….webp') as an absolute URL. */
export function avatarUrl(path) {
  if (!path) return '';
  return path.startsWith('http') ? path : `https://make.fun${path}`;
}

/** A wallet address shortened to its ends: 'E8Zo…cuft9'. */
export function shortWallet(address) {
  const a = String(address ?? '');
  return a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-5)}` : a;
}
