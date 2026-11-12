/* Opening Coach: board, game flow and panels. */
(function () {
  const $ = (id) => document.getElementById(id);
  const STORE_KEY = "openingCoach.games.v1";
  const CURRENT_KEY = "openingCoach.current.v1";
  const MAX_GAMES = 2000;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- Storage (may be blocked; never crash) ---------- */
  function loadGames() {
    try {
      const v = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
      return Array.isArray(v) ? v.filter((g) => g && typeof g === "object") : [];
    } catch (e) { return []; }
  }
  function saveGames(list) {
    scheduleCloudGames();
    try { localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(-MAX_GAMES))); return true; } catch (e) { return false; }
  }
  let savedGames = loadGames();
  // Ask the browser to keep our data and not clean it up (works in most browsers; harmless if refused).
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* ignore */ }

  /* ---------- Backup: clean up imported games ---------- */
  const NUM_FIELDS = ["date", "moves", "openingMoves", "center", "develop", "earlyQueen", "edgePawn", "rim", "repeat", "kingWalk", "rookEarly", "weakening", "book", "riskyBook", "captures", "checks", "blunders"];
  function cleanGame(g) {
    if (!g || typeof g !== "object") return null;
    const out = {};
    NUM_FIELDS.forEach((k) => { const n = Number(g[k]); out[k] = Number.isFinite(n) && n >= 0 ? n : 0; });
    if (!out.date) return null;
    out.color = g.color === "b" ? "b" : "w";
    out.result = ["win", "loss", "draw", "unfinished"].includes(g.result) ? g.result : "unfinished";
    out.level = typeof g.level === "string" ? g.level.slice(0, 20) : "";
    out.firstMove = typeof g.firstMove === "string" ? g.firstMove.slice(0, 10) : null;
    out.opening = typeof g.opening === "string" ? g.opening.slice(0, 80) : null;
    const cm = Number(g.castleMove);
    out.castleMove = Number.isFinite(cm) && cm > 0 ? cm : null;
    out.verdicts = {};
    if (g.verdicts && typeof g.verdicts === "object") {
      ["great", "good", "ok", "dubious", "bad"].forEach((k) => { const n = Number(g.verdicts[k]); if (Number.isFinite(n) && n > 0) out.verdicts[k] = n; });
    }
    return out;
  }
  const gameKey = (g) => [g.date, g.opening, g.result, g.moves].join("|");

  /* ---------- Cloud save: only inside the Claude viewer, private to the signed-in player ---------- */
  // Games are grouped by month, one document each, under data/users/<id>/ (private to that person).
  const cloud = { db: null, uid: null, ready: false, failed: false, written: {}, timer: null, curTimer: null, lastCur: "", busy: Promise.resolve() };
  const monthKey = (g) => "games-" + new Date(g.date).toISOString().slice(0, 7);
  const cloudCol = () => cloud.db.collection("data/users/" + cloud.uid);
  function cloudQueue(fn) {
    // One write at a time.
    cloud.busy = cloud.busy.then(fn).catch(() => { cloud.failed = true; });
    return cloud.busy;
  }
  function scheduleCloudGames() {
    if (!cloud.ready) return;
    clearTimeout(cloud.timer);
    cloud.timer = setTimeout(() => cloudQueue(syncCloudGames), 800);
  }
  async function syncCloudGames() {
    const groups = {};
    savedGames.forEach((g) => { const k = monthKey(g); (groups[k] = groups[k] || []).push(g); });
    for (const k of Object.keys(groups)) {
      const body = JSON.stringify(groups[k]);
      if (cloud.written[k] === body) continue;
      await cloudCol().doc(k).set({ games: groups[k] });
      cloud.written[k] = body;
    }
    // Months with no games left (after "Clear history") are removed.
    for (const k of Object.keys(cloud.written)) {
      if (!groups[k]) { await cloudCol().doc(k).delete(); delete cloud.written[k]; }
    }
    cloud.failed = false;
  }
  function scheduleCloudCurrent(json) {
    if (!cloud.ready) return;
    clearTimeout(cloud.curTimer);
    cloud.curTimer = setTimeout(() => {
      if (json === cloud.lastCur) return;
      cloudQueue(async () => { await cloudCol().doc("current").set({ json }); cloud.lastCur = json; });
    }, 2000);
  }
  async function startCloud(hadLocalCurrent) {
    if (!window.claude || typeof window.claude.use !== "function") return; // not in the Claude viewer
    try {
      const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
      if (!db || !user) return;
      const uid = await user.id();
      if (!uid) return;
      cloud.db = db; cloud.uid = uid;
      const snap = await cloudCol().get();
      const have = new Set(savedGames.map(gameKey));
      let added = 0, cur = null;
      snap.docs.forEach((d) => {
        const body = d.data() || {};
        if (d.id === "current") { cur = typeof body.json === "string" ? body.json : null; return; }
        if (!d.id.startsWith("games-") || !Array.isArray(body.games)) return;
        cloud.written[d.id] = JSON.stringify(body.games);
        body.games.forEach((raw) => {
          const g = cleanGame(raw);
          if (g && !have.has(gameKey(g))) { have.add(gameKey(g)); savedGames.push(g); added++; }
        });
      });
      savedGames.sort((a, b) => a.date - b.date);
      cloud.ready = true;
      cloud.lastCur = cur || "";
      saveGames(savedGames); // keeps this device in step and uploads games the cloud is missing
      if (!hadLocalCurrent && cur && !S.game.history().length && restoreCurrent(cur)) { afterMove(); return; }
      if (added || S.tab === "style") renderPanel();
    } catch (e) {
      cloud.failed = true;
    }
  }

  /* ---------- State ---------- */
  const S = {
    game: new Chess(),
    opp: "medium",
    userColor: "w",
    orientation: "w",
    selected: null,
    last: null,
    hint: null,       // { from, to, text }
    reviews: [],      // user reviews + opponent notes
    thinking: false,
    over: false,
    result: null,     // win | loss | draw
    endText: "",
    saved: false,
    practice: null,   // opening entry being practiced
    tab: "coach",
    backupMsg: "",
    showPaste: false,
    filter: "all",
    confirmClear: false,
  };
  const friend = () => S.opp === "friend";
  const isUserTurn = () => friend() || S.game.turn() === S.userColor;
  const myColor = () => (friend() ? S.game.turn() : S.userColor);

  /* ---------- Helpers ---------- */
  function formatLine(list, startPly) {
    let out = "";
    list.forEach((san, i) => {
      const ply = (startPly || 0) + i;
      if (ply % 2 === 0) out += `${ply / 2 + 1}.${san} `;
      else out += (i === 0 ? `${(ply + 1) / 2}...` : "") + `${san} `;
    });
    return out.trim();
  }
  /* ---------- Opening ratings (one color scale everywhere) ---------- */
  const TIERS = [
    { v: "great", label: "Best", desc: "Top choices. Strong players use these the most." },
    { v: "good", label: "Good", desc: "Solid and reliable." },
    { v: "ok", label: "Playable", desc: "Fine, but there are better choices." },
    { v: "dubious", label: "Risky", desc: "Can work, but a careful opponent can punish it." },
    { v: "bad", label: "Avoid", desc: "Weak. These lose time or weaken your king." },
  ];
  const TIER = Object.fromEntries(TIERS.map((t) => [t.v, t]));
  const tierChip = (v) => `<span class="chip ${v}">${TIER[v].label}</span>`;
  // One entry per opening name (the shortest line), without the checkmate traps.
  const OPENINGS = (() => {
    const seen = new Set(), out = [];
    for (const e of Book.list) {
      if (/Mate/.test(e.name) || seen.has(e.name)) continue;
      seen.add(e.name);
      out.push(e);
    }
    return out;
  })();

  function openingName() {
    const hist = S.game.history();
    if (!hist.length) return { name: null };
    const r = Book.lookup(hist);
    if (!r.named) return { name: "Unknown opening", off: true };
    return { name: r.named.name, off: !r.inBook, entry: r.named };
  }
  function practiceOn() {
    if (!S.practice) return false;
    const hist = S.game.history();
    if (hist.length >= S.practice.list.length) return false;
    return hist.every((s, i) => s === S.practice.list[i]);
  }

  /* ---------- Board ---------- */
  function squaresInOrder() {
    const files = "abcdefgh".split("");
    const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];
    if (S.orientation === "b") { files.reverse(); ranks.reverse(); }
    const out = [];
    for (const r of ranks) for (const f of files) out.push(f + r);
    return out;
  }

  function renderBoard() {
    const g = S.game;
    const boardEl = $("board");
    const targets = {};
    if (S.selected) {
      g.moves({ square: S.selected, verbose: true }).forEach((m) => (targets[m.to] = m));
    }
    let checkSq = null;
    if (g.in_check()) {
      const b = g.board();
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const p = b[r][c];
        if (p && p.type === "k" && p.color === g.turn()) checkSq = "abcdefgh"[c] + (8 - r);
      }
    }
    const order = squaresInOrder();
    let html = "";
    order.forEach((sq, i) => {
      const f = sq.charCodeAt(0) - 97, r = +sq[1];
      const light = (f + r) % 2 === 1;
      const p = g.get(sq);
      const cls = ["sq", light ? "l" : "d"];
      if (S.last && (S.last.from === sq || S.last.to === sq)) cls.push("last");
      if (S.hint && (S.hint.from === sq || S.hint.to === sq)) cls.push("hint");
      if (S.selected === sq) cls.push("sel");
      if (targets[sq]) cls.push("tgt", targets[sq].captured ? "cap" : "");
      if (checkSq === sq) cls.push("check");
      let inner = "";
      if (p) inner += Theme.pieceSvg(p.color, p.type);
      if (i >= 56) inner += `<span class="coord f">${sq[0]}</span>`;
      if (i % 8 === 0) inner += `<span class="coord r">${sq[1]}</span>`;
      const name = p ? `${p.color === "w" ? "White" : "Black"} ${({ k: "king", q: "queen", r: "rook", b: "bishop", n: "knight", p: "pawn" })[p.type]} on ${sq}` : sq;
      html += `<button type="button" role="gridcell" class="${cls.join(" ").trim()}" data-sq="${sq}" aria-label="${name}">${inner}</button>`;
    });
    boardEl.innerHTML = html;
  }

  function onSquare(sq) {
    if (S.over || S.thinking || !isUserTurn()) return;
    const g = S.game;
    if (S.selected) {
      const mv = g.moves({ square: S.selected, verbose: true }).find((m) => m.to === sq);
      if (mv) { userMove(S.selected, sq); return; }
    }
    const p = g.get(sq);
    S.selected = p && p.color === g.turn() && S.selected !== sq ? sq : null;
    renderBoard();
  }

  /* ---------- Moves ---------- */
  function userMove(from, to) {
    const g = S.game;
    const fenBefore = g.fen();
    const hist = g.history();
    const color = g.turn();
    const prevMine = g.history({ verbose: true }).filter((m) => m.color === color);
    const practicing = practiceOn();
    const mv = g.move({ from, to, promotion: "q" });
    if (!mv) return;
    const r = Coach.review({ fenBefore, historyBefore: hist, move: mv, myPrevMoves: prevMine });
    r.by = "you";
    if (practicing) {
      const expected = S.practice.list[hist.length];
      if (expected !== mv.san) r.tips.push(`You left the ${S.practice.name} line. The book move here was ${expected}.`);
    }
    S.reviews.push(r);
    S.last = mv; S.selected = null; S.hint = null;
    afterMove();
  }

  function cpuMove() {
    const g = S.game;
    const hist = g.history();
    const before = openingName().name;
    let san = null;
    if (practiceOn()) san = S.practice.list[hist.length];
    else if (hist.length < 16) {
      const minRank = S.opp === "easy" ? 2 : 3;
      const opts = Book.nextMoves(hist).filter((o) => o.entry && Coach.RANK[o.entry.verdict] >= minRank && g.moves().includes(o.san));
      if (opts.length) {
        const pool = [];
        opts.forEach((o) => { pool.push(o); if (o.entry.verdict === "great") pool.push(o, o); });
        san = pool[Math.floor(Math.random() * pool.length)].san;
      }
    }
    let mv;
    if (san) mv = g.move(san);
    if (!mv) {
      const choice = Engine.choose(g.fen(), S.opp);
      mv = g.move({ from: choice.from, to: choice.to, promotion: choice.promotion || "q" });
    }
    const after = openingName();
    const note = { by: "opp", san: mv.san, ply: hist.length, moveNo: Math.floor(hist.length / 2) + 1, color: mv.color, text: "" };
    if (after.name && after.name !== before && !after.off) note.text = `Opening is now: ${after.name}`;
    S.reviews.push(note);
    S.last = mv;
    S.thinking = false;
    afterMove();
  }

  function afterMove() {
    checkEnd();
    render();
    if (!S.over && !friend() && S.game.turn() !== S.userColor) {
      S.thinking = true;
      renderPlayers();
      const token = S.game;
      setTimeout(() => {
        // Skip if a new game started, or the game ended (resign) while waiting.
        if (S.game !== token) return;
        if (S.over || friend() || S.game.turn() === S.userColor) { S.thinking = false; render(); return; }
        cpuMove();
      }, 300);
    }
  }

  function checkEnd() {
    const g = S.game;
    if (!g.game_over()) return;
    S.over = true;
    if (g.in_checkmate()) {
      const winner = g.turn() === "w" ? "b" : "w";
      S.endText = `Checkmate. ${winner === "w" ? "White" : "Black"} wins.`;
      S.result = friend() ? null : winner === S.userColor ? "win" : "loss";
    } else {
      let why = "Draw";
      if (g.in_stalemate()) why = "Draw by stalemate";
      else if (g.in_threefold_repetition()) why = "Draw by repetition";
      else if (g.insufficient_material()) why = "Draw: not enough pieces to mate";
      S.endText = `${why}.`;
      S.result = "draw";
    }
    recordGame();
  }

  function recordGame() {
    if (S.saved || friend()) return;
    const mine = S.reviews.filter((r) => r.by === "you");
    if (mine.length < 3) return;
    const op = openingName();
    savedGames.push(Coach.summarize(mine, { color: S.userColor, result: S.result || "unfinished", level: S.opp, opening: op.name }));
    saveGames(savedGames);
    S.saved = true;
  }

  function newGame(opts) {
    // Count a long unfinished game so the style profile still learns from it.
    if (!S.over && !S.saved && !friend() && S.reviews.filter((r) => r.by === "you").length >= 8) {
      S.result = "unfinished";
      recordGame();
    }
    const colorOpt = $("opt-color").value;
    S.opp = $("opt-opp").value;
    S.practice = (opts && opts.practice) || null;
    S.userColor = S.practice ? S.practice.side : colorOpt === "r" ? (Math.random() < 0.5 ? "w" : "b") : colorOpt;
    if (S.practice) $("opt-color").value = S.userColor;
    S.orientation = friend() ? "w" : S.userColor;
    S.game = new Chess();
    S.selected = S.last = S.hint = null;
    S.reviews = [];
    S.thinking = S.over = S.saved = false;
    S.result = null; S.endText = "";
    setTab("coach");
    afterMove();
  }

  /* ---------- Buttons ---------- */
  function undo() {
    if (S.thinking) return;
    const g = S.game;
    if (!g.history().length) return;
    g.undo();
    if (!friend() && g.turn() !== S.userColor && g.history().length) g.undo();
    const n = g.history().length;
    S.reviews = S.reviews.filter((r) => r.ply < n);
    const hv = g.history({ verbose: true });
    S.last = hv[hv.length - 1] || null;
    S.over = false; S.endText = ""; S.selected = null; S.hint = null;
    afterMove();
  }

  function hint() {
    if (S.over || S.thinking || !isUserTurn()) return;
    const g = S.game;
    const hist = g.history();
    let san = null, why = "";
    if (practiceOn()) {
      san = S.practice.list[hist.length];
      why = `This is the next move of the ${S.practice.name}.`;
    } else {
      const opts = Book.nextMoves(hist).filter((o) => o.entry && Coach.RANK[o.entry.verdict] >= 3);
      if (opts.length) {
        opts.sort((a, b) => Coach.RANK[b.entry.verdict] - Coach.RANK[a.entry.verdict]);
        san = opts[0].san;
        const e = opts[0].entry;
        why = e.list.length === hist.length + 1 ? `${e.name}: ${e.note}` : `A main-line move. It leads to the ${e.name}.`;
      }
    }
    let mv = san ? g.moves({ verbose: true }).find((m) => m.san === san) : null;
    if (!mv) {
      $("status").textContent = "Thinking about a hint...";
      const token = g, ply = hist.length;
      setTimeout(() => {
        if (S.game !== token || g.history().length !== ply || S.over) return;
        const best = Engine.bestMove(g.fen(), 3, 1200).move;
        S.hint = { from: best.from, to: best.to, text: `Try ${best.san}. The computer likes this move best here.` };
        render();
      }, 30);
      return;
    }
    S.hint = { from: mv.from, to: mv.to, text: `Try ${mv.san}. ${why}` };
    render();
  }

  function resign() {
    if (S.over || friend() || !S.game.history().length) return;
    S.over = true;
    S.result = "loss";
    S.endText = "You resigned.";
    recordGame();
    render();
  }

  /* ---------- Render: players, banner, status ---------- */
  function renderPlayers() {
    const topColor = S.orientation === "w" ? "b" : "w";
    const name = (c) => {
      if (friend()) return c === "w" ? "White" : "Black";
      if (c === S.userColor) return "You";
      return `Computer (${S.opp})`;
    };
    const line = (c) => {
      const think = S.thinking && c !== S.userColor && !friend() ? `<span class="thinking">thinking...</span>` : "";
      const turn = !S.over && S.game.turn() === c && !think ? "to move" : "";
      return `<span><strong>${name(c)}</strong> · ${c === "w" ? "White" : "Black"}</span><span>${think || turn}</span>`;
    };
    $("player-top").innerHTML = line(topColor);
    $("player-bottom").innerHTML = line(topColor === "w" ? "b" : "w");
  }

  function renderBanner() {
    const op = openingName();
    let html;
    if (!op.name) {
      html = `<span class="eyebrow">Opening</span><span class="name">${S.practice ? "Practice: " + esc(S.practice.name) : "Make your first move"}</span>`;
    } else {
      html = `<span class="eyebrow">Opening</span><span class="name">${esc(op.name)}</span>`;
      if (op.entry && !/Mate/.test(op.entry.name)) html += `${tierChip(op.entry.verdict)}<span class="off">for ${op.entry.side === "w" ? "White" : "Black"}</span>`;
      if (op.off) html += `<span class="off">(left the known lines)</span>`;
      if (S.practice) html += `<span class="off">Practice: ${esc(S.practice.name)}</span>`;
    }
    $("banner").innerHTML = html;
  }

  function renderStatus() {
    const el = $("status");
    el.className = "status" + (S.over ? " end" : "");
    if (S.over) {
      const extra = S.saved ? " Saved to My style." : "";
      el.textContent = S.endText + extra;
    } else if (S.game.in_check()) el.textContent = "Check!";
    else el.textContent = "";
    $("btn-resign").disabled = S.over || friend();
    $("btn-undo").disabled = !S.game.history().length;
  }

  /* ---------- Coach tab ---------- */
  function renderCoach() {
    const pane = $("pane-coach");
    const mine = S.reviews.filter((r) => r.by === "you");
    const last = mine[mine.length - 1];
    const color = myColor();
    let html = "";

    // Latest move card
    html += `<div class="verdict-card">`;
    if (S.hint) {
      html += `<p class="tip hintnote">${esc(S.hint.text)}</p>`;
    }
    if (!last) {
      html += `<h3>Make your first move</h3><p>I will tell you the name of the opening, if the move is good, and a plan to follow. Your style profile grows with every game.</p>`;
    } else {
      const shown = last.inOpening || last.flags.blunder || last.flags.mistake;
      const prefix = last.color === "w" ? `${last.moveNo}.` : `${last.moveNo}...`;
      html += `<div class="top"><span class="mv">${prefix}${esc(last.san)}</span><span class="chip ${last.verdict}">${last.label}</span></div>`;
      if (shown) {
        html += `<h3>${esc(last.title)}</h3><p>${esc(last.text)}</p>`;
      } else {
        html += `<p class="empty">The opening is over. I now only warn you when a move loses material.</p>`;
      }
      last.tips.forEach((t) => (html += `<p class="tip">${esc(t)}</p>`));
    }
    html += `</div>`;

    // Plan
    const hist = S.game.history();
    const r = Book.lookup(hist);
    const planEntry = r.plans[color];
    const myMoves = S.game.history({ verbose: true }).filter((m) => m.color === color);
    const list = Coach.checklist(S.game, color, myMoves);
    html += `<div class="section"><h4>${planEntry ? "Your plan in the " + esc(planEntry.name) : "Your plan"} (${color === "w" ? "White" : "Black"})</h4>`;
    const steps = planEntry ? planEntry.plan[color] : Coach.generalPlan(list);
    html += `<ol class="plan">${steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol></div>`;

    html += `<div class="section"><h4>Opening checklist</h4><ul class="checks">`;
    list.forEach((c) => (html += `<li class="${c.done ? "done" : ""}"><span class="box">${c.done ? "✓" : "○"}</span>${esc(c.text)}</li>`));
    html += `</ul></div>`;

    // Feed
    html += `<div class="section"><h4>Move by move</h4>`;
    if (!S.reviews.length) html += `<p class="empty">Your moves and their ratings show here.</p>`;
    else {
      html += `<ul class="feed">`;
      S.reviews.slice().reverse().forEach((x) => {
        const num = x.color === "w" ? `${x.moveNo}.` : `${x.moveNo}...`;
        if (x.by === "you") {
          const t = x.inOpening ? x.title : x.flags.blunder ? "Loses material" : "";
          html += `<li><span class="n">${num}</span><span class="s"><span class="dot ${x.verdict}"></span>${esc(x.san)}</span><span class="t">${esc(x.label)}${t ? " · " + esc(t) : ""}</span></li>`;
        } else {
          html += `<li class="opp"><span class="n">${num}</span><span class="s">${esc(x.san)}</span><span class="t">${friend() ? "" : "Opponent"}${x.text ? " · " + esc(x.text) : ""}</span></li>`;
        }
      });
      html += `</ul>`;
    }
    html += `</div>`;

    html += `<div class="section"><h4>Moves</h4><div class="movelist">${hist.length ? esc(formatLine(hist)) : '<span class="empty">No moves yet.</span>'}</div></div>`;
    pane.innerHTML = html;
  }

  /* ---------- Openings tab ---------- */
  function renderOpenings() {
    const pane = $("pane-openings");
    let html = `<p>Every opening in the coach's book, ranked from best to worst. Open one to read why, and press Practice to play it against the computer.</p>`;
    html += `<div class="legend" aria-label="Color key">${TIERS.map((t) => tierChip(t.v)).join("")}</div>`;
    html += `<div class="filters" role="group" aria-label="Filter">${[["all", "All"], ["w", "For White"], ["b", "For Black"]].map(([k, l]) => `<button type="button" data-filter="${k}" aria-pressed="${S.filter === k}">${l}</button>`).join("")}</div>`;
    html += `<input class="search" id="open-search" type="search" placeholder="Search openings, e.g. Sicilian" value="${esc(S.search || "")}" aria-label="Search openings">`;
    html += `<div id="open-list"></div>`;
    pane.innerHTML = html;
    renderOpeningList();
  }

  function renderOpeningList() {
    const q = (S.search || "").trim().toLowerCase();
    const items = OPENINGS.filter((e) => (S.filter === "all" || e.side === S.filter) && (!q || e.name.toLowerCase().includes(q) || e.moves.toLowerCase().includes(q)));
    let html = "";
    TIERS.forEach((t) => {
      const group = items.filter((e) => e.verdict === t.v).sort((a, b) => (b.practice ? 1 : 0) - (a.practice ? 1 : 0) || a.ply - b.ply);
      if (!group.length) return;
      html += `<section class="tier"><div class="tier-head">${tierChip(t.v)}<span>${group.length} opening${group.length === 1 ? "" : "s"}</span></div><p class="tier-desc">${esc(t.desc)}</p>`;
      group.forEach((e) => {
        const plan = (e.plan && e.plan[e.side]) || [];
        html += `<details class="orow"><summary><span class="dot ${e.verdict}"></span><span class="nm">${esc(e.name)}</span><span class="side-tag">${e.side === "w" ? "White" : "Black"}</span><span class="ln">${esc(formatLine(e.list))}</span></summary>
          <div class="obody"><p>${esc(e.note)}</p>
          ${plan.length ? `<ol>${plan.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>` : ""}
          <div><button class="btn" type="button" data-practice="${esc(e.moves)}" data-side="${e.side}">Practice as ${e.side === "w" ? "White" : "Black"}</button></div></div></details>`;
      });
      html += `</section>`;
    });
    if (!html) html = `<p class="empty">No openings match your search.</p>`;
    $("open-list").innerHTML = html;
  }

  /* ---------- Style tab ---------- */
  function practiceButton(moves, side, label) {
    const e = Book.list.find((x) => x.moves === moves);
    if (!e) return "";
    return `<div class="item"><div><strong>${esc(label)}: ${esc(e.name)}</strong><small>${esc(formatLine(e.list))}</small></div>
      <button class="btn" type="button" data-practice="${esc(moves)}" data-side="${side}">Practice</button></div>`;
  }

  function renderStyle() {
    const pane = $("pane-style");
    const prof = Coach.profile(savedGames);
    let html = "";
    if (!prof) {
      html += `<h3 class="style-name">No games yet</h3>
        <p>Play against the computer. When a game ends (or you start a new one after 8+ moves), I save how you opened. After a few games I can tell your playing style and suggest openings that fit you.</p>
        <div class="section"><h4>What I look at</h4><ul class="plan">
        <li>Do you take the center and develop your pieces?</li>
        <li>Do you castle by move 10?</li>
        <li>How often do you play random moves: edge pawns, the same piece twice, early king or queen moves?</li>
        <li>How often do you attack: checks, captures, gambits?</li></ul></div>`;
      pane.innerHTML = html + backupSection();
      return;
    }
    const st = prof.style;
    html += `<div class="section"><h4>Your style · from ${prof.games} game${prof.games === 1 ? "" : "s"}${prof.games < 3 ? " (play more for a better read)" : ""}</h4>
      <h3 class="style-name">${esc(st.name)}</h3></div>
      <p>${esc(st.blurb)}</p><p class="tip hintnote">${esc(st.fix)}</p>`;
    html += `<div class="section"><h4>Your opening habits</h4><div class="meters">`;
    prof.meters.forEach((m) => {
      html += `<div class="meter ${m.invert ? "invert" : ""}" title="${esc(m.hint)}"><span>${esc(m.label)}</span><span class="bar"><span style="width:${m.value}%"></span></span><span class="v">${m.value}</span></div>`;
    });
    html += `</div><p class="empty" style="margin:8px 0 0;font-size:13px">Higher is better, except for Random moves.</p></div>`;

    html += `<div class="section"><h4>Openings that fit you</h4><div class="rep">
      ${practiceButton(st.white, "w", "As White")}
      ${practiceButton(st.blackE4, "b", "As Black vs 1.e4")}
      ${practiceButton(st.black, "b", "As Black vs 1.d4")}</div></div>`;

    const R = prof.results;
    html += `<div class="section"><h4>Results</h4><p>${R.w} win${R.w === 1 ? "" : "s"} · ${R.l} loss${R.l === 1 ? "" : "es"} · ${R.d} draw${R.d === 1 ? "" : "s"}</p></div>`;

    const firsts = Object.entries(prof.firsts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    if (firsts.length) {
      html += `<div class="section"><h4>Your first moves</h4><div class="tablewrap"><table class="rec"><thead><tr><th>Move</th><th class="num">Games</th></tr></thead><tbody>`;
      firsts.forEach(([k, n]) => (html += `<tr><td>${esc(k)}</td><td class="num">${n}</td></tr>`));
      html += `</tbody></table></div></div>`;
    }
    // Your success with each opening: wins count 1, draws count half.
    const SUCCESS = [
      { min: 0.6, v: "great", label: "Strong" },
      { min: 0.4, v: "ok", label: "Mixed" },
      { min: 0.2, v: "dubious", label: "Weak" },
      { min: -1, v: "bad", label: "Losing" },
    ];
    const ops = Object.entries(prof.openings).map(([name, v]) => {
      const played = v.w + v.l + v.d;
      const score = played ? (v.w + v.d / 2) / played : null;
      const tier = score === null ? null : SUCCESS.find((t) => score >= t.min);
      return { name, ...v, played, score, tier };
    }).sort((a, b) => (b.score ?? -2) - (a.score ?? -2) || b.played - a.played);
    const rated = ops.filter((o) => o.played);
    html += `<div class="section"><h4>Your most and least successful openings</h4>`;
    if (!rated.length) {
      html += `<p class="empty">Finish a game (win, lose or draw) to see which openings work for you.</p>`;
    } else {
      const best = rated[0], worst = rated[rated.length - 1];
      const line = (o, title) => `<div class="succ"><span class="chip ${o.tier.v}">${o.tier.label}</span><div><strong>${title}: ${esc(o.name)}</strong><small>${o.w} win${o.w === 1 ? "" : "s"}, ${o.l} loss${o.l === 1 ? "" : "es"}, ${o.d} draw${o.d === 1 ? "" : "s"} · ${Math.round(o.score * 100)}% score</small></div></div>`;
      html += line(best, "Most successful");
      if (rated.length > 1 && worst !== best) html += line(worst, "Least successful");
      if (rated.length < 2) html += `<p class="empty" style="font-size:13px">Play different openings to compare them.</p>`;
    }
    html += `</div>`;
    html += `<div class="section"><h4>All your openings</h4><div class="tablewrap"><table class="rec"><thead><tr><th>Opening</th><th class="num">W</th><th class="num">L</th><th class="num">D</th><th>Result</th></tr></thead><tbody>`;
    ops.forEach((o) => (html += `<tr><td><span class="dot ${o.tier ? o.tier.v : ""}"></span>${esc(o.name)}</td><td class="num">${o.w}</td><td class="num">${o.l}</td><td class="num">${o.d}</td><td>${o.tier ? `<span class="chip ${o.tier.v}">${o.tier.label}</span>` : `<span class="empty">Not finished</span>`}</td></tr>`));
    html += `</tbody></table></div><p class="empty" style="margin:8px 0 0;font-size:13px">Score: a win counts 1, a draw counts half. Strong = 60% or more, Mixed = 40–59%, Weak = 20–39%, Losing = under 20%.</p></div>`;

    html += S.confirmClear
      ? `<div class="confirm"><span>Delete all saved games${cloud.ready ? " here and in your Claude account" : ""}? Download a backup first if you want to keep them.</span><button class="btn" type="button" id="btn-clear-yes">Yes, delete</button><button class="btn" type="button" id="btn-clear-no">Cancel</button></div>`
      : `<div><button class="btn" type="button" id="btn-clear">Clear history</button></div>`;
    pane.innerHTML = html + backupSection();
  }

  /* ---------- Backup and restore ---------- */
  function backupSection() {
    const n = savedGames.length;
    let html = `<div class="section backup"><h4>Save and backup</h4>
      <p class="saved-note"><span class="dot great"></span>Autosaved on this device: ${n} game${n === 1 ? "" : "s"}, plus the game you are playing now.</p>
      ${cloud.ready ? `<p class="saved-note"><span class="dot ${cloud.failed ? "dubious" : "great"}"></span>${cloud.failed ? "Saving to your Claude account is paused. It will try again with your next game." : "Also saved to your Claude account (only you can see it)."}</p>` : ""}
      <p class="empty" style="margin:0;font-size:13px">Data on this device can be lost if you clear your browser, change browser, or use a different link. Download a backup now and then. You can restore it on any device.</p>
      <div class="controls">
        <button class="btn" type="button" id="btn-export"${n ? "" : " disabled"}>Download backup (.json)</button>
        <button class="btn" type="button" id="btn-copy"${n ? "" : " disabled"}>Copy backup</button>
        <label class="btn filebtn" for="backup-file">Restore from file</label>
        <input type="file" id="backup-file" accept=".json,application/json" hidden>
        <button class="btn" type="button" id="btn-paste">Paste backup</button>
      </div>`;
    if (S.showPaste) {
      html += `<textarea id="backup-text" rows="5" placeholder="Paste your backup text here"></textarea>
        <div class="controls"><button class="btn primary" type="button" id="btn-paste-go">Restore</button><button class="btn" type="button" id="btn-paste-cancel">Cancel</button></div>`;
    }
    if (S.backupMsg) html += `<p class="backup-msg" role="status">${esc(S.backupMsg)}</p>`;
    return html + `</div>`;
  }

  function backupText() {
    return JSON.stringify({ app: "Opening Coach", version: 1, exportedAt: new Date().toISOString(), games: savedGames }, null, 2);
  }
  function setBackupMsg(m) { S.backupMsg = m; renderStyle(); }

  async function exportBackup() {
    const name = `opening-coach-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const text = backupText();
    let file = null;
    try { file = new File([text], name, { type: "application/json" }); } catch (e) { /* old browser */ }
    // On phones, the share sheet lets you "Save to Files".
    // Inside the Claude viewer, files go through its own save prompt.
    if (window.claude && typeof window.claude.use === "function") {
      let dl = null;
      try { dl = await window.claude.use("downloads"); } catch (e) { dl = null; }
      if (dl) {
        try {
          await dl.save({ filename: name, data: text });
          return setBackupMsg(`Saved ${name}.`);
        } catch (e) {
          const code = e && e.code;
          if (code === "declined") return setBackupMsg("Download cancelled.");
          if (code === "rate_limited") return setBackupMsg("A save window is already open. Try again in a moment.");
          // other codes: fall through to the normal browser download
        }
      }
    }
    const phone = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    if (phone && file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: name });
        return setBackupMsg(`Backup shared: ${name}. Choose "Save to Files" to keep it.`);
      } catch (e) {
        if (e && e.name === "AbortError") return;
      }
    }
    try {
      const url = URL.createObjectURL(file || new Blob([text], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setBackupMsg(`Downloaded ${name}. If no file appeared, use Copy backup and paste it into a note.`);
    } catch (e) {
      setBackupMsg("This page cannot download files. Use Copy backup and paste it into a note.");
    }
  }

  function copyBackup() {
    const text = backupText();
    const fallback = () => {
      // Show the text so the player can copy it by hand.
      S.showPaste = true;
      S.backupMsg = "Copy did not work here. The backup text is selected above: copy it yourself.";
      renderStyle();
      const t = $("backup-text");
      t.value = text;
      t.select();
    };
    try {
      navigator.clipboard.writeText(text).then(
        () => setBackupMsg(`Copied ${savedGames.length} games. Paste them into a note or email to keep them safe.`),
        fallback);
    } catch (e) { fallback(); }
  }

  function importBackup(text) {
    let data;
    try { data = JSON.parse(text); } catch (e) { return setBackupMsg("That is not a valid backup. Check that you copied all of the text."); }
    const list = Array.isArray(data) ? data : data && Array.isArray(data.games) ? data.games : null;
    if (!list) return setBackupMsg("That file has no games in it. Pick an Opening Coach backup file.");
    const have = new Set(savedGames.map(gameKey));
    let added = 0, skipped = 0, bad = 0;
    for (const raw of list) {
      const g = cleanGame(raw);
      if (!g) { bad++; continue; }
      const k = gameKey(g);
      if (have.has(k)) { skipped++; continue; }
      have.add(k); savedGames.push(g); added++;
    }
    savedGames.sort((a, b) => a.date - b.date);
    const ok = saveGames(savedGames);
    S.showPaste = false;
    setBackupMsg(`Restored ${added} game${added === 1 ? "" : "s"}.` + (skipped ? ` ${skipped} ${skipped === 1 ? "was" : "were"} already here.` : "") + (bad ? ` ${bad} could not be read.` : "") + (ok ? "" : " Warning: this device could not save them."));
  }

  /* ---------- Tabs ---------- */
  function setTab(t) {
    S.tab = t;
    ["coach", "openings", "style"].forEach((k) => {
      $("tab-" + k).setAttribute("aria-selected", String(k === t));
      $("pane-" + k).hidden = k !== t;
    });
    renderPanel();
  }
  function renderPanel() {
    if (S.tab === "coach") renderCoach();
    else if (S.tab === "openings") renderOpenings();
    else renderStyle();
  }

  /* ---------- Autosave the game in progress ---------- */
  function saveCurrent() {
    const json = JSON.stringify({
      v: 1, moves: S.game.history(), opp: S.opp, userColor: S.userColor, orientation: S.orientation,
      reviews: S.reviews, over: S.over, result: S.result, endText: S.endText, saved: S.saved, practice: S.practice,
    });
    try { localStorage.setItem(CURRENT_KEY, json); } catch (e) { /* storage full or blocked */ }
    scheduleCloudCurrent(json);
  }
  function restoreCurrent(text) {
    let d;
    try { d = JSON.parse(text !== undefined ? text : localStorage.getItem(CURRENT_KEY) || "null"); } catch (e) { return false; }
    if (!d || d.v !== 1 || !Array.isArray(d.moves)) return false;
    const g = new Chess();
    for (const san of d.moves) if (!g.move(san)) return false;
    const opps = ["easy", "medium", "hard", "friend"];
    S.game = g;
    S.opp = opps.includes(d.opp) ? d.opp : "medium";
    S.userColor = d.userColor === "b" ? "b" : "w";
    S.orientation = d.orientation === "b" ? "b" : "w";
    S.reviews = Array.isArray(d.reviews) ? d.reviews.filter((r) => r && typeof r === "object" && r.ply < d.moves.length) : [];
    S.over = !!d.over; S.result = d.result || null; S.endText = typeof d.endText === "string" ? d.endText : ""; S.saved = !!d.saved;
    S.practice = d.practice && Array.isArray(d.practice.list) ? { name: String(d.practice.name), list: d.practice.list.map(String), side: d.practice.side === "b" ? "b" : "w" } : null;
    const hv = g.history({ verbose: true });
    S.last = hv[hv.length - 1] || null;
    $("opt-opp").value = S.opp;
    $("opt-color").value = S.userColor;
    return true;
  }

  function render() {
    saveCurrent();
    renderBoard();
    renderPlayers();
    renderBanner();
    renderStatus();
    renderPanel();
  }

  function startPractice(moves, sideOverride) {
    const e = Book.list.find((x) => x.moves === moves);
    if (!e) return;
    const p = { name: e.name, list: e.list, side: sideOverride || e.side };
    if ($("opt-opp").value === "friend") $("opt-opp").value = "medium";
    newGame({ practice: p });
  }

  /* ---------- Events ---------- */
  $("board").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-sq]");
    if (b) onSquare(b.dataset.sq);
  });
  $("btn-new").addEventListener("click", () => newGame());
  $("btn-undo").addEventListener("click", undo);
  $("btn-hint").addEventListener("click", hint);
  $("btn-resign").addEventListener("click", resign);
  $("btn-flip").addEventListener("click", () => { S.orientation = S.orientation === "w" ? "b" : "w"; render(); });
  ["coach", "openings", "style"].forEach((k) => $("tab-" + k).addEventListener("click", () => setTab(k)));
  $("pane-style").addEventListener("change", (ev) => {
    if (ev.target.id !== "backup-file" || !ev.target.files[0]) return;
    const f = ev.target.files[0];
    if (f.size > 5 * 1024 * 1024) return setBackupMsg("That file is too big to be a backup.");
    const r = new FileReader();
    r.onload = () => importBackup(String(r.result));
    r.onerror = () => setBackupMsg("Could not read that file.");
    r.readAsText(f);
  });
  $("pane-openings").addEventListener("input", (ev) => {
    if (ev.target.id === "open-search") { S.search = ev.target.value; renderOpeningList(); }
  });
  document.querySelector(".panel").addEventListener("click", (ev) => {
    const f = ev.target.closest("[data-filter]");
    if (f) { S.filter = f.dataset.filter; renderOpenings(); return; }
    const p = ev.target.closest("[data-practice]");
    if (p) { startPractice(p.dataset.practice, p.dataset.side); return; }
    if (ev.target.id === "btn-clear") { S.confirmClear = true; renderStyle(); }
    if (ev.target.id === "btn-clear-no") { S.confirmClear = false; renderStyle(); }
    if (ev.target.id === "btn-clear-yes") { savedGames = []; saveGames(savedGames); S.confirmClear = false; S.backupMsg = ""; renderStyle(); }
    if (ev.target.id === "btn-export") exportBackup();
    if (ev.target.id === "btn-copy") copyBackup();
    if (ev.target.id === "btn-paste") { S.showPaste = true; S.backupMsg = ""; renderStyle(); $("backup-text").focus(); }
    if (ev.target.id === "btn-paste-cancel") { S.showPaste = false; renderStyle(); }
    if (ev.target.id === "btn-paste-go") importBackup($("backup-text").value);
  });

  Theme.apply();
  const hadLocalCurrent = restoreCurrent();
  if (hadLocalCurrent) afterMove();
  else newGame();
  startCloud(hadLocalCurrent);
})();
