/**
 * @module protocol/authorized
 * @desc All passed to admin console window
 */

var connectionManager = require('dofusProxy/connectionManager.js');


connectionManager.on('ConsoleMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('ConsoleCommandsListMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-authorized.js
 ** module id = 58
 ** module chunks = 0
 **/