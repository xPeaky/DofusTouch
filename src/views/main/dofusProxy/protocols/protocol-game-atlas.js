var connectionManager = require('dofusProxy/connectionManager.js');

connectionManager.on('AtlasPointInformationsMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-atlas.js
 ** module id = 73
 ** module chunks = 0
 **/