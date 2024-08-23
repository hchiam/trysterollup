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

// https://web.dev/articles/gamepad and https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API
let gamepads = {}; // gamepads[0].id; gamepads[0].axes ; gamepads[0].buttons[0].pressed / .touched / .value for analog

const usingGamepad = true;

const buttonListeners = [up, right, down, left];

const isGamePadApiSupported = "getGamepads" in navigator;
if (isGamePadApiSupported) {
  window.addEventListener("gamepadconnected", (event) => {
    console.log("gamepad connected:", event.gamepad);
  });
  window.addEventListener("gamepaddisconnected", (event) => {
    console.log("gamepad disconnected:", event.gamepad);
  });

  pollGamepads((gamepads) => {
    if (gamepads) {
      showGamepadButtons(gamepads);
      mapGamepadToActions(gamepads[0], { buttonListeners: buttonListeners });
    }
  });

  function pollGamepads(processGamePads) {
    gamepads = navigator.getGamepads();
    processGamePads(gamepads);
    // for (const gamepad of gamepads) {
    //   if (!gamepad) {
    //     continue;
    //   }
    //   // can process a single gamepad here:
    //   // console.log(gamepad.axes, gamepad.buttons); // button.pressed/.touched/.value
    // }
    window.requestAnimationFrame(pollGamepads.bind(this, processGamePads));
  }
}

/** use listener indices to map them to controls:
 * axisListeners[0]: (number) => {}
 * buttonListeners[0]: () => {} // TODO: optional param value?:number for analog button
 */
function mapGamepadToActions(
  gamepad,
  { axisListeners = [], buttonListeners = [] }
) {
  if (!gamepad || !usingGamepad) return;

  const gamepadAxes = gamepad.axes;
  if (gamepadAxes && gamepadAxes.length) {
    for (let i = 0; i < gamepadAxes.length; i++) {
      const gamepadAxis = gamepadAxes[i];
      const axisListener = axisListeners[i];
      axisListener?.(gamepadAxis);
    }
  }
  const gamepadButtons = gamepad.buttons;
  if (gamepadButtons && gamepadButtons.length) {
    for (let i = 0; i < gamepadButtons.length; i++) {
      const gamepadButton = gamepadButtons[i];
      if (gamepadButton.pressed || gamepadButton.touched) {
        const buttonListener = buttonListeners[i];
        buttonListener?.(gamepadButton);
      }
    }
  }
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
