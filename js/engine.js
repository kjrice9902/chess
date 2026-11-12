/*
 * Small chess engine: material + piece-square tables, alpha-beta search,
 * and a short capture search so it does not hang pieces.
 * It uses the fast internal moves of lib/chess.js (g._fast) and has a time limit.
 */
(function () {
  const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  // Tables are from White's view, index 0 = a8.
  const PST = {
    p: [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5,
        0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
    n: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30,
        -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
    b: [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10,
        -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
    r: [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5,
        -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
    q: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5,
        0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
    k: [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30,
        -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20],
  };
  const MATE = 100000;
  const TIMEOUT = { timeout: true };

  // Score from the side to move. Reads the 0x88 board directly.
  function evaluate(g) {
    const b = g._fast.board();
    let s = 0;
    for (let i = 0; i < 120; i++) {
      if (i & 0x88) { i += 7; continue; }
      const p = b[i];
      if (!p) continue;
      const r = i >> 4, c = i & 7;
      if (p.color === "w") s += VAL[p.type] + PST[p.type][r * 8 + c];
      else s -= VAL[p.type] + PST[p.type][(7 - r) * 8 + c];
    }
    return g.turn() === "w" ? s : -s;
  }

  function orderScore(m) {
    let s = 0;
    if (m.captured) s += 10 * VAL[m.captured] - VAL[m.piece] + 1000;
    if (m.promotion) s += 800 + VAL[m.promotion];
    return s;
  }
  const order = (moves) => moves.sort((a, b) => orderScore(b) - orderScore(a));

  let deadline = Infinity, nodes = 0;
  function tick() {
    if ((++nodes & 511) === 0 && Date.now() > deadline) throw TIMEOUT;
  }

  function quiesce(g, alpha, beta, qd) {
    tick();
    const f = g._fast;
    // A capture that gives mate (for example Qxf7#) must count as mate, not as material.
    if (f.inCheck() && !f.moves().length) return -MATE;
    const stand = evaluate(g);
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    if (qd >= 4) return alpha;
    const caps = order(f.moves(true));
    for (const m of caps) {
      f.make(m);
      const sc = -quiesce(g, -beta, -alpha, qd + 1);
      f.undo();
      if (sc >= beta) return beta;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  }

  function negamax(g, depth, alpha, beta, ply) {
    tick();
    const f = g._fast;
    const moves = f.moves();
    if (!moves.length) return f.inCheck() ? -MATE + ply : 0;
    if (depth <= 0) return quiesce(g, alpha, beta, 0);
    order(moves);
    for (const m of moves) {
      f.make(m);
      const sc = -negamax(g, depth - 1, -beta, -alpha, ply + 1);
      f.undo();
      if (sc >= beta) return beta;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  }

  // Turn an internal move into the normal chess.js move object (with SAN).
  function toVerbose(g, m, verboseList) {
    const from = g._fast.algebraic(m.from), to = g._fast.algebraic(m.to);
    return verboseList.find((v) => v.from === from && v.to === to && (v.promotion || null) === (m.promotion || null));
  }

  function rootSearch(g, depth, exact, first) {
    const f = g._fast;
    const moves = order(f.moves());
    if (first) {
      // Search the previous best move first: it makes alpha-beta much faster.
      const i = moves.findIndex((m) => m.from === first.from && m.to === first.to && m.promotion === first.promotion);
      if (i > 0) { moves.splice(i, 1); moves.unshift(first); }
    }
    const out = [];
    let alpha = -MATE - 1;
    for (const m of moves) {
      f.make(m);
      let sc;
      const reply = f.moves();
      if (!reply.length) sc = f.inCheck() ? MATE : 0;
      else sc = -negamax(g, depth - 1, -MATE - 1, exact ? MATE + 1 : -alpha, 1);
      f.undo();
      out.push({ m, score: sc });
      if (sc > alpha) alpha = sc;
    }
    out.sort((a, b) => b.score - a.score);
    return out;
  }

  // Score every legal move (exact scores). Used by the coach.
  function scoreMoves(fen, depth, timeLimit) {
    const g = new Chess(fen);
    const verbose = g.moves({ verbose: true });
    deadline = timeLimit ? Date.now() + timeLimit : Infinity;
    try {
      const res = rootSearch(g, depth, true);
      return res.map((r) => ({ move: toVerbose(g, r.m, verbose), score: r.score }));
    } catch (e) {
      if (e !== TIMEOUT) throw e;
      return null; // too slow: caller skips the check
    } finally {
      deadline = Infinity;
    }
  }

  // Iterative deepening with a time limit. Always returns a legal move.
  function bestMove(fen, maxDepth, timeLimit) {
    const g = new Chess(fen);
    const verbose = g.moves({ verbose: true });
    if (!verbose.length) return { move: null, score: 0 };
    let best = null;
    deadline = timeLimit ? Date.now() + timeLimit : Infinity;
    try {
      for (let d = 1; d <= maxDepth; d++) {
        const res = rootSearch(g, d, false, best && best.m);
        best = res[0];
        if (best.score >= MATE - 10) break; // found a mate
      }
    } catch (e) {
      if (e !== TIMEOUT) throw e;
    } finally {
      deadline = Infinity;
    }
    if (!best) return { move: verbose[0], score: 0 };
    return { move: toVerbose(g, best.m, verbose), score: best.score };
  }

  // Any move that mates at once?
  function mateInOne(g) {
    return g.moves({ verbose: true }).find((m) => m.san.endsWith("#")) || null;
  }

  /*
   * Opponent levels, weakest to strongest.
   *  greedy:       looks only at the position right after its own move (never at your reply)
   *  depth:        how many moves ahead it looks (plus a short capture check)
   *  noise:        random error added to each move's score, in centipawns (100 = one pawn)
   *  randomChance: share of moves picked at random
   *  mateChance:   chance it notices a checkmate in one
   *  book:         lowest opening-book rating it plays (null = no opening book)
   *  time:         thinking time limit in ms
   */
  const LEVELS = {
    supereasy:  { label: "super easy",  greedy: true, noise: 150, randomChance: 0.5, mateChance: 0.3, book: null },
    easy:       { label: "easy",        depth: 1, noise: 90, randomChance: 0.15, mateChance: 1, book: 2, time: 600 },
    medium:     { label: "medium",      depth: 2, noise: 25, randomChance: 0, mateChance: 1, book: 3, time: 1200 },
    mediumhard: { label: "medium-hard", depth: 3, noise: 8, randomChance: 0, mateChance: 1, book: 3, time: 1600 },
    hard:       { label: "hard",        depth: 4, noise: 0, randomChance: 0, mateChance: 1, book: 3, time: 2500 },
  };
  const LEVEL_ORDER = ["supereasy", "easy", "medium", "mediumhard", "hard"];

  // Super easy: grabs whatever looks best right now and never thinks about your reply.
  function greedyMove(g, noise) {
    const f = g._fast;
    let best = null, bestScore = -Infinity;
    for (const m of f.moves()) {
      f.make(m);
      const s = -evaluate(g) + (Math.random() * 2 - 1) * noise;
      f.undo();
      if (s > bestScore) { bestScore = s; best = m; }
    }
    return toVerbose(g, best, g.moves({ verbose: true }));
  }

  function choose(fen, level) {
    if (!LEVELS[level]) throw new Error("Unknown opponent level: " + level);
    const L = LEVELS[level];
    const g = new Chess(fen);
    const legal = g.moves({ verbose: true });
    if (!legal.length) return null;
    const mate = mateInOne(g);
    if (mate && Math.random() < L.mateChance) return mate;
    if (L.randomChance && Math.random() < L.randomChance) {
      return legal[Math.floor(Math.random() * legal.length)];
    }
    if (L.greedy) return greedyMove(g, L.noise);
    if (L.noise) {
      const scored = scoreMoves(fen, L.depth, L.time);
      if (!scored) return bestMove(fen, 1).move;
      scored.forEach((s) => (s.score += (Math.random() * 2 - 1) * L.noise));
      scored.sort((a, b) => b.score - a.score);
      return scored[0].move;
    }
    return bestMove(fen, L.depth, L.time).move;
  }

  window.Engine = { evaluate, scoreMoves, bestMove, choose, VAL, MATE, LEVELS, LEVEL_ORDER };
})();
