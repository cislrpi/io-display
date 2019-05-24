const DisplayContextFactory = require('./displaycontextfactory');

class DisplayWorker {
  constructor(io) {
    this.io = io;
    this.displayContextFactory = new DisplayContextFactory(io);
    this.displayContext;
    this.uniformGridCellSize;
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
      this.uniformGridCellSize = uniformGridCellSize;
      this.displayContext = displayContext;
      return new Promise((resolve, _) => {
        resolve({displayContext: displayContext, uniformGridCellSize: uniformGridCellSize});
      });
    });
  }

  displayUrl(url, options) {
    options = Object.assign(
      {
        position: {
          'grid-left': 1,
          'grid-top': 1
        },
        nodeintegration: false,
        uiDraggable: true,
        uiClosable: true
      },
      options
    );

    options.url = url;

    options.width = (options.widthFactor * this.uniformGridCellSize.width) + 'px';
    options.height = (options.heightFactor * this.uniformGridCellSize.height) + 'px';
    this.displayContext.createViewObject(options, 'main').then(m => {
      console.log(m);
    });
  }
}

module.exports = {
  variable: 'display',
  Class: DisplayWorker
};
