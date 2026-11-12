/*
 * Small chess engine: material + piece-square tables, alpha-beta search,
 * and a short capture search so it does not hang pieces.
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

  // Score from the side to move.
  function evaluate(g) {
    const b = g.board();
    let s = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = b[r][c];
        if (!p) continue;
        if (p.color === "w") s += VAL[p.type] + PST[p.type][r * 8 + c];
        else s -= VAL[p.type] + PST[p.type][(7 - r) * 8 + c];
      }
    }
    return g.turn() === "w" ? s : -s;
  }

  function moveOrderScore(m) {
    let s = 0;
    if (m.captured) s += 10 * VAL[m.captured] - VAL[m.piece] + 1000;
    if (m.promotion) s += 800;
    if (m.san.indexOf("+") >= 0) s += 50;
    return s;
  }
  const order = (moves) => moves.sort((a, b) => moveOrderScore(b) - moveOrderScore(a));

  let nodes = 0;
  function quiesce(g, alpha, beta, qd) {
    nodes++;
    const stand = evaluate(g);
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    if (qd >= 4) return alpha;
    const caps = order(g.moves({ verbose: true }).filter((m) => m.captured || m.promotion));
    for (const m of caps) {
      g.move(m);
      const sc = -quiesce(g, -beta, -alpha, qd + 1);
      g.undo();
      if (sc >= beta) return beta;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  }

  function negamax(g, depth, alpha, beta, ply) {
    nodes++;
    const moves = g.moves({ verbose: true });
    if (!moves.length) return g.in_check() ? -MATE + ply : 0;
    if (g.insufficient_material()) return 0;
    if (depth === 0) return quiesce(g, alpha, beta, 0);
    order(moves);
    for (const m of moves) {
      g.move(m);
      const sc = -negamax(g, depth - 1, -beta, -alpha, ply + 1);
      g.undo();
      if (sc >= beta) return beta;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  }

  // Score every legal move at the given depth (exact scores, no pruning at root).
  function scoreMoves(fen, depth) {
    const g = new Chess(fen);
    const moves = order(g.moves({ verbose: true }));
    const out = [];
    for (const m of moves) {
      g.move(m);
      let sc;
      if (g.in_checkmate()) sc = MATE;
      else if (g.in_draw()) sc = 0;
      else sc = -negamax(g, depth - 1, -MATE - 1, MATE + 1, 1);
      g.undo();
      out.push({ move: m, score: sc });
    }
    out.sort((a, b) => b.score - a.score);
    return out;
  }

  function bestMove(fen, depth) {
    const g = new Chess(fen);
    const moves = order(g.moves({ verbose: true }));
    let best = null, alpha = -MATE - 1;
    for (const m of moves) {
      g.move(m);
      const sc = g.in_checkmate() ? MATE : -negamax(g, depth - 1, -MATE - 1, -alpha, 1);
      g.undo();
      if (sc > alpha || !best) { alpha = sc; best = m; }
    }
    return { move: best, score: alpha };
  }

  const LEVELS = {
    easy: { depth: 1, noise: 90, randomChance: 0.15 },
    medium: { depth: 2, noise: 25, randomChance: 0 },
    hard: { depth: 3, noise: 0, randomChance: 0 },
  };

  function choose(fen, level) {
    const L = LEVELS[level] || LEVELS.medium;
    const g = new Chess(fen);
    const legal = g.moves({ verbose: true });
    if (!legal.length) return null;
    if (L.randomChance && Math.random() < L.randomChance) {
      return legal[Math.floor(Math.random() * legal.length)];
    }
    if (L.noise) {
      const scored = scoreMoves(fen, L.depth);
      scored.forEach((s) => (s.score += (Math.random() * 2 - 1) * L.noise));
      scored.sort((a, b) => b.score - a.score);
      return scored[0].move;
    }
    return bestMove(fen, L.depth).move;
  }

  window.Engine = { evaluate, scoreMoves, bestMove, choose, VAL, MATE };
})();
