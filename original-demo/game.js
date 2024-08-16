export class GameController {
  constructor(sendData, updateUi) {
    this.updateUi = updateUi;
    this.sendData = sendData;
  }

  #_update(localData) {
    this.updateUi();
    this.sendData(localData);
  }

  startGame(localData) {
    localData._board = get2dArray(10, 10, "x");
    this.#_update(localData);
  }

  play(localData) {
    localData._board[0][0] = "o";
    this.#_update(localData);
  }

  updatePosition(localData, peerId, xDelta = 0, yDelta = 0) {
    const { x, y } = localData[peerId];
    localData[peerId].x = x === undefined ? xDelta : Number(x) + Number(xDelta);
    localData[peerId].y = y === undefined ? yDelta : Number(y) + Number(yDelta);
    this.#_update(localData);
  }
}

function get2dArray(rows, cols, val = "") {
  return new Array(rows).fill(null).map(() =>
    new Array(cols).fill(null).map(() => {
      return val;
    })
  );
}
