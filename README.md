# Alliance

A phone-friendly map for our game: a 20 × 20 grid where every player has a token
(with their own photo, if you like) and you move them around as the game goes on.

It's a plain web app — no install, no account, no server. One phone runs the game,
and everything is saved on that phone.

## How to use

- **Add a player:** tap **+ Add player**, enter a name, pick a colour and optionally
  choose a photo (camera or gallery). The photo becomes their token on the map.
- **Place or move a player:** tap the player (on the map or in the bar at the bottom),
  then tap a square. Several players can share a square.
- **Undo:** the ↶ button undoes the last move.
- **Zoom:** − and + in the top bar; scroll the map with your finger.
- **Edit / take off the map:** select a player, then use **Edit** or **Off map**.
- **Menu (⋯):** clear the map (keep players) or start a new game (delete everyone).

Tip: in the phone browser, use **Add to Home Screen** to open it like an app.

## Files

| File | What it is |
| --- | --- |
| `index.html` | Page layout and dialogs |
| `style.css` | Look and feel (light and dark mode) |
| `app.js` | Game logic: grid, players, moves, undo, saving |
| `manifest.webmanifest`, `icon.svg` | Home-screen app name and icon |

## Running it

Any static web host works, for example GitHub Pages. To try it on a computer, serve
the folder with any static file server and open it in a browser.
