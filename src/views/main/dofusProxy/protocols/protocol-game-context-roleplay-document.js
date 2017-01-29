var connectionManager = require('dofusProxy/connectionManager.js');

// DocumentReadingBeginMessage
/**
 * @param {object} msg - msg
 * @param {Array}  msg.documentId
 */
connectionManager.on('DocumentReadingBeginMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-context-roleplay-document.js
 ** module id = 106
 ** module chunks = 0
 **/