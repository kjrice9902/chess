# Opening Coach

A chess app that helps you fix your openings.

## What it does

- **Play chess** against the computer (easy, medium, hard) or a friend on the same screen.
- **Names every opening move.** After each of your moves, the coach shows the name of the opening (Italian Game, Sicilian Defense, London System, and about 230 more lines).
- **Rates each move**: Great, Good, OK, Questionable or Bad, with a short reason. Out of the known lines, it checks the basic rules: take the center, develop knights and bishops, castle early, do not move the queen or king early, do not move the same piece twice. It also warns you when a move loses material.
- **Gives you a plan** for the opening you are in, plus a checklist (center pawn, knights out, bishops out, castle, rooks connected).
- **Hint button** shows the next book move or the best move.
- **Sounds**: two rising beeps when your king is in check, and falling notes with a low boom on checkmate. Turn them off with the Sound button.
- **Openings tab**: every opening ranked and color coded: Best (green), Good (light green), Playable (yellow), Risky (orange), Avoid (red). Search, filter by color, and practice any opening. The computer follows the line.
- **Your success**: the My style tab shows your most and least successful openings, colored by your score: Strong (green), Mixed (yellow), Weak (orange), Losing (red).
- **My style tab**: after each game, the app saves how you opened. It finds your style (Explorer, Attacker, Builder or Strategist) and suggests openings for White and for Black that fit you.

## Saving and backups

- Everything saves by itself on your device: every finished game, and every move of the game you are playing now. If you close or reload the page, your game comes back.
- In **My style → Save and backup** you can:
  - **Download backup (.json)**: saves all your games to one file. On iPhone, choose "Save to Files".
  - **Copy backup**: copies the same data as text, so you can paste it into a note.
  - **Restore from file** or **Paste backup**: adds games from a backup. Games you already have are skipped.
- On the Claude link, your games are also saved to your Claude account (private to you), so they come back even if the Claude app clears the page.
- Up to **50,000 games** are kept on your device (in the browser's large storage). A warning appears at 90% full (yellow) and 98% full (red). When it is full, the oldest games are removed to make room, so download a backup first. You also get a warning if your device storage or your Claude account storage runs low.
- Every 5 days, a reminder at the top of the app asks you to download a backup. "Remind me tomorrow" hides it for one day.
- Zoom is locked: pinch and double-tap do not zoom the app.
- Each browser, link and home screen app keeps its own data. Use a backup to move your games between them.

## How to run

Open `index.html` in a web browser. No install needed. Your game history is saved in your browser.

Pawns always promote to a queen.

## Files

- `js/openings.js` – the opening book (names, ratings, plans)
- `js/coach.js` – move ratings, checklist and style profile
- `js/engine.js` – the computer player
- `js/theme.js` – the wood board, red leather frame and wooden pieces (all drawn in code)
- `js/app.js` – the board and screens
- `lib/chess.js` – chess rules ([chess.js](https://github.com/jhlywa/chess.js) 0.10.3, BSD license). One small addition: a `_fast` block near the end that lets the engine search faster.

## Add it to your phone's home screen

The home screen icon only works when the app has its own web address.
Host this folder on any static web host (for example GitHub Pages), open
`index.html` there in Safari, then tap Share → Add to Home Screen.
The knight icon comes from `icons/icon-180.png`.
