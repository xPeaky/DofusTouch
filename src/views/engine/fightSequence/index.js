var async           = require('async');
var GameContextEnum = require('GameContextEnum');

// local modules
var preloadAssets  = require('preloadAssets');
var castSpell      = require('castSpell');
var pointVariation = require('pointVariation');
var movement       = require('./movement.js');
var mark           = require('./mark.js');
var invisibility   = require('./invisibility.js');
var carry          = require('./carry.js');

var FIGHT_STATES = require('fightManager').FIGHT_STATES;


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** send a message to Gui */
function transmitToGui(msg, animSequence) {
	animSequence.push(function seqTransmitToGui(cb) {
		window.gui.transmitFightSequenceMessage(msg);
		return cb();
	});
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function reemitMessage(msg) {
	window.dofus.connectionManager.emit(msg._messageType, msg);
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Actor has been tackled
 *
 * @param {Object}   msg
 * @param {number}   msg.sourceId    - id of actor tackled
 * @param {number[]} msg.tacklersIds - ids of actors who did tackle
 * @param {Array}    animSequence
 */
function tackled(msg, animSequence) {
	var actor = window.actorManager.getActor(msg.sourceId);
	if (!actor) { return; }

	// add animation in the sequence
	animSequence.push(function seqTackled(cb) {
		window.gui.transmitFightSequenceMessage(msg);
		actor.oneShootAnim({ base: 'AnimTacle' }, true, cb);
	});
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** GameActionFightDeathMessage | GameActionFightKillMessage
 *
 * @param {number} msg.targetId - id of actor who die
 */
function killActor(msg, animSequence) {
	// if death is the result of a spell animation, just send it to GUI (anim will play within this spell message)
	if (msg._spell) {
		return transmitToGui(msg, animSequence);
	}

	var actorManager = window.actorManager;
	var actor = actorManager.getActor(msg.targetId);

	// load 'AnimMort' animation in actor
	// TODO: check if animation symbol exist in actor template

	// add animation in the sequence
	animSequence.push(function seqKillActor(cb) {
		// transmit message to update timeline
		window.gui.transmitFightSequenceMessage(msg);
		if (!actor) {
			console.warn('Actor ' + msg.targetId + ' not found.');
			return cb();
		}

		// Playing death animation (it will remove the actor)
		function dieAlone() {
			if ((!actorManager.userActor.isDead &&
				window.gui.fightManager.isFightersTurn(actorManager.userActor.actorId))) {
				window.isoEngine.displayUserMovementZone();
			}
			cb();
		}
		actor.death(dieAlone);
	});
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** GameActionFightSummonMessage
 *
 * @param {Object}  msg.summon - summoned montrer infos
 *
 * @param {number}  msg.summon.contextualId - actor id
 * @param {Object}  msg.summon.look         - actor look
 * @param {Object}  msg.summon.disposition  - actor disposition
 * @param {number}  msg.summon.teamId       - team id
 * @param {boolean} msg.summon.alive        - is actor alive
 * @param {Object}  msg.summon.stats        - actor statistics
 */
function summon(msg, animSequence) {
	// TODO: actor animation manager should be created before we launch animation sequence.
	animSequence.push(function seqSummon(cb) {
		window.gui.transmitFightSequenceMessage(msg);
		msg._summon.show();
		cb();
	});
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** GameActionFightChangeLookMessage
 * @desc A character had his look changed
 *
 * @param {Object} msg            - GameActionFightChangeLookMessage
 * @param {number} msg.actionId   - action id (and action text)
 * @param {number} msg.sourceId   - source actor (human, monstres, etc.) id.
 * @param {number} msg.targetId   - target actor id
 * @param {Object} msg.entityLook - new character's look
 */
function changeLook(msg, animSequence) {
	if (msg._doNotProcess) { return; }
	animSequence.push(function seqChangeLook(cb) {
		window.gui.transmitFightSequenceMessage(msg);
		var actor = window.actorManager.getActor(msg.targetId);
		actor.applyLook(msg._loadedLook);
		cb();
	});
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** GameFightRefreshFighterMessage
 * @desc A character need to have his look and disposition refreshed
 *
 * @param {Object} msg              - GameFightRefreshFighterMessage
 * @param {number} msg.informations - partial informations of a fighter
 */
function refreshFighter(msg, animSequence) {
	animSequence.push(function seqRefreshFighter(cb) {
		window.actorManager.refreshFighter(msg);
		cb();
	});
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
var messageProcess = {
	GameMapMovementMessage:                        movement.mapMovement,
	GameActionFightSlideMessage:                   movement.slideMovement,
	GameActionFightTeleportOnSameMapMessage:       movement.teleport,
	GameActionFightExchangePositionsMessage:       movement.exchangePositions,
	//--------------------------------------------------------------------------------------------
	GameActionFightCloseCombatMessage:             castSpell,
	GameActionFightSpellCastMessage:               castSpell,
	//--------------------------------------------------------------------------------------------
	GameActionFightLifePointsGainMessage:          pointVariation.lifePointVariation,
	GameActionFightLifePointsLostMessage:          pointVariation.lifePointVariation,
	GameActionFightLifeAndShieldPointsLostMessage: pointVariation.lifePointVariation,
	GameActionFightPointsVariationMessage:         pointVariation.actionOrMovementPointVariation,
	GameActionFightDispellableEffectMessage:       pointVariation.buffVariation,
	//--------------------------------------------------------------------------------------------
	GameActionFightMarkCellsMessage:               mark.addMark,
	GameActionFightUnmarkCellsMessage:             mark.removeMark,
	GameActionFightTriggerGlyphTrapMessage:        mark.triggerGlyphTrap,
	//--------------------------------------------------------------------------------------------
	GameActionFightVanishMessage:                  invisibility.vanish,
	GameActionFightInvisibilityMessage:            invisibility.setVisibility,
	GameActionFightInvisibleDetectedMessage:       invisibility.detected,
	GameActionFightInvisibleObstacleMessage:       null, // obsolete from 2.14
	//--------------------------------------------------------------------------------------------
	GameActionFightCarryCharacterMessage:          carry.carryCharacter,
	GameActionFightThrowCharacterMessage:          carry.throwCharacter,
	GameActionFightDropCharacterMessage:           carry.dropCharacter,
	//--------------------------------------------------------------------------------------------
	GameActionFightSummonMessage:                  summon,
	GameActionFightChangeLookMessage:              changeLook,
	GameActionFightTackledMessage:                 tackled,
		//--------------------------------------------------------------------------------------------
	_GameActionFightLeaveMessage:                  killActor, // not in protocol.
	GameActionFightDeathMessage:                   killActor,
	GameActionFightKillMessage:                    killActor,
	//--------------------------------------------------------------------------------------------
	GameActionFightDispellEffectMessage:           transmitToGui,
	GameActionFightDispellSpellMessage:            transmitToGui,
	GameActionFightDispellMessage:                 transmitToGui,
	GameActionFightSpellCooldownVariationMessage:  transmitToGui,
	GameActionFightSpellImmunityMessage:           transmitToGui,
	GameActionFightReduceDamagesMessage:           transmitToGui,
	GameActionFightReflectDamagesMessage:          transmitToGui,
	GameActionFightReflectSpellMessage:            transmitToGui,
	GameActionFightModifyEffectsDurationMessage:   transmitToGui,
	GameActionFightDodgePointLossMessage:          transmitToGui,
	GameFightTurnListMessage:                      transmitToGui,
	GameActionFightStealKamaMessage:               null,
	GameActionFightTriggerEffectMessage:           null, // deprecated
	//--------------------------------------------------------------------------------------------
	GameFightRefreshFighterMessage:                refreshFighter, // following messages are not supposed to be
	TextInformationMessage:                        reemitMessage,  // in a sequence but it sometimes happens
	FighterStatsListMessage:                       transmitToGui,
	//--------------------------------------------------------------------------------------------
	SequenceStartMessage:                          null, // subsequence
	SequenceEndMessage:                            null  // subsequence
};



//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
var isReady;
var fightTurnReadyRequested;
var synchronizeFightersRequested;
var synchronizeFightersRequest;
var fightEndRequested;
var fightEndRequest;
var sequenceBuffer;

function reset() {
	isReady                      = true;
	fightTurnReadyRequested      = false;
	synchronizeFightersRequested = false;
	synchronizeFightersRequest   = null;
	fightEndRequested            = false;
	fightEndRequest              = null;
	sequenceBuffer               = [];
}

reset();

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function turnReady() {
	if (!isReady) {
		fightTurnReadyRequested = true;
		return;
	}
	window.gui.transmitFightSequenceMessage({ _messageType: 'confirmTurnEnd' });
	window.dofus.sendMessage('GameFightTurnReadyMessage', { isReady: true });
	fightTurnReadyRequested = false;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function synchronizeFighters(synchronizeBuff) {
	if (!isReady) {
		synchronizeFightersRequested = true;
		return;
	}
	synchronizeFightersRequest._synchronizeBuff = synchronizeBuff;
	window.gui.transmitFightSequenceMessage(synchronizeFightersRequest);
	synchronizeFightersRequested = false;
	synchronizeFightersRequest = null;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function fightEnd() {
	window.actorManager.removeAllFighterIndicators();
	window.actorManager.allTurnNumbersOff();
	if (!isReady) {
		fightEndRequested = true;
		return;
	}
	window.gui.transmitFightSequenceMessage(fightEndRequest);
	fightEndRequested = false;
	fightEndRequest = null;
	window.actorManager.userActor.isDead = false;
}


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function processSequence(msg) {
	var isoEngine = window.isoEngine;
	if (!isoEngine.mapRenderer.isReady) {
		return isoEngine.once('mapLoaded', function () {
			processSequence(msg);
		});
	}
	if (window.gui.fightManager.fightState === FIGHT_STATES.UNDEFINED) {
		return;
	} else if (!isReady) {
		// a sequence is already playing. we push this one in a buffer to process it later
		sequenceBuffer.push(msg);
		return;
	}
	isReady = false;
	var messageSequence = msg.sequence;

	// extract `SequenceStartMessage` and `SequenceEndMessage` from the sequence
	var startMsg = messageSequence.shift();
	var endMsg   = messageSequence.pop();

	function finishSequence() {
		isReady = true;

		try {
			window.gui.transmitFightSequenceMessage({ _messageType: 'sendAllFightEvent' });
		} catch (err) {
			console.error(err);
		}

		// check if sequence buffer contain another sequence
		if (sequenceBuffer.length) {
			if (synchronizeFightersRequested) { synchronizeFighters(false); }
			return processSequence(sequenceBuffer.shift());
		}

		// send acknoledgment at the end of the sequence.
		window.dofus.sendMessage('GameActionAcknowledgementMessage', { valid: true, actionId: endMsg.actionId });
		if (synchronizeFightersRequested) { synchronizeFighters(true); }
		if (fightEndRequested) { return fightEnd(); }
		if (fightTurnReadyRequested) { turnReady(); }
	}

	// check if startMsg and endMsg are correctly related
	if (startMsg.sequenceType !== endMsg.sequenceType) { return console.error(new Error('Different sequenceType')); }
	if (startMsg.authorId     !== endMsg.authorId)     { return console.error(new Error('Different authorId')); }

	preloadAssets(messageSequence, function sequenceAssetPreload(error) {
		if (error) {
			console.error(error);
			return finishSequence();
		}

		// var actor = window.actorManager.getActor(startMsg.authorId);
		var animSequence = [];

		for (var i = 0; i < messageSequence.length; i++) {
			var msg = messageSequence[i];
			var process = messageProcess[msg._messageType];
			if (process === undefined) {
				console.error(new Error('[process messageSequence] Unsupported game action: ' + msg._messageType));
				continue;
			}
			if (process) { process(msg, animSequence); }
		}

		// launch animation
		try {
			async.series(animSequence, function sequenceAnimationEnd(error) {
				if (error) { console.error(error); }
				finishSequence();
			});
		} catch (err) {
			console.error(err);
			finishSequence();
		}
	});
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
exports.initialize = function (isoEngine) {
	isoEngine.on('messageSequence', processSequence);

	/**
	 * @event module:protocol/contextFight.client_GameFightTurnReadyRequestMessage
	 * @param {number} msg.id - character id
	 */
	isoEngine.on('GameFightTurnReadyRequestMessage', turnReady);

	/** @event module:protocol/contextFight.client_GameFightResumeMessage */
	isoEngine.on('GameFightSynchronizeMessage', function (msg) {
		synchronizeFightersRequest = msg;
		synchronizeFighters(false);
	});

	// cleanup sequences on disconnection (avoid problem when reconnect in fight)
	isoEngine.on('disconnect', function () {
		reset();
	});


	/** @event module:protocol/contextFight.client_GameFightLeaveMessage */
	isoEngine.on('GameFightLeaveMessage', function (msg) {
		var isUserActor = msg.charId === window.actorManager.userId;
		var gui = window.gui;
		var fightState = gui.fightManager.fightState;

		if (fightState === FIGHT_STATES.BATTLE) {
			var fighter = gui.fightManager.getFighter(msg.charId);
			if (fighter && fighter.data.alive) {
				var sequenceMsg = {
					_messageType: 'messageSequence',
					sequence: [
						{ _messageType: 'SequenceStartMessage' },
						{ _messageType: '_GameActionFightLeaveMessage', actionId: 0, sourceId: 0, targetId: msg.charId },
						{ _messageType: 'SequenceEndMessage' }
					]
				};
				isoEngine.emit('messageSequence', sequenceMsg);
			}
		}
		gui.transmitFightSequenceMessage(msg);
		if (isUserActor) {
			isoEngine.emit('GameFightEndMessage', { _messageType: 'GameFightEndMessage' });
		}
	});

	/** @event module:protocol/contextFight.client_FighterStatsListMessage */
	isoEngine.on('FighterStatsListMessage', function (msg) {
		var gui = window.gui;
		var fightState = gui.fightManager.fightState;

		if (fightState === FIGHT_STATES.BATTLE) {
			var sequenceMsg = {
				_messageType: 'messageSequence',
				sequence: [
					{ _messageType: 'SequenceStartMessage' },
					msg,
					{ _messageType: 'SequenceEndMessage' }
				]
			};
			isoEngine.emit('messageSequence', sequenceMsg);
		} else {
			gui.transmitFightSequenceMessage(msg);
		}
	});


	/** @event module:protocol/contextFight.client_GameFightEndMessage */
	isoEngine.on('GameFightEndMessage', function (msg) {
		window.actorManager.removeInvisibilityOfAllActors();
		fightEndRequest = msg;
		fightEnd();
	});

	function restoreFight(msg) {
		mark.syncMarks(msg.marks);
	}

	/** @event module:protocol/contextFight.client_GameFightSpectateMessage */
	isoEngine.on('GameFightSpectateMessage', restoreFight);

	/** @event module:protocol/contextFight.client_GameFightResumeMessage */
	isoEngine.on('GameFightResumeMessage', restoreFight);

	/** @event module:protocol/contextFight.client_GameFightResumeWithSlavesMessage */
	isoEngine.on('GameFightResumeWithSlavesMessage', restoreFight);

	/** @event module:protocol/context.client_GameContextDestroyMessage */
	isoEngine.on('GameContextDestroyMessage', function () {
		if (isoEngine.gameContext !== GameContextEnum.FIGHT || isReady) {
			return;
		}
		if (fightEndRequested) {
			window.gui.transmitFightSequenceMessage(fightEndRequest);
		}
		// TODO: Carried actors may misbehave if we reset in the middle of a drop/throw animation
		reset();
	});
};

exports.getMarkedCells = mark.getMarkedCells;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/fightSequence/index.js
 ** module id = 1032
 ** module chunks = 0
 **/