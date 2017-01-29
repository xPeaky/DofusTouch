var connectionManager = require('dofusProxy/connectionManager.js');

// AcquaintanceSearchErrorMessage
connectionManager.on('AcquaintanceSearchErrorMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// AcquaintanceServerListMessage



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-connection-search.js
 ** module id = 63
 ** module chunks = 0
 **/