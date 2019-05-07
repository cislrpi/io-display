const DisplayWindow = require('./displaywindow');
const ViewObject = require('./viewobject');
const _ = require('lodash');

/**
 * @typedef {Promise.<Object>} display_rpc_result
 * @property {String} status success or rejects with an Error message
 * @property {String} command The command name
 * @property {String} displayName Display Name
 * @property {String} displayContext DisplayContext Name
 */

/**
 * Callback for handling displayContextClosed event subscriptions.
 * @callback displayWorkerQuitHandler
 * @param {Object} message - The message content parsed into a javascript object.
 * @param {String} message.closedDisplay - displayName
 * @param {Array} message.closedWindows - List of window names
 * @param {Array} message.closedViewObjects - List of viewObject ids
 */

/**
 * @typedef {Object} viewobject_options
 * @property {String} url - url starting with http:// or https://; or local file on display-worker starting with file://<absolute path>
 * @property {String} left - left position in pixels or em
 * @property {String} top -  top position in pixels or em
 * @property {String} width - width in pixels or em
 * @property {String} height -  height in pixels or em
 * @property {boolean} uiDraggable - sets if the viewObject is draggable using a pointing device
 * @property {boolean} uiClosable - sets if the viewObject is closable using a pointing device
 * @property {Object} [position] - Specifies position in grid mode. ignores left and top if specified
 * @property {Number} [position.grid-left] - column position
 * @property {Number} [position.grid-top] - row position
 * @property {Object} [slide] - Specifies sliding content in grid mode. Requires position object
 * @property {String} [direction] - values : 'left', 'right', 'down', 'up'
 * @property {boolean} [nodeIntegration] - specifies if the guest page needs to use Electron resources
 * @property {Object} [deviceEmulation] - Specifies device emulation parameters. ( For all parameter options refer http://electron.atom.io/docs/api/web-contents/#contentsenabledeviceemulationparameters)
 * @property {Number} deviceEmulation.scale - Scale of emulated view inside available space (not in fit to view mode) (default: 1)
 * @property {Object} deviceEmulation.offset - Offset of the emulated view inside available space (not in fit to view mode) (default: {x: 0, y: 0})
 * @property {Number} deviceEmulation.offset.x - Set the x axis offset from top left corner
 * @property {Number} deviceEmulation.offset.y - Set the y axis offset from top left corner
 * @property {boolean} deviceEmulation.fitToView -  Whether emulated view should be scaled down if necessary to fit into available space (default: false)
 * @property {Object} [videoOptions] - Specifies video options for url specified with local file:/// and extension .mp4.
 * @property {String} [videoOptions.group] - Specify group name of video view objects that should maintain synchronicity
 * @property {String} [videoOptions.groupSize] - Specify the number of video view objects that should maintain synchronicity
 * @property {boolean} [videoOptions.controls] - Specify video UI controls be present. (default: true)
 * @property {boolean} [videoOptions.content] - Specify content should play (true) or paused (false) (default: true)
 * @property {boolean} [videoOptions.muted] - Specify whether sound is muted or not (default: false)
 * @property {Number} [videoOptions.currentTime] - Specify the video play position in seconds(default 0.0)
 * @property {Number} [videoOptions.volume] - Specify the current volume from (0.0 - muted) to (1.0 - full volume) (default: 1.0)
 * @property {Number} [videoOptions.preload] - Specify the current video preload ('auto' | 'metadata' | 'none') (default: 'auto')
*/

/**
 * Class representing the DisplayContext object.
 */
class DisplayContext {
  /**
  * Creates an instance of DisplayContext.
  * @param {String} name Display context name
  * @param {Object.<String, window_settings>} window_settings - a collection of named window settings
  * @param {Object} io CELIO object instance
  */
  constructor(name, window_settings, io) {
    this.io = io;
    this.name = name;
    this.displayWindows = new Map();
    this.viewObjects = new Map();
    if (!_.isEmpty(window_settings)) {
      this.window_settings = window_settings;
      for (let k of Object.keys(this.window_settings)) {
        this.window_settings[k].windowName = k;
        if (this.window_settings[k].displayName) {
          this.window_settings[k].displayName = k;
        }
      }
    }

    this.io.mq.onTopic('display.removed', m => {
      let closedDisplay = m.toString();
      this._clean(closedDisplay);
    });

    this.io.mq.onQueueDeleted((queue, headers) => {
      if (queue.name.indexOf('rpc-display-') > -1) {
        let closedDisplay = queue.name.replace('rpc-display-', '');
        this._clean(closedDisplay);
      }
    });
  }

  _clean(closedDisplay) {
    let closedWindows = [];
    for (let [k, v] of this.displayWindows) {
      if (v.displayName === closedDisplay) {
        closedWindows.push(k);
      }
    }
    closedWindows.forEach(w => this.displayWindows.delete(w));
    let vboToRemove = [];
    for (let [k, v] of this.viewObjects) {
      if (v.displayName === closedDisplay) {
        vboToRemove.push(k);
      }
    }
    vboToRemove.forEach(v => this.viewObjects.delete(v));

    if (this.displayWorkerQuitHandler) {
      let obj = {
        closedDisplay: closedDisplay,
        closedWindows: closedWindows,
        closedViewObjects: vboToRemove
      };
      this.displayWorkerQuitHandler(obj);
    }
  }

  _on(topic, handler) {
    this.io.mq.onTopic(topic, (msg, headers) => {
      if (handler != null) {
        handler(JSON.parse(msg.toString()), headers);
      }
    });
  }

  _postRequest(displayName, data) {
    return this.io.mq.call('rpc-display-' + displayName, JSON.stringify(data)).then(msg => {
      return JSON.parse(msg.content.toString());
    });
  }

  restoreFromDisplayWorkerStates(reset = false) {
    // check for available display workers
    let cmd = {
      command: 'get-dw-context-windows-vbo',
      options: {
        context: this.name
      }
    };
    return this._executeInAvailableDisplays(cmd).then(states => {
      // restoring display context from display workers
      this.displayWindows.clear();
      this.viewObjects.clear();
      let windowCount = 0;
      states.forEach(state => {
        if (state.windows) {
          for (let k of Object.keys(state.windows)) {
            let opts = state.windows[k];
            windowCount++;
            this.displayWindows.set(k, new DisplayWindow(this.io, opts));
          }
        }
        if (state.viewObjects) {
          for (let k of Object.keys(state.viewObjects)) {
            let wn = this.displayWindows.get(state.viewObjects[k]);
            if (wn) {
              let opts = {
                'view_id': k,
                'displayName': wn.displayName,
                'displayContext': this.name,
                'windowName': wn.windowName
              };
              this.viewObjects.set(k, new ViewObject(this.io, opts));
            }
          }
        }
      });
      if (windowCount === 0) {
        // initialize display context from options
        return this.getWindowBounds().then(bounds => {
          return this.initialize(bounds);
        });
      }
      else if (reset) {
        // making it active and reloading
        return this.show().then(m => {
          return this.reloadAll();
        }).then(m => {
          return m;
        });
      }
      else {
        // making it active and not reloading
        return this.show();
      }
    });
  }

  _executeInAvailableDisplays(cmd) {
    return this.io.mq.getQueues().then(qs => {
      let availableDisplayNames = [];
      qs.forEach(queue => {
        if ((queue.state === 'running' || queue.state === 'live') && queue.name.indexOf('rpc-display-') > -1) {
          availableDisplayNames.push(queue.name);
        }
      });

      let _ps = [];
      availableDisplayNames.forEach(dm => {
        _ps.push(this.io.mq.call(dm, JSON.stringify(cmd)).then(msg => {
          return JSON.parse(msg.content.toString());
        }));
      });
      if (_ps.length > 0) {
        return Promise.all(_ps);
      }
      else {
        return new Promise((resolve, reject) => {
          reject(new Error(`No display-worker found while executing: ${JSON.stringify(cmd)}`));
        });
      }
    });
  }

  /**
   * gets a map of windowName with bounds
   * @returns {Promise.<Object>} A map of windowNames with bounds
   */
  getWindowBounds() {
    if (this.window_settings && !_.isEmpty(this.window_settings)) {
      return Promise.resolve(this.window_settings);
    }
    else {
      // get existing context state from display workers
      let cmd = {
        command: 'get-window-bounds',
        options: {
          context: this.name
        }
      };
      return this._executeInAvailableDisplays(cmd).then(bounds => {
        let boundMap = {};
        for (let x = 0; x < bounds.length; x++) {
          for (let k of Object.keys(bounds[x])) {
            boundMap[k] = bounds[x][k];
          }
        }
        this.window_settings = boundMap;
        return Promise.resolve(boundMap);
      });
    }
  }

  /**
   * gets a window object by window name
   * @param {any} windowName
   * @returns {DisplayWindow} returns an instance of DisplayWindow
   */
  getDisplayWindowSync(windowName) {
    return this.displayWindows.get(windowName);
  }

  /**
   * gets all window names
   * @returns {Array.<String>} An array of window names
   */
  getDisplayWindowNamesSync() {
    return this.displayWindows.keys();
  }

  /**
   * Shows all windows of a display context
   * @returns {display_rpc_result} returns a status object
   */
  show() {
    let cmd = {
      command: 'set-display-context',
      options: {
        context: this.name
      }
    };
    return this._executeInAvailableDisplays(cmd).then(m => {
      this.io.store.setState('display:activeDisplayContext', this.name);
      return m;
    });
  }

  /**
   * hides all windows of a display context
   * @returns {display_rpc_result} returns a status object
   */
  hide() {
    let cmd = {
      command: 'hide-display-context',
      options: {
        context: this.name
      }
    };
    return this._executeInAvailableDisplays(cmd);
  }

  /**
  * closes all windows of a display context
  * @returns {display_rpc_result} returns a status object
  */
  close() {
    let cmd = {
      command: 'close-display-context',
      options: {
        context: this.name
      }
    };
    return this._executeInAvailableDisplays(cmd).then(m => {
      let map = [];
      let isHidden = false;
      for (let i = 0; i < m.length; i++) {
        let res = m[i];
        if (res.command === 'hide-display-context') {
          isHidden = true;
        }
        map.push(res);
      }
      if (!isHidden) {
        this.displayWindows.clear();
        this.viewObjects.clear();
        this.io.store.getState('display:activeDisplayContext').then(x => {
          if (x === this.name) {
            // clearing up active display context in store
            this.io.store.del('display:activeDisplayContext');
          }
        });
        this.io.mq.publishTopic('display.displayContext.closed', JSON.stringify({
          'type': 'displayContextClosed',
          'details': map
        }));
      }
      return map;
    });
  }

  /**
  * reloads all viewObjects of a display context
  * @returns {display_rpc_result} returns a status object
  */
  reloadAll() {
    let _ps = [];
    for (let [k, v] of this.viewObjects) {
      _ps.push(v.reload());
    }

    return Promise.all(_ps);
  }

  initialize(options) {
    if (_.isEmpty(options)) {
      return new Promise((resolve, reject) => {
        reject(new Error('Cannot initialize display context without proper window_settings.'));
      });
    }
    else {
      return this.show().then(() => {
        let _ps = [];
        // creating displaywindows
        for (let k of Object.keys(options)) {
          options[k].template = 'index.html';
          let cmd = {
            command: 'create-window',
            options: options[k]
          };
          _ps.push(this._postRequest(options[k].displayName, cmd));
        }
        return Promise.all(_ps);
      }).then(m => {
        let map = {};
        for (let i = 0; i < m.length; i++) {
          let res = m[i];
          map[res.windowName] = res;
          this.displayWindows.set(res.windowName, new DisplayWindow(this.io, res));
        }
        return map;
      });
    }
  }

  /**
  * gets a viewObject by id
  * @param {String} id - an uuid of the viewobject
  * @returns {ViewObject} returns the ViewObject instance
  */
  getViewObjectByIdSync(id) {
    return this.viewObjects.get(id);
  }

  /**
    * gets all viewObjects
    * @returns {Map.<String, ViewObject>} returns the collection of ViewObject instances
    */
  getViewObjectsSync() {
    return this.viewObjects;
  }

  /**
   * Captures screenshot of display windows
   * @returns {Map.<Buffer>} returns a map of screenshot image buffer with windowNames as key and image Buffer as value
   */
  captureDisplayWindows() {
    let _ps = [];
    let _dispNames = [];
    for (let [k, v] of this.displayWindows) {
      _ps.push(v.capture());
      _dispNames.push(k);
    }
    return Promise.all(_ps).then(m => {
      let resMap = new Map();
      for (let i = 0; i < m.length && i < _dispNames.length; i++) {
        resMap.set(_dispNames[i], m[i]);
      }
      return resMap;
    });
  }

  /**
   * Creates a view object
   * @param {viewobject_options} options - view object options
   * @param {String} [windowName='main'] - window name
   * @returns {ViewObject} returns the ViewObject instance
   */
  createViewObject(options, windowName = 'main') {
    options.displayContext = this.name;
    if (this.displayWindows.has(windowName)) {
      return this.displayWindows.get(windowName).createViewObject(options).then(vo => {
        this.viewObjects.set(vo.view_id, vo);
        let map = {};
        for (let [k, v] of this.viewObjects) {
          map[k] = v.windowName;
        }
        return vo;
      });
    }
    else {
      return this.getWindowBounds().then(bounds => {
        let windowNameCheck = false;
        for (let k of Object.keys(bounds)) {
          if (bounds[k].displayName === undefined) {
            bounds[k].displayName = k;
          }
          if (windowName === k) {
            windowNameCheck = true;
          }
          bounds[k].windowName = k;
          bounds[k].template = 'index.html';
          bounds[k].displayContext = this.name;
        }
        return new Promise((resolve, reject) => {
          if (windowNameCheck) {
            this.initialize(bounds);
          }
          else {
            reject(new Error(`windowName ${windowName} is not defined by the user. Inferencing based on existing display-workers also failed.`));
          }
        });
      }).then(m => {
        return this.createViewObject(options, windowName);
      });
    }
  }

  /**
   * DisplayContext closed event
   * @param {displayContextClosedEventCallback} handler - event handler
   */
  onClosed(handler) {
    this.io.mq.onTopic('display.displayContext.closed', (msg, headers) => {
      if (handler != null) {
        let m = JSON.parse(msg.toString());
        if (m.details.closedDisplayContext === this.name) {
          handler(m, headers);
        }
      }
    });
  }

  /**
   * DisplayContext changed event
   * @param {displayContextChangedEventCallback} handler - event handler
   */
  onActivated(handler) {
    this.io.mq.onTopic('display.displayContext.changed', (msg, headers) => {
      if (handler != null) {
        let m = JSON.parse(msg.toString());
        if (m.details.displayContext === this.name) {
          handler(m, headers);
        }
      }
    });
  }

  /**
   * DisplayContext changed event
   * @param {displayContextChangedEventCallback} handler - event handler
   */
  onDeactivated(handler) {
    this.io.mq.onTopic('display.displayContext.changed', (msg, headers) => {
      if (handler != null) {
        let m = JSON.parse(msg.toString());
        if (m.details.lastDisplayContext === this.name) {
          handler(m, headers);
        }
      }
    });
  }

  /**
   * DisplayWorkerQuit Event
   * @param {displayWorkerQuitHandler} handler
   */
  onDisplayWorkerQuit(handler) {
    this.displayWorkerQuitHandler = handler;
  }
}

module.exports = DisplayContext;
