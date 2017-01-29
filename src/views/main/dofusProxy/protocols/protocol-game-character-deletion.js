var connectionManager = require('dofusProxy/connectionManager.js');

connectionManager.on('CharacterDeletionErrorMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-character-deletion.js
 ** module id = 77
 ** module chunks = 0
 **/