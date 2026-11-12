/* Opening Coach: board, game flow and panels. */
(function () {
  const $ = (id) => document.getElementById(id);
  const GLYPH = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
  const VS = "︎"; // ask for text glyphs, not emoji
  const STORE_KEY = "openingCoach.games.v1";
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- Storage (may be blocked; never crash) ---------- */
  function loadGames() {
    try {
      const v = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
      return Array.isArray(v) ? v.filter((g) => g && typeof g === "object") : [];
    } catch (e) { return []; }
  }
  function saveGames(list) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(-200))); } catch (e) { /* ignore */ }
  }
  let savedGames = loadGames();

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
  function openingName() {
    const hist = S.game.history();
    if (!hist.length) return { name: null };
    const r = Book.lookup(hist);
    if (!r.named) return { name: "Unknown opening", off: true };
    return { name: r.named.name, off: !r.inBook };
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
      if (p) inner += `<span class="pc ${p.color}">${GLYPH[p.type]}${VS}</span>`;
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
      html = `<span class="eyebrow">Opening</span><span class="name">${esc(op.name)}</span>${op.off ? `<span class="off">(left the known lines)</span>` : ""}`;
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
    const items = Book.list.filter((e) => e.practice && (S.filter === "all" || e.side === S.filter));
    let html = `<p>Pick an opening and press Practice. The computer follows the line, and the Hint button shows you the next book move.</p>`;
    html += `<div class="filters" role="group" aria-label="Filter">${[["all", "All"], ["w", "For White"], ["b", "For Black"]].map(([k, l]) => `<button type="button" data-filter="${k}" aria-pressed="${S.filter === k}">${l}</button>`).join("")}</div>`;
    items.forEach((e) => {
      const plan = (e.plan && e.plan[e.side]) || [];
      html += `<div class="ocard">
        <div class="head"><h3>${esc(e.name)}</h3><span class="side-tag">For ${e.side === "w" ? "White" : "Black"}</span></div>
        <div class="line">${esc(formatLine(e.list))}</div>
        <p>${esc(e.note)}</p>
        ${plan.length ? `<ol>${plan.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>` : ""}
        <div><button class="btn" type="button" data-practice="${esc(e.moves)}">Practice as ${e.side === "w" ? "White" : "Black"}</button></div>
      </div>`;
    });
    pane.innerHTML = html;
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
      pane.innerHTML = html;
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
    html += `<div class="section"><h4>Results</h4><p>${R.w} wins · ${R.l} losses · ${R.d} draws</p></div>`;

    const firsts = Object.entries(prof.firsts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    if (firsts.length) {
      html += `<div class="section"><h4>Your first moves</h4><div class="tablewrap"><table class="rec"><thead><tr><th>Move</th><th class="num">Games</th></tr></thead><tbody>`;
      firsts.forEach(([k, n]) => (html += `<tr><td>${esc(k)}</td><td class="num">${n}</td></tr>`));
      html += `</tbody></table></div></div>`;
    }
    const ops = Object.entries(prof.openings).sort((a, b) => b[1].n - a[1].n).slice(0, 10);
    html += `<div class="section"><h4>Your openings</h4><div class="tablewrap"><table class="rec"><thead><tr><th>Opening</th><th class="num">W</th><th class="num">L</th><th class="num">D</th></tr></thead><tbody>`;
    ops.forEach(([k, v]) => (html += `<tr><td>${esc(k)}</td><td class="num">${v.w}</td><td class="num">${v.l}</td><td class="num">${v.d}</td></tr>`));
    html += `</tbody></table></div></div>`;

    html += S.confirmClear
      ? `<div class="confirm"><span>Delete all saved games?</span><button class="btn" type="button" id="btn-clear-yes">Yes, delete</button><button class="btn" type="button" id="btn-clear-no">Cancel</button></div>`
      : `<div><button class="btn" type="button" id="btn-clear">Clear history</button></div>`;
    pane.innerHTML = html;
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

  function render() {
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
  document.querySelector(".panel").addEventListener("click", (ev) => {
    const f = ev.target.closest("[data-filter]");
    if (f) { S.filter = f.dataset.filter; renderOpenings(); return; }
    const p = ev.target.closest("[data-practice]");
    if (p) { startPractice(p.dataset.practice, p.dataset.side); return; }
    if (ev.target.id === "btn-clear") { S.confirmClear = true; renderStyle(); }
    if (ev.target.id === "btn-clear-no") { S.confirmClear = false; renderStyle(); }
    if (ev.target.id === "btn-clear-yes") { savedGames = []; saveGames(savedGames); S.confirmClear = false; renderStyle(); }
  });

  newGame();
})();
