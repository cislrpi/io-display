const ViewObject = require('./viewobject');
/**
 * Class representing DisplayWindow
 * @class DisplayWindow
 */
class DisplayWindow {
  constructor(io, options) {
    this.io = io;
    this.windowName = options.windowName;
    this.displayName = options.displayName;
    this.displayContext = options.displayContext;
    this.template = 'index.html';
    this.x = options.x;
    this.y = options.y;
    this.width = options.width;
    this.height = options.height;
  }

  _postRequest(data) {
    return this.io.mq.call(
      'rpc-display-' + this.displayName,
      JSON.stringify(data)
    ).then(msg => JSON.parse(msg.content.toString()));
  }

  id() {
    return this.windowName;
  }

  /**
   * Clears grid defined in the display window
   * @returns {display_rpc_result}
   */
  clearGrid() {
    let cmd = {
      command: 'clear-grid',
      options: {
        windowName: this.windowName
      }
    };
    return this._postRequest(cmd);
  }

  /**
   * Clears contents (viewobjects) defined in the display window
   * @returns {display_rpc_result}
   */
  clearContents() {
    let cmd = {
      command: 'clear-contents',
      options: {
        windowName: this.windowName
      }
    };
    return this._postRequest(cmd);
  }

  /*
      args: options (json object)
          - contentGrid (json Object)
              (for uniform grid)
              - row (integer, no of rows)
              - col (integer, no of cols)
              - rowHeight ( float array, height percent for each row - 0.0 to 1.0 )
              - colWidth ( float array,  width percent for each col - 0.0 to 1.0 )
              - padding (float) // in px or em
              (for custom grid)
              - custom ( array of json Object)
                  [{ 'label' : 'cel-id-1',  left, top, width, height}, // in px or em or percent
                  { 'label' : 'cel-id-2',  left, top, width, height},
                  { 'label' : 'cel-id-3',  left, top, width, height},
                  ...
                  ]
          - gridBackground (json Object)
              {
                  'row|col' : 'backgroundColor',
                  'cel-id-1' : 'backgroundColor',
                  'cel-id-2' : 'backgroundColor',
              }
  */

  /**
   * Creates a  simple grid layout in the display window
   * @example <caption> A sample options object </caption>
   * 'contentGrid': {
          'row': 2,
          'col': 2,
          'padding': 5,
          'rowHeight' : [ 0.5, 0.5] // ( float array, height percent for each row - 0.0 to 1.0 )
          'colWidth' : [ 0.4, 0.6] //( float array,  width percent for each col - 0.0 to 1.0 )
      },
      'gridBackground' : {
          '1|1' : 'white',
          '1|2' : 'grey',
          '2|1' : 'grey',
          '2|2' : 'white'
      }
    * @param {Object} options
    * @returns {display_rpc_result}
    */
  createUniformGrid(options) {
    options.windowName = this.windowName;
    let cmd = {
      command: 'create-grid',
      options: options
    };
    return this._postRequest(cmd);
  }

  /**
   * adds a cell to the grid
   * @param {String} label
   * @param {Object.<{left: String, top: String, width : String, height: String}>} bounds
   * @param {String} backgroundStyle
   * @returns {display_rpc_result}
   */
  addToGrid(label, bounds, backgroundStyle) {
    let cmd = {
      command: 'add-to-grid',
      options: {
        windowName: this.windowName,
        label: label,
        bounds: bounds,
        style: backgroundStyle
      }
    };
    return this._postRequest(cmd);
  }

  /**
   * Removes a cell from the grid
   * @param {String} label - cell label
   * @returns {display_rpc_result}
   */
  removeFromGrid(label) {
    let cmd = {
      command: 'remove-from-grid',
      options: {
        windowName: this.windowName,
        label: label
      }
    };
    return this._postRequest(cmd);
  }

  /**
   * get the grid layout object
   * @returns {Object}
   */
  getGrid() {
    let cmd = {
      command: 'get-grid',
      options: {
        windowName: this.windowName
      }
    };
    return this._postRequest(cmd);
  }

  /**
   * gets the cell size of the uniform content grid
   * @returns {{width : Number, height : Number }}
   */
  getUniformGridCellSize() {
    let cmd = {
      command: 'uniform-grid-cell-size',
      options: {
        windowName: this.windowName
      }
    };
    return this._postRequest(cmd);
  }

  /**
   * setting DisplayWindow cssText
   * label is row|col or custom cell name
   * js_css_style : http://www.w3schools.com/jsref/dom_obj_style.asp
   * @param {String} label
   * @param {String} js_css_style - based on  http://www.w3schools.com/jsref/dom_obj_style.asp
   * @param {Object} animation - based on W3 animation API
   * @returns {display_rpc_result}
   */
  setCellStyle(label, js_css_style, animation) {
    let cmd = {
      command: 'cell-style',
      options: {
        windowName: this.windowName,
        label: label,
        style: js_css_style
      }
    };

    if (animation) {
      cmd.options.animation_options = animation;
    }

    return this._postRequest(cmd);
  }

  /**
   * Sets the font size of the display window object
   * @param {String} px_string - font size in pixels
   * @returns {display_rpc_result}
   */
  setFontSize(px_string) {
    let cmd = {
      command: 'set-displaywindow-font-size',
      options: {
        windowName: this.windowName,
        fontSize: px_string
      }
    };
    return this._postRequest(cmd);
  }

  /**
   * Hides the display window
   * @returns {display_rpc_result}
   */
  hide() {
    let cmd = {
      command: 'hide-window',
      options: {
        windowName: this.windowName
      }
    };
    return this._postRequest(cmd);
  }

  /**
   * shows the displayWindow
   * @returns {display_rpc_result}
   * @memberOf DisplayWindow
   */
  show() {
    let cmd = {
      command: 'show-window',
      options: {
        windowName: this.windowName
      }
    };
    return this._postRequest(cmd);
  }

  /**
   * closes the displayWindow and destroys the viewobjects
   * @returns {display_rpc_result}
   */
  close() {
    let cmd = {
      command: 'close-window',
      options: {
        windowName: this.windowName
      }
    };

    return this._postRequest(cmd).then(m => {
      m.viewObjects.forEach((v) => {
        let view = this.getViewObjectById(v);
        if (view) {
          view.destroy();
        }
      });
      this.destroy();
      return m;
    });
  }

  /**
   * opens debug console
   * @returns {display_rpc_result}
   */
  openDevTools() {
    let cmd = {
      command: 'window-dev-tools',
      options: {
        windowName: this.windowName,
        devTools: true
      }
    };
    return this._postRequest(cmd);
  }

  /**
   * closes the debug console
   * @returns {display_rpc_result}
   */
  closeDevTools() {
    let cmd = {
      command: 'window-dev-tools',
      options: {
        windowName: this.windowName,
        devTools: false
      }
    };
    return this._postRequest(cmd);
  }

  /**
   * gets the screenshotof the display window as image buffer
   * @returns {Promise.<Buffer>}
   */
  capture() {
    let cmd = {
      command: 'capture-window',
      options: {
        windowName: this.windowName
      }
    };
    return this.io.mq.call('rpc-display-' + this.displayName, JSON.stringify(cmd)).then(m => m.content);
  }

  /**
  * Creates a view object in the window
  *
  * options:
  *  - url
  *  - position (label or grid-top & grid-left)
  *  - width // in px or em
  *  - height // in px or em
  *  - cssText (string)
  *  - nodeintegration (boolean)
  *
  * @param {Object} options
  * @param {String} options.url
  * @param {Object|String} [options.position]
  * @param {Number} options.position.grid-top
  * @param {Number} options.position.grid-left
  * @param {String} options.width - in pixels or em
  * @param {String} options.height - in pixels or em
  * @param {boolean} options.nodeintegration
  * @param {String} options.cssText
  * @param {boolean} options.uiDraggable
  * @param {boolean} options.uiClosable
  * @param {object} options.deviceEmulation
  * @param {Number} options.deviceEmulation.scale
  * @returns {ViewObject} View object
  */
  createViewObject(options) {
    options.windowName = this.windowName;
    options.displayContext = this.displayContext;
    options.displayName = this.displayName;
    options.windowName = this.windowName;
    let cmd = {
      command: 'create-viewobj',
      options: options
    };

    return this._postRequest(cmd).then(m => {
      return new ViewObject(this.io, m);
    });
  }
}

module.exports = DisplayWindow;
