/**
 * @module protocol/contextFightCharacter
 */

var connectionManager = require('dofusProxy/connectionManager.js');

/**
 * @event module:protocol/contextFightCharacter.client_GameFightShowFighterMessage
 *
 * @param {object} msg - msg
 * @param {GameFightCharacterInformations} msg.informations
 * @param {number} msg.informations.contextualId - actor id
 * @param {Object} msg.informations.alive        - is fighter alive
 * @param {Object} msg.informations.look         - look
 * @param {Object} msg.informations.disposition  - disposition
 */
connectionManager.on('GameFightShowFighterMessage', function (msg) {
	window.gui.transmitMessage(msg);

	// don't show dead fighters
	if (!msg.informations.alive) { return; }
	window.actorManager.addActor(msg.informations);
});

/**
 * @event module:protocol/contextFightCharacter.client_GameFightRefreshFighterMessage
 *
 * @param {object} msg - msg
 * @param {GameContextActorInformations} msg.informations
 * @param {Object} msg.informations.contextualId
 * @param {Object} msg.informations.look
 * @param {Object} msg.informations.disposition
 */
connectionManager.on('GameFightRefreshFighterMessage', function (msg) {
	window.gui.transmitMessage(msg);
	window.actorManager.refreshFighter(msg);
});

/**
 * @event module:protocol/contextFightCharacter.client_GameFightShowFighterRandomStaticPoseMessage
 *
 * @param {object} msg - msg
 * @param {GameFightCharacterInformations} msg.informations
 * @param {number} msg.informations.contextualId - actor id
 * @param {Object} msg.informations.look         - look
 * @param {Object} msg.informations.disposition  - disposition
 */
connectionManager.on('GameFightShowFighterRandomStaticPoseMessage', function (msg) {
	window.gui.transmitMessage(msg);
	window.actorManager.addActor(msg.informations);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-context-fight-character.js
 ** module id = 100
 ** module chunks = 0
 **/