import { DisplayContext } from './display-context';
import { Io } from '@cisl/io/io';
import { Response } from '@cisl/io/rabbitmq';

import { Bounds } from './types';

interface BoundsResponse {
  displayName: string;
  bounds: Bounds;
}

/**
 * @typedef {Object} focus_window
 * @property {string} status success or rejects with an Error message
 * @property {string} windowName Window Name, when status is success
 * @property {string} command The command name
 * @property {string} displayName Display Name
 * @property {string} displayContext DisplayContext Name
 * @example
 * { "command" : "get-focus-window",
 *   "status" : "success",
 *   "windowName" : "winA",
 *   "displayName" : "main",
 *   "displayContext" : "creative"
 *  }
 */

/**
 * @typedef {Object} window_settings
 * @property {string} displayName Display Name
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {object} contentGrid
 * @property {number} contentGrid.row
 * @property {number} contentGrid.col
 * @property {number} contentGrid.padding
 * @property {Object.<String,String>} gridBackground. key is "row|col" and value is a valid html color string
 * @property {String} fontSize
 */

/**
 * Callback for handling viewObjects event subscriptions.
 * @callback viewObjectBasicEventCallback
 * @param {Object} message - The message content parsed into a javascript object.
 * @param {String} message.type - event type
 * @param {String} message.displayContext - The display context name
 * @param {Object} message.details - The message details.
 * @param {String} message.details.view_id - view object id
 */

/**
 * Callback for handling viewObjects URL event subscriptions.
 * @callback viewObjectURLEventCallback
 * @param {Object} message - The message content parsed into a javascript object.
 * @param {String} message.type - event type
 * @param {String} message.displayContext - The display context name
 * @param {Object} message.details - The message details.
 * @param {String} message.details.view_id - view object id
 * @param {String} message.details.url - view object url
 */

/**
 * Callback for handling viewObject created event subscriptions.
 * @callback viewObjectCreatedEventCallback
 * @param {Object} message - The message content parsed into a javascript object.
 * @param {String} message.type - event type
 * @param {String} message.displayContext - The display context name
 * @param {Object} message.details - The message details.
 */

/**
 * Callback for handling viewObject Bounds change event subscriptions.
 * @callback viewObjectBoundsEventCallback
 * @param {Object} message - The message content parsed into a javascript object.
 * @param {String} message.type - event type
 * @param {String} message.displayContext - The display context name
 * @param {Object} message.details - The message details.
 * @param {String} message.details.view_id - view object id
 * @param {Number} message.details.top - Top position in pixel.
 * @param {Number} message.details.left - Left position in pixel.
 * @param {Number} message.details.width - Width in pixel.
 * @param {Number} message.details.height - Height position in pixel.
 */

/**
 * Callback for handling displayContextClosed event subscriptions.
 * @callback displayContextClosedEventCallback
 * @param {Object} message - The message content parsed into a javascript object.
 * @param {String} message.type - event type
 * @param {String} message.displayContext - The display context name
 * @param {Object} message.details - The message details.
 * @param {String} message.details.view_id - view object id
 * @param {Number} message.details.top - Top position in pixel.
 * @param {Number} message.details.left - Left position in pixel.
 * @param {Number} message.details.width - Width in pixel.
 * @param {Number} message.details.height - Height position in pixel.
 */

/**
 * Callback for handling display worker add/remove event subscriptions.
 * Display worker added event
 * @callback displayEventCallback
 * @param {String} displayName
 */

/**
 * Class representing the DisplayContextFactory object.
 */
export class DisplayContextFactory {
  private io: Io;

  /**
   * Use {@link CELIO#displayContext} instead.
   */
  constructor(io: Io) {
    if (!io.rabbit) {
      throw new Error('could not find RabbitMQ instance');
    }
    this.io = io;
  }

  /**
  * gets the Display Workers details running in the environment.
  * @returns {Promise} A ES2015 Map object with displayNames as keys and bounds as values.
  */
  async getDisplays(): Promise<Map<string, Bounds>> {
    const queues = await this.io.rabbit!.getQueues();
    const availableDisplayNames: Array<string> = [];
    queues.forEach(queue => {
      if ((queue.state === 'running' || queue.state === 'live') && queue.name.indexOf('rpc-display-') > -1) {
        availableDisplayNames.push(queue.name);
      }
    });
    // get existing context state from display workers
    const cmd = {
      command: 'get-display-bounds'
    };
    const _ps: Array<any> = [];
    availableDisplayNames.forEach(dm => {
      _ps.push(this.io.rabbit!.publishRpc(dm, cmd).then(response => {
        return response.content;
      }));
    });
    const bounds = (await Promise.all(_ps) as BoundsResponse[]);
    const boundMap = new Map();
    for (const bound of bounds) {
      boundMap.set(bound.displayName, bound.bounds);
    }
    return boundMap;
  }

  /**
  * list display contexts live in the environment.
  * @returns {Promise} An array of String containing display context names.
  */
  list() {
    return this.io.rabbit!.getQueues().then(qs => {
      const availableDisplayNames: Array<string> = [];
      qs.forEach(queue => {
        if ((queue.state === 'running' || queue.state === 'live') && queue.name.indexOf('rpc-display-') > -1) {
          availableDisplayNames.push(queue.name);
        }
      });
      // get existing context state from display workers
      const cmd = {
        command: 'get-context-list'
      };
      const _ps: any[] = [];
      availableDisplayNames.forEach(dm => {
        _ps.push(this.io.rabbit!.publishRpc(dm, cmd).then(response => {
          return response.content;
        }));
      });
      return Promise.all(_ps);
    }).then(lists => {
      let contextList = [];
      for (let x = 0; x < lists.length; x++) {
        contextList = contextList.concat(lists[x]);
      }
      return [...new Set(contextList)];
    });
  }

  /**
  * gets the activelist display contexts.
  * @returns {Promise} An array of String containing display context names.
  */
  async getActive(): Promise<DisplayContext> {
    const m = await this.io.store.get('display:activeDisplayContext');
    if (m) {
      const _dc = new DisplayContext(this.io, m, {});
      await _dc.restoreFromDisplayWorkerStates();
      return _dc;
    }
    else {
      throw new Error('No display context is active');
    }
  }

  /**
  * sets a display context active. Making a display context active ensures only windows of the display context are visible. Windows from other display contexts are hidden.
  * @param display_ctx_name - display context name.
  * @param reset=false if the viewObjects of the displayContext need to be reloaded.
  * @returns return false if the display context name is already active.
  */
  async setActive(display_ctx_name: string, reset = false): Promise<string | boolean> {
    // since setState first gets old value and sets the new value at the sametime,
    // calling this function within multiple display workers ensures this function is executed only once.
    const name = await this.io.store.getset('display:activeDisplayContext', display_ctx_name);
    if (name !== display_ctx_name) {
      const m = await (new DisplayContext(this.io, display_ctx_name, {})).restoreFromDisplayWorkerStates(reset);
      this.io.mq.publishTopic('display.displayContext.changed', {
        'type': 'displayContextChanged',
        'details': {
          'displayContext': display_ctx_name,
          'lastDisplayContext': name
        }
      });
      return m;
    }
    else {
      // return false when the context is already active
      return false;
    }
  }

  /**
  * Creates a display context. If the display context already exists, it is made active and a DisplayContext Object is restored from store.
  * @param {string} display_ctx_name - display context name.
  * @param {Object.<String, window_settings>} [window_settings={}] Key is window name and value is an object
  * @returns {Promise<Object>} A DisplayContext Object is returned.
  * @example
{
  'windowA': {
      'displayName': 'main',
      'x': 0,
      'y': 0,
      'width': 500,
      'height': 500,
      'contentGrid': {
          'row': 2,
          'col': 2,
          'padding': 5
      },
      'fontSize': '50px'
  },
  'windowB': {
      'displayName': 'main',
      'x': 505,
      'y': 0,
      'width': 500,
      'height': 500,
      'contentGrid': {
          'row': 2,
          'col': 2,
          'padding': 5
      }
  },
  'windowC': {
      'displayName': 'main',
      'x': 1010,
      'y': 0,
      'width': 500,
      'height': 500,
      'contentGrid': {
          'row': 2,
          'col': 2,
          'padding': 5
      },
      'gridBackground' : {
          '1|1' : 'white',
          '1|2' : 'grey',
          '2|1' : 'grey',
          '2|2' : 'white'
      }
  }
}
  */
  async create(display_ctx_name: string, window_settings = {}): Promise<DisplayContext> {
    const _dc = new DisplayContext(this.io, display_ctx_name, window_settings);
    await _dc.restoreFromDisplayWorkerStates();
    this.io.rabbit.publishTopic('display.displayContext.created', {
      type: 'displayContextCreated',
      details: {
        displayContext: display_ctx_name
      }
    });
    return _dc;
  }

  /**
  * hides all display contexts. If the display context already exists, it is made active and a DisplayContext Object is restored from store.
  * @returns {Promise<Object>} A array of JSON object containing status of hide function execution at all display workers.
  */
  async hideAll() {
    const cmd = {
      command: 'hide-all-windows'
    };
    const displays = await this.getDisplays();
    const _ps = [];
    for (const [k] of displays) {
      _ps.push(this.io.rabbit!.publishRpc('rpc-display-' + k, cmd).then(m => m.content));
    }
    const m = await Promise.all(_ps);
    this.io.store.del('display:activeDisplayContext');
    return m;
  }

  /**
   * gets the details of the focused window from a display.
   * @param {string} [displayName=main] - Display Name.
   * @returns {Promise.<focus_window>} - A JSON object with window details.
   */
  getFocusedWindow(displayName = 'main') {
    const cmd = {
      command: 'get-focus-window'
    };
    return this.io.rabbit!.publishRpc('rpc-display-' + displayName, cmd).then(m => m.content);
  }

  /**
   * gets the details of the focused window from all displays.
   * @returns {Promise.<Array.<focus_window>>} - An array of JSON object with window details.
   */
  getFocusedWindows() {
    const cmd = {
      command: 'get-focus-window'
    };
    return this.getDisplays().then(m => {
      const _ps = [];
      for (const [k] of m) {
        _ps.push(this.io.rabbit!.publishRpc('rpc-display-' + k, cmd).then(m => m.content));
      }
      return Promise.all(_ps);
    });
  }

  _on(topic: string, handler: (content: Buffer | string | number | object, response: Response) => void): void {
    this.io.rabbit!.onTopic(topic, (response) => {
      if (handler != null) {
        handler(response.content, response);
      }
    });
  }

  /**
   * viewObject created event
   * @param {viewObjectCreatedEventCallback} handler
   */
  onViewObjectCreated(handler) {
    this._on(`display.*.viewObjectCreated.*`, handler);
  }

  /**
   * viewObject hidden event
   * @param {viewObjectBasicEventCallback} handler
   */
  onViewObjectHidden(handler) {
    this._on(`display.*.viewObjectHidden.*`, handler);
  }

  /**
   * viewObject became visible event
   * @param {viewObjectBasicEventCallback} handler
   */
  onViewObjectShown(handler) {
    this._on(`display.*.viewObjectShown.*`, handler);
  }

  /**
   * viewObject closed event
   * @param {viewObjectBasicEventCallback} handler
   */
  onViewObjectClosed(handler) {
    this._on(`display.*.viewObjectClosed.*`, handler);
  }

  /**
   * viewObject bounds changed event
   * @param {viewObjectBoundsEventCallback} handler
   */
  onViewObjectBoundsChanged(handler) {
    this._on(`display.*.viewObjectBoundsChanged.*`, handler);
  }

  /**
   * viewObject URL changed event
   * @param {viewObjectURLEventCallback} handler
   */
  onViewObjectUrlChanged(handler) {
    this._on(`display.*.viewObjectUrlChanged.*`, handler);
  }

  /**
   * viewObject URL reloaded event
   * @param {viewObjectURLEventCallback} handler
   */
  onViewObjectUrlReloaded(handler) {
    this._on(`display.*.viewObjectUrlChanged.*`, handler);
  }

  /**
   * viewObject crashed event
   * @param {viewObjectBasicEventCallback} handler
   */
  onViewObjectCrashed(handler) {
    this._on(`display.*.viewObjectCrashed.*`, handler);
  }

  /**
   * viewObject GPU crashed event
   * @param {viewObjectBasicEventCallback} handler
   */
  onViewObjectGPUCrashed(handler) {
    this._on(`display.*.viewObjectGPUCrashed.*`, handler);
  }

  /**
   * viewObject plugin crashed event
   * @param {viewObjectBasicEventCallback} handler
   */
  onViewObjectPluginCrashed(handler) {
    this._on(`display.*.viewObjectPluginCrashed.*`, handler);
  }

  /**
   * DisplayContext created event
   * @param {displayContextCreatedEventCallback} handler
   */
  onDisplayContextCreated(handler) {
    this._on('display.displayContext.created', handler);
  }

  /**
   * DisplayContext changed event
   * @param {displayContextChangedEventCallback} handler
   */
  onDisplayContextChanged(handler) {
    this._on('display.displayContext.changed', handler);
  }

  /**
   * DisplayContext closed event
   * @param {displayContextClosedEventCallback} handler
   */
  onDisplayContextClosed(handler) {
    this._on('display.displayContext.closed', handler);
  }

  /**
   * Display worker removed event. Use <displayContextInstance>.onDisplayWorkerQuit instead if you want to listen to displayworker unexpected quit event.
   * @param {displayEventCallback} handler
   */
  onDisplayWorkerRemoved(handler) {
    this._on('display.removed', handler);
  }

  /**
   * Display worker added event
   * @param {displayEventCallback} handler
   */
  onDisplayWorkerAdded(handler) {
    this._on('display.added', handler);
  }
}
