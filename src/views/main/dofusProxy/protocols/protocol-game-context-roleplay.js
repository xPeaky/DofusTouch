/**
 * @module protocol/contextRoleplay
 */
var connectionManager = require('dofusProxy/connectionManager.js');
var audioManager      = require('audioManager');

var currentMapId = null;

connectionManager.on('disconnect', function () {
	currentMapId = null;
});

/**
 * @event module:protocol/contextRoleplay.client_CurrentMapMessage
 * @desc  server send the map id where user is now.
 *
 * @param {object} msg - msg
 * @param {number} msg.mapId - map id
 */
connectionManager.on('CurrentMapMessage', function (msg) {
	connectionManager.sendMessage('MapInformationsRequestMessage', { mapId: msg.mapId });
	if (msg.mapId === currentMapId) { return; }
	window.foreground.lock('loadMap');
	window.gui.transmitMessage(msg);
	audioManager.release();
});


/**
 * @event module:protocol/contextRoleplay.client_TeleportOnSameMapMessage
 *
 * @param {object} msg - msg
 * @param {number} msg.targetId - id of actor being teleported
 * @param {number} msg.cellId   - position where actor is teleported
 */
connectionManager.on('TeleportOnSameMapMessage', function (msg) {
	window.actorManager.setActorsDisposition([{ id: msg.targetId, cellId: msg.cellId }]);
});


/**
 * @event module:protocol/contextRoleplay.client_MapFightCountMessage
 */
connectionManager.on('MapFightCountMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


/**
 * @event module:protocol/contextRoleplay.client_MapRunningFightListMessage
 */
connectionManager.on('MapRunningFightListMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


/**
 * @event module:protocol/contextRoleplay.client_MapRunningFightDetailsMessage
 */
connectionManager.on('MapRunningFightDetailsMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


/**
 * @event module:protocol/contextRoleplay.client_MapObstacleUpdateMessage
 *
 * @param {object} msg - msg
 * @param {Object[]} msg.obstacles                   - obstacles list
 * @param {number}   msg.obstacles[*].obstacleCellId - position of obstacle
 * @param {number}   msg.obstacles[*].state          - state (1: OPENED, 2: CLOSED)
 */
connectionManager.on('MapObstacleUpdateMessage', function (msg) {
	window.isoEngine.updateObstacles(msg.obstacles);
});


/**
 * Preload map assets when user change map.
 * @param {Object} msg - msg object received
 */
function mapComplementaryInformationsData(msg) {
	window.gui.transmitMessage(msg);
	if (currentMapId === msg.mapId) {
		window.isoEngine.reloadMap(msg);
	} else {
		connectionManager.lockMessages();
		window.isoEngine.loadMap(msg);
	}
	currentMapId = msg.mapId;
}


/**
 * @event module:protocol/contextRoleplay.client_MapComplementaryInformationsDataMessage
 */
connectionManager.on('MapComplementaryInformationsDataMessage', mapComplementaryInformationsData);


/**
 * @event module:protocol/contextRoleplay.client_MapComplementaryInformationsDataInHouseMessage
 */
connectionManager.on('MapComplementaryInformationsDataInHouseMessage', mapComplementaryInformationsData);


/**
 * @event module:protocol/contextRoleplay.client_MapComplementaryInformationsWithCoordsMessage
 */
connectionManager.on('MapComplementaryInformationsWithCoordsMessage', mapComplementaryInformationsData);


/**
 * @event module:protocol/contextRoleplay.client_GameRolePlayShowActorMessage
 *
 * @param {object} msg - msg
 * @param {Object} msg.informations
 * @param {number} msg.informations.contextualId - actor id
 * @param {Object} msg.informations.look         - look object
 * @param {Object} msg.informations.disposition  - actor disposition
 * @param {number} msg.informations.disposition.cellId    - position
 * @param {number} msg.informations.disposition.direction - direction
 */
connectionManager.on('GameRolePlayShowActorMessage', function (msg) {
	window.actorManager.addActor(msg.informations);
});


/**
 * @event module:protocol/contextRoleplay.client_GameRolePlayShowActorWithEventMessage
 */




/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-context-roleplay.js
 ** module id = 103
 ** module chunks = 0
 **/