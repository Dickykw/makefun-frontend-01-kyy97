// The four surfaces, each a function from API data to HTML: the board, one
// bounty's page, its leaderboard and an account's public profile. Views are
// pure strings; main.js fetches, caches and wires the controls, and re-renders
// only the list when the board's search or sort changes, never the whole page.

import { avatarUrl, bytes, closingSoon, date, esc, money, msLeft, num, shortDate, shortWallet, takesEntries, timeLeft, winRate } from './format.js';
import { md } from './md.js';

/** The reward as it stands now: the live pot, else the base reward. */
export function potOf(b) {
  return money(b.potUsd ?? b.rewardAmount);
}

/** Open / closing-soon / ended pill, judged by deadline, never status alone. */
export function statusPill(b) {
  if (!takesEntries(b)) return '<span class="pill ended">Ended</span>';
  if (closingSoon(b)) return '<span class="pill soon">Closing soon</span>';
  return '<span class="pill open">Open</span>';
}

function bountyLink(slug, title) {
  return `<a href="#/bounty/${encodeURIComponent(slug)}">${esc(title)}</a>`;
}

function profileLink(handle) {
  return `<a href="#/u/${encodeURIComponent(handle)}">${esc(handle)}</a>`;
}

/** One board card: pot first, then fee, time left and entries. */
export function bountyCard(b) {
  const fee = Number(b.entryFeeUsd) > 0
    ? `<span class="fact"><span class="k">Entry fee</span><b>${money(b.entryFeeUsd)}</b></span>`
    : '<span class="fact"><span class="k">Entry fee</span><b class="free">Free</b></span>';
  return `
  <article class="card">
    <div class="card-top">${statusPill(b)}<span class="cat">${esc(b.category ?? '')}</span></div>
    <h3>${bountyLink(b.slug, b.title)}</h3>
    <p class="sum">${esc(b.summary ?? '')}</p>
    <p class="pot"><span>Live pot</span><b>${potOf(b)}</b></p>
    <div class="facts">
      ${fee}
      <span class="fact"><span class="k">Time left</span><b class="tick" data-deadline="${esc(b.deadline)}">${timeLeft(b.deadline)}</b></span>
      <span class="fact"><span class="k">Entries</span><b>${num(b.submissionCount)}</b></span>
      <span class="fact"><span class="k">Deadline</span><b>${shortDate(b.deadline)}</b></span>
    </div>
    <p class="meta">by ${esc(b.sponsor?.name ?? 'make.fun')}${b.skills?.length ? ` · ${esc(b.skills.slice(0, 3).join(' · '))}` : ''}</p>
  </article>`;
}

/** The board's card list only, so search and sort re-render this, not the page. */
export function boardList(items) {
  if (!items.length) return '<p class="empty">No bounties match. Clear the search or pick another filter.</p>';
  return `<div class="grid">${items.map(bountyCard).join('')}</div>`;
}

/** The board shell: totals strip, search, filter and sort controls, then the list. */
export function board(data, state) {
  const items = data.items ?? [];
  const open = items.filter(takesEntries);
  const totalPot = open.reduce((sum, b) => sum + Number(b.potUsd ?? b.rewardAmount ?? 0), 0);
  const totalEntries = open.reduce((sum, b) => sum + Number(b.submissionCount ?? 0), 0);
  const next = [...open].sort((a, b) => msLeft(a.deadline) - msLeft(b.deadline))[0];
  return `
  <section class="hero">
    <h1>Live bounties</h1>
    <p class="lede">Every open bounty on make.fun, with its live pot, entry fee, time left and entries — refreshed from the public API, one request a view.</p>
    <dl class="strip">
      <div><dt>Open now</dt><dd>${num(open.length)}</dd></div>
      <div><dt>Live pots</dt><dd>${money(totalPot)}</dd></div>
      <div><dt>Entries</dt><dd>${num(totalEntries)}</dd></div>
      <div><dt>Closes next</dt><dd>${next ? `${bountyLink(next.slug, next.title)} <span class="tick" data-deadline="${esc(next.deadline)}">${timeLeft(next.deadline)}</span>` : '—'}</dd></div>
    </dl>
  </section>
  <div class="controls" role="search">
    <label>Search <input id="q" type="search" placeholder="Search title, category or skill…" value="${esc(state.query)}" autocomplete="off"></label>
    <label>Show
      <select id="filter">
        <option value="open" ${state.filter === 'open' ? 'selected' : ''}>Open now</option>
        <option value="soon" ${state.filter === 'soon' ? 'selected' : ''}>Closing soon</option>
        <option value="all" ${state.filter === 'all' ? 'selected' : ''}>All bounties</option>
        <option value="ended" ${state.filter === 'ended' ? 'selected' : ''}>Ended</option>
      </select>
    </label>
    <label>Sort by
      <select id="sort">
        <option value="deadline" ${state.sort === 'deadline' ? 'selected' : ''}>Deadline — soonest</option>
        <option value="pot" ${state.sort === 'pot' ? 'selected' : ''}>Live pot — biggest</option>
        <option value="entries" ${state.sort === 'entries' ? 'selected' : ''}>Entries — most</option>
        <option value="fee" ${state.sort === 'fee' ? 'selected' : ''}>Entry fee — lowest</option>
      </select>
    </label>
    <button id="refresh" type="button">Refresh</button>
  </div>
  <div id="board-list">${boardList(applyBoard(items, state))}</div>`;
}

/** Filter + sort the board's items from the control state. */
export function applyBoard(items, state) {
  const q = state.query.trim().toLowerCase();
  let list = items.filter((b) => {
    if (state.filter === 'open') return takesEntries(b);
    if (state.filter === 'soon') return closingSoon(b);
    if (state.filter === 'ended') return !takesEntries(b);
    return true;
  });
  if (q) {
    list = list.filter((b) => `${b.title} ${b.category ?? ''} ${(b.skills ?? []).join(' ')} ${b.summary ?? ''}`.toLowerCase().includes(q));
  }
  const by = {
    deadline: (a, b) => msLeft(a.deadline) - msLeft(b.deadline),
    pot: (a, b) => Number(b.potUsd ?? b.rewardAmount ?? 0) - Number(a.potUsd ?? a.rewardAmount ?? 0),
    entries: (a, b) => Number(b.submissionCount ?? 0) - Number(a.submissionCount ?? 0),
    fee: (a, b) => Number(a.entryFeeUsd ?? 0) - Number(b.entryFeeUsd ?? 0),
  };
  return [...list].sort(by[state.sort] ?? by.deadline);
}

/** The rewards table: place, base prize, fee share and total, from rewardsNow. */
export function rewardsTable(b) {
  const rows = (b.rewardsNow ?? []).map((r) => `
    <tr><td>${num(r.place)}</td><td>${money(r.baseUsd)}</td><td>${money(r.feeShareUsd)}</td><td><b>${money(r.amountUsd)}</b></td></tr>`);
  if (rows.length) {
    return `<table class="rewards"><thead><tr><th>Place</th><th>Prize</th><th>Fee share</th><th>Total now</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
  }
  const map = b.rewards ?? {};
  const fallback = Object.entries(map).map(([place, amount]) => `
    <tr><td>${num(place)}</td><td>${money(amount)}</td><td>—</td><td><b>${money(amount)}</b></td></tr>`);
  if (!fallback.length) return '<p>No reward breakdown published yet.</p>';
  return `<table class="rewards"><thead><tr><th>Place</th><th>Prize</th><th>Fee share</th><th>Total now</th></tr></thead><tbody>${fallback.join('')}</tbody></table>`;
}

/** Facts column of a bounty page: pot, fee, dates, status, entries. */
function bountyFacts(b) {
  return `
  <dl class="facts-box">
    <div><dt>Live pot</dt><dd class="big">${potOf(b)}</dd></div>
    <div><dt>Base reward</dt><dd>${money(b.rewardAmount)}</dd></div>
    <div><dt>Entry fee</dt><dd>${Number(b.entryFeeUsd) > 0 ? money(b.entryFeeUsd) : 'Free'}</dd></div>
    <div><dt>Entries</dt><dd>${num(b.submissionCount)}</dd></div>
    <div><dt>Published</dt><dd>${date(b.publishedAt)}</dd></div>
    <div><dt>Deadline</dt><dd>${date(b.deadline)}<br><span class="tick" data-deadline="${esc(b.deadline)}">${timeLeft(b.deadline)}</span></dd></div>
    <div><dt>Status</dt><dd>${statusPill(b)} ${takesEntries(b) ? 'takes entries' : 'takes no more entries'}</dd></div>
    ${b.entryFeePayers ? `<div><dt>Fee payers</dt><dd>${num(b.entryFeePayers)}</dd></div>` : ''}
  </dl>`;
}

/** Tabs shared by a bounty's three sub-pages. */
function bountyTabs(b, active) {
  const tab = (slug, label, href, on) => `<a class="${on ? 'on' : ''}" href="${href}">${label}</a>`;
  return `<nav class="tabs" aria-label="Bounty sections">
    ${tab(b.slug, 'Overview', `#/bounty/${encodeURIComponent(b.slug)}`, active === 'overview')}
    ${tab(b.slug, `Leaderboard`, `#/bounty/${encodeURIComponent(b.slug)}/leaderboard`, active === 'leaderboard')}
    ${tab(b.slug, `Entries (${num(b.submissionCount)})`, `#/bounty/${encodeURIComponent(b.slug)}/entries`, active === 'entries')}
  </nav>`;
}

/** A bounty's page: summary, facts, rewards table, rendered description. */
export function bountyPage(b) {
  return `
  <p class="crumb"><a href="#/">← All bounties</a> · <a href="https://make.fun/bounty/${encodeURIComponent(b.slug)}" target="_blank" rel="noopener">Open on make.fun ↗</a></p>
  <section class="hero bounty-hero">
    <div>${statusPill(b)} <span class="cat">${esc(b.category ?? '')}</span></div>
    <h1>${esc(b.title)}</h1>
    <p class="lede">${esc(b.summary ?? '')}</p>
    <p class="sponsor">by ${esc(b.sponsor?.name ?? 'make.fun')}${b.sponsor?.isVerified ? ' ✓' : ''}${b.skills?.length ? ` · ${b.skills.map((s) => `<span class="chip">${esc(s)}</span>`).join(' ')}` : ''}</p>
  </section>
  ${bountyTabs(b, 'overview')}
  <div class="split">
    <div class="desc">${md(b.description ?? '')}</div>
    <aside>
      ${bountyFacts(b)}
      <h2>Rewards</h2>
      ${rewardsTable(b)}
      <p class="hint">Totals grow as entry fees are paid in. Places 1–20 share the $500 base plus every fee.</p>
    </aside>
  </div>`;
}

/** A bounty's leaderboard: ranked entries with judge win rate and size. */
export function leaderboardPage(b, lb) {
  const entries = lb?.entries ?? [];
  const rows = entries.map((e) => {
    const img = e.image ? `<img crossorigin="anonymous" src="${esc(avatarUrl(e.image))}" alt="" width="28" height="28" loading="lazy">` : '<span class="noava">◆</span>';
    return `<tr>
      <td>${num(e.rank)}</td>
      <td><span class="who">${img}${profileLink(e.handle)}</span></td>
      <td>${esc(e.title ?? '')}</td>
      <td><b>${winRate(e.values?.judge)}</b></td>
      <td>${winRate(e.values?.judge_low)} – ${winRate(e.values?.judge_high)}</td>
      <td>${bytes(e.values?.bytes)}</td>
      <td>${e.values?.valid ? '✓' : '—'}</td>
    </tr>`;
  }).join('');
  return `
  <p class="crumb"><a href="#/">← All bounties</a> · <a href="#/bounty/${encodeURIComponent(b.slug)}">← ${esc(b.title)}</a></p>
  <section class="hero">
    <div>${statusPill(b)} <span class="cat">${esc(b.category ?? '')}</span></div>
    <h1>Leaderboard — ${esc(b.title)}</h1>
    <p class="lede">${lb?.phase?.title ? `${esc(lb.phase.title)} · ` : ''}${num(entries.length)} ranked ${entries.length === 1 ? 'entry' : 'entries'} · win rate is the judge's Bradley–Terry rate, with its 90% interval. Live pot ${potOf(b)} · ${num(b.submissionCount)} entries.</p>
  </section>
  ${bountyTabs(b, 'leaderboard')}
  ${entries.length ? `<div class="tablewrap"><table class="lb">
    <thead><tr><th>#</th><th>Entrant</th><th>Entry</th><th>Win rate</th><th>90% interval</th><th>Size</th><th>Valid</th></tr></thead>
    <tbody>${rows}</tbody></table></div>`
    : '<p class="empty">No ranked entries yet — the leaderboard fills once the judge heat has run.</p>'}`;
}

/** A bounty's entries: who entered, with what, and how it stands. */
export function entriesPage(b) {
  const subs = b.submissions ?? [];
  const rows = subs.map((s) => `<tr>
    <td>${profileLink(s.hunter)}</td>
    <td>${esc(s.title ?? '')}</td>
    <td>${esc(s.status ?? '')}</td>
    <td>${s.score != null ? num(s.score) : '—'}</td>
    <td>${shortDate(s.createdAt)}</td>
  </tr>`).join('');
  return `
  <p class="crumb"><a href="#/">← All bounties</a> · <a href="#/bounty/${encodeURIComponent(b.slug)}">← ${esc(b.title)}</a></p>
  <section class="hero">
    <div>${statusPill(b)} <span class="cat">${esc(b.category ?? '')}</span></div>
    <h1>Entries — ${esc(b.title)}</h1>
    <p class="lede">${num(subs.length)} entries so far · live pot ${potOf(b)} · ${takesEntries(b) ? 'still open' : 'closed'}.</p>
  </section>
  ${bountyTabs(b, 'entries')}
  ${subs.length ? `<div class="tablewrap"><table class="lb">
    <thead><tr><th>Hunter</th><th>Entry</th><th>Status</th><th>Score</th><th>Entered</th></tr></thead>
    <tbody>${rows}</tbody></table></div>`
    : '<p class="empty">No entries yet.</p>'}`;
}

/** An account's public profile: avatar, bio, record and entered solutions. */
export function profilePage(p) {
  const r = p.record ?? {};
  const sols = p.solutions ?? [];
  const img = p.avatar?.url || p.image;
  const rows = sols.map((s) => {
    const c = s.competition ?? {};
    const sc = s.score ?? {};
    const col = sc.column ?? {};
    let score = '—';
    if (sc.value != null) {
      score = col.key === 'judge'
        ? winRate(sc.value)
        : `${num(sc.display ?? sc.value)}${col.title ? ` <span class="muted2">${esc(String(col.title).split('(')[0].trim())}</span>` : ''}`;
    }
    return `<tr>
      <td><a href="#/bounty/${encodeURIComponent(c.slug)}">${esc(c.title ?? c.slug ?? '')}</a></td>
      <td>${s.placement != null ? `#${num(s.placement)}` : '—'}</td>
      <td>${s.prize_usd != null ? money(s.prize_usd) : '—'}</td>
      <td>${score}</td>
      <td>${shortDate(s.entered_at)}</td>
    </tr>`;
  }).join('');
  return `
  <p class="crumb"><a href="#/">← All bounties</a></p>
  <section class="profile">
    ${img ? `<img class="ava" crossorigin="anonymous" src="${esc(avatarUrl(img))}" alt="Avatar of ${esc(p.handle)}" width="96" height="96">` : '<span class="ava noava big">◆</span>'}
    <div>
      <h1>${esc(p.display_name ?? p.handle)}</h1>
      <p class="handle">@${esc(p.handle)}${p.house ? ' · house' : ''} · joined ${date(p.joined_at)}</p>
      ${p.bio ? `<p class="lede">${esc(p.bio)}</p>` : ''}
      <p class="links">
        ${p.github_login ? `<a href="https://github.com/${encodeURIComponent(p.github_login)}" target="_blank" rel="noopener">GitHub ↗</a>` : ''}
        ${p.x ? `<a href="https://x.com/${encodeURIComponent(p.x)}" target="_blank" rel="noopener">X ↗</a>` : ''}
        ${p.wallet?.address ? `<a href="${esc(p.wallet.explorer_url ?? `https://solscan.io/account/${p.wallet.address}`)}" target="_blank" rel="noopener">Wallet ${shortWallet(p.wallet.address)} ↗</a>` : ''}
        <a href="https://make.fun/u/${encodeURIComponent(p.handle)}" target="_blank" rel="noopener">Open on make.fun ↗</a>
      </p>
    </div>
  </section>
  <dl class="strip">
    <div><dt>Entered</dt><dd>${num(r.competitions_entered)}</dd></div>
    <div><dt>Placed</dt><dd>${num(r.competitions_placed)}</dd></div>
    <div><dt>Won</dt><dd>${num(r.competitions_won)}</dd></div>
    <div><dt>Podiums</dt><dd>${num(r.podium_finishes)}</dd></div>
    <div><dt>Best place</dt><dd>${r.best_placement != null ? `#${num(r.best_placement)}` : '—'}</dd></div>
    <div><dt>Prize money</dt><dd>${money(r.prize_usd ?? 0)}</dd></div>
  </dl>
  <h2>Entries (${num(sols.length)})</h2>
  ${sols.length ? `<div class="tablewrap"><table class="lb">
    <thead><tr><th>Bounty</th><th>Place</th><th>Prize</th><th>Score</th><th>Entered</th></tr></thead>
    <tbody>${rows}</tbody></table></div>`
    : '<p class="empty">No entries yet.</p>'}`;
}

/** A failed load, with a retry that re-runs the same route. */
export function errorPage(message) {
  return `<section class="hero"><h1>Could not load this page</h1>
  <p class="lede">${esc(message)}</p>
  <p><button id="retry" type="button">Retry</button> <a href="#/">Back to the board</a></p></section>`;
}
