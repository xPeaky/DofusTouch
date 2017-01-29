var connectionManager = require('dofusProxy/connectionManager.js');

connectionManager.on('GameRolePlayPlayerLifeStatusMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @event module:protocol/contextRoleplayDeath.client_GameRolePlayGameOverMessage
 */
connectionManager.on('GameRolePlayGameOverMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-context-roleplay-death.js
 ** module id = 104
 ** module chunks = 0
 **/