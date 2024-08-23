/** see trystero capabilities in the documentation:
 * https://github.com/dmotz/trystero
 * https://oxism.com/trystero
 */

import {
  selfId,
  joinRoom,
} from "https://cdn.skypack.dev/pin/trystero@v0.18.0-r4w3880OHw2o0euVPNYJ/mode=imports,min/optimized/trystero/nostr.js";

// .../?room=someNumberOrId
export const roomId =
  "room" + (new URLSearchParams(window.location.search).get("room") || 42);

const room = joinRoom(
  { appId: "hchiam-trysterollup-demo" },
  roomId,
  "silly_pwd"
);

room.onPeerJoin((userId) => {
  console.log("userId", userId);
});
room.onPeerLeave((userId) => {
  console.log("userId", userId);
});

const [sendDataOut, getData] = room.makeAction("data");

export function sendData(data) {
  // use this to debug whether data is bouncing back and forth unnecessarily
  console.log("data", data);
  sendDataOut(data);
}

export class GameController {
  constructor({ updateUi, generatingDocumentation = false }) {
    const someFunction = function () {};

    this.updateUi = updateUi || someFunction;
    this.localData = { [selfId]: { playerId: 0 } };
    this.debug = true;
    this.debugMore = false;

    if (!generatingDocumentation) {
      // tell other peers currently in the room
      sendData(this.localData);

      this.#initializeDataEventListeners();
    }
  }

  startGame() {
    this.update();
    return this;
  }

  update(dataOverride = null) {
    if (dataOverride) this.localData = dataOverride;
    this.updateUi();
    sendData(this.localData);
    return this;
  }

  updatePosition(xDelta = 0, yDelta = 0, peerId = selfId) {
    const { x, y } = this.localData[peerId];

    this.localData[peerId].x =
      x === undefined ? xDelta : Number(x) + Number(xDelta);
    this.localData[peerId].y =
      y === undefined ? yDelta : Number(y) + Number(yDelta);

    this.update();

    return this;
  }

  #initializeDataEventListeners() {
    this.#signalNewcomers();
    this.#listenForPeersSendingData();
    this.#listenForPeersLeaving();
  }

  #signalNewcomers() {
    room.onPeerJoin((peerId) => {
      this.#syncPlayerIdOfIncomingPeer(peerId);

      if (this.debug) console.log("onPeerJoin", peerId);

      this.updateUi();
    });
  }

  #listenForPeersSendingData() {
    getData((data, peerId) => {
      if (this.debugMore) {
        console.log(
          `-----|\n\this.localData BEFORE:\n${JSON.stringify(this.localData)}`
        );
        console.log("getData data peerId", JSON.stringify(data), peerId);
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
    const dataBefore = JSON.stringify(this.localData);

    if (!(peerId in this.localData)) this.localData[peerId] = { playerId: 0 };

    const mustGiveThemANewPlayerId =
      !isNaN(this.localData[peerId].playerId) &&
      this.localData[peerId].playerId === 0;

    if (mustGiveThemANewPlayerId) {
      const maxPlayerId = Math.max(
        ...Object.values(this.localData).map((x) =>
          isNaN(x.playerId) ? 0 : Number(x.playerId)
        )
      );

      this.localData[peerId].playerId = Math.max(
        maxPlayerId + 1,
        Object.keys(this.localData).length
      );
    }

    let needToSendData =
      mustGiveThemANewPlayerId || dataBefore !== JSON.stringify(this.localData);

    if (needToSendData) sendData(this.localData);
  }

  #listenForPeersLeaving() {
    room.onPeerLeave((peerId) => {
      delete this.localData[peerId];
      if (this.debug) console.log("onPeerLeave", peerId);
      this.updateUi();
    });
  }
}
