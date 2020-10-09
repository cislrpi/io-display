import cislio from '@cisl/io';
import { Io } from '@cisl/io/io';
import { DisplayContextFactory } from './display-context-factory';
import { DisplayContext } from './display-context';
import { UniformGridCellSize } from './display-window';
import { ViewObject } from './view-object';

declare module '@cisl/io/io' {
  interface Io {
    display: DisplayWorker;
  }
}

interface ContentGrid {
  row: number;
  col: number;
  padding?: number;
}

interface DisplayUrlOptions {
  url: string;
  position?: {
    gridLeft: number;
    gridTop: number;
  };
  nodeIntegration: boolean;
  width?: number | string;
  height?: number | string;
  widthFactor?: number;
  heightFactor?: number;
}

export class DisplayWorker {
  io: Io;
  displayContextFactory: DisplayContextFactory;
  displayContext?: DisplayContext;
  uniformGridCellSize?: UniformGridCellSize;

  constructor(io: Io) {
    this.io = io;
    this.displayContextFactory = new DisplayContextFactory(io);
    this.displayContext;
    this.uniformGridCellSize;
  }

  async openDisplayWorker(name: string, display: string, contentGrid: ContentGrid): Promise<{displayContext: DisplayContext; uniformGridCellSize: UniformGridCellSize}> {
    const windows = await this.displayContextFactory.getDisplays();
    let bounds = windows.get(name);
    if (bounds === undefined) {
      bounds = {};
    }
    bounds.contentGrid = contentGrid;
    bounds.displayName = name;
    this.displayContext = await this.displayContextFactory.create(display, {main: bounds});
    const displayWindow = this.displayContext.getDisplayWindowSync(name);
    await displayWindow.clearContents();
    const uniformGridCellSize = await displayWindow.getUniformGridCellSize();
    this.uniformGridCellSize = uniformGridCellSize;
    return {displayContext: this.displayContext, uniformGridCellSize: uniformGridCellSize};
  }

  async displayUrl(url: string, options: DisplayUrlOptions): Promise<ViewObject> {
    options = Object.assign(
      {
        position: {
          gridLeft: 1,
          gridTop: 1
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
    return await this.displayContext.createViewObject(options, 'main');
  }
}

export function registerDisplayWorker(io: Io): void {
  if (!io.rabbit || !io.redis) {
    throw new Error('Requires both redis and rabbitmq');
  }
  io.display = new DisplayWorker(io);
}

console.log('what');
cislio.registerPlugins(registerDisplayWorker);
