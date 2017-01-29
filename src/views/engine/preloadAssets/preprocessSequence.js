var mapPoint = require('mapPoint');

var actors;
var castSpellMessage;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** reset sequence data */
function resetData() {
	actors = {};
	castSpellMessage = null;
}


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get an actor data. If actor does not exist yet, create a new object.
 * @param {number} actorId
 */
function getActor(actorId) {
	if (!actors[actorId]) {
		actors[actorId] = { id: actorId };
	}
	return actors[actorId];
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @param {Object} msg
 * @param {number} msg.targetId - id of actor that die
 */
function death(msg) {
	var actor = getActor(msg.targetId); // this actor should be different than the regular actor!
	if (!actor) { return console.error('Actor ' + msg.targetId + ' not found.'); }
	// if (actor.hit) delete actor.hit;
	actor.death = true;
	if (castSpellMessage) {
		// death is the result of a spell message in the same sequence, link the message to it.
		msg._spell = castSpellMessage;
		castSpellMessage._deathMsgs.push(msg);
		castSpellMessage._deadIds.push(msg.targetId);
	}
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @param {Object} msg
 * @param {number} msg.sourceId - actor's ID
 */
function tackled(msg) {
	var actor = getActor(msg.sourceId);
	actor.tackled = true;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @param {Object} msg
 */
function pointVariation(msg) {
	if (castSpellMessage) {
		// point variation is the result of a spell message in the same sequence, link the message to it.
		msg._spell = castSpellMessage;
		castSpellMessage._pointVariationMsgs.push(msg);
	}
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @param {Object} msg
 */
function lifeVariation(msg) {
	if (castSpellMessage) {
		// life variation is the result of a spell message in the same sequence, link the message to it.
		msg._spell = castSpellMessage;
		castSpellMessage._lifeVariationMsgs.push(msg);
	}
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** An invisible actor has been detected. Actor position is updated
 *
 * @param {number} msg.targetId - detected actor id
 * @param {number} msg.cellId   - position where actor has been detected
 */
function invisibleDetected(msg) {
	var actor = window.actorManager.getActor(msg.targetId);
	if (actor) { actor.setOnScreenPosition(msg.cellId); }
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** An actor look has changed. Actor look is updated
 *
 * @param {Object} msg            - received message
 * @param {number} msg.targetId   - actor id
 * @param {number} msg.entityLook - new look of the actor
 */
function changeLook(msg) {
	var actor = getActor(msg.targetId);
	actor.look = msg.entityLook;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** A new actor is summoned. */
function summon(msg) {
	var actorId = msg.summon.contextualId;
	var actor = getActor(actorId);
	var disposition = msg.summon.disposition;
	actor.position  = disposition.cellId;
	actor.direction = disposition.direction;
	actor.isSummoned = true;
	// store summon contextual id in spell message, in order to set target gfx correctly
	if (castSpellMessage) {
		castSpellMessage.targetId = actorId;
	}
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Cast a spell or close combat message */
function attack(msg) {
	castSpellMessage = msg;
	castSpellMessage._deathMsgs          = []; // to store all related death messages.
	castSpellMessage._deadIds            = []; // to store all actors that die because of that spell.
	castSpellMessage._lifeVariationMsgs  = []; // to store all related life point variation messages.
	castSpellMessage._pointVariationMsgs = []; // to store all related action/movement point variation messages.
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function throwCharacter(msg) {
	if (msg.cellId === -1) { return; }
	var actor = window.actorManager.getActor(msg.sourceId);
	if (!actor) { return; }

	// check if it's a drop
	if (mapPoint.getDistance(actor.cellId, msg.cellId) === 1) {
		// change message type for GameActionFightDropCharacterMessage
		msg._messageType = 'GameActionFightDropCharacterMessage';
	}
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
var messageProcess = {
	GameActionFightCloseCombatMessage:             attack,
	GameActionFightSpellCastMessage:               attack,
	GameMapMovementMessage:                        null,
	GameActionFightSlideMessage:                   null,
	GameActionFightPointsVariationMessage:         pointVariation,
	GameActionFightLifeAndShieldPointsLostMessage: lifeVariation,
	GameActionFightLifePointsGainMessage:          lifeVariation,
	GameActionFightLifePointsLostMessage:          lifeVariation,
	GameActionFightTeleportOnSameMapMessage:       null,
	GameActionFightExchangePositionsMessage:       null,
	GameActionFightSummonMessage:                  summon,
	GameActionFightMarkCellsMessage:               null,
	GameActionFightUnmarkCellsMessage:             null,
	GameActionFightChangeLookMessage:              changeLook,
	GameActionFightInvisibilityMessage:            null,
	_GameActionFightLeaveMessage:                  death,
	GameActionFightDeathMessage:                   death,
	GameActionFightKillMessage:                    death,
	GameActionFightVanishMessage:                  null,
	GameActionFightTriggerEffectMessage:           null, // deprecated
	GameActionFightDispellEffectMessage:           null,
	GameActionFightDispellSpellMessage:            null,
	GameActionFightDispellMessage:                 null,
	GameActionFightDodgePointLossMessage:          null,
	GameActionFightSpellCooldownVariationMessage:  null,
	GameActionFightSpellImmunityMessage:           null,
	GameActionFightInvisibleObstacleMessage:       null,
	GameActionFightReduceDamagesMessage:           null,
	GameActionFightReflectDamagesMessage:          null,
	GameActionFightReflectSpellMessage:            null,
	GameActionFightStealKamaMessage:               null,
	GameActionFightTackledMessage:                 tackled,
	GameActionFightTriggerGlyphTrapMessage:        null,
	GameActionFightDispellableEffectMessage:       null,
	GameActionFightModifyEffectsDurationMessage:   null,
	GameActionFightCarryCharacterMessage:          null,
	GameActionFightThrowCharacterMessage:          throwCharacter,
	GameActionFightDropCharacterMessage:           null,
	GameActionFightInvisibleDetectedMessage:       invisibleDetected,
	GameFightTurnListMessage:                      null,
	GameRolePlaySpellAnimMessage:                  null
};

module.exports = function (sequence) {
	resetData();
	for (var i = 0; i < sequence.length; i++) {
		var msg = sequence[i];
		var process = messageProcess[msg._messageType];
		if (process) { process(msg); }
	}
	return { actors: actors };
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/preloadAssets/preprocessSequence.js
 ** module id = 1034
 ** module chunks = 0
 **/