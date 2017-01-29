var connectionManager = require('dofusProxy/connectionManager.js');

connectionManager.on('ClientUIOpenedMessage', function (msg) {
	window.gui.emit('ClientUIOpened', msg);
});

connectionManager.on('ClientUIOpenedByObjectMessage', function (msg) {
	window.gui.emit('ClientUIOpened', msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-ui.js
 ** module id = 146
 ** module chunks = 0
 **/