# GameController Documentation

(Generated from generateDocumentation.js to clipboard.)

## Methods

```js
constructor({
    updateUi, // callback function
    keydownListeners = {}, // key:left/right/up/down for keyboard
    buttonListeners = {}, // object key:number of functions for game pad buttons
    joystickListeners = {}, // object key:number of functions that take in a number
    generatingDocumentation = false,
    manuallyMapGamepadToActions = true,
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
isManuallyRemappingButtons()
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

`listenersToRemap`: object
