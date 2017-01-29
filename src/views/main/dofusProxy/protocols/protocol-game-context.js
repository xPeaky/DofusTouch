/**
 * @module protocol/context
 */

var connectionManager = require('dofusProxy/connectionManager.js');
var audioManager      = require('audioManager');
var CellInfo          = require('CellInfo');
var transformStates   = require('transformStates');

/**
 * @event module:protocol/context.client_GameContextCreateMessage
 * @param {object} msg         - msg
 * @param {number} msg.context - context id
 */
connectionManager.on('GameContextCreateMessage', function (msg) {
	window.gui.transmitMessage(msg);
	window.isoEngine.changeGameContext(msg.context);
	audioManager.changeGameContext(msg.context);
});

/**
 * @event module:protocol/context.client_GameContextCreateErrorMessage
 * @desc TODO: OK to ignore ?
 */

/**
 * @event module:protocol/context.client_GameContextDestroyMessage
 */
connectionManager.on('GameContextDestroyMessage', function (msg) {
	window.isoEngine.transmitMessage(msg);
	window.actorManager.resetActors();
	window.gui.transmitMessage(msg);
});

/**
 * @event module:protocol/context.client_GameContextRemoveElementMessage
 * @param {object} msg    - msg
 * @param {number} msg.id - actor id
 */
connectionManager.on('GameContextRemoveElementMessage', function (msg) {
	window.actorManager.removeActor(msg.id);
});

/**
 * @event module:protocol/context.client_GameContextRemoveMultipleElementsMessage
 *
 * @param {object} msg      - msg
 * @param {number[]} msg.id - actor ids
 */
connectionManager.on('GameContextRemoveMultipleElementsMessage', function (msg) {
	window.actorManager.removeActors(msg.id);
});

/**
 * @event module:protocol/context.client_GameContextRemoveElementWithEventMessage
 *
 * @param {object} msg    - msg
 * @param {number} msg.id - actor id
 * @param {number} msg.elementEventId
 */
connectionManager.on('GameContextRemoveElementWithEventMessage', function (msg) {
	// TODO: transmit elementEventId
	window.actorManager.removeActor(msg.id);
});

/**
 * @event module:protocol/context.client_GameContextRemoveMultipleElementsWithEventsMessage
 *
 * @param {object} msg      - msg
 * @param {number[]} msg.id - actor id
 * @param {number[]} msg.elementEventId
 */
connectionManager.on('GameContextRemoveMultipleElementsWithEventsMessage', function (msg) {
	// TODO: transmit list of elementEventId
	window.actorManager.removeActors(msg.id);
});

/**
 * @event module:protocol/context.client_GameContextMoveElementMessage
 */

/**
 * @event module:protocol/context.client_GameContextMoveMultipleElementsMessage
 */

/**
 * @event module:protocol/context.client_GameContextRefreshEntityLookMessage
 *
 * @param {object} msg      - msg
 * @param {number} msg.id   - actor id
 * @param {Object} msg.look - new entity look
 */
connectionManager.on('GameContextRefreshEntityLookMessage', function (msg) {
	window.actorManager.setActorLook(msg.id, msg.look);
	window.gui.transmitMessage(msg);
});

/**
 * @event module:protocol/context.client_GameMapNoMovementMessage
 */
connectionManager.on('GameMapNoMovementMessage', function () {
	window.isoEngine.noMovement();
});

/**
 * @event module:protocol/context.client_GameMapMovementMessage
 */
connectionManager.on('GameMapMovementMessage', function (msg) {
	window.actorManager.actorMovement(msg);
});

/**
 * @event module:protocol/context.client_GameMapMovementMessage
 *
 * @param {object} msg                       - msg
 * @param {number} msg.orientation           - actor orientation
 * @param {number} msg.orientation.id        - actor id
 * @param {number} msg.orientation.direction - direction
 */
connectionManager.on('GameMapChangeOrientationMessage', function (msg) {
	window.actorManager.setActorsDisposition([msg.orientation]);
});

/**
 * @event module:protocol/context.client_GameMapChangeOrientationsMessage
 *
 * @param {object} msg                           - msg
 * @param {number} msg.orientations              - actors orientations
 * @param {number} msg.orientations[*].id        - actor id
 * @param {number} msg.orientations[*].direction - direction
 */
connectionManager.on('GameMapChangeOrientationsMessage', function (msg) {
	window.actorManager.setActorsDisposition(msg.orientations);
});

/**
 * @event module:protocol/context.client_GameEntityDispositionMessage
 *
 * @param {object} msg                       - msg
 * @param {number} msg.disposition           - actor dispositions
 * @param {number} msg.disposition.id        - actor id
 * @param {number} msg.disposition.cellId    - cell id
 * @param {number} msg.disposition.direction - direction
 */
connectionManager.on('GameEntityDispositionMessage', function (msg) {
	window.actorManager.setActorsDisposition([msg.disposition]);
});

/**
 * @event module:protocol/context.client_GameEntitiesDispositionMessage
 *
 * @param {object} msg                           - msg
 * @param {number} msg.dispositions              - actors dispositions
 * @param {number} msg.dispositions[*].id        - actor id
 * @param {number} msg.dispositions[*].cellId    - cell id
 * @param {number} msg.dispositions[*].direction - direction
 */
connectionManager.on('GameEntitiesDispositionMessage', function (msg) {
	window.actorManager.setActorsDisposition(msg.dispositions, true);
});

/**
 * @event module:protocol/context.client_GameEntityDispositionErrorMessage
 */

/**
 * @event module:protocol/context.client_ShowCellMessage
 *
 * @param {object} msg          - msg
 * @param {number} msg.sourceId - id of the actor that show the cell
 * @param {number} msg.cellId   - cell to be highlighted
 */
connectionManager.on('ShowCellMessage', function (msg) {
	var cellInfos = {};
	var distance = 0;

	cellInfos[msg.cellId] =
		new CellInfo(
			msg.cellId,
			distance,
			transformStates.fullRed
		);

	var cellLayer = window.background.addGridAnimation(cellInfos);

	window.setTimeout(function () {
		window.background.removeGridLayer(cellLayer);
	}, 5000);
});

/**
 * @event module:protocol/context.client_ShowCellSpectatorMessage
 *
 * @param {object} msg            - msg
 * @param {number} msg.sourceId   - id of the actor that show the cell
 * @param {number} msg.cellId     - cell to be highlighted
 * @param {string} msg.playerName - name of player that show the cell
 */
connectionManager.on('ShowCellSpectatorMessage', function (msg) {
	var cellInfos = {};
	var distance = 0;

	for (var i = 0; i < msg.cells.length; i++) {
		var cellId = msg.cells[i];
		cellInfos[cellId] =
			new CellInfo(
				cellId,
				distance,
				transformStates.fullRed
			);
	}

	var cellLayer = window.background.addGridAnimation(cellInfos);

	window.setTimeout(function () {
		window.background.removeGridLayer(cellLayer);
	}, 5000);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-context.js
 ** module id = 83
 ** module chunks = 0
 **/