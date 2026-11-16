// Potwatch router: four surfaces on hash routes, one fetch per view.
//
//   #/                              the board
//   #/bounty/<slug>                 one bounty
//   #/bounty/<slug>/leaderboard     that bounty's leaderboard
//   #/bounty/<slug>/entries         that bounty's entries
//   #/u/<handle>                    an account's public profile
//
// window.__shotReady is false while a route loads and true once its data is
// on screen, so a screenshot script knows when to capture. Countdowns tick
// in place every 30 seconds: the numbers move, the page is never rebuilt.

import { dropCache, getBounties, getBounty, getLeaderboard, getProfile, stats } from './api.js';
import { applyBoard, board, boardList, bountyPage, entriesPage, errorPage, leaderboardPage, profilePage } from './views.js';
import { timeLeft } from './format.js';

const app = document.getElementById('app');
const net = document.getElementById('net');

const boardState = { query: '', filter: 'open', sort: 'deadline' };
let boardData = null;
let boardAt = 0;
let tickTimer = null;

function showNet() {
  const s = stats();
  net.textContent = s.requests ? `${s.requests} API request${s.requests === 1 ? '' : 's'} · ${s.cacheHits} served from cache` : 'Live from make.fun API';
}

/** Tick every .tick countdown in place, without touching the rest. */
function tick() {
  for (const el of document.querySelectorAll('.tick[data-deadline]')) {
    el.textContent = timeLeft(el.dataset.deadline);
  }
}

function startTick() {
  stopTick();
  tickTimer = setInterval(tick, 30000);
}

function stopTick() {
  if (tickTimer !== null) clearInterval(tickTimer);
  tickTimer = null;
}

/** Wire the board's search, filter, sort and refresh to re-render the list only. */
function wireBoard() {
  const q = document.getElementById('q');
  const filter = document.getElementById('filter');
  const sort = document.getElementById('sort');
  const refresh = document.getElementById('refresh');
  const list = document.getElementById('board-list');
  if (!q || !boardData) return;
  const rerender = () => {
    boardState.query = q.value;
    boardState.filter = filter.value;
    boardState.sort = sort.value;
    list.innerHTML = boardList(applyBoard(boardData.items ?? [], boardState));
  };
  q.addEventListener('input', rerender);
  filter.addEventListener('change', rerender);
  sort.addEventListener('change', rerender);
  refresh.addEventListener('click', () => {
    dropCache();
    render(true);
  });
}

function wireRetry() {
  const retry = document.getElementById('retry');
  if (retry) retry.addEventListener('click', () => render(true));
}

function setTitle(text) {
  document.title = `${text} — Potwatch · make.fun bounties`;
}

function fail(err) {
  app.innerHTML = errorPage(err instanceof Error ? err.message : String(err));
  wireRetry();
  showNet();
  window.__shotReady = true;
}

async function render(force = false) {
  window.__shotReady = false;
  stopTick();
  const hash = location.hash || '#/';
  const bountyMatch = hash.match(/^#\/bounty\/([^/?#]+)(?:\/(leaderboard|entries))?$/);
  const profileMatch = hash.match(/^#\/u\/([^/?#]+)$/);
  try {
    if (bountyMatch) {
      const slug = decodeURIComponent(bountyMatch[1]);
      const tab = bountyMatch[2] || 'overview';
      const b = await getBounty(slug);
      setTitle(b.title);
      if (tab === 'leaderboard') {
        const lb = await getLeaderboard(slug);
        app.innerHTML = leaderboardPage(b, lb);
      } else if (tab === 'entries') {
        app.innerHTML = entriesPage(b);
      } else {
        app.innerHTML = bountyPage(b);
      }
    } else if (profileMatch) {
      const handle = decodeURIComponent(profileMatch[1]);
      const p = await getProfile(handle);
      setTitle(`@${p.handle}`);
      app.innerHTML = profilePage(p);
    } else {
      setTitle('Live bounties');
      if (!boardData || force || Date.now() - boardAt > 60000) {
        boardData = await getBounties();
        boardAt = Date.now();
      }
      app.innerHTML = board(boardData, boardState);
      wireBoard();
    }
  } catch (err) {
    fail(err);
    return;
  }
  showNet();
  startTick();
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

window.addEventListener('hashchange', () => render());
render();
