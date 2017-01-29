var connectionManager = require('dofusProxy/connectionManager.js');

// ContactLookMessage
connectionManager.on('ContactLookMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// ContactLookErrorMessage



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-social.js
 ** module id = 143
 ** module chunks = 0
 **/