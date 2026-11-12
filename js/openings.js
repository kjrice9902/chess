/*
 * Opening book.
 * Each entry is one line of moves (in standard notation) and what we know about
 * the LAST move in that line.
 *
 *   verdict: great | good | ok | dubious | bad
 *   side:    who the opening "belongs" to (for practice cards)
 *   plan:    { w: [...], b: [...] }  simple steps for each side
 *   practice: true  -> shown as a card in the Openings tab
 */
(function () {
  const O = [];
  const add = (moves, name, verdict, note, extra) => O.push(Object.assign({ moves, name, verdict, note }, extra || {}));

  /* ---------------- White first moves ---------------- */
  add("e4", "King's Pawn Opening", "great",
    "The most popular first move. It takes the center and opens lines for your queen and light-square bishop.",
    { plan: {
      w: ["Develop your knight to f3 and your bishop to c4 or b5.", "Castle short (O-O) early.", "Play d3 or d4 to support the center.", "Bring your rooks to the middle files."],
      b: ["Answer in the center with e5, c5, e6 or c6.", "Develop knights before bishops.", "Castle before move 10.", "Do not move the same piece twice without a reason."] } });
  add("d4", "Queen's Pawn Opening", "great",
    "A strong first move. The pawn is protected by the queen, and it controls e5 and c5.",
    { plan: {
      w: ["Play c4 to attack Black's center, or Bf4 for a simple London setup.", "Develop Nf3, Nc3 and your dark-square bishop.", "Castle short.", "Push for space on the queenside."],
      b: ["Answer with d5 or Nf6.", "Fight for the e5 square.", "Develop and castle short.", "Strike back later with c5 or e5."] } });
  add("c4", "English Opening", "good",
    "A flexible move. It controls d5 from the side and often leads to slow, strategic games.",
    { plan: {
      w: ["Play Nc3, g3 and Bg2 to control the light squares.", "Castle short.", "Expand on the queenside with a3 and b4."],
      b: ["Take the center with e5, or mirror with c5.", "Develop knights and bishops.", "Castle and then fight for d4."] } });
  add("Nf3", "Réti Opening", "good",
    "A flexible developing move. It controls d4 and e5 and keeps many options open.",
    { plan: {
      w: ["Follow with c4 and g3.", "Fianchetto your bishop on g2.", "Castle short and hit the center later."],
      b: ["Take the center with d5.", "Develop calmly and castle."] } });
  add("g3", "King's Fianchetto Opening", "ok", "Prepares Bg2. Solid but slow; it does not take the center right away.");
  add("b3", "Nimzo-Larsen Attack", "ok", "Prepares Bb2 to aim at the long diagonal. Playable, but it gives Black the center for free.");
  add("f4", "Bird's Opening", "ok", "Controls e5, but it slightly weakens your king. Playable for players who like attacks on the kingside.");
  add("Nc3", "Van Geet Opening", "ok", "Develops a knight, but it blocks your c-pawn. Fine, but less useful than 1.e4 or 1.d4.");
  add("e3", "Van't Kruijs Opening", "ok", "Very passive. It opens a bishop but does not fight for the center.");
  add("d3", "Mieses Opening", "ok", "Very passive. It gives Black a free hand in the center.");
  add("c3", "Saragossa Opening", "ok", "Passive. It takes the c3 square away from your knight.");
  add("b4", "Polish Opening", "dubious", "An odd flank move. The pawn on b4 can be attacked easily.");
  add("g4", "Grob Opening", "dubious", "Weakens your king side a lot and does not help the center.");
  add("a3", "Anderssen's Opening", "dubious", "Wastes time. It does not develop a piece or take the center.");
  add("h3", "Clemenz Opening", "dubious", "Wastes time. It does not develop a piece or take the center.");
  add("a4", "Ware Opening", "bad", "An edge pawn move that does nothing for the center or development.");
  add("h4", "Desprez Opening", "bad", "An edge pawn move that does nothing for the center or development.");
  add("f3", "Barnes Opening", "bad", "One of the worst first moves. It weakens your king and takes the best square from your knight.");
  add("Na3", "Durkin Opening", "dubious", "A knight on the edge controls fewer squares. 'A knight on the rim is dim.'");
  add("Nh3", "Amar Opening", "dubious", "A knight on the edge controls fewer squares. 'A knight on the rim is dim.'");
  add("f3 e5 g4", "Fool's Mate Trap", "bad", "This move loses at once: Black plays Qh4 and it is checkmate.");
  add("f3 e5 g4 Qh4#", "Fool's Mate", "great", "Checkmate in two moves. The fastest mate in chess.");
  add("g4 e5 f3", "Fool's Mate Trap", "bad", "This move loses at once: Black plays Qh4 and it is checkmate.");
  add("g4 e5 f3 Qh4#", "Fool's Mate", "great", "Checkmate in two moves.");

  /* ---------------- 1.e4 replies ---------------- */
  add("e4 e5", "Open Game", "great", "The classical answer. Black takes an equal share of the center.",
    { plan: {
      w: ["Attack the e5 pawn with Nf3.", "Develop your bishop to c4 or b5.", "Castle short and prepare d4."],
      b: ["Protect e5 with Nc6.", "Develop Nf6 and a bishop.", "Castle short.", "Watch the f7 square: it is your weak point early."] } });
  add("e4 c5", "Sicilian Defense", "great",
    "The most popular answer to 1.e4. Black fights for d4 from the side and plays for a win.",
    { side: "b", practice: true, plan: {
      w: ["Play Nf3 and d4 to open the game.", "Develop fast and castle.", "Attack on the kingside."],
      b: ["Trade your c-pawn for White's d-pawn.", "Use the half-open c-file for your rook.", "Develop and castle, then attack on the queenside."] } });
  add("e4 e6", "French Defense", "good",
    "A solid defense. Black prepares d5 to challenge the center.",
    { side: "b", practice: true, plan: {
      w: ["Take the center with d4.", "Gain space with e5 when you can.", "Attack on the kingside."],
      b: ["Play d5 next move.", "Attack White's pawn chain with c5 and f6.", "Your light-square bishop can be hard to use. Plan b6 and Ba6 or trade it."] } });
  add("e4 c6", "Caro-Kann Defense", "good",
    "A very solid defense. Black prepares d5 without blocking the light-square bishop.",
    { side: "b", practice: true, plan: {
      w: ["Take the center with d4.", "Develop and castle.", "Use your extra space."],
      b: ["Play d5 next move.", "Bring your light-square bishop out to f5 or g4 before e6.", "Play e6, Nd7 and Ngf6, then castle.", "Look for c5 later to free your game."] } });
  add("e4 d5", "Scandinavian Defense", "good",
    "Black challenges e4 at once. It gives a clear, simple game.",
    { side: "b", practice: true, plan: {
      w: ["Take the pawn with exd5.", "Develop with tempo by attacking Black's queen (Nc3).", "Take the center with d4."],
      b: ["Take back on d5 with your queen.", "Move the queen to a5 or d6 when attacked.", "Develop with Nf6, Bf5 or Bg4, e6 and c6.", "Castle and play a solid middle game."] } });
  add("e4 d6", "Pirc Defense", "ok", "A hyper-modern defense. Black lets White take the center and plans to attack it later.");
  add("e4 Nf6", "Alekhine's Defense", "ok", "Black invites White's pawns forward, then tries to attack them.");
  add("e4 g6", "Modern Defense", "ok", "Black plans Bg7 and attacks the center later.");
  add("e4 Nc6", "Nimzowitsch Defense", "ok", "Unusual but playable. Black often follows with e5 or d5.");
  add("e4 b6", "Owen's Defense", "dubious", "Slow. White can take the whole center.");
  add("e4 a6", "St. George Defense", "dubious", "Wastes time. White can take the whole center.");
  add("e4 f5", "Duras Gambit", "dubious", "Gives away a pawn and weakens the king side.");
  add("e4 f6", "Barnes Defense", "bad", "Weakens your king and takes the f6 square from your knight.");
  add("e4 g5", "Borg Defense", "bad", "Weakens your king side. White gets an easy game.");
  add("e4 h6", "Carr Defense", "dubious", "Wastes time. It does not help the center or development.");
  add("e4 h5", "Goldsmith Defense", "bad", "Wastes time. It does not help the center or development.");
  add("e4 a5", "Corn Stalk Defense", "bad", "Wastes time. It does not help the center or development.");

  /* ---- Open Game ---- */
  add("e4 e5 Nf3", "King's Knight Opening", "great", "Develops a knight and attacks the e5 pawn.");
  add("e4 e5 Bc4", "Bishop's Opening", "good", "Aims the bishop at f7, Black's weak point.");
  add("e4 e5 Nc3", "Vienna Game", "good", "Develops and prepares f4 for an attack.",
    { side: "w", practice: true, plan: {
      w: ["Develop Bc4 and look at the f7 square.", "Play f4 when it is safe, to open the f-file.", "Castle short and attack on the kingside."],
      b: ["Develop Nf6 and Bc5.", "Strike in the center with d5 when possible."] } });
  add("e4 e5 f4", "King's Gambit", "dubious", "A sharp gambit. You give a pawn to open the f-file. Fun, but risky for your king.");
  add("e4 e5 f4 exf4", "King's Gambit Accepted", "good", "Taking the pawn is fine. Keep it if you can and develop fast.");
  add("e4 e5 f4 Bc5", "King's Gambit Declined", "good", "A safe way to decline. The bishop stops White from castling for a while.");
  add("e4 e5 d4", "Center Game", "ok", "Opens the center early. After exd4 Qxd4, your queen can be chased with Nc6.");
  add("e4 e5 d4 exd4 c3", "Danish Gambit", "dubious", "White gives pawns for very fast development. Risky.");
  add("e4 e5 Qh5", "Wayward Queen Attack", "dubious",
    "The queen comes out too early. It threatens Qxf7 mate with Bc4, but a careful player chases the queen and gains time.");
  add("e4 e5 Qh5 Nc6", "Wayward Queen Attack", "good", "Protects e5 and develops.");
  add("e4 e5 Qh5 Nc6 Bc4", "Scholar's Mate Attempt", "dubious", "Threatens Qxf7 mate. It only works if Black makes a mistake.");
  add("e4 e5 Qh5 Nc6 Bc4 g6", "Scholar's Mate Defense", "great", "Blocks the queen and attacks it. Now White must lose time.");
  add("e4 e5 Qh5 Nc6 Bc4 Qe7", "Scholar's Mate Defense", "good", "Protects f7. Safe and solid.");
  add("e4 e5 Qh5 Nc6 Bc4 Nf6", "Scholar's Mate Blunder", "bad", "This attacks the queen but forgets f7. White plays Qxf7 and it is checkmate.");
  add("e4 e5 Qh5 Nc6 Bc4 Nf6 Qxf7#", "Scholar's Mate", "great", "Checkmate! Remember this pattern so it never happens to you.");
  add("e4 e5 Bc4 Nc6 Qh5", "Scholar's Mate Attempt", "dubious", "Threatens Qxf7 mate. It only works if Black makes a mistake.");
  add("e4 e5 Bc4 Nc6 Qh5 g6", "Scholar's Mate Defense", "great", "Blocks the queen and attacks it.");
  add("e4 e5 Bc4 Nc6 Qh5 Qe7", "Scholar's Mate Defense", "good", "Protects f7. Safe and solid.");
  add("e4 e5 Bc4 Nc6 Qh5 Nf6", "Scholar's Mate Blunder", "bad", "This forgets f7. White plays Qxf7 and it is checkmate.");
  add("e4 e5 Bc4 Nc6 Qh5 Nf6 Qxf7#", "Scholar's Mate", "great", "Checkmate!");
  add("e4 e5 Ke2", "Bongcloud Attack", "bad", "A joke move. Your king blocks your bishop and can no longer castle.");

  add("e4 e5 Nf3 Nc6", "King's Knight Opening", "great", "Protects e5 and develops a knight.");
  add("e4 e5 Nf3 Nf6", "Petrov's Defense", "good", "A solid counter-attack on e4.",
    { side: "b", practice: true, plan: {
      w: ["Take on e5 or play d4.", "Develop and castle.", "Try to use your extra move."],
      b: ["If White takes on e5, play d6 first, then take on e4.", "Develop Be7 and castle.", "The game stays balanced and solid."] } });
  add("e4 e5 Nf3 Nf6 Nxe5 d6", "Petrov's Defense", "great", "Correct! Chase the knight first, then take on e4.");
  add("e4 e5 Nf3 d6", "Philidor Defense", "ok", "Solid but a little passive. It blocks your dark-square bishop.");
  add("e4 e5 Nf3 f6", "Damiano Defense", "bad", "Weakens your king. White can sacrifice on e5 with a strong attack.");
  add("e4 e5 Nf3 f5", "Latvian Gambit", "dubious", "A risky gambit that weakens your king.");
  add("e4 e5 Nf3 d5", "Elephant Gambit", "dubious", "Gives a pawn without enough reward.");

  add("e4 e5 Nf3 Nc6 Bc4", "Italian Game", "great",
    "Your bishop aims at f7, Black's weak point. A classical and easy plan.",
    { side: "w", practice: true, plan: {
      w: ["Castle short.", "Play c3 and then d4 to build a big center (or d3 for a slow game).", "Put a rook on e1.", "Move your knight b1-d2-f1-g3 to join the attack."],
      b: ["Develop Bc5 or Nf6.", "Castle short.", "Play d6 to protect e5.", "Watch out for Ng5 attacking f7."] } });
  add("e4 e5 Nf3 Nc6 Bc4 Bc5", "Giuoco Piano", "great", "The 'quiet game'. Black's bishop also aims at the weak f-pawn.");
  add("e4 e5 Nf3 Nc6 Bc4 Bc5 c3", "Giuoco Piano: Main Line", "great", "Prepares d4 to take the center.");
  add("e4 e5 Nf3 Nc6 Bc4 Bc5 d3", "Giuoco Pianissimo", "good", "A slow and safe setup. Castle and build up.");
  add("e4 e5 Nf3 Nc6 Bc4 Bc5 O-O", "Giuoco Piano", "good", "King safety first. Good.");
  add("e4 e5 Nf3 Nc6 Bc4 Bc5 b4", "Evans Gambit", "good", "A pawn sacrifice for fast development and attack. Good for attacking players.",
    { side: "w", practice: true, plan: {
      w: ["After Bxb4, play c3 to gain time on the bishop.", "Push d4 to open the center.", "Castle and attack f7 and the black king fast."],
      b: ["Take the pawn and retreat the bishop to a5.", "Give back material if needed to finish development.", "Castle as soon as you can."] } });
  add("e4 e5 Nf3 Nc6 Bc4 Nf6", "Two Knights Defense", "good", "An active defense. Black attacks e4 at once.");
  add("e4 e5 Nf3 Nc6 Bc4 Nf6 d3", "Two Knights: Modern", "good", "Protects e4. Calm and safe.");
  add("e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5", "Two Knights: Knight Attack", "ok", "Attacks f7 again. Black must defend carefully with d5.");
  add("e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5", "Two Knights: Main Line", "great", "The best defense. It blocks the bishop.");
  add("e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5", "Two Knights: Main Line", "great", "Correct! Attack the bishop. Black gets good play for the pawn.");
  add("e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5", "Two Knights: Fried Liver Risk", "dubious", "This allows the Fried Liver Attack (Nxf7). Na5 is safer.");
  add("e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7", "Fried Liver Attack", "good", "A famous knight sacrifice. The black king must walk into the open.");
  add("e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 Bc5", "Traxler Counterattack", "dubious", "A wild counter-attack. Very sharp for both sides.");
  add("e4 e5 Nf3 Nc6 Bc4 Be7", "Hungarian Defense", "ok", "Safe but passive.");
  add("e4 e5 Nf3 Nc6 Bc4 Nd4", "Blackburne Shilling Gambit", "dubious", "A trap. If White takes on e5, Qg5 is dangerous. Against good play it loses time.");

  add("e4 e5 Nf3 Nc6 Bb5", "Ruy Lopez", "great",
    "One of the oldest and best openings. The bishop pressures the knight that protects e5.",
    { side: "w", practice: true, plan: {
      w: ["Castle short.", "Put a rook on e1 and play c3 and d4.", "Retreat the bishop to c2 when it is chased.", "Slowly build pressure in the center."],
      b: ["Play a6 to ask the bishop a question.", "Develop Nf6, Be7 and castle.", "Use b5 to gain space on the queenside."] } });
  add("e4 e5 Nf3 Nc6 Bb5 a6", "Ruy Lopez: Morphy Defense", "great", "The main line. Black asks the bishop to decide.");
  add("e4 e5 Nf3 Nc6 Bb5 a6 Ba4", "Ruy Lopez: Main Line", "great", "Keeps the pin. The main line.");
  add("e4 e5 Nf3 Nc6 Bb5 a6 Bxc6", "Ruy Lopez: Exchange Variation", "good", "Gives Black doubled pawns. A simple plan for the endgame.");
  add("e4 e5 Nf3 Nc6 Bb5 Nf6", "Ruy Lopez: Berlin Defense", "great", "Very solid. Top players use it.");
  add("e4 e5 Nf3 Nc6 Bb5 d6", "Ruy Lopez: Steinitz Defense", "ok", "Solid but passive.");
  add("e4 e5 Nf3 Nc6 Bb5 Bc5", "Ruy Lopez: Classical", "good", "An active bishop. Playable.");
  add("e4 e5 Nf3 Nc6 Bb5 f5", "Ruy Lopez: Schliemann", "dubious", "A sharp gambit-like reply. Risky.");

  add("e4 e5 Nf3 Nc6 d4", "Scotch Game", "good", "Opens the center at once. Simple and active.",
    { side: "w", practice: true, plan: {
      w: ["Take back on d4 with the knight.", "Develop Nc3, Bc4 or Bd3, and castle.", "Use your free play in the center."],
      b: ["Take on d4.", "Develop fast with Nf6 or Bc5.", "Castle and hit back in the center with d5."] } });
  add("e4 e5 Nf3 Nc6 d4 exd4", "Scotch Game", "great", "Correct. Take the pawn.");
  add("e4 e5 Nf3 Nc6 d4 exd4 Nxd4", "Scotch Game: Main Line", "great", "Takes back and keeps a nice center.");
  add("e4 e5 Nf3 Nc6 d4 exd4 Bc4", "Scotch Gambit", "good", "A gambit for fast development.");
  add("e4 e5 Nf3 Nc6 d4 exd4 c3", "Göring Gambit", "ok", "Gives a pawn for fast development.");
  add("e4 e5 Nf3 Nc6 Nc3", "Three Knights Game", "good", "Solid development.");
  add("e4 e5 Nf3 Nc6 Nc3 Nf6", "Four Knights Game", "good", "Both sides develop. Simple and classical.");
  add("e4 e5 Nf3 Nc6 c3", "Ponziani Opening", "ok", "Prepares d4. Fine, but it takes c3 from the knight.");
  add("e4 e5 Nf3 Nc6 Nxe5", "Irish Gambit", "bad", "Gives a knight for one pawn. Not enough.");

  /* ---- Sicilian ---- */
  add("e4 c5 Nf3", "Sicilian: Open", "great", "The main line. Prepares d4.");
  add("e4 c5 Nc3", "Closed Sicilian", "good", "A slower plan with g3 and Bg2.");
  add("e4 c5 c3", "Sicilian: Alapin", "good", "Prepares d4 to build a full center. Good anti-Sicilian.");
  add("e4 c5 f4", "Sicilian: Grand Prix Attack", "ok", "Aggressive. Plans a kingside attack.");
  add("e4 c5 b4", "Sicilian: Wing Gambit", "dubious", "Gives a pawn for little.");
  add("e4 c5 d4", "Sicilian: Smith-Morra idea", "ok", "Prepares a pawn gambit with c3.");
  add("e4 c5 d4 cxd4 c3", "Smith-Morra Gambit", "ok", "A pawn for fast development and open lines.");
  add("e4 c5 Nf3 d6", "Sicilian", "great", "Prepares Nf6 and controls e5.");
  add("e4 c5 Nf3 Nc6", "Sicilian", "great", "Develops and controls d4.");
  add("e4 c5 Nf3 e6", "Sicilian: French Variation", "good", "Flexible. Leads to Kan or Taimanov setups.");
  add("e4 c5 Nf3 g6", "Hyper-Accelerated Dragon", "ok", "Plans Bg7 quickly.");
  add("e4 c5 Nf3 d6 Bb5+", "Sicilian: Moscow Variation", "good", "A safe way for White to avoid big theory.");
  add("e4 c5 Nf3 Nc6 Bb5", "Sicilian: Rossolimo", "good", "Plans to take on c6 and damage Black's pawns.");
  add("e4 c5 Nf3 d6 d4", "Open Sicilian", "great", "White opens the center.");
  add("e4 c5 Nf3 d6 d4 cxd4", "Open Sicilian", "great", "Black trades a side pawn for a center pawn.");
  add("e4 c5 Nf3 d6 d4 cxd4 Nxd4", "Open Sicilian", "great", "White takes back with the knight.");
  add("e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6", "Open Sicilian", "great", "Attacks e4 and gains time.");
  add("e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3", "Open Sicilian", "great", "Protects e4.");
  add("e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6", "Sicilian: Najdorf", "great", "The most famous Sicilian. Black prepares e5 or b5.");
  add("e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6", "Sicilian: Dragon", "great", "Black plans Bg7 and a fast queenside attack.",
    { side: "b", practice: true, plan: {
      w: ["Play Be3, f3, Qd2 and castle long.", "Push h4-h5 to attack Black's king."],
      b: ["Play Bg7, O-O and Nc6.", "Attack on the c-file and with your bishop on the long diagonal.", "Be fast: both kings are under attack."] } });
  add("e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 Nc6", "Sicilian: Classical", "good", "Solid development.");
  add("e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 e6", "Sicilian: Scheveningen", "good", "A small but strong center.");

  /* ---- French ---- */
  add("e4 e6 d4", "French Defense", "great", "Take the center.");
  add("e4 e6 d4 d5", "French Defense", "great", "Black challenges e4.");
  add("e4 e6 d4 d5 e5", "French: Advance Variation", "good", "Gains space. Black hits back with c5.");
  add("e4 e6 d4 d5 e5 c5", "French: Advance Variation", "great", "Correct! Attack the base of White's pawn chain.");
  add("e4 e6 d4 d5 Nc3", "French Defense", "great", "Protects e4.");
  add("e4 e6 d4 d5 Nc3 Bb4", "French: Winawer", "good", "Pins the knight. Sharp and rich.");
  add("e4 e6 d4 d5 Nc3 Nf6", "French: Classical", "good", "Attacks e4 again.");
  add("e4 e6 d4 d5 Nc3 dxe4", "French: Rubinstein", "ok", "Solid, but it gives up the center.");
  add("e4 e6 d4 d5 Nd2", "French: Tarrasch", "good", "Protects e4 and avoids the Winawer pin.");
  add("e4 e6 d4 d5 exd5", "French: Exchange Variation", "ok", "Simple and equal.");
  add("e4 e6 d4 d5 exd5 exd5", "French: Exchange Variation", "good", "Take back. The position is equal.");

  /* ---- Caro-Kann ---- */
  add("e4 c6 d4", "Caro-Kann Defense", "great", "Take the center.");
  add("e4 c6 d4 d5", "Caro-Kann Defense", "great", "Black challenges e4.");
  add("e4 c6 d4 d5 Nc3", "Caro-Kann: Main Line", "great", "Protects e4.");
  add("e4 c6 d4 d5 Nc3 dxe4", "Caro-Kann: Main Line", "great", "Take the pawn.");
  add("e4 c6 d4 d5 Nc3 dxe4 Nxe4", "Caro-Kann: Main Line", "great", "Take back.");
  add("e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5", "Caro-Kann: Classical", "great", "The bishop comes out before e6. That is the key Caro-Kann idea.");
  add("e4 c6 d4 d5 e5", "Caro-Kann: Advance", "good", "Gains space.");
  add("e4 c6 d4 d5 e5 Bf5", "Caro-Kann: Advance", "great", "Develop the bishop outside the pawn chain.");
  add("e4 c6 d4 d5 exd5", "Caro-Kann: Exchange", "ok", "Simple and equal.");
  add("e4 c6 d4 d5 exd5 cxd5", "Caro-Kann: Exchange", "good", "Take back.");

  /* ---- Scandinavian / others ---- */
  add("e4 d5 exd5", "Scandinavian Defense", "great", "Take the pawn.");
  add("e4 d5 exd5 Qxd5", "Scandinavian: Main Line", "good", "Take back with the queen.");
  add("e4 d5 exd5 Qxd5 Nc3", "Scandinavian: Main Line", "great", "Develop and attack the queen.");
  add("e4 d5 exd5 Qxd5 Nc3 Qa5", "Scandinavian: Main Line", "great", "A safe square for the queen.");
  add("e4 d5 exd5 Qxd5 Nc3 Qd6", "Scandinavian: Modern Line", "good", "A safe square for the queen.");
  add("e4 d5 exd5 Nf6", "Scandinavian: Modern Variation", "ok", "Take back the pawn later with the knight.");
  add("e4 d6 d4 Nf6", "Pirc Defense", "good", "Attacks e4.");
  add("e4 d6 d4 Nf6 Nc3 g6", "Pirc Defense", "good", "Plans Bg7 and castle.");
  add("e4 d6 d4 Nf6 Nc3 g6 f4", "Pirc: Austrian Attack", "good", "An aggressive pawn storm.");
  add("e4 Nf6 e5 Nd5", "Alekhine's Defense", "good", "The knight goes to the center.");
  add("e4 g6 d4 Bg7", "Modern Defense", "good", "The bishop looks at the center from far.");

  /* ---------------- 1.d4 ---------------- */
  add("d4 d5", "Closed Game", "great", "The classical answer. Black takes an equal share of the center.");
  add("d4 Nf6", "Indian Defense", "great", "Flexible. It stops e4.");
  add("d4 e6", "Horwitz Defense", "ok", "Flexible. Often turns into a French or Queen's Gambit.");
  add("d4 f5", "Dutch Defense", "ok", "Fights for e4 from the side. Playable but weakens the king a little.",
    { side: "b", practice: true, plan: {
      w: ["Fianchetto with g3 and Bg2.", "Play c4 and Nc3 and aim for e4."],
      b: ["Play Nf6, e6 (or g6) and castle.", "Control the e4 square.", "Attack on the kingside with Qe8-h5."] } });
  add("d4 c5", "Old Benoni", "ok", "Hits the center from the side.");
  add("d4 g6", "Modern Defense", "ok", "Plans Bg7.");
  add("d4 e5", "Englund Gambit", "dubious", "A trappy gambit. Against good play you are just a pawn down.");
  add("d4 b5", "Polish Defense", "dubious", "An odd flank move.");
  add("d4 Nc6", "Queen's Knight Defense", "ok", "Unusual. It blocks the c-pawn.");
  add("d4 f6", "Barnes Defense", "bad", "Weakens your king and does not help development.");

  add("d4 d5 c4", "Queen's Gambit", "great",
    "White offers a side pawn to win the center. A top-level classic.",
    { side: "w", practice: true, plan: {
      w: ["Develop Nc3, Nf3 and Bg5 or Bf4.", "Play e3 and develop the bishop to d3.", "Castle short.", "Use the c-file and push in the center with e4 later."],
      b: ["Hold d5 with e6 or c6 (do not try to keep a pawn after dxc4).", "Develop Nf6, Be7, castle.", "Free your game with c5 or e5 later."] } });
  add("d4 d5 c4 e6", "Queen's Gambit Declined", "great", "Very solid. Holds d5.",
    { side: "b", practice: true, plan: {
      w: ["Develop Nc3, Bg5 and Nf3.", "Play e3, Bd3 and castle.", "Plan a minority attack with b4-b5."],
      b: ["Develop Nf6, Be7 and castle.", "Play Nbd7 and c6.", "Free your game with c5 or e5."] } });
  add("d4 d5 c4 c6", "Slav Defense", "great", "Very solid. Holds d5 and keeps the light-square bishop free.",
    { side: "b", practice: true, plan: {
      w: ["Develop Nf3 and Nc3.", "Play e3 and win back the c4 pawn if Black takes it."],
      b: ["Play Nf6 and maybe dxc4.", "Develop the bishop to f5 or g4 before e6.", "Castle and play a solid game."] } });
  add("d4 d5 c4 dxc4", "Queen's Gambit Accepted", "good", "Takes the pawn. Do not try to keep it; develop instead.");
  add("d4 d5 c4 Nc6", "Chigorin Defense", "ok", "Active but unusual.");
  add("d4 d5 c4 e5", "Albin Countergambit", "dubious", "A sharp countergambit. Risky.");
  add("d4 d5 c4 c5", "Symmetrical Defense", "ok", "Copying White's move. Playable but not best.");
  add("d4 d5 c4 Bf5", "Baltic Defense", "ok", "Unusual. The b7 pawn can become weak.");
  add("d4 d5 c4 e6 Nc3", "Queen's Gambit Declined", "great", "Develop and add pressure on d5.");
  add("d4 d5 c4 e6 Nc3 Nf6", "Queen's Gambit Declined", "great", "Develop and protect d5.");
  add("d4 d5 c4 e6 Nc3 Nf6 Bg5", "QGD: Main Line", "great", "Pins the knight.");
  add("d4 d5 c4 c6 Nf3", "Slav Defense", "great", "Develop.");
  add("d4 d5 c4 c6 Nf3 Nf6", "Slav Defense", "great", "Develop.");
  add("d4 d5 c4 c6 Nf3 Nf6 Nc3", "Slav Defense", "great", "Develop.");
  add("d4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4", "Slav: Main Line", "great", "Take the pawn now that b5 is ready to help.");
  add("d4 d5 c4 c6 Nf3 Nf6 Nc3 e6", "Semi-Slav Defense", "great", "A strong and rich setup.");

  add("d4 d5 Bf4", "London System", "good",
    "A simple system. You can play the same setup in almost every game.",
    { side: "w", practice: true, plan: {
      w: ["Play e3, Nf3, Bd3, Nbd2 and c3 (the London triangle).", "Castle short.", "Later push Ne5 or e4, or attack with h4."],
      b: ["Develop and castle.", "Hit the center with c5.", "Put your queen on b6 to attack b2."] } });
  add("d4 Nf6 Bf4", "London System", "good", "A simple system. You can play the same setup in almost every game.");
  add("d4 d5 Bf4 Nf6", "London System", "good", "Develop.");
  add("d4 d5 Bf4 Nf6 e3", "London System", "great", "Build the pawn triangle.");
  add("d4 d5 Bf4 c5", "London System: ...c5", "great", "The best way to fight the London.");
  add("d4 d5 Nf3", "Queen's Pawn Game", "good", "Develop. Keeps options open.");
  add("d4 d5 Nf3 Nf6", "Queen's Pawn Game", "good", "Develop.");
  add("d4 d5 Nf3 Nf6 e3", "Colle System", "ok", "Solid. Plans Bd3, O-O and e4 later.");
  add("d4 d5 e4", "Blackmar-Diemer Gambit", "dubious", "A risky pawn gambit.");
  add("d4 d5 Nc3", "Queen's Pawn: Veresov idea", "ok", "Blocks the c-pawn but develops.");
  add("d4 d5 Bg5", "Levitsky Attack", "ok", "Unusual. The bishop attacks e7.");
  add("d4 d5 e3", "Queen's Pawn: Colle idea", "ok", "Solid but slow.");

  add("d4 Nf6 c4", "Indian Game", "great", "Takes more space.");
  add("d4 Nf6 Nf3", "Indian Game", "good", "Develop. Keeps options open.");
  add("d4 Nf6 Bg5", "Trompowsky Attack", "good", "Attacks the knight right away.");
  add("d4 Nf6 Nc3", "Indian Game: Knights", "ok", "Develops but blocks the c-pawn.");
  add("d4 Nf6 g3", "Indian Game", "ok", "Plans Bg2.");
  add("d4 Nf6 c4 e6", "Indian Game", "great", "Prepares d5 or Bb4.");
  add("d4 Nf6 c4 g6", "Indian Game", "great", "Prepares Bg7. Leads to King's Indian or Grünfeld.");
  add("d4 Nf6 c4 c5", "Benoni Defense", "good", "Hits the center from the side.");
  add("d4 Nf6 c4 e5", "Budapest Gambit", "dubious", "A trappy gambit.");
  add("d4 Nf6 c4 d6", "Old Indian Defense", "ok", "Solid but passive.");
  add("d4 Nf6 c4 c5 d5", "Benoni Defense", "great", "Gains space.");
  add("d4 Nf6 c4 c5 d5 e6", "Modern Benoni", "good", "Sharp and active.");
  add("d4 Nf6 c4 c5 d5 b5", "Benko Gambit", "good", "A pawn for long-term queenside pressure.");
  add("d4 Nf6 c4 e6 Nc3", "Indian Game", "great", "Develop and prepare e4.");
  add("d4 Nf6 c4 e6 Nc3 Bb4", "Nimzo-Indian Defense", "great", "Pins the knight and stops e4. Very strong.",
    { side: "b", practice: true, plan: {
      w: ["Unpin with Qc2 or e3.", "Keep the bishop pair and open the position."],
      b: ["Castle short.", "Trade on c3 if it damages White's pawns.", "Control e4 with b6, Bb7 and Ne4."] } });
  add("d4 Nf6 c4 e6 Nf3", "Indian Game", "great", "Develop.");
  add("d4 Nf6 c4 e6 Nf3 b6", "Queen's Indian Defense", "good", "Plans Bb7 to control e4.");
  add("d4 Nf6 c4 e6 Nf3 Bb4+", "Bogo-Indian Defense", "good", "A check that helps Black develop.");
  add("d4 Nf6 c4 e6 g3", "Catalan Opening", "good", "Plans Bg2 to aim at Black's queenside.");
  add("d4 Nf6 c4 g6 Nc3", "Indian Game", "great", "Develop.");
  add("d4 Nf6 c4 g6 Nc3 d5", "Grünfeld Defense", "great", "Black attacks White's center with pieces.");
  add("d4 Nf6 c4 g6 Nc3 Bg7", "King's Indian Defense", "great", "Black lets White take the center, then attacks it.");
  add("d4 Nf6 c4 g6 Nc3 Bg7 e4", "King's Indian Defense", "great", "White takes the full center.");
  add("d4 Nf6 c4 g6 Nc3 Bg7 e4 d6", "King's Indian Defense", "great", "The main setup. Castle next, then strike with e5.",
    { side: "b", practice: true, plan: {
      w: ["Develop Nf3, Be2 and castle.", "Attack on the queenside with c5 and b4."],
      b: ["Castle short, then play e5.", "If the center locks, play Ne8 (or Nd7) and f5.", "Attack White's king with your kingside pawns."] } });

  /* ---------------- Other White openings ---------------- */
  add("c4 e5", "English: Reversed Sicilian", "good", "Takes the center.");
  add("c4 Nf6", "English: Anglo-Indian", "good", "Develop.");
  add("c4 c5", "English: Symmetrical", "good", "Mirrors White. Solid.");
  add("c4 e6", "English: Agincourt", "good", "Prepares d5.");
  add("c4 c6", "English: Caro-Kann setup", "ok", "Prepares d5.");
  add("Nf3 d5", "Réti Opening", "good", "Takes the center.");
  add("Nf3 Nf6", "Réti Opening", "good", "Develop.");
  add("Nf3 d5 c4", "Réti Opening", "good", "Attacks d5 from the side.");
  add("Nf3 c5", "Réti: Sicilian setup", "ok", "Fine.");
  add("f4 d5", "Bird's Opening", "good", "Takes the center.");
  add("f4 e5", "From's Gambit", "dubious", "A sharp gambit against the Bird.");
  add("g3 d5", "King's Fianchetto", "good", "Takes the center.");
  add("g3 e5", "King's Fianchetto", "good", "Takes the center.");
  add("b3 e5", "Nimzo-Larsen Attack", "good", "Takes the center.");
  add("b3 d5", "Nimzo-Larsen Attack", "good", "Takes the center.");

  /* ---------------- Trie ---------------- */
  const root = { children: {}, entry: null };
  for (const op of O) {
    const list = op.moves.split(" ");
    op.list = list;
    op.ply = list.length;
    op.lastSide = list.length % 2 === 1 ? "w" : "b";
    if (!op.side) op.side = op.lastSide;
    let node = root;
    for (const san of list) {
      if (!node.children[san]) node.children[san] = { children: {}, entry: null };
      node = node.children[san];
    }
    node.entry = op;
  }

  // Walk a move list. Returns how deep the book goes and the best names/plans.
  function lookup(history) {
    let node = root, depth = 0, named = null;
    const plans = { w: null, b: null };
    for (const san of history) {
      const next = node.children[san];
      if (!next) break;
      node = next;
      depth++;
      if (node.entry) {
        named = node.entry;
        if (node.entry.plan) {
          if (node.entry.plan.w) plans.w = node.entry;
          if (node.entry.plan.b) plans.b = node.entry;
        }
      }
    }
    return { inBook: depth === history.length, depth, node, named, plans };
  }

  // Book moves that can follow the given history.
  function nextMoves(history) {
    const r = lookup(history);
    if (!r.inBook) return [];
    return Object.keys(r.node.children).map((san) => {
      const child = r.node.children[san];
      return { san, entry: child.entry || findEntryBelow(child) };
    });
  }

  function findEntryBelow(node) {
    // A node with no entry of its own lies on a longer line, so it is a main-line move.
    for (const k in node.children) {
      const c = node.children[k];
      if (c.entry) return c.entry;
      const d = findEntryBelow(c);
      if (d) return d;
    }
    return null;
  }

  window.Book = { list: O, lookup, nextMoves };
})();
