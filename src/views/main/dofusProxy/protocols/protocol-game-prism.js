var connectionManager = require('dofusProxy/connectionManager.js');


connectionManager.on('PrismFightDefenderAddMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('PrismFightDefenderLeaveMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/*
 the code using this message is commented in Ankama's code
 */
// PrismFightDefendersSwapMessage

connectionManager.on('PrismFightAttackerAddMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('PrismFightAttackerRemoveMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('PrismsListMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('PrismsListUpdateMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// PrismInfoCloseMessage

connectionManager.on('PrismsInfoValidMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('PrismFightAddedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('PrismFightRemovedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// PrismInfoInValidMessage

connectionManager.on('PrismFightStateUpdateMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('PrismSettingsErrorMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-prism.js
 ** module id = 138
 ** module chunks = 0
 **/