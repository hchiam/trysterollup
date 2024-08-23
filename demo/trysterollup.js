/** see trystero capabilities in the documentation:
 * https://github.com/dmotz/trystero
 * https://oxism.com/trystero
 */

import { selfId, joinRoom } from "./trystero-nostr.min.js";

export class GameController {
  constructor({
    updateUi, // callback function
    buttonListeners = [], // array of functions
    joystickListeners = [], // array of functions that take in a number
    generatingDocumentation = false,
  }) {
    this.room = null;
    this.updateUi = updateUi || function () {};
    this.localData = { players: { [selfId]: { playerId: 0 } } };
    this.debug = true;
    this.debugMore = false;
    this.gamepads = {};
    this.buttonListeners = buttonListeners; // buttonListeners[0]: () => {} // TODO: #11: optional param value?:number for analog button
    this.joystickListeners = joystickListeners; // joystickListeners[0]: (number) => {}

    if (!generatingDocumentation) {
      // tell other peers currently in the room
      this.#sendData(this.localData);

      this.#initializeGamepadSupport();
    }
  }
  // (put private properties AFTER the constructor so documentation generates properly)
  #sendData = () => {}; // for room
  #getData = () => {}; // for room

  join(/* https://github.com/dmotz/trystero#api joinRoom */) {
    if (this.debug) console.log("join");
    this.room = joinRoom(...arguments);
    const [sendData, getData] = this.room.makeAction("data");
    this.#sendData = sendData;
    this.#getData = getData;

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
    this.#getData((data, peerId) => {
      if (this.debugMore) {
        console.log(
          `-----|\n\this.localData BEFORE:\n${JSON.stringify(this.localData)}`
        );
        console.log("#getData data peerId", JSON.stringify(data), peerId);
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

      this.localData.players[peerId].playerId = maxPlayerId + 1;
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
      this.updateUi();
    });
  }

  #initializeGamepadSupport() {
    const isGamePadApiSupported = "getGamepads" in navigator;
    if (isGamePadApiSupported) {
      window.addEventListener("gamepadconnected", (event) => {
        if (this.debug) console.log("gamepad connected:", event.gamepad);
        setTimeout(() => {
          this.updateUi();
        }, 100);
      });
      window.addEventListener("gamepaddisconnected", (event) => {
        if (this.debug) console.log("gamepad disconnected:", event.gamepad);
        setTimeout(() => {
          this.updateUi();
        }, 100);
      });

      this.#pollGamepads((gamepads) => {
        if (gamepads && gamepads.length) {
          // assuming only 1 gamepad:
          this.#mapGamepadToActions(gamepads[0], {
            buttonListeners: this.buttonListeners,
            joystickListeners: this.joystickListeners,
          });
        }
      });
    }
  }

  #pollGamepads(processGamePads = () => {}) {
    this.gamepads = navigator.getGamepads();
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
  #mapGamepadToActions(
    gamepad,
    { buttonListeners = [], joystickListeners = [] }
  ) {
    if (!gamepad) return;

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

    const gamepadAxes = gamepad.axes;
    if (gamepadAxes && gamepadAxes.length) {
      for (let i = 0; i < gamepadAxes.length; i++) {
        const gamepadAxis = gamepadAxes[i];
        const joystickListener = joystickListeners[i];
        joystickListener?.(gamepadAxis);
      }
    }
  }
}
