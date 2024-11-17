/** see trystero capabilities in the documentation:
 * https://github.com/dmotz/trystero
 * https://oxism.com/trystero
 */

import { selfId, joinRoom } from "./trystero-nostr.0.20.0.min.js"; // so tauri doesn't complain about MIME type (because of TS?)

export class GameController {
  /**
   * Trysterollup game controller:
   *
   * https://github.com/hchiam/trysterollup
   */
  constructor({
    updateUi, // callback function
    keydownListeners = {}, // key:left/right/up/down for keyboard
    buttonListeners = {}, // object key:number of functions for game pad buttons
    joystickListeners = {}, // object key:number of functions that take in a number
    gamepadConnectedCallback,
    gamepadDisconnectedCallback,
    manuallyMapGamepadToActions = false,
    hold3ButtonsFor3SecondsToRemapButtons = false,
  }) {
    this.room = null;
    this.updateUi = updateUi || function () {};
    this.localData = { players: { [selfId]: { playerId: 0 } } };
    this.debug = true;
    this.debugMore = false;
    this.gamepads = {};
    this.keydownListeners = keydownListeners; // keydownListeners.left: (event) => {}
    this.buttonListeners = buttonListeners; // buttonListeners[0]: () => {} // TODO: #11: optional param value?:number for analog button
    this.joystickListeners = joystickListeners; // joystickListeners[0]: (number) => {}
    this.gamepadConnectedCallback = gamepadConnectedCallback || function () {};
    this.gamepadDisconnectedCallback =
      gamepadDisconnectedCallback || function () {};

    this.#originalButtonListeners = {};
    for (let actionIndex of Object.keys(this.buttonListeners)) {
      this.#originalButtonListeners[actionIndex] =
        this.buttonListeners[actionIndex];
    }

    this.#hold3ButtonsFor3SecondsToRemapButtons =
      hold3ButtonsFor3SecondsToRemapButtons;

    this.#manuallyMapGamepadToActions = manuallyMapGamepadToActions;
    this.listenersToRemap = {};
    if (manuallyMapGamepadToActions) {
      this.manuallyRemapButtons();
    }

    // tell other peers currently in the room
    this.#sendData(this.localData);

    this.#initializeKeyboardSupport();

    this.#initializeGamepadSupport();
  }
  // (put private properties AFTER the constructor so documentation generates properly)
  #sendData = () => {}; // for room
  #onDataUpdate = () => {}; // for room
  #originalButtonListeners = {};
  #currentButton = null; // assumes one at a time, for manual remap functionality only
  #manuallyMapGamepadToActions = false;
  #manuallyRemapLastButtonTimeout = null;
  #hold3ButtonsFor3SecondsToRemapButtons = false;
  #remapButtonsHoldTimer = null;
  #remapButtonsDelayTimer = null;

  join(/* https://github.com/dmotz/trystero#api joinRoom */) {
    if (this.debug) console.log("join");
    this.room = joinRoom(...arguments);
    const [sendData, onDataUpdate] = this.room.makeAction("data");
    this.#sendData = sendData;
    this.#onDataUpdate = onDataUpdate;

    this.#initializeRoomEventListeners();

    return this.room;
  }

  startGame() {
    this.update();
    return this;
  }

  update(dataOverride = null) {
    if (dataOverride) this.localData = dataOverride;
    this.updateUi();
    this.#sendData(this.localData);
    return this;
  }

  updatePosition(xDelta = 0, yDelta = 0, peerId = selfId) {
    const { x, y } = this.localData.players[peerId];

    this.localData.players[peerId].x =
      x === undefined ? xDelta : Number(x) + Number(xDelta);
    this.localData.players[peerId].y =
      y === undefined ? yDelta : Number(y) + Number(yDelta);

    this.update();

    return this;
  }

  /**
   * for convenience, in case you want to detect holding 3 buttons down for 3 seconds
   */
  isHolding3ButtonsDown() {
    return (
      this.#hold3ButtonsFor3SecondsToRemapButtons &&
      this.getCurrentlyOnButtonsPerGamepad().some(
        (gpButtonsOn) => gpButtonsOn.length === 3
      )
    );
  }

  isManuallyRemappingButtons() {
    const negativeKeysToRemap = Object.keys(this.listenersToRemap);
    return negativeKeysToRemap.length > 0;
  }

  manuallyRemapButtons() {
    this.#manuallyMapGamepadToActions = true;
    this.listenersToRemap = {};
    for (let actionIndex of Object.keys(this.buttonListeners)) {
      this.listenersToRemap["toRemap:" + actionIndex] =
        this.#originalButtonListeners[actionIndex];
    }
  }

  getCurrentlyOnButtonsPerGamepad() {
    return this.gamepads.map((gp) =>
      gp.buttons
        .map((b, i) => {
          return { i, on: b.pressed || b.touched };
        })
        .filter((b) => b.on)
        .map((b) => b.i)
    );
  }

  #initializeRoomEventListeners() {
    this.#signalNewcomers();
    this.#listenForPeersSendingData();
    this.#listenForPeersLeaving();
  }

  #signalNewcomers() {
    this.room?.onPeerJoin((peerId) => {
      this.#syncPlayerIdOfIncomingPeer(peerId);

      if (this.debug) console.log("onPeerJoin", peerId);

      this.updateUi();
    });
  }

  #listenForPeersSendingData() {
    this.#onDataUpdate((data, peerId) => {
      if (this.debugMore) {
        console.log(
          `-----|\n\this.localData BEFORE:\n${JSON.stringify(this.localData)}`
        );
        console.log("#onDataUpdate data peerId", JSON.stringify(data), peerId);
      }

      Object.entries(data).forEach((x) => {
        this.localData[x[0]] = x[1];
      });

      this.#syncPlayerIdOfIncomingPeer(peerId);

      if (this.debugMore) {
        console.log(
          `this.localData AFTER:\n${JSON.stringify(this.localData)}\n\n|-----`
        );
      }

      this.updateUi();
    });
  }

  #syncPlayerIdOfIncomingPeer(peerId) {
    const localDataBefore = JSON.stringify(this.localData);

    if (!(peerId in this.localData.players))
      this.localData.players[peerId] = { playerId: 0 };

    const mustGiveThemANewPlayerId =
      !isNaN(this.localData.players[peerId].playerId) &&
      this.localData.players[peerId].playerId === 0;

    if (mustGiveThemANewPlayerId) {
      const maxPlayerId = Math.max(
        ...Object.values(this.localData.players).map((x) =>
          isNaN(x.playerId) ? 0 : Number(x.playerId)
        )
      );

      this.localData.players[peerId].playerId = Math.max(
        maxPlayerId + 1,
        Object.keys(this.localData.players).length - 1
      );

      this.#updateHost();
    }

    let needToSendData =
      mustGiveThemANewPlayerId ||
      localDataBefore !== JSON.stringify(this.localData);

    if (needToSendData) this.#sendData(this.localData);
  }

  #listenForPeersLeaving() {
    this.room?.onPeerLeave((peerId) => {
      delete this.localData.players[peerId];
      if (this.debug) console.log("onPeerLeave", peerId);
      this.#updateHost();
      this.updateUi();
    });
  }

  #updateHost() {
    let maxPlayerId = 0;
    let peerIdOfMaxPlayerId = null;
    Object.entries(this.localData.players).forEach((player) => {
      const playerData = player[1];
      playerData.isHost = false;
      const likelyFasterConnection = playerData.playerId > maxPlayerId;
      if (likelyFasterConnection) {
        maxPlayerId = playerData.playerId;
        peerIdOfMaxPlayerId = player[0];
      }
    });
    this.localData.players[peerIdOfMaxPlayerId].isHost = true;
    this.update();
  }

  #initializeKeyboardSupport() {
    document.querySelector("body").addEventListener("keydown", (event) => {
      switch (event.key.toLowerCase()) {
        case "arrowleft":
        case "a":
          this.keydownListeners?.left?.(event);
          break;
        case "arrowright":
        case "d":
          this.keydownListeners?.right?.(event);
          break;
        case "arrowup":
        case "w":
          this.keydownListeners?.up?.(event);
          break;
        case "arrowdown":
        case "s":
          this.keydownListeners?.down?.(event);
          break;
      }
    });
  }

  #initializeGamepadSupport() {
    const isGamePadApiSupported = "getGamepads" in navigator;
    if (isGamePadApiSupported) {
      window.addEventListener("gamepadconnected", (event) => {
        if (this.debug) console.log("gamepad connected:", event.gamepad);
        if (this.#isFunction(this.gamepadConnectedCallback)) {
          this.gamepadConnectedCallback(event);
        }
        setTimeout(() => {
          this.updateUi();
        }, 100);
      });
      window.addEventListener("gamepaddisconnected", (event) => {
        if (this.debug) console.log("gamepad disconnected:", event.gamepad);
        if (this.#isFunction(this.gamepadDisconnectedCallback)) {
          this.gamepadDisconnectedCallback(event);
        }
        setTimeout(() => {
          this.updateUi();
        }, 100);
      });

      this.#pollGamepads((gamepads) => {
        if (gamepads && gamepads.length) {
          // assuming only 1 gamepad can control player:
          this.#mapGamepadToActions(gamepads[0]);
        }
      });
    }
  }

  #pollGamepads(processGamePads = () => {}) {
    this.gamepads = //this.#splitJoyConHalves(
      navigator.getGamepads().filter(Boolean);
    //);
    processGamePads(this.gamepads);
    window.requestAnimationFrame(
      this.#pollGamepads.bind(this, processGamePads)
    );
  }

  #splitJoyConHalves(gp) {
    const gamepads = [];
    for (let i = 0; i < gp.length; i++) {
      const isJoyConLR = /Joy-Con L\+R/.test(gp[i].id);
      if (!isJoyConLR) {
        gamepads.push(gp[i]);
      } else {
        const left = this.#makeFakeGamepadObject(gp[i]);
        const right = this.#makeFakeGamepadObject(gp[i]);

        left.id = gp[i].id.replace(/Joy-Con L\+R/, "Joy-Con (L)");
        [left.axes[0], left.axes[1]] = [left.axes[1], -left.axes[0]];
        left.axes[2] = 0;
        left.axes[3] = 0;
        left.buttons[0] = this.#deepCloneButton(left.buttons[14]);
        left.buttons[1] = this.#deepCloneButton(left.buttons[13]);
        left.buttons[2] = this.#deepCloneButton(left.buttons[12]);
        left.buttons[3] = this.#deepCloneButton(left.buttons[15]);
        this.#disableButton(left.buttons[4]); // disable "L" (like ZL) because of ergonomics
        this.#disableButton(left.buttons[5]);
        this.#disableButton(left.buttons[6]); // disable ZL because of ergonomics
        this.#disableButton(left.buttons[7]);
        const b18 = this.#deepCloneButton(left.buttons[18]);
        const b19 = this.#deepCloneButton(left.buttons[19]);
        left.buttons[4] = b18;
        left.buttons[5] = b19;
        this.#disableButton(left.buttons[8]); // this (holding) L -ve button already triggers record
        this.#disableButton(left.buttons[9]); // disable because this is R controller's
        // leave left.buttons[10] enabled for clicking the L axis button
        this.#disableButton(left.buttons[11]); // disable because this is for clicking the R axis button
        this.#disableButton(left.buttons[12]);
        this.#disableButton(left.buttons[13]);
        this.#disableButton(left.buttons[14]);
        this.#disableButton(left.buttons[15]);
        this.#disableButton(left.buttons[16]); // disable because this is R controller's
        this.#disableButton(left.buttons[17]); // disable because R square button already triggers home
        this.#disableButton(left.buttons[18]); // SL -> "L" (as in ZL)
        this.#disableButton(left.buttons[19]); // SR -> "R" (as in ZR)
        this.#disableButton(left.buttons[20]);
        this.#disableButton(left.buttons[21]);

        right.id = gp[i].id.replace(/Joy-Con L\+R/, "Joy-Con (R)");
        right.axes[0] = 0;
        right.axes[1] = 0;
        [right.axes[2], right.axes[3]] = [-right.axes[3], right.axes[2]];
        const b0 = this.#deepCloneButton(right.buttons[0]);
        const b1 = this.#deepCloneButton(right.buttons[1]);
        const b2 = this.#deepCloneButton(right.buttons[2]);
        const b3 = this.#deepCloneButton(right.buttons[3]);
        right.buttons[0] = b1;
        right.buttons[1] = b3;
        right.buttons[2] = b0;
        right.buttons[3] = b2;
        this.#disableButton(right.buttons[4]);
        this.#disableButton(right.buttons[5]); // disable "R" (like ZR) because of ergonomics
        this.#disableButton(right.buttons[6]);
        this.#disableButton(right.buttons[7]); // disable "R" (like ZR) because of ergonomics
        const b20 = this.#deepCloneButton(right.buttons[20]);
        const b21 = this.#deepCloneButton(right.buttons[21]);
        right.buttons[4] = b20;
        right.buttons[5] = b21;
        this.#disableButton(right.buttons[8]); // disable because this is L controller's
        this.#disableButton(right.buttons[9]); // disable because (holding) L -ve button already triggers record
        this.#disableButton(right.buttons[10]); // disable because this is for clicking the L axis button
        // leave right.buttons[11] enabled for clicking the R axis button
        this.#disableButton(right.buttons[12]);
        this.#disableButton(right.buttons[13]);
        this.#disableButton(right.buttons[14]);
        this.#disableButton(right.buttons[15]);
        this.#disableButton(right.buttons[16]); // this R square button already triggers home
        this.#disableButton(right.buttons[17]); // disable because this is L controller's
        this.#disableButton(right.buttons[18]);
        this.#disableButton(right.buttons[19]);
        this.#disableButton(right.buttons[20]); // SL -> "L" (as in ZL)
        this.#disableButton(right.buttons[21]); // SR -> "R" (as in ZR)

        // TODO: fix indices of all controllers including those that follow:
        right.index++;

        // TODO: separate vibrationActuator for L and R

        gamepads.push(left);
        gamepads.push(right);
      }
    }

    return gamepads;
  }

  #makeFakeGamepadObject(gamepad) {
    return {
      axes: [...gamepad.axes],
      // [0, 0, 0, 0],
      // buttons: [...gamepad.buttons],
      buttons: gamepad.buttons.map((b) => {
        return { pressed: b.pressed, touched: b.touched, value: b.value };
      }),
      // [
      //   {
      //     pressed: false,
      //     touched: false,
      //     value: 0,
      //   },
      // ],
      connected: gamepad.connected,
      id: gamepad.id,
      index: gamepad.index,
      mapping: gamepad.mapping,
      timestamp: gamepad.timestamp,
      vibrationActuator: {
        effects: gamepad.vibrationActuator.effects,
        type: gamepad.vibrationActuator.type,
      },
    };
  }

  #deepCloneButton(buttonReference) {
    return {
      pressed: buttonReference.pressed,
      touched: buttonReference.touched,
      value: buttonReference.value,
    };
  }

  #disableButton(buttonReference) {
    buttonReference.pressed = false;
    buttonReference.touched = false;
    buttonReference.value = false;
  }

  /**
   * use listener indices to map gamepad buttons/axes to listeners:
   *
   * buttonListeners[0]: () => {} // TODO: optional param value?:number for analog button
   *
   * joystickListeners[0]: (number) => {}
   */
  #mapGamepadToActions(gamepad) {
    if (!gamepad) return;

    const gamepadButtons = gamepad.buttons;
    if (gamepadButtons && gamepadButtons.length) {
      for (let i = 0; i < gamepadButtons.length; i++) {
        const gamepadButton = gamepadButtons[i];
        if (gamepadButton.pressed || gamepadButton.touched) {
          const currentlyPressedButton = gamepadButton;

          if (this.#manuallyMapGamepadToActions) {
            if (this.isManuallyRemappingButtons()) {
              const negativeKeysToRemap = Object.keys(this.listenersToRemap);

              const actionKeyToRemap = negativeKeysToRemap[0];
              const actionToRemap = this.listenersToRemap[actionKeyToRemap];

              if (this.#currentButton !== currentlyPressedButton) {
                this.#currentButton = currentlyPressedButton;

                // overwrite to remap:
                this.buttonListeners[i] = actionToRemap;

                // delete action done remapping:
                if (negativeKeysToRemap.length === 1) {
                  // debounce to avoid triggering action right after remap:
                  clearTimeout(this.#manuallyRemapLastButtonTimeout);
                  this.#manuallyRemapLastButtonTimeout = setTimeout(() => {
                    delete this.listenersToRemap[actionKeyToRemap];
                  }, 200);
                } else {
                  delete this.listenersToRemap[actionKeyToRemap];
                }
              }
            }
          }

          if (
            !(
              this.#hold3ButtonsFor3SecondsToRemapButtons &&
              this.getCurrentlyOnButtonsPerGamepad().some(
                (gpButtonsOn) => gpButtonsOn.length === 3
              )
            )
          ) {
            // actually run the listener action mapped to the current button:
            const actionToRun = this.buttonListeners[i];
            actionToRun?.(currentlyPressedButton);
          } else {
            // otherwise don't run any action - handle holding 3 buttons for 3 seconds:
            if (this.#remapButtonsHoldTimer === null) {
              this.#remapButtonsHoldTimer = setTimeout(() => {
                clearTimeout(this.#remapButtonsDelayTimer);
                this.#remapButtonsDelayTimer = setTimeout(() => {
                  this.manuallyRemapButtons();
                  clearTimeout(this.#remapButtonsDelayTimer);
                  clearTimeout(this.#remapButtonsHoldTimer);
                  this.#remapButtonsHoldTimer = null;
                }, 0);
              }, 3000);
            }
          }
        }
      }
    }

    const gamepadAxes = gamepad.axes;
    if (gamepadAxes && gamepadAxes.length) {
      for (let i = 0; i < gamepadAxes.length; i++) {
        const gamepadAxis = gamepadAxes[i];
        const joystickListener = this.joystickListeners[i];
        joystickListener?.(gamepadAxis);
      }
    }
  }

  #isFunction(potentialCallback) {
    return (
      typeof potentialCallback === "function" &&
      !/^class\s/.test(String(potentialCallback))
    );
  }
}
