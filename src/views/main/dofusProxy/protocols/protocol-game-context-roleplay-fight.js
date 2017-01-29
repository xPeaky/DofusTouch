/**
 * @module protocol/contextRoleplayFight
 */

var connectionManager = require('dofusProxy/connectionManager.js');


// GameRolePlayFightRequestCanceledMessage
// This message is received when a player challenges a dead player, which does nothing


/**
 * @event module:protocol/contextRoleplayFight.client_GameRolePlayAggressionMessage
 *
 * @param {object} msg - msg
 * @param {number} msg.attackerId - id of attacking character
 * @param {number} msg.defenderId - id of attacked character
 */
connectionManager.on('GameRolePlayAggressionMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @event module:protocol/contextRoleplayFight.client_GameRolePlayPlayerFightFriendlyRequestedMessage
 *
 * @param {object} msg - msg
 * @param {number} msg.fightId  - fight id
 * @param {number} msg.sourceId - id of player who ask for fight
 * @param {number} msg.targetId - id of player who fight is requested
 */
connectionManager.on('GameRolePlayPlayerFightFriendlyRequestedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


/**
 * @event module:protocol/contextRoleplayFight.client_GameRolePlayPlayerFightFriendlyAnsweredMessage
 *
 * @param {object} msg - msg
 * @param {number} msg.fightId  - fight id
 * @param {number} msg.sourceId - id of player who ask for fight
 * @param {number} msg.targetId - id of player who fight is requested
 * @param {number} msg.accept   - whether the fight was accepted or refused
 */
connectionManager.on('GameRolePlayPlayerFightFriendlyAnsweredMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @event module:protocol/contextRoleplayFight.client_GameRolePlayShowChallengeMessage
 *
 * @param {object} msg - msg
 * @param {number}   msg.commonsInfos.fightId             - fight id
 * @param {number}   msg.commonsInfos.fightType           - fight type (see FightTypeEnum)
 * @param {Object[]} msg.commonsInfos.fightTeams          - teams informations
 * @param {Object[]} msg.commonsInfos.fightTeamsOptions   - teams options informations
 * @param {number[]} msg.commonsInfos.fightTeamsPositions - cell id where challenge models are displayed
 *
 * @param {number}   msg.commonsInfos.fightTeams[*].teamId      - team id
 * @param {number}   msg.commonsInfos.fightTeams[*].leaderId    - team leader id
 * @param {number}   msg.commonsInfos.fightTeams[*].teamSide    - team alignement
 * @param {number}   msg.commonsInfos.fightTeams[*].teamTypeId  - team type
 * @param {Object[]} msg.commonsInfos.fightTeams[*].teamMembers - team members
 *
 * @param {boolean}  msg.commonsInfos.fightTeamsOptions[*].isSecret
 * @param {boolean}  msg.commonsInfos.fightTeamsOptions[*].isRestrictedToPartyOnly
 * @param {boolean}  msg.commonsInfos.fightTeamsOptions[*].isClosed
 * @param {boolean}  msg.commonsInfos.fightTeamsOptions[*].isAskingForHelp
 */
connectionManager.on('GameRolePlayShowChallengeMessage', function (msg) {
	window.isoEngine.showChallenge(msg.commonsInfos);
});

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @event module:protocol/contextRoleplayFight.client_GameRolePlayRemoveChallengeMessage */
connectionManager.on('GameRolePlayRemoveChallengeMessage', function (msg) {
	window.gui.transmitMessage(msg);
	window.isoEngine.removeChallenge(msg.fightId);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-context-roleplay-fight.js
 ** module id = 108
 ** module chunks = 0
 **/