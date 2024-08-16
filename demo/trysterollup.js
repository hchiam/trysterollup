/** see trystero capabilities in the documentation:
 * https://github.com/dmotz/trystero
 * https://oxism.com/trystero
 */

import {
  selfId as si,
  joinRoom as jr,
} from "https://cdn.skypack.dev/pin/trystero@v0.18.0-r4w3880OHw2o0euVPNYJ/mode=imports,min/optimized/trystero/nostr.js";

export const selfId = si;

export const joinRoom = jr;

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

    // tell other peers currently in the room
    sendData(this.localData);

    this.#initializeDataEventListeners();
  }

  startGame() {
    this.localData._board = get2dArray(10, 10, "x");
    this.#update(this.localData);
  }

  play() {
    this.localData._board[0][0] = "o";
    this.#update(this.localData);
  }

  updatePosition(peerId, xDelta = 0, yDelta = 0) {
    const { x, y } = this.localData[peerId];
    this.localData[peerId].x =
      x === undefined ? xDelta : Number(x) + Number(xDelta);
    this.localData[peerId].y =
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
      console.log("onPeerJoin", peerId);
      this.updateUi();
    });

    // listen for peers sending data
    getData((data, peerId) => {
      // console.log("_______|\n\n", "getData this.localData", JSON.stringify(this.localData));
      // console.log("getData data", JSON.stringify(data));
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
      // console.log(
      //   `getData this.localData AFTER:\n${JSON.stringify(this.localData)}\n\n|_______`
      // );
      this.updateUi();
    });

    // listen for peers leaving
    room.onPeerLeave((peerId) => {
      delete this.localData[peerId];
      console.log("onPeerLeave", peerId);
      this.updateUi();
    });
  }
}

function get2dArray(rows, cols, val = "") {
  return new Array(rows).fill(null).map(() =>
    new Array(cols).fill(null).map(() => {
      return val;
    })
  );
}
