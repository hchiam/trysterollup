import { GameController, selfId, sendData } from "./trysterollup";

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const pre = $("pre");

log(`my peerId: ${selfId}`);

function log(text) {
  pre.textContent = `my selfId: ${selfId}\n\n${text}\n`;
}

const game = new GameController(printPlayers);
game.startGame();

$("#update").addEventListener("click", () => {
  sendData(game.localData);
  // console.log("#update click", JSON.stringify(game.localData));
  printPlayers();
});

$("#play").addEventListener("click", () => {
  game.play();
});

// button clicks work on both desktop and mobile and keyboard
$("#left").addEventListener("click", () => {
  game.updatePosition(selfId, -1, 0);
});
$("#right").addEventListener("click", () => {
  game.updatePosition(selfId, +1, 0);
});
$("#up").addEventListener("click", () => {
  game.updatePosition(selfId, 0, -1);
});
$("#down").addEventListener("click", () => {
  game.updatePosition(selfId, 0, +1);
});

function printPlayers() {
  const playersData = Object.entries(game.localData).filter(
    (x) => !x[0].startsWith("_")
  );
  const players = playersData
    .map((x) => `${x[0]}: ${JSON.stringify(x[1])}`)
    .join("\n");
  const boardData = game.localData._board ?? [[]];
  const board = boardData.map((row) => row.join(" ")).join("\n");
  log(board + "\nplayers:\n" + players);
}
