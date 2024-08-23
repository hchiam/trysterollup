import { GameController } from "./trysterollup";
const $ = (s) => document.querySelector(s);

// .../?room=someNumberOrId
const roomId_fromUrl =
  new URLSearchParams(window.location.search).get("room") || "room42";

const game = new GameController({
  updateUi: updateUi,
  buttonListeners: [up, right, down, left],
});
// this is possible: game.buttonListeners = [up, right, down, left];
game.localData.board = get2dArray(10, 10, "x");
game.startGame();
updateUi();

$("#roomId").value = roomId_fromUrl;
$("#roomId").addEventListener("change", () => {
  const valid = $("#roomId").value && $("#password").value;
  if (valid) {
    $("#join").style.pointerEvents = "";
  } else {
    $("#join").style.pointerEvents = "none";
  }
});
$("#password").addEventListener("change", () => {
  const valid = $("#roomId").value && $("#password").value;
  if (valid) {
    $("#join").style.pointerEvents = "";
  } else {
    $("#join").style.pointerEvents = "none";
  }
});
$("#join").addEventListener("click", () => {
  console.log("trying to join");
  const roomId = String('$("#roomId").value' || roomId_fromUrl);
  const password = String('$("#password").value' || "silly_pwd");
  game.join(
    {
      appId: "hchiam-trysterollup-demo",
      password: password,
    },
    roomId,
    function onJoinError() {}
  );
});

$("#update").addEventListener("click", () => {
  game.sendData(game.localData);
  // console.log("#update click", JSON.stringify(game.localData));
  printPlayers();
});

$("#play").addEventListener("click", () => {
  game.localData.board[0][0] = "o";
  game.update();
});

// button clicks work on both desktop and mobile and keyboard
$("#left").addEventListener("click", () => {
  left();
});
$("#right").addEventListener("click", () => {
  right();
});
$("#up").addEventListener("click", () => {
  up();
});
$("#down").addEventListener("click", () => {
  down();
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

function updateUi() {
  printPlayers();
  showGamepadButtons(game.gamepads);
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

function left() {
  game.updatePosition(-1, 0);
}
function right() {
  game.updatePosition(+1, 0);
}
function up() {
  game.updatePosition(0, -1);
}
function down() {
  game.updatePosition(0, +1);
}

function showGamepadButtons(gamepads) {
  if (!gamepads) {
    $("#gamepads").innerHTML = "";
  } else {
    $("#gamepads").innerHTML = gamepads
      .map(
        (gamepad) => `<fieldset>
          <p>${gamepad.id}:</p>
          <p>Axes:<br><span>${gamepad.axes
            .map((a) => String(Math.round(a * 100)))
            .map((a, i) => (i % 2 === 0 ? a + " " : a + ","))
            .join("")}</span></p>
          <p>Buttons:<br><span>${gamepad.buttons
            .map((b, i) => (i === 4 ? " " : "" + Number(b.pressed)))
            .join("")}</span></p>
        </fieldset>`
      )
      .join("");
  }
}
