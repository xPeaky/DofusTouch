/**
 * @module protocol/fightChallenge
 */
var connectionManager = require('dofusProxy/connectionManager.js');

/**
 * @event module:protocol/fightChallenge.client_ChallengeInfoMessage
 * @desc  Information of a challenge in progress (sent to users joining the fight)
 *
 * @param {object} msg - msg
 * @param {number} msg.challengeId - challenge id
 * @param {number} msg.targetId    - id of fighter targeted for this challenge (0 if none)
 * @param {number} msg.xpBonus     - experience bonus.
 * @param {number} msg.dropBonus   - drop bonus
 */
connectionManager.on('ChallengeInfoMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


/**
 * @event module:protocol/fightChallenge.client_ChallengeTargetUpdateMessage
 * @desc  Update of a challenge in progress
 *
 * @param {number} msg.challengeId - challenge id
 * @param {number} msg.targetId    - id of fighter targeted for this challenge (0 if none)
 */
// Challenge's targetId property does not seem to be used anywhere, so implementing this message is not required


/**
 * @event module:protocol/fightChallenge.client_ChallengeResultMessage
 * @desc  Information of a challenge in progress (sent to users joining the fight)
 *
 * @param {object} msg - msg
 * @param {number}  msg.challengeId - challengeId
 * @param {boolean} msg.success     - challenge result (true = success, false = fail)
 */
connectionManager.on('ChallengeResultMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


// ChallengeDungeonStackedBonusMessage




/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-context-fight-challenge.js
 ** module id = 99
 ** module chunks = 0
 **/