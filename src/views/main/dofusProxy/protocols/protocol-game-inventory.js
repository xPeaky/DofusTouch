/**
 * @module protocol/inventory
 */

var connectionManager = require('dofusProxy/connectionManager.js');


connectionManager.on('KamasUpdateMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// ObjectAveragePricesMessage
connectionManager.on('ObjectAveragePricesMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-inventory.js
 ** module id = 130
 ** module chunks = 0
 **/