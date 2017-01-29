/**
 * @module protocol/shortcut
 */

var connectionManager = require('dofusProxy/connectionManager.js');


/**
 * @event module:protocol/shortcut.client_ShortcutBarContentMessage
 *
 * @param {object} msg - msg
 * @param {number} msg.barType   - 0: item, 1: spell
 * @param {Array}  msg.shortcuts
 */
connectionManager.on('ShortcutBarContentMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('ShortcutBarAddErrorMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('ShortcutBarRemoveErrorMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('ShortcutBarSwapErrorMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @event module:protocol/shortcut.client_ShortcutBarRefreshMessage
 */
connectionManager.on('ShortcutBarRefreshMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


/**
 * @event module:protocol/shortcut.client_ShortcutBarRemovedMessage
 */
connectionManager.on('ShortcutBarRemovedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-shortcut.js
 ** module id = 142
 ** module chunks = 0
 **/