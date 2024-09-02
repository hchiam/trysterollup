import { GameController } from "../trysterollup.js";
const $ = (s) => document.querySelector(s);

// .../?room=someNumberOrId
const roomId_fromUrl =
  new URLSearchParams(window.location.search).get("room") || "room42";

const game = new GameController({
  updateUi: updateUi,
  keydownListeners: {
    left: left,
    right: right,
    up: up,
    down: down,
  },
  hold3ButtonsFor3SecondsToRemapButtons: true,
  // buttonListeners: {
  //   // USB Joystick: Y X A B; up down left right;
  //   0: up,
  //   1: right,
  //   2: down,
  //   3: left,
  //   12: up,
  //   13: down,
  //   14: left,
  //   15: right,
  // },
  // joystickListeners: {
  //   // USB Joystick:
  //   0: leftAxisHorizontal,
  //   1: leftAxisVertical,
  //   // 3: rightAxisHorizontal, // not working well on my USB Joystick
  //   // 4: rightAxisVertical, // not working well on my USB Joystick
  // },
  buttonListeners: {
    // Joy-Con: B A Y X; up down left right;
    0: b,
    1: a,
    2: y,
    3: x,
    12: up,
    13: down,
    14: left,
    15: right,
  },
  joystickListeners: {
    // Joy-Con:
    0: leftAxisHorizontal,
    1: leftAxisVertical,
    2: rightAxisHorizontal,
    3: rightAxisVertical,
  },
});
// this is possible: game.buttonListeners = [up, right, down, left];
game.localData.board = get2dArray(10, 10, "x");
game.startGame();
updateUi();

window.game = game; // for browser console convenience

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
  const roomId = $("#roomId").value || roomId_fromUrl;
  const password = $("#password").value || "silly_pwd";
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
  game.update(game.localData);
  // console.log("#update click", JSON.stringify(game.localData));
  printPlayers();
});

$("#play").addEventListener("click", () => {
  game.localData.board[0][0] = "o";
  game.update();
});

$("#remap").addEventListener("click", () => {
  game.manuallyRemapButtons();
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

  const actionsToRemap = Object.values(game.listenersToRemap)
    .map((f) => f.name)
    .join(", ");
  $("#remapMessage").innerText = actionsToRemap
    ? "Buttons to remap: " + actionsToRemap
    : "";

  showGamepadButtons(game.gamepads);
}

function printPlayers() {
  const playersData = Object.entries(game.localData.players);
  const players = playersData
    .map((x) => `${x[0]}: ${JSON.stringify(x[1])}`)
    .join("\n");
  const boardData = game.localData.board ?? [[]];
  const board = boardData.map((row) => row.join(" ")).join("\n");
  log(board + "\n\nplayers:\n" + players);
}

function b() {
  if (!game.isManuallyRemappingButtons()) {
    down();
  }
  anyButtonEventCallback();
}
function a() {
  if (!game.isManuallyRemappingButtons()) {
    right();
  }
  anyButtonEventCallback();
}
function y() {
  if (!game.isManuallyRemappingButtons()) {
    left();
  }
  anyButtonEventCallback();
}
function x() {
  if (!game.isManuallyRemappingButtons()) {
    up();
  }
  anyButtonEventCallback();
}
function left() {
  if (!game.isManuallyRemappingButtons()) {
    game.updatePosition(-1, 0);
  }
  anyButtonEventCallback();
}
function right() {
  if (!game.isManuallyRemappingButtons()) {
    game.updatePosition(+1, 0);
  }
  anyButtonEventCallback();
}
function up() {
  if (!game.isManuallyRemappingButtons()) {
    game.updatePosition(0, -1);
  }
  anyButtonEventCallback();
}
function down() {
  if (!game.isManuallyRemappingButtons()) {
    game.updatePosition(0, +1);
  }
  anyButtonEventCallback();
}
let remapButtonsHoldTimer = null;
let remapButtonsDelayTimer = null;
function anyButtonEventCallback() {
  const gamepadsOnButtons = game.getCurrentlyOnButtonsPerGamepad();
  if (gamepadsOnButtons.some((gpButtonsOn) => gpButtonsOn.length === 3)) {
    if (remapButtonsHoldTimer === null) {
      remapButtonsHoldTimer = setTimeout(() => {
        clearTimeout(remapButtonsDelayTimer);
        remapButtonsDelayTimer = setTimeout(() => {
          game.manuallyRemapButtons();
          clearTimeout(remapButtonsDelayTimer);
          clearTimeout(remapButtonsHoldTimer);
          remapButtonsHoldTimer = null;
        }, 3000);
      }, 3000);
    }
  }
}

function leftAxisHorizontal(data) {
  game.updatePosition(Math.round(data), 0);
}
function leftAxisVertical(data) {
  game.updatePosition(0, Math.round(data));
}
function rightAxisHorizontal(data) {
  game.updatePosition(Math.round(data), 0);
}
function rightAxisVertical(data) {
  game.updatePosition(0, Math.round(data));
}

function showGamepadButtons(gamepads) {
  if (!gamepads) {
    $("#gamepads").innerHTML = "";
  } else {
    $("#gamepads").innerHTML = gamepads
      .map(
        (gamepad) => `<fieldset>
          <p>${gamepad.id}:</p>
          <pre>Axes:<br><span>${gamepad.axes
            .map((a) => String(Math.round(a * 100)).padStart(4, " ") + "%")
            .map((a, i) => (i % 2 === 0 ? a + " " : a + "<br/><br/>"))
            .join("")}</span></pre>
          <p>Buttons:<br><span>${gamepad.buttons
            .map((b, i) => (i === 4 ? " " : "" + Number(b.pressed)))
            .join("")}</span></p>
        </fieldset>`
      )
      .join("");
  }
}

console.log("https://github.com/hchiam/trysterollup");
