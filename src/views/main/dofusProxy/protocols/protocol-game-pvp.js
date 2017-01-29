var connectionManager = require('dofusProxy/connectionManager.js');

/**
 * @event module:protocol/pvp.client_UpdateMapPlayersAgressableStatusMessage
 *
 * @param {object} msg - msg
 * @param {Array} msg.playerIds - list of ids of players that need to have their status updated
 * @param {Array} msg.enable    - status for every player of the list of ids
 */
connectionManager.on('UpdateMapPlayersAgressableStatusMessage', function (msg) {
	window.gui.transmitMessage(msg);
	window.actorManager.updateActorsAggressableStatus(msg.playerIds, msg.enable);
});

connectionManager.on('UpdateSelfAgressableStatusMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('AlignmentRankUpdateMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-pvp.js
 ** module id = 139
 ** module chunks = 0
 **/