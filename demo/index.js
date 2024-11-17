import { GameController } from "../trysterollup.js";
import { Lsvg, LRsvg, PS5svg, Rsvg } from "./gamepadIconStrings.js";
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

// .../?room=someNumberOrId
const roomId_fromUrl =
  new URLSearchParams(window.location.search).get("room") || "room42";

const hold3ButtonsFor3SecondsToRemapButtons = true;

const gamepadsContainer = $("#gamepads");

const game = new GameController({
  updateUi: updateUi,
  keydownListeners: {
    left: left,
    right: right,
    up: up,
    down: down,
  },
  hold3ButtonsFor3SecondsToRemapButtons: hold3ButtonsFor3SecondsToRemapButtons,
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
  gamepadConnectedCallback: (event) => {
    console.log("gamepadConnectedCallback", event);
  },
  gamepadDisconnectedCallback: (event) => {
    console.log("gamepadDisconnectedCallback", event);
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
    highlightPressedGamepadButton("b0");
  }
}
function a() {
  if (!game.isManuallyRemappingButtons()) {
    right();
    highlightPressedGamepadButton("b1");
  }
}
function y() {
  if (!game.isManuallyRemappingButtons()) {
    left();
    highlightPressedGamepadButton("b2");
  }
}
function x() {
  if (!game.isManuallyRemappingButtons()) {
    up();
    highlightPressedGamepadButton("b3");
  }
}
function left() {
  if (!game.isManuallyRemappingButtons()) {
    game.updatePosition(-1, 0);
  }
}
function right() {
  if (!game.isManuallyRemappingButtons()) {
    game.updatePosition(+1, 0);
  }
}
function up() {
  if (!game.isManuallyRemappingButtons()) {
    game.updatePosition(0, -1);
  }
}
function down() {
  if (!game.isManuallyRemappingButtons()) {
    game.updatePosition(0, +1);
  }
}
if (hold3ButtonsFor3SecondsToRemapButtons) {
  setInterval(() => {
    monitor3Buttons3Seconds();
  }, 250);
}
function monitor3Buttons3Seconds() {
  if (game.isHolding3ButtonsDown()) {
    if (game.isManuallyRemappingButtons()) {
      $("#remapTimingInstruction").innerText = "RELEASE!";
      $("#remapTimingInstruction").classList.add("release");
    } else {
      $("#remapTimingInstruction").innerText = "HOLD";
      $("#remapTimingInstruction").classList.remove("release");
    }
  } else {
    $("#remapTimingInstruction").innerText = "";
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
    gamepadsContainer.innerHTML = "";
  } else {
    const html = [...gamepads] // need [...] for ChromeOS chrome
      .map((gamepad) => {
        // const showAxes = true; // WARNING: showing axes constantly updates view
        const showAxes = false;
        const axes = showAxes
          ? `<pre>Axes:<br><span>${gamepad.axes
              .map((a) => String(Math.round(a * 100)).padStart(4, " ") + "%")
              .map((a, i) => (i % 2 === 0 ? a + " " : a + "<br><br>"))
              .join("")}</span></pre>`
          : "";

        return `<fieldset>
          <p>${showGamepadIcon(gamepad.id)}</p>
          <p>Gamepad ID: ${gamepad.id}:</p>
          ${axes}
          <p>Buttons:<br><span>${gamepad.buttons
            .map((b, i) => (i === 4 ? " " : "") + Number(b.pressed))
            .join("")}</span><br>${gamepad.buttons
          .map((b, i) => (i === 4 ? " " : "") + String(i).slice(-1))
          .join("")}</p>
        </fieldset>`;
      })
      .join("");
    const current = gamepadsContainer.innerHTML;
    if (current !== html) {
      gamepadsContainer.innerHTML = html;
    }
  }
}

const gamepadIconUnknown = $("#gamepad-icon-unknown").src;
const gamepadIconPS5 = PS5svg ?? $("#gamepad-icon-ps5").src;
const gamepadIconJoyConL = Lsvg ?? $("#gamepad-icon-joycon_L").src;
const gamepadIconJoyConR = Rsvg ?? $("#gamepad-icon-joycon_R").src;
const gamepadIconJoyConLR = LRsvg ?? $("#gamepad-icon-joycon_LR").src;
function showGamepadIcon(id) {
  id = id.replace(/ {2,}/g, " ");
  let image = gamepadIconUnknown;
  const testMatch = false && id.match(/Generic USB Joystick/);
  if (testMatch || id.match(/DualSense Wireless Controller/)) {
    return gamepadIconPS5;
  } else if (id.match(/Joy-Con \(L\)/)) {
    return gamepadIconJoyConL;
  } else if (id.match(/Joy-Con \(R\)/)) {
    return gamepadIconJoyConR;
  } else if (id.match(/Joy-Con L\+R/)) {
    return gamepadIconJoyConLR;
  }
  return `<img class="gamepad-icon" src="${image}">`;
}

function highlightPressedGamepadButton(className) {
  gamepadsContainer.classList.add(className);
  setTimeout(() => {
    gamepadsContainer.classList.remove(className);
  }, 100);
}

console.log("https://github.com/hchiam/trysterollup");
