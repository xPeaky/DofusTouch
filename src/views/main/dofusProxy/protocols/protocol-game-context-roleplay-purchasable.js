var connectionManager = require('dofusProxy/connectionManager.js');


// PurchasableDialogMessage
connectionManager.on('PurchasableDialogMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-context-roleplay-purchasable.js
 ** module id = 118
 ** module chunks = 0
 **/