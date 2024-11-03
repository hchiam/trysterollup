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
          // assuming only 1 gamepad:
          this.#mapGamepadToActions(gamepads[0]);
        }
      });
    }
  }

  #pollGamepads(processGamePads = () => {}) {
    this.gamepads = navigator.getGamepads().filter(Boolean);
    processGamePads(this.gamepads);
    window.requestAnimationFrame(
      this.#pollGamepads.bind(this, processGamePads)
    );
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
