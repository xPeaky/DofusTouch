var connectionManager = require('dofusProxy/connectionManager.js');


connectionManager.on('GameRolePlayArenaRegistrationStatusMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('GameRolePlayArenaFightPropositionMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('GameRolePlayArenaFighterStatusMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('GameRolePlayArenaUpdatePlayerInfosMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-context-roleplay-fight-arena.js
 ** module id = 109
 ** module chunks = 0
 **/