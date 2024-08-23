# GameController Documentation:

(Generated from generateDocumentation.js to clipboard.)

## Methods:

```js
constructor({
    updateUi, // callback function
    buttonListeners = [], // array of functions
    joystickListeners = [], // array of functions that take in a number
    generatingDocumentation = false,
  })
```

```js
startGame()
```

```js
update(dataOverride = null)
```

```js
updatePosition(xDelta = 0, yDelta = 0, peerId = selfId)
```

## Properties:

`updateUi`: function

`localData`: object

`debug`: boolean

`debugMore`: boolean

`gamepads`: object

`buttonListeners`: object

`joystickListeners`: object
