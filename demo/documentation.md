# GameController Documentation

(Generated from generateDocumentation.js to clipboard.)

## Methods

```js
constructor({
    updateUi, // callback function
    keydownListeners = {}, // key:left/right/up/down for keyboard
    buttonListeners = {}, // object key:number of functions for game pad buttons
    joystickListeners = {}, // object key:number of functions that take in a number
    gamepadConnectedCallback,
    gamepadDisconnectedCallback,
    manuallyMapGamepadToActions = false,
    hold3ButtonsFor3SecondsToRemapButtons = false,
    generatingDocumentation = false,
  })
```

```js
join(/* https://github.com/dmotz/trystero#api joinRoom */)
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

```js
isHolding3ButtonsDown()
```

```js
isManuallyRemappingButtons()
```

```js
manuallyRemapButtons()
```

```js
getCurrentlyOnButtonsPerGamepad()
```

## Properties

`room`: object

`updateUi`: function

`localData`: object

`debug`: boolean

`debugMore`: boolean

`gamepads`: object

`keydownListeners`: object

`buttonListeners`: object

`joystickListeners`: object

`gamepadConnectedCallback`: function

`gamepadDisconnectedCallback`: function

`listenersToRemap`: object
