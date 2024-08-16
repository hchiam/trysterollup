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
  constructor(updateUi) {
    this.updateUi = updateUi;
    this.localData = { [selfId]: { playerId: 0 } };
    this.debug = true;
    this.debugMore = false;

    // tell other peers currently in the room
    sendData(this.localData);

    this.#initializeDataEventListeners();
  }

  startGame() {
    this.#update(this.localData);
    return this;
  }

  play() {
    this.#update(this.localData);
  }

  updatePosition(xDelta = 0, yDelta = 0) {
    const { x, y } = this.localData[selfId];
    this.localData[selfId].x =
      x === undefined ? xDelta : Number(x) + Number(xDelta);
    this.localData[selfId].y =
      y === undefined ? yDelta : Number(y) + Number(yDelta);
    this.#update(this.localData);
  }

  #update() {
    this.updateUi();
    sendData(this.localData);
  }

  #initializeDataEventListeners() {
    // tell newcomers
    room.onPeerJoin((peerId) => {
      if (!(peerId in this.localData)) this.localData[peerId] = { playerId: 0 };
      if (
        !isNaN(this.localData[peerId].playerId) &&
        this.localData[peerId].playerId === 0
      ) {
        const maxPlayerId = Math.max(
          ...Object.values(this.localData).map((x) =>
            isNaN(x.playerId) ? 0 : Number(x.playerId)
          )
        );
        this.localData[peerId].playerId = Math.max(
          maxPlayerId + 1,
          Object.keys(this.localData).length
        );
        sendData(this.localData, peerId);
      }
      if (this.debug) console.log("onPeerJoin", peerId);
      this.updateUi();
    });

    // listen for peers sending data
    getData((data, peerId) => {
      if (this.debugMore) {
        console.log(
          `_______|\n\ngetData this.localData:\n${JSON.stringify(
            this.localData
          )}`
        );
        console.log("getData data", JSON.stringify(data));
      }
      Object.entries(data).forEach((x) => {
        this.localData[x[0]] = x[1];
      });
      const before = JSON.stringify(this.localData);
      let needToSendData = false;
      if (!(peerId in this.localData)) this.localData[peerId] = { playerId: 0 };
      if (
        !isNaN(this.localData[peerId].playerId) &&
        this.localData[peerId].playerId === 0
      ) {
        const maxPlayerId = Math.max(
          ...Object.values(this.localData).map((x) =>
            isNaN(x.playerId) ? 0 : Number(x.playerId)
          )
        );
        this.localData[peerId].playerId = Math.max(
          maxPlayerId + 1,
          Object.keys(this.localData).length
        );
        needToSendData = true;
      }
      if (before !== JSON.stringify(this.localData)) {
        needToSendData = true;
      }
      if (needToSendData) sendData(this.localData);
      if (this.debugMore) {
        console.log(
          `getData this.localData AFTER:\n${JSON.stringify(
            this.localData
          )}\n\n|_______`
        );
      }
      this.updateUi();
    });

    // listen for peers leaving
    room.onPeerLeave((peerId) => {
      delete this.localData[peerId];
      if (this.debug) console.log("onPeerLeave", peerId);
      this.updateUi();
    });
  }
}
