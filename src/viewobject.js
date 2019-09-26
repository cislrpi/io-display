
/**
 * Class representing the ViewObject
 * @class ViewObject
 */
class ViewObject {
  constructor(io, options) {
      this.io = io
      this.view_id = options.view_id
      this.displayName = options.displayName
      this.windowName = options.windowName
      this.displayContext = options.displayContext
  }

  _postRequest(data) {
      return this.io.mq.call('rpc-display-' + this.displayName, JSON.stringify(data)).then(msg => JSON.parse(msg.content.toString()))
  }

  /**
   * Sets the url of the view object
   * @param {String} url
   * @returns {display_rpc_result}
   */
  setUrl(url) {
      let cmd = {
          command: 'set-url',
          options: {
              view_id: this.view_id,
              url: url
          }
      }
      return this._postRequest(cmd)
  }

  /**
   * gets the current url of the view object
   * @returns {Promise}
   */
  getUrl() {
      let cmd = {
          command: 'get-url',
          options: {
              view_id: this.view_id
          }
      }
      return this._postRequest(cmd)
  }

  /**
   * sets the css style string
   * @param {String} css_string
   * @returns {display_rpc_result}
   */
  setCSSStyle(css_string) {
      let cmd = {
          command: 'set-webview-css-style',
          options: {
              view_id: this.view_id,
              cssText: css_string
          }
      }
      return this._postRequest(cmd)
  }

  /**
   * enables device emulation
   * @param {Object} options http://electron.atom.io/docs/api/web-contents/#contentsenabledeviceemulationparameters
   * @returns {display_rpc_result}
  */
  enableDeviceEmulation(options) {
      let cmd = {
          command: 'enable-device-emulation',
          options: {
              view_id: this.view_id,
              parameters: options
          }
      }
      return this._postRequest(cmd)
  }

  /**
   * disables device emulation
   * @returns {display_rpc_result}
   */
  disableDeviceEmulation() {
      let cmd = {
          command: 'disable-device-emulation',
          options: {
              view_id: this.view_id
          }
      }
      return this._postRequest(cmd)
  }

  /**
   * reloads the view object
   * @returns {display_rpc_result}
   */
  reload() {
      let cmd = {
          command: 'reload',
          options: {
              view_id: this.view_id
          }
      }
      return this._postRequest(cmd)
  }

  /**
   * hides the view object
   * @returns {display_rpc_result}
   */
  hide() {
      let cmd = {
          command: 'hide',
          options: {
              view_id: this.view_id
          }
      }
      return this._postRequest(cmd)
  }

  /**
   * shows the view object
   * @returns {display_rpc_result}
   */
  show() {
      let cmd = {
          command: 'show',
          options: {
              view_id: this.view_id
          }
      }
      return this._postRequest(cmd)
  }

  /**
   * closes the view object
   * @returns {display_rpc_result}
   */
  close() {
      let cmd = {
          command: 'close',
          options: {
              view_id: this.view_id
          }
      }
      return this._postRequest(cmd)
  }

  /**
   * setBounds the view object
   * @param {Object} options
   * @returns {display_rpc_result}
   */
  setBounds(options) {
      // if(options.scaleContent){
      //     let w = parseFloat(options.width)
      //     let h = parseFloat(options.height)
      //     let dia = Math.sqrt( Math.pow(w,2) + Math.pow(h,2) )
      //     options.scale = dia * 1.0 /this.o_diagonal
      // }
      options.view_id = this.view_id
      let cmd = {
          command: 'set-bounds',
          options: options
      }
      return this._postRequest(cmd)
  }

  /**
   * gets the bounds of the view object
   * @returns {display_rpc_result}
   */
  getBounds() {
      let cmd = {
          command: 'get-bounds',
          options: {
              view_id: this.view_id
          }
      }
      return this._postRequest(cmd)
  }

  /**
   * navigates back if available
   * @returns {display_rpc_result}
   */
  goBack() {
      let cmd = {
          command: 'back',
          options: {
              view_id: this.view_id
          }
      }
      return this._postRequest(cmd)
  }

  /**
   * navigates forward if available
   * @returns {display_rpc_result}
   */
  goForward() {
      let cmd = {
          command: 'forward',
          options: {
              view_id: this.view_id
          }
      }
      return this._postRequest(cmd)
  }

  /**
    * opens debug console
    * @returns {display_rpc_result}
    */
  openDevTools() {
      let cmd = {
          command: 'view-object-dev-tools',
          options: {
              view_id: this.view_id,
              devTools: true
          }
      }
      return this._postRequest(cmd)
  }

  /**
   * closes debug console
   * @returns {display_rpc_result}
   */
  closeDevTools() {
      let cmd = {
          command: 'view-object-dev-tools',
          options: {
              view_id: this.view_id,
              devTools: false
          }
      }
      return this._postRequest(cmd)
  }

  /**
   * sets audio muted
   * @param {boolean} mute
   * @returns {display_rpc_result}
   */
  setAudioMuted(mute) {
      let cmd = {
          command: 'set-audio-muted',
          options: {
              view_id: this.view_id,
              audio: mute
          }
      }
      return this._postRequest(cmd)
  }

  /**
    * gets if audio muted
    * @returns {display_rpc_result}
    */
  isAudioMuted() {
      let cmd = {
          command: 'get-audio-muted',
          options: {
              view_id: this.view_id
          }
      }
      return this._postRequest(cmd)
  }

  /**
   * Plays video if the source url is video file
   * @returns {display_rpc_result}
   */
  playVideo() {
      let cmd = {
          command: 'play-video',
          options: {
              view_id: this.view_id
          }
      }
      return this._postRequest(cmd)
  }

  /**
   * Pauses video if the source url is video file
   * @returns {display_rpc_result}
   */
  pauseVideo() {
      let cmd = {
          command: 'pause-video',
          options: {
              view_id: this.view_id
          }
      }
      return this._postRequest(cmd)
  }

  /**
   * Sets the current time in seconds of the video if the source url is video file
   * @param {int} time
   * @returns {display_rpc_result}
   */
  setCurrentVideoTime(time) {
      let cmd = {
          command: 'set-current-video-time',
          options: {
              view_id: this.view_id,
              time: time
          }
      }
      return this._postRequest(cmd)
  }

  // getCurrentVideoTime() {
  //     let cmd = {
  //         command: 'get-current-video-time',
  //         options: {
  //             view_id: this.view_id
  //         }
  //     }
  //     return this._postRequest(cmd)
  // }

  /**
  * replays video if the source url is video file
  * @returns {display_rpc_result}
  */
  replayVideo() {
      let cmd = {
          command: 'replay-video',
          options: {
              view_id: this.view_id
          }
      }
      return this._postRequest(cmd)
  }

  _on(topic, handler) {
      this.io.mq.onTopic(topic, (msg, headers) => {
          let m = JSON.parse(msg.toString())
          if (handler != null && m.details.view_id == this.view_id) {
              handler(m, headers)
          }
      })
  }

  /**
  * viewObject hidden event
  * @param {viewObjectBasicEventCallback} handler
  */
  onHidden(handler) {
      this._on(`display.${this.displayContext}.viewObjectHidden.${this.view_id}`, handler)
  }

  /**
    * viewObject became visible event
    * @param {viewObjectBasicEventCallback} handler
    */
  onShown(handler) {
      this._on(`display.${this.displayContext}.viewObjectShown.${this.view_id}`, handler)
  }

  /**
  * viewObject closed event
  * @param {viewObjectBasicEventCallback} handler
  */
  onClosed(handler) {
      this._on(`display.${this.displayContext}.viewObjectClosed.${this.view_id}`, handler)
  }

  /**
    * viewObject bounds changed event
    * @param {viewObjectBoundsEventCallback} handler
    */
  onBoundsChanged(handler) {
      this._on(`display.${this.displayContext}.viewObjectBoundsChanged.${this.view_id}`, handler)
  }

  /**
  * viewObject URL changed event
  * @param {viewObjectURLEventCallback} handler
  */
  onUrlChanged(handler) {
      this._on(`display.${this.displayContext}.viewObjectUrlChanged.${this.view_id}`, handler)
  }

  /**
   * viewObject URL reloaded event
   * @param {viewObjectURLEventCallback} handler
   */
  onUrlReloaded(handler) {
      this._on(`display.${this.displayContext}.viewObjectUrlChanged.${this.view_id}`, handler)
  }

  /**
   * viewObject crashed event
   * @param {viewObjectBasicEventCallback} handler
   */
  onCrashed(handler) {
      this._on(`display.${this.displayContext}.viewObjectCrashed.${this.view_id}`, handler)
  }

  /**
   * viewObject GPU crashed event
   * @param {viewObjectBasicEventCallback} handler
   */
  onGPUCrashed(handler) {
      this._on(`display.${this.displayContext}.viewObjectGPUCrashed.${this.view_id}`, handler)
  }

  /**
  * viewObject plugin crashed event
  * @param {viewObjectBasicEventCallback} handler
  */
  onPluginCrashed(handler) {
      this._on(`display.${this.name}.viewObjectPluginCrashed.${this.view_id}`, handler)
  }
}

module.exports = ViewObject