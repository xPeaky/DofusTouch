/**
 * @module protocol-custom
 * @desc Our own "custom" messages from proxy to client
 */

var connectionManager = require('dofusProxy/connectionManager.js');

/**
 * @event module:protocol/custom.client_ErrorPopupMessage
 * @desc Generic popup handler
 */
connectionManager.on('_ErrorPopupMessage', function (msg) {
	window.gui.openSimplePopup(msg.text, msg.title);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/custom.js
 ** module id = 57
 ** module chunks = 0
 **/