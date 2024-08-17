import { GameController, sendData } from "./trysterollup";
const $ = (s) => document.querySelector(s);

const game = new GameController({ updateUi: printPlayers });
game.localData.board = get2dArray(10, 10, "x");
game.startGame();

$("#update").addEventListener("click", () => {
  sendData(game.localData);
  // console.log("#update click", JSON.stringify(game.localData));
  printPlayers();
});

$("#play").addEventListener("click", () => {
  game.localData.board[0][0] = "o";
  game.update();
});

// button clicks work on both desktop and mobile and keyboard
$("#left").addEventListener("click", () => {
  game.updatePosition(-1, 0);
});
$("#right").addEventListener("click", () => {
  game.updatePosition(+1, 0);
});
$("#up").addEventListener("click", () => {
  game.updatePosition(0, -1);
});
$("#down").addEventListener("click", () => {
  game.updatePosition(0, +1);
});

function get2dArray(rows, cols, val = "") {
  return new Array(rows).fill(null).map(() =>
    new Array(cols).fill(null).map(() => {
      return val;
    })
  );
}

function log(text) {
  $("pre").textContent = text;
}

function printPlayers() {
  const playersData = Object.entries(game.localData).filter(
    (x) => x[0] !== "board"
  );
  const players = playersData
    .map((x) => `${x[0]}: ${JSON.stringify(x[1])}`)
    .join("\n");
  const boardData = game.localData.board ?? [[]];
  const board = boardData.map((row) => row.join(" ")).join("\n");
  log(board + "\nplayers:\n" + players);
}
