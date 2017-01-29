/**
 * @module protocol/contextFight
 */
var connectionManager  = require('dofusProxy/connectionManager.js');
/**
 * @event module:protocol/contextFight.client_GameFightStartingMessage
 *
 * @param {object} msg - msg
 * @param {number} msg.fightType - one of the following type:
 *
 * FIGHT_TYPE_CHALLENGE     0   Challenge
 * FIGHT_TYPE_AGRESSION     1   Aggression
 * FIGHT_TYPE_PvMA          2   Player vs Monster alignment (village and prism)
 * FIGHT_TYPE_MXvM          3   Player mixed vs Monster
 * FIGHT_TYPE_PvM           4   Player vs Monster
 * FIGHT_TYPE_PvT           5   Player vs Collector
 * FIGHT_TYPE_PvMU          6   Player vs Mutant
 * FIGHT_TYPE_PVP_ARENA     7   PVP Arena
 * FIGHT_TYPE_Koh           8   King of the Hill
 */
connectionManager.on('GameFightStartingMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


/**
 * @event module:protocol/contextFight.client_GameFightJoinMessage
 *
 * @param {object} msg - msg
 * @param {boolean} msg.canBeCancelled
 * @param {boolean} msg.canSayReady
 * @param {boolean} msg.isSpectator
 * @param {boolean} msg.isFightStarted
 * @param {number}  msg.timeMaxBeforeFightStart
 * @param {number}  msg.fightType               - fight type (see GameFightStartingMessage)
 */
connectionManager.on('GameFightJoinMessage', function (msg) {
	window.isoEngine.transmitMessage(msg);
	window.gui.transmitMessage(msg);
});


/**
 * @event module:protocol/contextFight.client_GameFightPlacementPossiblePositionsMessage
 *
 * @param {object} msg - msg
 * @param {number[]}   msg.positionsForChallengers - cell ids
 * @param {number[]}   msg.positionsForDefenders   - cell ids
 * @param {number}     msg.teamNumber              - team number
 */
connectionManager.on('GameFightPlacementPossiblePositionsMessage', function (msg) {
	window.isoEngine.displayFightPositions(msg);
	window.gui.transmitMessage(msg);
});


/**
 * @event module:protocol/contextFight.client_GameFightOptionStateUpdateMessage
 *
 * @param {object} msg - msg
 * @param {number} msg.fightId
 * @param {number} msg.teamId
 * @param {number} msg.option - FightOptionsEnum
 * @param {Boolean} msg.state
 */
connectionManager.on('GameFightOptionStateUpdateMessage', function (msg) {
	window.isoEngine.challengeOptionChange(msg.fightId, msg.teamId, msg.option, msg.state);
	window.gui.transmitMessage(msg);
});



/** @event module:protocol/contextFight.client_GameFightUpdateTeamMessage
 *
 * @param {object} msg - msg
 * @param {number} msg.fightId - fight id on the map
 * @param {Object} msg.team    - FightTeamInformations object
 */
connectionManager.on('GameFightUpdateTeamMessage', function (msg) {
	window.isoEngine.updateFightTeam(msg);
	window.gui.transmitMessage(msg);
});


/**
 * @event module:protocol/contextFight.client_GameFightRemoveTeamMemberMessage
 *
 * @param {object} msg - msg
 * @param {number} msg.fightId - fight number
 * @param {number} msg.teamId  - team number
 * @param {number} msg.charId  - character number
 */
connectionManager.on('GameFightRemoveTeamMemberMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


/**
 * @event module:protocol/contextFight.client_GameFightHumanReadyStateMessage
 */
connectionManager.on('GameFightHumanReadyStateMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


/**
 * @event module:protocol/contextFight.client_GameFightLeaveMessage
 */
connectionManager.on('GameFightLeaveMessage', function (msg) {
	window.isoEngine.transmitMessage(msg);
});


/**
 * @event module:protocol/contextFight.client_GameFightStartMessage
 */
connectionManager.on('GameFightStartMessage', function (msg) {
	// transmit message first to gui, in order to update fightManager's fight state
	// background then rely on fight state to remove cell placement colorations.
	window.gui.transmitMessage(msg);
	window.isoEngine.transmitMessage(msg);
});

function gameFightResuming(msg) {
	window.gui.transmitMessage(msg);
	window.isoEngine.transmitMessage(msg);
}


/**
 * @event module:protocol/contextFight.client_GameFightSpectateMessage
 *
 * @param {object} msg - msg
 * @param {Object[]} msg.effects  - Current effects in the fight
 * @param {Object[]} msg.marks    - Current glyphs/traps in the fight
 * @param {number}   msg.gameTurn - Current round number (starts at 1)
 */
connectionManager.on('GameFightSpectateMessage', gameFightResuming);


/**
 * @event module:protocol/contextFight.client_GameFightResumeMessage
 * @desc Informations on running fight, sent when user reconnect in a fight.
 *
 * @param {object} msg - msg
 * @param {number}   msg.gameTurn       - game turn
 * @param {number}   msg.summonCount    - summon count
 * @param {number}   msg.bombCount      - bomb count
 * @param {object[]} msg.effects        - list of effects
 * @param {object[]} msg.spellCooldowns - list of cooldowns
 * @param {object[]} msg.marks          - list of marks (trap, glyph, wall of bomb)
 *
 * @param {object[]} msg.marks[*].markAuthorId - actor id
 * @param {number}   msg.marks[*].markId       - mark id
 * @param {number}   msg.marks[*].markSpellId  - spell id source of mark
 * @param {number}   msg.marks[*].markType     - type of object on ground { 1: GLYPH, 2: TRAP, 3: WALL }
 * @param {object[]} msg.marks[*].cells        - list of cells mark is composed of.
 * @param {number}   msg.marks[*]._glyphGfxId  - (enriched) glyph gfx id
 */
connectionManager.on('GameFightResumeMessage', gameFightResuming);


/**
 * @event module:protocol/contextFight.client_GameFightResumeWithSlavesMessage
 *
 * @param {object} msg - msg
 * @param {number}   msg.gameTurn       - game turn
 * @param {number}   msg.summonCount    - summon count
 * @param {number}   msg.bombCount      - bomb count
 * @param {object[]} msg.effects        - list of effects
 * @param {object[]} msg.spellCooldowns - list of cooldowns
 * @param {object[]} msg.marks          - list of marks (trap, glyph, wall of bomb)
 * @param {Object[]} msg.slavesInfo     - infos of slave entities controlled by the player
 */
connectionManager.on('GameFightResumeWithSlavesMessage', gameFightResuming);


/**
 * @event module:protocol/contextFight.client_GameFightEndMessage
 *
 * @param {object} msg - msg
 * @param {number} msg.id - actor id which fight turn has ended.
 */
connectionManager.on('GameFightEndMessage', function (msg) {
	window.isoEngine.transmitMessage(msg);
});


/**
 * @event module:protocol/contextFight.client_GameFightNewRoundMessage
 *
 * @param {object} msg - msg
 * @param {number} msg.roundNumber - Current round number
 */
connectionManager.on('GameFightNewRoundMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


/**
 * @event module:protocol/contextFight.client_GameFightTurnListMessage
 * @param {object} msg - msg
 * @param {number[]} msg.ids      - Sorted list of all characters in timeline
 * @param {number[]} msg.deadsIds - Sorted list of dead's ids in current timeline
 */
connectionManager.on('GameFightTurnListMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


/**
 * @event module:protocol/contextFight.client_GameFightTurnStartMessage
 *
 * @param {object} msg - msg
 * @param {number} msg.id       - actor id which fight turn has started.
 * @param {number} msg.waitTime - duration in ms of his turn.
 */
connectionManager.on('GameFightTurnStartMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


/**
 * @event module:protocol/contextFight.client_GameFightTurnStartPlayingMessage
 */
connectionManager.on('GameFightTurnStartPlayingMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


/**
 * @event module:protocol/contextFight.client_GameFightTurnResumeMessage
 *
 * @param {object} msg - msg
 * @param {number} msg.id       - actor id which fight turn has started.
 * @param {number} msg.waitTime - duration in ms of his turn.
 */
connectionManager.on('GameFightTurnResumeMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


/**
 * @event module:protocol/contextFight.client_GameFightTurnStartSlaveMessage
 *
 * @param {object} msg - msg
 * @param {number} msg.id       - actor id which fight turn has started.
 * @param {number} msg.waitTime - duration in ms of his turn.
 */
connectionManager.on('GameFightTurnStartSlaveMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


/**
 * @event module:protocol/contextFight.client_GameFightTurnReadyRequestMessage
 * @desc  Ask client if he is ready for next turn
 *
 * @param {object} msg - msg
 * @param {number} msg.id - character id
 */
connectionManager.on('GameFightTurnReadyRequestMessage', function (msg) {
	// We must wait until isoEngine has finished playing animations.
	// The message is transmitted to isoEngine and handled by fightSequence module, that makes sure
	// that sequence animations have ended and respond with a `GameFightTurnReadyMessage`.
	window.isoEngine.transmitMessage(msg);
});


/**
 * @event module:protocol/contextFight.client_GameFightSynchronizeMessage
 *
 * @param {object} msg - msg
 * @param {Object[]} msg.fighters - fighters list
 *
 * @param {Boolean}  msg.fighters[*].alive
 * @param {number}   msg.fighters[*].contextualId
 * @param {number}   msg.fighters[*].teamId
 * @param {Object}   msg.fighters[*].disposition
 * @param {Object}   msg.fighters[*].stats
 * @param {Object}   msg.fighters[*].look
 */
connectionManager.on('GameFightSynchronizeMessage', function (msg) {
	window.isoEngine.transmitMessage(msg);
});

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @event module:protocol/contextFight.client_GameFightTurnEndMessage
 *
 * @param {object} msg - msg
 * @param {number} msg.id - actor id which fight turn has ended.
 */
connectionManager.on('GameFightTurnEndMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-context-fight.js
 ** module id = 98
 ** module chunks = 0
 **/