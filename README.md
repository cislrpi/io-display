# @cisl/celio-display-worker

Module for `@cisl/celio` that wraps the interface for the display-worker to make it easier to work with.

## Installation
```bash
npm install @cisl/celio-display-worker
```

## Usage
```js
const io = require('@cisl/celio');
let contentGrid = {
  contentGrid: {
    row: 4,
    col: 12,
    padding: 0
  }
}
io.display.openDisplayWorker('main', 'm_and_a', contentGrid).then((displayContext, uniformGridCellSize) => {
    // ...
})
```