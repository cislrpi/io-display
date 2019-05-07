const DisplayContextFactory = require('./displaycontextfactory');

class DisplayWorker {
  constructor(io) {
    this.io = io;
    this.displayContextFactory = new DisplayContextFactory(io);
  }

  openDisplayWorker(name, display, contentGrid) {
    return this.displayContextFactory.getDisplays().then(windows => {
      let bounds = windows.get(name);
      if (bounds === undefined) {
        bounds = {};
      }
      bounds.contentGrid = contentGrid;
      bounds.displayName = name;
      return this.displayContextFactory.create(display, {main: bounds });
    }).then(async (displayContext) => {
      let displayWindow = displayContext.getDisplayWindowSync(name);
      await displayWindow.clearContents();
      let uniformGridCellSize = await displayWindow.getUniformGridCellSize();
      return new Promise((resolve, _) => {
        resolve({displayContext: displayContext, uniformGridCellSize: uniformGridCellSize});
      });
    });
  }
}

module.exports = {
  variable: 'display',
  Class: DisplayWorker
};
