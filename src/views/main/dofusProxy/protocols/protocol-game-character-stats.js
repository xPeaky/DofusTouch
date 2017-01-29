/**
 * @module protocol/characterStats
 */

var connectionManager = require('dofusProxy/connectionManager.js');


/**
 * @event module:protocol/characterStats.client_CharacterStatsListMessage
 * @param {object} msg - msg
 * @param {Object} msg.stats - user character statistics
 */
connectionManager.on('CharacterStatsListMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


/**
 * @event module:protocol/characterStats.client_FighterStatsListMessage
 */
connectionManager.on('FighterStatsListMessage', function (msg) {
	// this is now rerouted through the fightSequence to avoid a race with stat buffs.
	window.isoEngine.sendToFightSequence(msg);
});

/**
 * @event module:protocol/characterStats.client_CharacterLevelUpMessage
 * @desc  A character (friend, guild or player on the same map) leveled up.
 *
 * @param {object} msg          - msg
 * @param {number} msg.newLevel - new level
 * @param {string} msg.name     - name of character who leveled up
 * @param {number} msg.id       - id of character who leveled up
 */
connectionManager.on('CharacterLevelUpMessage', function (msg) {
	window.gui.transmitMessage(msg);

	// We suppose the message corresponds to the user
	window.isoEngine.playLevelUpAnimation(window.gui.playerData.id);
});

/**
 * @event module:protocol/characterStats.client_CharacterLevelUpInformationMessage
 * @desc  A character (friend, guild or player on the same map) leveled up.
 *
 * @param {object} msg          - msg
 * @param {number} msg.newLevel - new level
 * @param {string} msg.name     - name of character who leveled up
 * @param {number} msg.id       - id of character who leveled up
 */
connectionManager.on('CharacterLevelUpInformationMessage', function (msg) {
	// User level-up animation is already triggered by the 'CharacterLevelUpMessage' message
	// And 'CharacterLevelUpInformationMessage' is not always received when the user levels-up
	var actorId = msg.id;
	if (actorId !== window.gui.playerData.id) {
		window.isoEngine.playLevelUpAnimation(actorId);
	}
});


/**
 * @event module:protocol/characterStats.client_UpdateLifePointsMessage
 * @param {object} msg - msg
 * @param {number} msg.lifePoints
 * @param {number} msg.maxLifePoints
 */
connectionManager.on('UpdateLifePointsMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


/**
 * @event module:protocol/characterStats.client_LifePointsRegenBeginMessage
 *
 * @param {object} msg - msg
 * @param {number} msg.regenRate - duration (in 0.1s) between each earned points (level +5)
 */
connectionManager.on('LifePointsRegenBeginMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


/**
 * @event module:protocol/characterStats.client_LifePointsRegenEndMessage
 * @param {object} msg - msg
 * @param {number} msg.lifePoints
 * @param {number} msg.maxLifePoints
 * @param {number} msg.lifePointsGained
 */
connectionManager.on('LifePointsRegenEndMessage', function (msg) {
	window.gui.transmitMessage(msg);
});




/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-character-stats.js
 ** module id = 79
 ** module chunks = 0
 **/