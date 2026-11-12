/*
 * The coach: rates opening moves, tracks the opening checklist,
 * and builds a playing-style profile from saved games.
 */
(function () {
  const RANK = { bad: 0, dubious: 1, ok: 2, good: 3, great: 4 };
  const LABEL = { great: "Great move", good: "Good move", ok: "OK move", dubious: "Questionable", bad: "Bad move" };
  const worse = (a, b) => (RANK[a] <= RANK[b] ? a : b);
  const OPENING_PLY = 24; // first 12 moves for each side

  const homeRank = (c) => (c === "w" ? "1" : "8");

  /* Look at the user's earlier moves to spot repeats. */
  function movedBefore(prevMoves, from) {
    // Did one of our earlier moves land on this square (and the piece stayed)?
    return prevMoves.some((m) => m.to === from);
  }

  // A sound book move (for example 2...Qxd5 in the Scandinavian) is not a bad habit.
  function clearHabitFlags(flags) {
    ["earlyQueen", "weakening", "edgePawn", "rim", "repeat", "rookEarly", "kingWalk"].forEach((k) => delete flags[k]);
  }

  /*
   * Review one move.
   *  ctx = { fenBefore, historyBefore (SAN[]), move (verbose), myPrevMoves (verbose[]) }
   */
  function review(ctx) {
    const { fenBefore, historyBefore, move, myPrevMoves } = ctx;
    const color = move.color;
    const ply = historyBefore.length; // 0-based ply of this move
    const moveNo = Math.floor(ply / 2) + 1;
    const after = historyBefore.concat([move.san]);
    const book = Book.lookup(after);
    const flags = {};
    const tips = [];
    let verdict = "ok";
    let title = "";
    let text = "";
    let source = "principles";

    /* ---- Principle flags (used for both the rating and the style profile) ---- */
    const p = move.piece;
    const fromHome = move.from[1] === homeRank(color);
    const isCastle = move.flags.indexOf("k") >= 0 || move.flags.indexOf("q") >= 0;
    if (isCastle) flags.castle = true;
    if (p === "p" && ["d", "e"].includes(move.from[0]) && !move.captured) flags.center = true;
    if (p === "p" && move.from[0] === "c" && !move.captured) flags.center = true;
    if ((p === "n" || p === "b") && fromHome) flags.develop = true;
    if (p === "n" && ["a", "h"].includes(move.to[0])) flags.rim = true;
    if (p === "q" && moveNo <= 6 && !move.captured) flags.earlyQueen = true;
    if (p === "k" && !isCastle) flags.kingWalk = true;
    if (p === "r" && !move.captured && myPrevMoves.every((m) => !(m.flags.indexOf("k") >= 0 || m.flags.indexOf("q") >= 0)) && moveNo <= 10) flags.rookEarly = true;
    if (p === "p" && ["a", "h"].includes(move.from[0]) && moveNo <= 8) flags.edgePawn = true;
    if (p === "p" && ["f", "g"].includes(move.from[0]) && moveNo <= 6 && !move.captured && !(p === "p" && move.from[0] === "g" && Math.abs(+move.to[1] - +move.from[1]) === 1)) flags.weakening = true;
    if (p !== "p" && p !== "k" && !move.captured && moveNo <= 8 && movedBefore(myPrevMoves, move.from)) flags.repeat = true;
    if (move.captured) flags.capture = true;
    if (move.san.indexOf("+") >= 0 || move.san.indexOf("#") >= 0) flags.check = true;

    /* ---- Engine check: did the move drop material? ---- */
    // Sound book moves are trusted: a gambit gives material on purpose.
    const soundBook = book.inBook && (!book.node.entry || RANK[book.node.entry.verdict] >= RANK.ok);
    let loss = 0, bestSan = null;
    try {
      const scored = soundBook ? [] : Engine.scoreMoves(fenBefore, 2, 900) || Engine.scoreMoves(fenBefore, 1, 600) || [];
      const best = scored[0];
      const mine = scored.find((s) => s.move.san === move.san);
      if (best && mine) {
        loss = best.score - mine.score;
        bestSan = best.move.san;
        if (mine.score <= -Engine.MATE + 100 && best.score > -Engine.MATE + 100) flags.allowsMate = true;
      }
    } catch (e) { /* engine is a helper only */ }
    if (move.san.indexOf("#") >= 0) loss = 0;
    if (loss >= 200) flags.blunder = true;
    else if (loss >= 100) flags.mistake = true;

    if (book.inBook && book.node.entry) {
      /* ---- Book move ---- */
      const e = book.node.entry;
      source = "book";
      flags.book = true;
      verdict = e.verdict;
      title = e.name;
      text = e.note;
      if (RANK[e.verdict] <= 1) flags.riskyBook = true;
      else clearHabitFlags(flags);
    } else if (book.inBook) {
      source = "book";
      flags.book = true;
      verdict = "good";
      title = (book.named && book.named.name) || "Book move";
      text = "A main-line move from opening theory.";
      clearHabitFlags(flags);
    } else {
      /* ---- Out of book: use the principles ---- */
      verdict = "ok";
      const good = [], warn = [];
      if (isCastle) { verdict = "great"; good.push("Castling puts your king in safety and connects your rooks."); }
      if (flags.center) { verdict = "good"; good.push("A pawn move that fights for the center."); }
      if (flags.develop) { verdict = "good"; good.push("Develops a new piece. Every piece should join the game."); }
      if (flags.capture && !flags.blunder && !flags.mistake) { if (verdict === "ok") verdict = "good"; good.push("A fair capture."); }
      if (flags.rim) { verdict = "dubious"; warn.push("A knight on the edge controls few squares. Try c3/f3 (or c6/f6)."); }
      if (flags.earlyQueen) { verdict = worse(verdict, "dubious"); warn.push("Your queen came out early. The opponent can chase it and develop at the same time."); }
      if (flags.kingWalk) { verdict = "bad"; warn.push("Moving the king takes away your right to castle. Keep the king home until you castle."); }
      if (flags.rookEarly) { verdict = worse(verdict, "dubious"); warn.push("Rooks work best after you castle and open a file."); }
      if (flags.edgePawn) { verdict = worse(verdict, "dubious"); warn.push("Edge pawn moves do not help the center or your development."); }
      if (flags.weakening) { verdict = worse(verdict, "dubious"); warn.push("This pawn move weakens the squares around your king."); }
      if (flags.repeat) { verdict = worse(verdict, "dubious"); warn.push("You moved the same piece twice. In the opening, try to move each piece once."); }
      if (!good.length && !warn.length && !flags.capture) good.push("A quiet move. Ask yourself: does it help the center, develop a piece, or keep the king safe?");
      title = book.named ? `${book.named.name} (you left the known lines)` : "Your own idea";
      text = good.concat(warn).join(" ");
    }

    if (flags.allowsMate) {
      verdict = "bad";
      flags.blunder = true;
      tips.push(`This lets your opponent checkmate you. A safer move was ${bestSan}.`);
    } else if (flags.blunder) {
      verdict = "bad";
      tips.push(`This loses material. A safer move was ${bestSan}.`);
    } else if (flags.mistake) {
      verdict = worse(verdict, "dubious");
      tips.push(`This may let your opponent win something. The computer prefers ${bestSan}.`);
    }
    if (!text) text = flags.capture ? "A capture." : "";

    return {
      ply, moveNo, san: move.san, color, verdict, label: LABEL[verdict], title, text, tips,
      source, flags, inOpening: ply < OPENING_PLY, bookName: book.named ? book.named.name : null,
    };
  }

  /* ---- Opening checklist ---- */
  function checklist(game, color, myMoves) {
    const b = game.board();
    const at = (sq) => {
      const c = sq.charCodeAt(0) - 97, r = 8 - +sq[1];
      return b[r][c];
    };
    const is = (sq, type) => { const x = at(sq); return x && x.color === color && x.type === type; };
    const back = color === "w" ? "1" : "8";
    const castled = myMoves.some((m) => m.flags.indexOf("k") >= 0 || m.flags.indexOf("q") >= 0);
    const centerSquares = color === "w" ? ["d4", "e4", "c4", "d3", "e3"] : ["d5", "e5", "c5", "d6", "e6"];
    const center = centerSquares.some((sq) => is(sq, "p")) || myMoves.some((m) => m.piece === "p" && ["c", "d", "e"].includes(m.from[0]));
    const knightsOut = !is("b" + back, "n") && !is("g" + back, "n");
    const bishopsOut = !is("c" + back, "b") && !is("f" + back, "b");
    const queenEarly = myMoves.slice(0, 5).some((m) => m.piece === "q" && !m.captured);
    let rooksConnected = false;
    if (castled) {
      const files = "abcdefgh";
      const rooks = [];
      for (const f of files) if (is(f + back, "r")) rooks.push(f);
      if (rooks.length === 2) {
        rooksConnected = true;
        for (let i = files.indexOf(rooks[0]) + 1; i < files.indexOf(rooks[1]); i++) {
          if (at(files[i] + back)) rooksConnected = false;
        }
      }
    }
    return [
      { done: center, text: "Put a pawn in the center" },
      { done: knightsOut, text: "Develop both knights" },
      { done: bishopsOut, text: "Develop both bishops" },
      { done: castled, text: "Castle your king" },
      { done: !queenEarly, text: "Keep the queen home early", keep: true },
      { done: rooksConnected, text: "Connect your rooks" },
    ];
  }

  /* ---- Next step advice when no book plan exists ---- */
  function generalPlan(list) {
    const todo = list.filter((x) => !x.done && !x.keep).map((x) => x.text);
    if (!todo.length) return ["Your opening is done. Now find a plan: put rooks on open files, and attack the side where you have more space.", "Before every move, check: what does my opponent threaten?"];
    return todo.slice(0, 3).map((t, i) => (i === 0 ? "Next: " : "Then: ") + t.toLowerCase() + ".");
  }

  /* ---- Game summary for the style profile ---- */
  function summarize(reviews, info) {
    const opening = reviews.filter((r) => r.inOpening);
    const count = (list, f) => list.filter((r) => r.flags[f]).length;
    const castleMove = (reviews.find((r) => r.flags.castle) || {}).moveNo || null;
    return {
      date: Date.now(),
      color: info.color,
      result: info.result,
      level: info.level,
      firstMove: reviews[0] ? reviews[0].san : null,
      opening: info.opening,
      moves: reviews.length,
      openingMoves: opening.length,
      center: count(opening, "center"),
      develop: count(opening, "develop"),
      castleMove,
      earlyQueen: count(opening, "earlyQueen"),
      edgePawn: count(opening, "edgePawn"),
      rim: count(opening, "rim"),
      repeat: count(opening, "repeat"),
      kingWalk: count(opening, "kingWalk"),
      rookEarly: count(opening, "rookEarly"),
      weakening: count(opening, "weakening"),
      book: count(opening, "book"),
      riskyBook: count(opening, "riskyBook"),
      captures: count(reviews, "capture"),
      checks: count(reviews, "check"),
      blunders: count(reviews, "blunder"),
      verdicts: opening.reduce((a, r) => { a[r.verdict] = (a[r.verdict] || 0) + 1; return a; }, {}),
    };
  }

  /* ---- Repertoire suggestions by style ---- */
  const STYLES = {
    explorer: {
      name: "The Explorer",
      blurb: "You try lots of different moves, but your opening has no clear goal. Many moves go to the edge, repeat a piece, or move the king or queen early. This is why games slip away before the fight starts.",
      fix: "Pick ONE opening for White and ONE for Black and play them every game. Follow the checklist: center pawn, knights, bishops, castle.",
      white: "e4 e5 Nf3 Nc6 Bc4", black: "d4 d5 c4 e6", blackE4: "e4 e5 Nf3 Nc6",
    },
    attacker: {
      name: "The Attacker",
      blurb: "You like action: checks, captures and early threats. That is a strength, but attacks work best after your pieces are out and your king is safe.",
      fix: "Choose sharp openings that give attacks with sound ideas, not cheap traps.",
      white: "e4 e5 Nf3 Nc6 Bc4 Bc5 b4", black: "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6", blackE4: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6",
    },
    builder: {
      name: "The Builder",
      blurb: "You develop your pieces and castle on time. You play classical chess: center first, then attack.",
      fix: "Learn deeper main lines so you know the middle-game plans that come after the opening.",
      white: "e4 e5 Nf3 Nc6 Bb5", black: "d4 d5 c4 e6", blackE4: "e4 e5 Nf3 Nc6",
    },
    strategist: {
      name: "The Strategist",
      blurb: "You play calm, quiet moves and avoid early fights. You like safe positions where you can slowly improve.",
      fix: "Use a system opening that you can play the same way every game, and solid defenses as Black.",
      white: "d4 d5 Bf4", black: "d4 d5 c4 c6", blackE4: "e4 c6",
    },
  };

  function profile(games) {
    if (!games.length) return null;
    const sum = (k) => games.reduce((a, g) => a + (g[k] || 0), 0);
    const om = Math.max(1, sum("openingMoves"));
    const allMoves = Math.max(1, sum("moves"));
    const chaos = (sum("edgePawn") + sum("rim") + sum("repeat") + sum("kingWalk") + sum("rookEarly") + sum("earlyQueen") + sum("weakening")) / om;
    const develop = (sum("develop") + sum("center")) / om;
    const castled = games.filter((g) => g.castleMove && g.castleMove <= 10).length / games.length;
    const aggression = (sum("captures") + sum("checks")) / allMoves + (sum("earlyQueen") + sum("riskyBook")) / om;
    const bookRate = sum("book") / om;
    const blunderRate = sum("blunders") / allMoves;

    const pct = (x, max) => Math.max(0, Math.min(100, Math.round((x / max) * 100)));
    const meters = [
      { key: "develop", label: "Development", value: pct(develop, 0.7), hint: "Center pawns and new pieces in your first 12 moves" },
      { key: "safety", label: "King safety", value: pct(castled, 1), hint: "Games where you castled by move 10" },
      { key: "theory", label: "Opening knowledge", value: pct(bookRate, 0.6), hint: "Moves that match known opening lines" },
      { key: "aggression", label: "Aggression", value: pct(aggression, 0.6), hint: "Checks, captures and early attacks" },
      { key: "random", label: "Random moves", value: pct(chaos, 0.45), hint: "Edge pawns, repeat moves, early king/queen/rook moves", invert: true },
    ];

    let key;
    if (chaos >= 0.22 || (develop < 0.3 && castled < 0.5)) key = "explorer";
    else if (aggression >= 0.38) key = "attacker";
    else if (castled >= 0.6 && develop >= 0.45) key = "builder";
    else key = "strategist";

    const firsts = {};
    games.forEach((g) => {
      if (!g.firstMove) return;
      const k = (g.color === "w" ? "White: 1." : "Black: 1...") + g.firstMove;
      firsts[k] = (firsts[k] || 0) + 1;
    });
    const openings = {};
    games.forEach((g) => {
      const k = g.opening || "Unnamed opening";
      openings[k] = openings[k] || { w: 0, l: 0, d: 0, n: 0 };
      openings[k].n++;
      if (g.result === "win") openings[k].w++;
      else if (g.result === "loss") openings[k].l++;
      else if (g.result === "draw") openings[k].d++;
    });

    const res = { w: 0, l: 0, d: 0 };
    games.forEach((g) => { if (g.result === "win") res.w++; else if (g.result === "loss") res.l++; else if (g.result === "draw") res.d++; });

    return { key, style: STYLES[key], meters, firsts, openings, results: res, games: games.length, blunderRate };
  }

  window.Coach = { review, checklist, generalPlan, summarize, profile, STYLES, LABEL, RANK, OPENING_PLY };
})();
