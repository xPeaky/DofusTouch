var connectionManager = require('dofusProxy/connectionManager.js');

// TrustStatusMessage
connectionManager.on('TrustStatusMessage', function (msg) {
	connectionManager.sendMessage('CharactersListRequestMessage');
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-secure.js
 ** module id = 148
 ** module chunks = 0
 **/