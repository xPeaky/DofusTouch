var EventEmitter = require('events.js').EventEmitter;
var getText = require('getText').getText;
var inactivityMonitor = require('inactivityMonitor');
var inherits = require('util').inherits;
var userPreferences = require('UserPreferences');
var FightEventEnum = require('FightEventEnum');
var FightOptionsEnum = require('FightOptionsEnum');
var Buff = require('Buff');
var Fighter = require('./fighter.js');
var ActionIdConverter = require('ActionIdConverter');
var SpellFactory = require('SpellFactory');
var FightSpellCastCriticalEnum = require('FightSpellCastCriticalEnum');
var GameContextEnum = require('GameContextEnum');
var async = require('async');
var windowsManager = require('windowsManager');
var FightEventsHelper = require('fightEventsHelper');
var Step = require('./steps.js');
var pushStep = Step.pushStep;

// Some monsters like "Ze Flib" ("addsummonedmonster 1x1050") can make you skip your turn.
// As a result you cannot do any action during your turn and it ends right away.
// Our client should not misunderstand this for real inactivity.
// We use same logic as Flash client: if player's turn lasted less than 10s this means his turn was skipped.
// Note the 10s duration does not really matter since this spell is the only way a player can pass his turn
// without activity (tapping on "End Turn" button is also an activity!).
var MIN_TURN_DURATION = 10000;

// Hardcoded constants
var ACTION_CHARACTER_ADD_ILLUSION_RANDOM = 1024;
var ACTION_CHARACTER_ADD_ILLUSION_MIRROR = 1097;
var ACTION_SUMMON_BOMB = 1008;

var WEAPON_SPELL_ID = SpellFactory.WEAPON_SPELL_ID;

var playerData;

var FIGHT_STATES = {
	UNDEFINED: -1,
	PREPARATION: 0,
	BATTLE: 1
};

var FIGHT_TYPE_UNDEFINED = -1;

var FIGHT_OPTION_KEY_TO_ENUM = {
	isSecret: FightOptionsEnum.FIGHT_OPTION_SET_SECRET,
	isRestrictedToPartyOnly: FightOptionsEnum.FIGHT_OPTION_SET_TO_PARTY_ONLY,
	isClosed: FightOptionsEnum.FIGHT_OPTION_SET_CLOSED,
	isAskingForHelp: FightOptionsEnum.FIGHT_OPTION_ASK_FOR_HELP
};

// list of fight options that can be displayed (in fightListWindow, on the map...)
var FIGHT_OPTION_ICON_ID = [
	FightOptionsEnum.FIGHT_OPTION_SET_TO_PARTY_ONLY,
	FightOptionsEnum.FIGHT_OPTION_SET_CLOSED,
	FightOptionsEnum.FIGHT_OPTION_ASK_FOR_HELP
];

// reference: core/src/com/ankamagames/dofus/logic/game/fight/types/CastingSpell.as
function CastingSpell(updateCastingId) {
	updateCastingId = (updateCastingId === undefined) ? true : updateCastingId;

	this.castingSpellId = null;   // CastingSpell unic ID
	this.casterId       = null;   // Spell caster identifier.
	this.targetedCell   = null;   // The cell where the spell was casted on.
	this.spell          = null;   // Reference to the corresponding Spell object.
	this.spellRank      = null;   // Reference to the corresponding rank.
	this.markId         = null;   // Reference to the corresponding mark if any
	this.markType       = null;   // Reference to the corresponding mark type if any
	this.silentCast     = null;   // Est-ce qu'on voit le lancé de sort (false), ou juste une direction de lancé ? (true)
	this.weaponId       = -1;     // Id of used weapon, -1 if no weapon
	this.isCriticalHit  = null;   // Specify if it's a critical action
	this.isCriticalFail = null;   // Specify if it's a critical fail action

	if (updateCastingId) {
		this.castingSpellId = CastingSpell.uniqueSpellId++;
	}
}
CastingSpell.uniqueSpellId = 0;

var _castingSpell;

function FightManager() {
	EventEmitter.call(this);

	this.turnCount = 0;

	this.turnsList = [];
	this.deadTurnsList = [];

	this.currentFighterId = 0;
	this._lastFighterId = 0;

	this._fighters = {};

	this.FIGHT_STATES = FIGHT_STATES;

	this.fightState = FIGHT_STATES.UNDEFINED;
	this.fightType = FIGHT_TYPE_UNDEFINED;
	this.isInReconnection = false;

	this.isInactive = false;
	this.turnStartTime = 0;

	this.spellCastCounts = {};

	this.fightMessagesStack = [];
	this.isProcessing = false;
	this.asyncFightMessages = {
		GameActionFightDispellableEffectMessage: this.addDispellableEffect,
		GameActionFightCloseCombatMessage: this.gameActionFightCloseCombatAndSpell,
		GameActionFightSpellCastMessage: this.gameActionFightCloseCombatAndSpell
	};

	playerData = window.gui.playerData;
}
inherits(FightManager, EventEmitter);
module.exports = FightManager;

FightManager.FIGHT_STATES = FIGHT_STATES;
FightManager.FIGHT_OPTION_KEY_TO_ENUM = FIGHT_OPTION_KEY_TO_ENUM;
FightManager.FIGHT_OPTION_ICON_ID = FIGHT_OPTION_ICON_ID;

FightManager.prototype.INCREMENT_MODE_SOURCE = 1;
FightManager.prototype.INCREMENT_MODE_TARGET = 2;

FightManager.prototype.getFighters = function () {
	// TODO: Temporary way to check if we are in preparation or in battle
	if (window.foreground.tapOptions.mode === 'fightPlacement') {
		return this.getOrdonnedPreFighters();
	}

	return this.turnsList;
};

FightManager.prototype.getDeadFighters = function () {
	return this.deadTurnsList;
};

FightManager.prototype.getAvailableFighters = function () {
	return this._fighters;
};

FightManager.prototype.getFighter = function (id) {
	return this._fighters[id];
};

FightManager.prototype.getTurnCount = function () {
	return this.turnCount;
};

FightManager.prototype.getFighterSpell = function (spellId, fighterId, cb) {
	var fighters = this.getAvailableFighters();
	var fighter = fighters[fighterId];
	if (!fighter) {
		return cb(new Error('Spell could not be found, its fighter does not exist'));
	}
	// if the fighter already have the spell
	if (fighter.spells[spellId]) {
		return cb(null, fighter.spells[spellId]);
	}
	// if the player's character have this spell: we can clone it
	// TODO: Take slaves spell into account
	var spellData = playerData.characters.mainCharacter.spellData;
	if (spellData.spells[spellId]) {
		fighter.spells[spellId] = spellData.spells[spellId].clone();
		fighter.spells[spellId].setLevel(spellData.spells[spellId].level);
		return cb(null, fighter.spells[spellId]);
	}
	// checking if any other fighter already have the spell to clone it
	for (var id in fighters) {
		var otherFighter = fighters[id];
		if (otherFighter.id === fighterId) { continue; }
		if (otherFighter.spells[spellId]) {
			fighter.spells[spellId] = otherFighter.spells[spellId].clone();
			return cb(null, fighter.spells[spellId]);
		}
	}
	// no luck: we have to hit the server to create the spell
	SpellFactory.createSpells([spellId], function (err, spells) {
		if (err) {
			return cb(err);
		}
		fighter.spells[spellId] = spells[spellId];
		return cb(null, fighter.spells[spellId]);
	});
};

FightManager.prototype._checkInactivityOnTurnStart = function () {
	if (this.isInactive) {
		if (inactivityMonitor.isActiveSince(this.turnStartTime)) {
			this.isInactive = false;
		} else {
			// Client ask to finish its turn right away
			window.dofus.sendMessage('GameFightTurnFinishMessage');
		}
	}
	this.turnStartTime = Date.now();
};

FightManager.prototype._checkInactivityOnTurnEnd = function () {
	if (!this.isInactive && !inactivityMonitor.isActiveSince(this.turnStartTime) &&
		Date.now() - this.turnStartTime > MIN_TURN_DURATION) {
		this.isInactive = true;
		window.gui.openSimplePopup(getText('ui.fight.inactivityMessage'), getText('ui.fight.inactivityTitle'));
	}
};

FightManager.prototype.initialize = function (gui) {
	var self = this;
	var connectionManager = window.dofus.connectionManager;

	/** @event module:protocol/contextFight.client_GameFightStartMessage */
	gui.on('GameFightStartMessage', function (/*msg*/) {
		self.fightState = FIGHT_STATES.BATTLE;
		self.emit('fightEnterBattle');

		// We need to prepare player spells with an initial cooldown
		self.prepareSpellsWithInitialCooldown(playerData.characters.mainCharacter);
		for (var slaveId in playerData.characters.slaves) {
			self.prepareSpellsWithInitialCooldown(playerData.characters.slaves[slaveId]);
		}

		window.isoEngine.displayTextBanner('tablet.fight.animation.fightStarts');
		window.actorManager.removeReadyIcon();
	});

	/** @event module:protocol/contextFight.client_GameFightStartingMessage */
	gui.on('GameFightStartingMessage', function (msg) {
		self.fightType = msg.fightType;
		self.turnCount = 0;

		gui.timeline.show();

		self.emit('fightStart');
	});

	function fightEnd() {
		if (gui.timeline) { gui.timeline.close(); }

		self.turnsList = [];
		self.deadTurnsList = [];

		self.currentFighterId = 0;
		self._lastFighterId = 0;

		for (var id in self._fighters) {
			self.removeFighter(id);
		}
		self._fighters = {};

		self.fightState = FIGHT_STATES.UNDEFINED;
		self.fightType = FIGHT_TYPE_UNDEFINED;
		self.isInReconnection = false;

		self.spellCastCounts = {};

		self.fightMessagesStack = [];
		self.isProcessing = false;

		playerData.isFightLeader = false;
		playerData.isFighting = false;
		playerData.isSpectator = false;

		playerData.characters.switchControlledCharacter(playerData.characters.mainCharacterId);
		playerData.characters.mainCharacter.currentSummonedCreature = 0;
		playerData.characters.mainCharacter.currentSummonedBomb = 0;
		playerData.characters.clearSlaves();
		window.actorManager.removeTeamCircles();
	}

	gui.on('disconnect', function () {
		fightEnd();
		FightEventsHelper.reset();
	});

	/** @event module:protocol/contextFight.client_GameFightEndMessage */
	gui.on('GameFightEndMessage', function (msg) {
		var fighters = self.getAvailableFighters();
		if (msg.results && msg.results.length > 0) {
			windowsManager.open('fightEnd', { msg: msg, fighters: fighters });
		}
		FightEventsHelper.flush(function (error) {
			if (error) {
				console.error(error);
			}
			fightEnd();
			if (!playerData.isSpectator) {
				FightEventsHelper.send(FightEventEnum.FIGHT_END);
			}
			FightEventsHelper.reset();
		});
	});

	function onNewGameFightTurnMessage(msg) {
		// TODO: More logic in FightBattleFrame.as, at GameFightTurnStartMessage
		var fighterId = msg.id;
		self.currentFighterId = fighterId;

		if (msg._messageType !== 'GameFightTurnResumeMessage') {
			self.decrementDuration(fighterId);
		}

		if (playerData.characters.canControlCharacterId(fighterId)) {
			self.spellCastCounts = {};

			self._checkInactivityOnTurnStart();
			window.isoEngine.displayTextBanner('tablet.fight.animation.userTurn');
		}

		self.emit('GameFightTurnStart', msg.id, msg.waitTime, userPreferences.getValue('turnPicture'));
	}

	/** @event module:protocol/contextFight.client_GameFightTurnResumeMessage */
	gui.on('GameFightTurnResumeMessage', function (msg) {
		onNewGameFightTurnMessage(msg);
	});

	/** @event module:protocol/contextFight.client_GameFightTurnStartMessage */
	gui.on('GameFightTurnStartMessage', function (msg) {
		onNewGameFightTurnMessage(msg);
	});

	/** @event module:protocol/contextFight.client_GameFightTurnStartSlaveMessage */
	gui.on('GameFightTurnStartSlaveMessage', function (msg) {
		onNewGameFightTurnMessage(msg);
	});

	gui.on('GameFightHumanReadyStateMessage', function (msg) {
		if (msg.characterId === playerData.id) {
			self.emit('playerReady', msg.isReady);
		}
		window.actorManager.setReadyIconOnActor(msg.characterId, msg.isReady);
	});

	/** @event module:fightSequence/confirmTurnEnd
	 *  @desc Executed at the end of a sequence if GameFightTurnReadyRequestMessage has been received */
	gui.on('confirmTurnEnd', function () {
		if (!self._lastFighterId) {
			return;
		}
		var lastFighterId = self._lastFighterId;
		var fighter = self.getFighter(lastFighterId);
		if (!fighter) {
			return console.warn('Turn confirmation failed, fighter does not exist:', lastFighterId);
		}
		fighter.markFinishingBuffs();

		fighter.data.stats.actionPoints = fighter.data.stats.maxActionPoints;
		fighter.data.stats.movementPoints = fighter.data.stats.maxMovementPoints;

		if (lastFighterId === playerData.characters.controlledCharacterId) {
			var character = playerData.characters.getControlledCharacter();
			character.setCharacteristic('actionPointsCurrent', fighter.data.stats.maxActionPoints);
			character.setCharacteristic('movementPointsCurrent', fighter.data.stats.maxMovementPoints);

			// cooldown management (only for controlled character)
			for (var spellId in fighter.spells) {
				var spell = fighter.spells[spellId];
				spell.newTurn();
			}

			self._checkInactivityOnTurnEnd();
			window.isoEngine.displayTextBanner('tablet.fight.animation.endOfUserTurn');
		}

		self.prepareNextPlayableCharacter();

		self.emit('GameFightTurnEnd', lastFighterId);
	});

	/** @event module:protocol/contextFight.client_GameFightTurnEndMessage */
	gui.on('GameFightTurnEndMessage', function (msg) {
		var lastFighterId = msg.id;
		self._lastFighterId = lastFighterId;

		var fighter = self.getFighter(lastFighterId);
		if (!fighter) {
			return console.warn('Turn end failed, fighter does not exist');
		}
		// The following logic happens here for dead fighters because only the ending message is sent for them
		if (!fighter.data.alive) {
			self.decrementDuration(lastFighterId);
			fighter.markFinishingBuffs();

			fighter.data.stats.actionPoints = fighter.data.stats.maxActionPoints;
			fighter.data.stats.movementPoints = fighter.data.stats.maxMovementPoints;

			self.emit('GameFightTurnEnd', lastFighterId);

			// cooldown management (only for controlled character)
			if (lastFighterId === playerData.characters.controlledCharacterId) {
				for (var spellId in fighter.spells) {
					var spell = fighter.spells[spellId];
					spell.newTurn();
				}
			}
		}
	});

	function updatePreFightersList(msg) {
		if (self.fightState !== FIGHT_STATES.PREPARATION) {
			return;
		}
		var informations = getFighterInformations(msg);
		self.emit('UpdatePreFightersList', informations.contextualId);
	}

	/** @event module:protocol/contextFight.client_GameFightShowFighterMessage */
	gui.on('GameFightShowFighterMessage', function (msg) {
		self.loadFighter(msg);
		updatePreFightersList(msg);
	});

	/** @event module:protocol/contextFight.client_GameFightShowFighterRandomStaticPoseMessage */
	gui.on('GameFightShowFighterRandomStaticPoseMessage', function (msg) {
		self.loadFighter(msg);
	});

	/** @event module:protocol/contextFight.client_GameActionFightSummonMessage */
	gui.on('GameActionFightSummonMessage', function (msg) {
		updatePreFightersList(msg);

		var sourceId = msg.sourceId;
		var actionId = msg.actionId;
		var summonInfos = msg.summon;
		if (sourceId === playerData.id && actionId !== ActionIdConverter.ACTION_SUMMON_STATIC_CREATURE) {
			var fighter = self.getFighter(summonInfos.contextualId);
			if (!fighter) {
				return console.error(new Error('Summoning failed, fighter does not exist'));
			}
			if (actionId === ACTION_SUMMON_BOMB || fighter.isBomb) {
				playerData.characters.addSummonedBomb();
			} else if (fighter.isCreature) {
				playerData.characters.addSummonedCreature();
			}
		}

		pushStep(Step.fightSummonStep,
			[_castingSpell ? _castingSpell.castingSpellId : -1, sourceId, summonInfos]);
	});

	/** @event module:protocol/contextFight.client_GameFightTurnListMessage */
	gui.on('GameFightTurnListMessage', function (msg) {
		self.turnsList = msg.ids;
		self.deadTurnsList = msg.deadsIds;

		self.emit('FightersListUpdated');
	});

	/** @event module:protocol/contextFight.client_GameFightSynchronizeMessage */
	gui.on('GameFightSynchronizeMessage', function (msg) {
		var syncFighters = msg.fighters;
		var fighters = self.getAvailableFighters();

		if (msg._synchronizeBuff) {
			for (var fighterId in fighters) {
				fighters[fighterId].enableBuffs();
			}
		}

		for (var i = 0; i < syncFighters.length; i++) {
			var syncFighter = syncFighters[i];
			if (!syncFighter.alive) {
				continue;
			}
			var fighter = fighters[syncFighter.contextualId];
			if (!fighter) {
				return console.error(new Error('Synchronizing failed, fighter does not exist'));
			}
			fighter.synchronizeData(syncFighter);
		}
	});

	/** @event module:protocol/contextFight.client_GameFightLeaveMessage */
	gui.on('GameFightLeaveMessage', function (msg) {
		var targetId = msg.charId;
		if (targetId !== playerData.id) {
			return;
		}

		// TODO: Temporary way to check if we are in preparation or in battle
		if (window.foreground.tapOptions.mode === 'fightPlacement' || playerData.isSpectator) {
			self.emit('gameFightLeave', targetId);
		}
	});

	function killFighter(targetId, isLeaving) {
		var fighters = self.getAvailableFighters();
		var target = fighters[targetId];
		if (!target || !target.data.alive) {
			return console.warn('Fighter was killed previously.');
		}
		for (var fighterId in fighters) {
			var fighter = fighters[fighterId];
			if (fighter.id === targetId) {
				continue;
			}
			if (fighter.data.stats.summoner === targetId) {
				pushStep(Step.fightDeathStep, [_castingSpell ? _castingSpell.castingSpellId : -1, fighter.id]);
			}
		}
		pushStep(Step.fightDeathStep, [_castingSpell ? _castingSpell.castingSpellId : -1, targetId, !isLeaving]);

		var summonerId = target.data.stats.summoner;
		if (playerData.characters.canControlCharacterId(summonerId)) {
			if (target.isBomb) {
				playerData.characters.removeSummonedBomb(summonerId);
			} else {
				playerData.characters.removeSummonedCreature(summonerId);
			}
			self.emit('updateSpellsAvailability');
		}
	}

	gui.on('_GameActionFightLeaveMessage', function (msg) {
		killFighter(msg.targetId, true);
	});

	/** @event module:protocol/contextFight.client_GameActionFightDeathMessage */
	gui.on('GameActionFightDeathMessage', function (msg) {
		killFighter(msg.targetId, false);
	});

	/** @event module:protocol/contextFight.client_GameFightRefreshFighterMessage */
	gui.on('GameFightRefreshFighterMessage', function (msg) {
		var informations = msg.informations;
		var fighterId = informations.contextualId;
		var fighter = self.getFighter(fighterId);
		if (!fighter) {
			return console.error('Refreshing fighter failed, fighter ' + fighterId + ' does not exist');
		}
		fighter.data.updateData({ look: informations.look, disposition: informations.disposition });
		// TODO: Temporary way to check if we are in preparation or in battle
		if (window.foreground.tapOptions.mode === 'fightPlacement') {
			fighter.updateFighterIllustration();
			self.emit('UpdatePreFightersList', fighterId);
		}
	});

	/** @event module:protocol/contextFight.client_GameFightRemoveTeamMemberMessage */
	gui.on('GameFightRemoveTeamMemberMessage', function (msg) {
		var fighterId = msg.charId;
		self.removeFighter(fighterId);

		// TODO: Temporary way to check if we are in preparation or in battle
		if (window.foreground.tapOptions.mode === 'fightPlacement') {
			self.emit('UpdatePreFightersList', fighterId);
		}
	});

	/** @event module:protocol/contextFight.client_GameFightNewRoundMessage */
	gui.on('GameFightNewRoundMessage', function (msg) {
		self.turnCount = msg.roundNumber - 1;
		self.emit('TurnCountUpdated', msg.roundNumber - 1);
	});

	/** @event module:protocol/contextFight.client_GameFightResumeMessage */
	gui.on('GameFightResumeMessage', function (msg) {
		self.gameFightResumeMessage(msg);
	});

	/** @event module:protocol/contextFight.client_GameFightResumeWithSlavesMessage */
	gui.on('GameFightResumeWithSlavesMessage', function (msg) {
		self.gameFightResumeMessage(msg);
	});

	/** @event module:protocol/contextFight.client_GameFightSpectateMessage */
	gui.on('GameFightSpectateMessage', function (msg) {
		self.gameFightResumeMessage(msg);
	});

	/** @event module:protocol/contextFight.client_GameActionFightChangeLookMessage
	 *
	 *  @param {Number} msg.targetId   - fighter id that changed look
	 *  @param {Object} msg.entityLook - new character's look
	 */
	gui.on('GameActionFightChangeLookMessage', function (msg) {
		// TODO: change fighter look in timeline using GameContextRefreshEntityLookMessage ?
		var fighterId = msg.targetId;
		var fighter = self.getFighter(fighterId);
		if (!fighter) {
			return console.error(new Error('Changing fighter\'s look failed, fighter does not exist'));
		}
		var newLook = msg.entityLook;
		fighter.data.updateData({ look: newLook });
		fighter.updateFighterIllustration();
		self.emit(FightEventEnum.FIGHTER_CHANGE_LOOK, [fighterId, newLook], fighterId);
	});

	/** @event module:protocol/actionsFight.client_GameActionFightDispellEffectMessage
	 */
	gui.on('GameActionFightDispellEffectMessage', function (msg) {
		pushStep(Step.fightDispelEffectStep,
			[_castingSpell ? _castingSpell.castingSpellId : -1, msg.targetId, msg.boostUID]);
	});

	// GameActionFightTriggerEffectMessage is ignored
	/** @event module:protocol/actionsFight.client_GameActionFightTriggerEffectMessage */
	/* gui.on('GameActionFightTriggerEffectMessage', function (msg) {
	}); */

	/** @event module:protocol/actionsFight.client_GameActionFightDispellSpellMessage
	 */
	gui.on('GameActionFightDispellSpellMessage', function (msg) {
		pushStep(Step.fightDispelSpellStep,
			[_castingSpell ? _castingSpell.castingSpellId : -1, msg.targetId, msg.spellId]);
	});

	/** @event module:protocol/actionsFight.client_GameActionFightDispellMessage
	 */
	gui.on('GameActionFightDispellMessage', function (msg) {
		pushStep(Step.fightDispelStep, [_castingSpell ? _castingSpell.castingSpellId : -1, msg.targetId]);
	});

	/** @event module:protocol/actionsFight.client_GameActionFightNoSpellCastMessage */
	gui.on('GameActionFightNoSpellCastMessage', function (msg) {
		var spellLevelId = msg.spellLevelId;
		var controlledCharacter = playerData.characters.getControlledCharacter();
		var spell;
		if (spellLevelId === 0) {
			spell = controlledCharacter.spellData.spells[WEAPON_SPELL_ID];
		} else {
			spell = controlledCharacter.spellData.getSpellBySpellLevelId(msg.spellLevelId);
		}
		if (!spell || !self.spellCastCounts[spell.id]) {
			return;
		}
		self.spellCastCounts[spell.id] = self.spellCastCounts[spell.id] - 1;
		var apCost = spell.getProperty('apCost', spell.level);
		controlledCharacter.setCharacteristic('actionPointsCurrent',
			controlledCharacter.characteristics.actionPointsCurrent + apCost);
	});

	/** @event module:protocol/actionsFight.client_GameActionFightLifePointsGainMessage */
	gui.on('GameActionFightLifePointsGainMessage', function (msg) {
		pushStep(Step.fightLifePointsVariationStep,
			[_castingSpell ? _castingSpell.castingSpellId : -1, msg.targetId, msg.delta, 0, msg.actionId]);
	});
	/** @event module:protocol/actionsFight.client_GameActionFightLifePointsLostMessage */
	gui.on('GameActionFightLifePointsLostMessage', function (msg) {
		pushStep(Step.fightLifePointsVariationStep,
			[_castingSpell ? _castingSpell.castingSpellId : -1, msg.targetId, -msg.loss, -msg.permanentDamages,
			msg.actionId]);
	});
	/** @event module:protocol/actionsFight.client_GameActionFightLifeAndShieldPointsLostMessage */
	gui.on('GameActionFightLifeAndShieldPointsLostMessage', function (msg) {
		pushStep(Step.fightShieldPointsVariationStep,
			[_castingSpell ? _castingSpell.castingSpellId : -1, msg.targetId, -msg.shieldLoss, msg.actionId]);
		pushStep(Step.fightLifePointsVariationStep,
			[_castingSpell ? _castingSpell.castingSpellId : -1, msg.targetId, -msg.loss, -msg.permanentDamages,
			msg.actionId]);
	});

	/** @event module:protocol/actionsFight.client_GameActionFightPointsVariationMessage */
	gui.on('GameActionFightPointsVariationMessage', function (msg) {
		var targetId = msg.targetId;
		var actionId = msg.actionId;
		var delta = msg.delta;
		if (actionId === ActionIdConverter.ACTION_CHARACTER_ACTION_POINTS_USE ||
			actionId === ActionIdConverter.ACTION_CHARACTER_ACTION_POINTS_LOST ||
			actionId === ActionIdConverter.ACTION_CHARACTER_ACTION_POINTS_WIN) {
			pushStep(Step.fightActionPointsVariationStep,
				[_castingSpell ? _castingSpell.castingSpellId : -1, targetId, delta,
					actionId === ActionIdConverter.ACTION_CHARACTER_ACTION_POINTS_USE]);
		} else if (actionId === ActionIdConverter.ACTION_CHARACTER_MOVEMENT_POINTS_USE ||
			actionId === ActionIdConverter.ACTION_CHARACTER_MOVEMENT_POINTS_LOST ||
			actionId === ActionIdConverter.ACTION_CHARACTER_MOVEMENT_POINTS_WIN) {
			pushStep(Step.fightMovementPointsVariationStep,
				[_castingSpell ? _castingSpell.castingSpellId : -1, targetId, delta,
					actionId === ActionIdConverter.ACTION_CHARACTER_MOVEMENT_POINTS_USE]);
		}
	});

	/** @event module:protocol/actionsFight.client_GameActionFightVanishMessage */
	gui.on('GameActionFightVanishMessage', function (msg) {
		var targetId = msg.targetId;
		var fighter = self.getFighter(targetId);
		if (!fighter) {
			return console.error(new Error('Vanish failed, fighter does not exist'));
		}

		fighter.setAlive(false);
		// TODO: Update entities number? see updateRemovedEntity

		// Fight vanish step
		fighter.dispel(false, false, true);
		self.removeLinkedBuff(targetId, false, true);
		self.reaffectBuffs(targetId);
		// TODO: FighterInfoUpdate hook? see outEntity
	});

	/** @event module:protocol/characterChoice.client_CharacterSelectedForceMessage */
	connectionManager.on('CharacterSelectedForceMessage', function () {
		self.isInReconnection = true;
	});

	// TODO look for places where we listen to GameFightJoinMessage/etc. and use fightEnterxxx instead
	/** @event module:protocol/contextFight.client_GameFightJoinMessage */
	gui.on('GameFightJoinMessage', function (msg) {
		self.fightState = msg.isFightStarted ? FIGHT_STATES.BATTLE : FIGHT_STATES.PREPARATION;

		self.fightType = msg.fightType;
		var isSpectator = msg.isSpectator;
		if (isSpectator) {
			window.actorManager.userActor.hide();
		} else {
			window.actorManager.userActor.show();
		}
		playerData.isSpectator = isSpectator;
		playerData.isFighting = true;
		if (msg.isFightStarted) {
			window.isoEngine.displayTextBanner('tablet.fight.animation.fightStarts');
			self.emit('fightEnterBattle', 'PREPARATION_SKIPPED'); // reconnection directly into fight
		} else {
			window.isoEngine.displayTextBanner('tablet.fight.animation.preparationPhase');
			self.emit('fightEnterPreparation', msg);
		}
	});

	/** @event module:protocol/contextFight.client_GameActionFightSpellCooldownVariationMessage */
	gui.on('GameActionFightSpellCooldownVariationMessage', function (msg) {
		pushStep(Step.fightSpellCooldownVariationStep,
			[_castingSpell ? _castingSpell.castingSpellId : -1, msg.targetId, msg.spellId, msg.value]);
	});

	/** @event module:protocol/contextFight.client_GameActionFightModifyEffectsDurationMessage */
	gui.on('GameActionFightModifyEffectsDurationMessage', function (msg) {
		pushStep(Step.fightModifyEffectsDurationStep,
			[_castingSpell ? _castingSpell.castingSpellId : -1, msg.sourceId, msg.targetId, msg.delta]);
	});

	/** @event module:protocol/contextFight.client_GameActionFightExchangePositionsMessage */
	gui.on('GameActionFightExchangePositionsMessage', function (msg) {
		pushStep(Step.fightExchangePositionsStep,
			[_castingSpell ? _castingSpell.castingSpellId : -1, msg.sourceId, msg.casterCellId, msg.targetId,
			msg.targetCellId]);
	});

	/** @event module:protocol/contextFight.client_GameActionFightSlideMessage */
	gui.on('GameActionFightSlideMessage', function (msg) {
		pushStep(Step.fightSlideStep,
			[_castingSpell ? _castingSpell.castingSpellId : -1, msg.targetId, msg.endCellId]);
	});

	/** @event module:protocol/contextFight.client_GameActionFightTeleportOnSameMapMessage */
	gui.on('GameActionFightTeleportOnSameMapMessage', function (msg) {
		pushStep(Step.fightTeleportOnSameMapStep,
			[_castingSpell ? _castingSpell.castingSpellId : -1, msg.targetId, msg.cellId]);
	});

	/** @event module:protocol/context.client_GameMapMovementMessage */
	gui.on('GameMapMovementMessage', function (msg) {
		var cellId = msg.keyMovements[msg.keyMovements.length - 1];
		pushStep(Step.mapMovementStep,
			[_castingSpell ? _castingSpell.castingSpellId : -1, msg.actorId, cellId]);
	});

	/** @event module:protocol/contextFight.client_GameActionFightCarryCharacterMessage */
	gui.on('GameActionFightCarryCharacterMessage', function (msg) {
		pushStep(Step.fightCarryCharacterStep,
			[_castingSpell ? _castingSpell.castingSpellId : -1, msg.sourceId, msg.targetId]);
	});

	/** @event module:protocol/contextFight.client_GameActionFightThrowCharacterMessage */
	gui.on('GameActionFightThrowCharacterMessage', function (msg) {
		pushStep(Step.fightThrowCharacterStep,
			[_castingSpell ? _castingSpell.castingSpellId : -1, msg.sourceId, msg.targetId, msg.cellId]);
	});

	/** @event module:protocol/contextFight.client_GameActionFightDropCharacterMessage */
	gui.on('GameActionFightDropCharacterMessage', function (msg) {
		pushStep(Step.fightThrowCharacterStep,
			[_castingSpell ? _castingSpell.castingSpellId : -1, msg.sourceId, msg.targetId, msg.cellId]);
	});

	gui.on('sendAllFightEvent', function () {
		FightEventsHelper.flush();
	});

	// Sequence messages

	/** @event module:protocol/contextFight.client_GameActionFightReduceDamagesMessage */
	gui.on('GameActionFightReduceDamagesMessage', function (msg) {
		pushStep(Step.fightReduceDamages,
			[_castingSpell ? _castingSpell.castingSpellId : -1, msg.targetId, msg.amount]);
	});

	/** @event module:protocol/contextFight.client_GameActionFightDodgePointLossMessage */
	gui.on('GameActionFightDodgePointLossMessage', function (msg) {
		var actionId = msg.actionId;
		if (actionId === ActionIdConverter.ACTION_FIGHT_SPELL_DODGED_PA) {
			pushStep(Step.fightActionPointsLossDodge,
				[_castingSpell ? _castingSpell.castingSpellId : -1, msg.targetId, msg.amount]);
		} else if (actionId === ActionIdConverter.ACTION_FIGHT_SPELL_DODGED_PM) {
			pushStep(Step.fightMovementPointsLossDodge,
				[_castingSpell ? _castingSpell.castingSpellId : -1, msg.targetId, msg.amount]);
		}
	});

	/** @event module:protocol/contextFight.client_GameActionFightSpellImmunityMessage */
	gui.on('GameActionFightSpellImmunityMessage', function (msg) {
		pushStep(Step.fightSpellImmunity, [_castingSpell ? _castingSpell.castingSpellId : -1, msg.targetId]);
	});

	/** @event module:protocol/contextFight.client_GameActionFightReflectSpellMessage */
	gui.on('GameActionFightReflectSpellMessage', function (msg) {
		pushStep(Step.fightReflectSpellStep, [_castingSpell ? _castingSpell.castingSpellId : -1, msg.targetId]);
	});

	/** @event module:protocol/contextFight.client_GameActionFightReflectDamagesMessage */
	gui.on('GameActionFightReflectDamagesMessage', function (msg) {
		pushStep(Step.fightReflectDamagesStep, [_castingSpell ? _castingSpell.castingSpellId : -1, msg.sourceId]);
	});

	/** @event module:protocol/contextFight.client_GameActionFightTackledMessage */
	gui.on('GameActionFightTackledMessage', function (msg) {
		pushStep(Step.fightTackledStep, [_castingSpell ? _castingSpell.castingSpellId : -1, msg.sourceId]);
	});

	/** @event module:protocol/contextFight.client_GameActionFightKillMessage */
	gui.on('GameActionFightKillMessage', function (msg) {
		pushStep(Step.fightKillStep, [_castingSpell ? _castingSpell.castingSpellId : -1, msg.targetId, msg.sourceId]);
	});

	/** @event module:protocol/contextFight.client_GameActionFightInvisibilityMessage */
	gui.on('GameActionFightInvisibilityMessage', function (msg) {
		pushStep(Step.fightInvisibilityStep, [_castingSpell ? _castingSpell.castingSpellId : -1, msg.targetId,
			msg.state]);
	});

	/** @event module:protocol/contextFight.client_GameActionFightTriggerGlyphTrapMessage */
	gui.on('GameActionFightTriggerGlyphTrapMessage', function (msg) {
		// TODO: Do not interfere with this sequence if there is already a casting spell
		pushStep(Step.fightTriggerGlyphTrapStep, [_castingSpell ? _castingSpell.castingSpellId : -1,
			msg.triggeringCharacterId, msg.sourceId, msg._spellId]);
	});

	/** @event module:protocol/contextFight.client_GameFightUpdateTeamMessage */
	gui.on('GameFightUpdateTeamMessage', function (msg) {
		playerData.isFightLeader = msg.team.leaderId === playerData.id;
	});

	/** @event module:protocol/context.client_GameContextDestroyMessage */
	gui.on('GameContextDestroyMessage', function () {
		if (window.isoEngine.gameContext !== GameContextEnum.FIGHT) {
			return;
		}
		self.fightState = FIGHT_STATES.UNDEFINED;
	});
};

FightManager.prototype.getNextControllableCharacterId = function () {
	var turnsList = this.turnsList;
	var turnsListLength = turnsList.length;
	if (turnsListLength === 0) {
		return playerData.characters.controlledCharacterId;
	}

	// TODO: Use controllable character indexes to avoid loop
	var currentFighterIndex = turnsList.indexOf(this.currentFighterId);
	for (var i = 1; i < turnsListLength; i++) {
		var nextFighterId = turnsList[(currentFighterIndex + i) % turnsListLength];
		var fighter = this.getFighter(nextFighterId);
		if (!fighter) {
			return console.error(new Error('Find next controllable character failed, fighter does not exist'));
		}
		if (playerData.characters.canControlCharacterId(nextFighterId) && fighter.data.alive) {
			return nextFighterId;
		}
	}

	return playerData.characters.controlledCharacterId;
};

FightManager.prototype.prepareNextPlayableCharacter = function () {
	var nextControllableCharacterId = this.getNextControllableCharacterId();

	playerData.characters.switchControlledCharacter(nextControllableCharacterId);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Remove a fighter from the list
 * @param {Number} id - fighter id
 */
FightManager.prototype.removeFighter = function (id) {
	var fighter = this.getFighter(id);
	if (!fighter) {
		//TODO: fix me that should be an error
		return console.warn('Removing fighter failed, it does not exist');
	}
	fighter.clear();
	delete this._fighters[id];
};

function getFighterInformations(msg) {
	switch (msg._messageType) {
		case 'GameFightRefreshFighterMessage':
		case 'GameFightShowFighterMessage':
			return msg.informations;
		case 'GameActionFightSummonMessage':
			return msg.summon;
		default:
			return null;
	}
}

FightManager.prototype.loadFighter = function (msg) {
	var actionId = msg.actionId;
	var isIllusion = msg._type === 'GameFightShowFighterRandomStaticPoseMessage' ||
		(actionId === ACTION_CHARACTER_ADD_ILLUSION_RANDOM || actionId === ACTION_CHARACTER_ADD_ILLUSION_MIRROR);

	var fighterInformations = getFighterInformations(msg);
	if (!fighterInformations) {
		console.warn('Fighter informations could not be extracted from this message type: ' + msg._messageType);
		return;
	}

	var fighter = this.addFighter(fighterInformations.contextualId, isIllusion);
	fighter.setData(fighterInformations);
	var actor = window.actorManager.getActor(fighter.id);
	if (actor) {
		actor.addTeamCircle();
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** prepareSpellsWithInitialCooldown
 * @desc Spells with an initial cooldown need to be created for player's characters, otherwise the cooldown isn't shown
 *
 * @param {Object} character - a controllable character
 */
FightManager.prototype.prepareSpellsWithInitialCooldown = function (character) {
	var self = this;
	function resetSpellInitialCooldown(error, spell) {
		if (error) {
			return console.error(error);
		}
		spell.resetInitialCooldown(self.turnCount);
	}
	for (var spellId in character.spellData.spells) {
		var spell = character.spellData.spells[spellId];
		if (spell.isItem || spell.spellLevel.initialCooldown === 0) {
			continue;
		}
		this.getFighterSpell(spellId, character.spellData.characterId, resetSpellInitialCooldown);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Add a buff
 *
 *  @param {Object} effectData - effect data received by the server
 */
FightManager.prototype.addDispellableEffect = function (effectData, cb) {
	/**
	 *  (original code in FightSequenceFrame.as and BuffManager.as)
	 *  it seems it can be (cf. dofus/logic/game/fight/managers/BuffManager.as):
	 *
	 *  Description             Message                                    Buff class
	 *
	 *  a spell boost           FightTemporarySpellBoostEffect             SpellBuff
	 *  a boost with trigger    FightTriggeredEffect                       TriggeredBuff
	 *  contact damage boost    FightTemporaryBoostWeaponDamagesEffect     BasicBuff
	 *  status boost            FightTemporaryBoostStateEffect             StateBuff
	 *  spell immunity boost    FightTemporarySpellImmunityEffect          BasicBuff
	 *  stat boost              FightTemporaryBoostEffect                  StatBuff
	 */

	var castingSpell;
	if (effectData.actionId === ActionIdConverter.ACTION_CHARACTER_UPDATE_BOOST) {
		castingSpell = new CastingSpell(false);
	} else {
		castingSpell = new CastingSpell(!_castingSpell);
	}

	if (_castingSpell) {
		castingSpell.castingSpellId = _castingSpell.castingSpellId; // it's a UID, not an ID
		if (_castingSpell.spell.id === effectData.effect.spellId) {
			castingSpell.spellRank = _castingSpell.spellRank;
		}
	}

	var timeCreationStarted = Date.now();

	function createBuff() {
		var buffEffect = effectData.effect;

		function applyBuff(error, buff) {
			if (error) {
				return console.error(error);
			}

			// Buff is flagged to avoid applying it if data on which it will be applied have already been synchronized
			buff.timeCreationStarted = timeCreationStarted;

			if (buff instanceof Buff.StateBuff) {
				if (buff.actionId === 952) { // COMPAT226 952 = ActionIdConverter.ACTION_FIGHT_DISABLE_STATE
					pushStep(Step.fightLeavingStateStep, [_castingSpell ? _castingSpell.castingSpellId : -1,
						buff.targetId, buff.stateId]);
				} else {
					pushStep(Step.fightEnteringStateStep, [_castingSpell ? _castingSpell.castingSpellId : -1,
						buff.targetId, buff.stateId, buff.effect.getDurationString()]);
				}
			}

			if (buffEffect._type === 'FightTemporaryBoostEffect') {
				var actionId = effectData.actionId;
				if (actionId !== ActionIdConverter.ACTION_CHARACTER_MAKE_INVISIBLE &&
					actionId !== ActionIdConverter.ACTION_CHARACTER_UPDATE_BOOST &&
					actionId !== ActionIdConverter.ACTION_CHARACTER_CHANGE_LOOK &&
					actionId !== ActionIdConverter.ACTION_CHARACTER_CHANGE_COLOR &&
					actionId !== ActionIdConverter.ACTION_CHARACTER_ADD_APPEARANCE &&
					actionId !== ActionIdConverter.ACTION_FIGHT_SET_STATE) {
					pushStep(Step.fightTemporaryBoostStep, [_castingSpell ? _castingSpell.castingSpellId : -1,
						effectData.effect.targetId, buff.effect.description, buff.effect.duration,
						buff.effect.getDurationString()]);
				}
			}

			pushStep(Step.fightDisplayBuffStep, [_castingSpell ? _castingSpell.castingSpellId : -1, buff]);

			// It works because steps are executed directly, if this changes it has to move in the last step here
			delete buff.timeCreationStarted;

			return cb();
		}

		Buff.makeBuffFromEffect(buffEffect, castingSpell, effectData.actionId, applyBuff);
	}

	var spellId = effectData.effect.spellId;
	castingSpell.casterId = effectData.sourceId;

	this.getFighterSpell(spellId, castingSpell.casterId, function (error, spell) {
		if (error) {
			return cb(error);
		}
		if (!spell) {
			return cb(new Error('unable to find spell id ' + spellId));
		}
		castingSpell.spell = spell;
		createBuff();
	});
};



//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** A spell or a contact attack action
 *
 *
 */

FightManager.prototype.gameActionFightCloseCombatAndSpell = function (msg, cb) {
	var self = this;

	var isCloseCombat = msg._messageType === 'GameActionFightCloseCombatMessage';
	var closeCombatWeaponId = 0;

	if (isCloseCombat) {
		msg.spellId = WEAPON_SPELL_ID;
		msg.spellLevel = 1;
		closeCombatWeaponId = msg.weaponGenericId;
	}

	if (this.spellCastCounts[msg.spellId]) {
		this.spellCastCounts[msg.spellId] = this.spellCastCounts[msg.spellId] - 1;
	}


	this.getFighterSpell(msg.spellId, msg.sourceId, function (error, spell) {
		if (error) {
			return cb(error);
		}
		if (!spell) {
			return cb(new Error('unable to find spell id ' + msg.spellId));
		}

		_castingSpell                = new CastingSpell();
		_castingSpell.casterId       = msg.sourceId;
		_castingSpell.spell          = spell;
		_castingSpell.spellRank      = isCloseCombat ? null : spell.getProperty('spellLevel', msg.spellLevel);
		_castingSpell.isCriticalFail = (msg.critical === FightSpellCastCriticalEnum.CRITICAL_FAIL);
		_castingSpell.isCriticalHit  = (msg.critical === FightSpellCastCriticalEnum.CRITICAL_HIT);
		_castingSpell.silentCast     = msg.silentCast;
		if (isCloseCombat) {
			_castingSpell.weaponId   = msg.weaponGenericId;
		}

		if (msg.sourceId === playerData.characters.controlledCharacterId &&
			msg.critical !== FightSpellCastCriticalEnum.CRITICAL_FAIL) {
			spell.cast(self.turnCount, [msg.targetId]);
		}

		if (isCloseCombat && closeCombatWeaponId !== 0) {
			pushStep(Step.fightCloseCombatStep,
				[_castingSpell ? _castingSpell.castingSpellId : -1, msg.sourceId, closeCombatWeaponId, msg.critical]);
		} else {
			pushStep(Step.fightSpellCastStep,
				[_castingSpell ? _castingSpell.castingSpellId : -1, msg.sourceId, msg.spellId, msg.critical]);
		}

		// TODO: much more here..
		cb();
	});
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Fight resume
 */

FightManager.prototype._restoreSpellCooldown = function (cooldownData, spell, callback) {
	spell.cast(this.turnCount, [], false);

	if (cooldownData.cooldown === 63) {
		spell.forceLastCastTurn(this.turnCount + cooldownData.cooldown - spell.spellLevel.minCastInterval);
		return callback();
	}
	var interval = spell.getModifiedInterval();
	spell.forceLastCastTurn(this.turnCount + cooldownData.cooldown - interval);
	return callback();
};

FightManager.prototype._restoreCooldowns = function (fighterId, cooldowns, cb) {
	var self = this;

	if (!cooldowns || cooldowns.length === 0) {
		return cb();
	}
	var fighter = this.getFighter(fighterId);
	if (!fighter) {
		return console.error(new Error('Restoring cooldowns failed, fighter does not exist.'));
	}

	async.each(cooldowns, function (cooldownData, callback) {
		if (cooldownData._type !== 'GameFightSpellCooldown') {
			return callback();
		}
		var spellId = cooldownData.spellId;
		var spell = fighter.spells[spellId];
		if (spell) {
			return self._restoreSpellCooldown(cooldownData, spell, callback);
		}
		self.getFighterSpell(spellId, fighterId, function (error, spell) {
			if (error) {
				return callback(error);
			}
			return self._restoreSpellCooldown(cooldownData, spell, callback);
		});
	}, function (error) {
		cb(error);
	});
};

FightManager.prototype._restoreBuffs = function (effects, isSpectateMessage) {
	var self = this;
	var castingSpellPool = {};

	function createAndApplyBuff(effect, castingSpell, actionId, callback) {
		Buff.makeBuffFromEffect(effect, castingSpell, actionId, function (error, buff) {
			if (error) {
				return callback(error);
			}
			var fighter = self.getFighter(buff.targetId);
			if (!fighter) {
				return callback(new Error('Restoring buffs failed, fighter does not exist'));
			}
			var mustBeApplied = isSpectateMessage ? !(buff instanceof Buff.StatBuff) : true;
			fighter.addBuff(buff, mustBeApplied);
			return callback();
		});
	}
	function processEffect(buff, callback) {
		var effect = buff.effect;
		if (!castingSpellPool[effect.targetId]) {
			castingSpellPool[effect.targetId] = {};
		}
		if (!castingSpellPool[effect.targetId][effect.turnDuration]) {
			castingSpellPool[effect.targetId][effect.turnDuration] = {};
		}
		var castingSpell = castingSpellPool[effect.targetId][effect.turnDuration][effect.spellId];
		if (!castingSpell) {
			castingSpell = new CastingSpell();
			castingSpell.casterId = buff.sourceId;
			return self.getFighterSpell(effect.spellId, castingSpell.casterId, function (error, spell) {
				if (error) {
					return callback(error);
				}
				if (!spell) {
					return callback(new Error('unable to find spell id ' + effect.spellId));
				}
				castingSpell.spell = spell;
				castingSpellPool[effect.targetId][effect.turnDuration][effect.spellId] = castingSpell;
				createAndApplyBuff(effect, castingSpell, buff.actionId, callback);
			});
		}
		createAndApplyBuff(effect, castingSpell, buff.actionId, callback);
	}

	async.eachSeries(effects, function (effect, callback) {
		return processEffect(effect, callback);
	}, function done(error) {
		self.isInReconnection = false;
		if (error) {
			return console.error(error);
		}
	});
};

FightManager.prototype.gameFightResumeMessage = function (msg) {
	var self = this;

	playerData.characters.mainCharacter.currentSummonedCreature = msg.summonCount;
	playerData.characters.mainCharacter.currentSummonedBomb = msg.bombCount;

	// restore turn count
	this.turnCount = msg.gameTurn - 1;
	this.emit('TurnCountUpdated', msg.gameTurn - 1);

	if (msg._messageType === 'GameFightSpectateMessage') {
		self._restoreBuffs(msg.effects, true);
		return FightEventsHelper.flush();
	}

	// restore cooldowns
	var cooldownInfos = msg.slavesInfo || [];
	cooldownInfos.unshift({
		slaveId: playerData.characters.mainCharacterId,
		spellCooldowns: msg.spellCooldowns
	});
	async.eachSeries(cooldownInfos, function (cooldownInfo, callback) {
		return self._restoreCooldowns(cooldownInfo.slaveId, cooldownInfo.spellCooldowns, callback);
	}, function done(error) {
		if (error) {
			return console.error(error);
		}
		return self._restoreBuffs(msg.effects, false);
	});
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Add a new fighter in the list.
 *
 *  @param {Number} id - fighter id
 */
FightManager.prototype.addFighter = function (id, isIllusion) {
	var fighter = this.getFighter(id);

	if (fighter) {
		return fighter;
	}

	fighter = new Fighter(id, isIllusion);
	this._fighters[id] = fighter;

	return fighter;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Organize know fighters in the right order manually when fighters list has not yet been
 * received
 */
FightManager.prototype.getOrdonnedPreFighters = function () {
	var fightersList = [];
	var goodGuys = [];
	var badGuys = [];
	var badInit = 0;
	var goodInit = 0;

	// Organising fighters by initiative order in each team
	var fighters = this.getAvailableFighters();
	for (var id in fighters) {
		var fighter = fighters[id];
		var stats = fighter.data.stats;

		if (stats) {
			if (!stats.initiative && stats.initiative !== 0) {
				console.warn('Initiative stats is not defined, it will be initialized at 0.');
				stats.initiative = 0;
			}
			// TODO: Review init as int?
			var initRatio = ~~(stats.initiative * stats.lifePoints / stats.maxLifePoints);
			if (fighter.data.teamId === 0) {
				badGuys.push({ fighter: id, init: initRatio });
				badInit += initRatio;
			} else {
				goodGuys.push({ fighter: id, init: initRatio });
				goodInit += initRatio;
			}
		}
	}
	var sortFighters = function (a, b) {
		if (a.init === b.init) {
			return b.fighter - a.fighter;
		}
		return b.init - a.init;
	};
	badGuys.sort(sortFighters);
	goodGuys.sort(sortFighters);

	// Alternating between each team
	var firstTeam = badGuys;
	var secondTeam = goodGuys;
	if (badGuys.length === 0 || goodGuys.length === 0 || (badInit / badGuys.length) < (goodInit / goodGuys.length)) {
		firstTeam = goodGuys;
		secondTeam = badGuys;
	}

	var len = Math.min(firstTeam.length, secondTeam.length);
	var i;
	for (i = 0; i < len; i++) {
		fightersList.push(firstTeam[i].fighter);
		fightersList.push(secondTeam[i].fighter);
	}
	var remainTeam = badGuys.length > goodGuys.length ? badGuys : goodGuys;
	for (len = remainTeam.length; i < len; i++) {
		fightersList.push(remainTeam[i].fighter);
	}

	return fightersList;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** CanCastThisSpell
 *  Check if the currently controlled entity can cast a spell
 *  From currentPlayedFighterManager.as canCastThisSpell()
 */

FightManager.prototype.canCastThisSpell = function (spellId/*, targetId*/) {
	var controlledCharacter = playerData.characters.getControlledCharacter();
	var controlledCharacterId = playerData.characters.controlledCharacterId;
	var fighter = this.getFighter(controlledCharacterId);

	if (!fighter) {
		return false;
	}

	var currentStates = fighter.states;
	var spells = controlledCharacter.spellData.spells;
	var spell = spells[spellId];
	var apCost = spell.getProperty('apCost');
	var actionPoints = controlledCharacter.characteristics.actionPointsCurrent;
	var i;

	// checking availability against remaining action points
	if (apCost > actionPoints) {
		return false;
	}

	var canSummon = spell.getProperty('canSummon');
	if (canSummon && !playerData.characters.canSummonCreature()) {
		return false;
	}

	var canBomb = spell.getProperty('canBomb');
	if (canBomb && !playerData.characters.canSummonBomb()) {
		return false;
	}

	var statesForbidden = spell.getProperty('statesForbidden');
	var statesRequired = spell.getProperty('statesRequired');

	for (i = 0; i < currentStates.length; i++) {
		var currentState = window.gui.databases.SpellStates[currentStates[i]];

		// checking availability against forbidden states
		if (statesForbidden && statesForbidden.length > 0 && statesForbidden.indexOf(currentStates[i]) !== -1) {
			return false;
		}

		// check if the current "spell" is the spell 0 (weapon) and if the state is blocking the attack
		if (spellId === WEAPON_SPELL_ID && currentState && currentState.preventsFight) {
			return false;
		}
	}

	// check if all required states are here
	if (statesRequired) {
		for (i = 0; i < statesRequired.length; i++) {
			if (currentStates.indexOf(statesRequired[i]) === -1) {
				return false;
			}
		}
	}

	// TODO: a lot of other checks are still missing

	// if the spell have already been cast in the current fight
	var fighterSpell = fighter.spells[spellId];
	if (fighterSpell && fighterSpell.hasBeenCast()) {
		// nb. of cast per turn
		var maxCastPerTurn = fighterSpell.getProperty('maxCastPerTurn');
		if (maxCastPerTurn > 0 && fighterSpell.castingData.castThisTurn >= maxCastPerTurn) {
			return false;
		}

		// cooldown
		if (fighterSpell.getCooldown() > 0) {
			return false;
		}
	}

	return true;
};

FightManager.prototype.getSpellCooldown = function (spellId) {
	var controlledCharacterId = playerData.characters.controlledCharacterId;
	var fighter = this.getFighter(controlledCharacterId);
	if (!fighter || !fighter.spells[spellId]) { return 0; }
	var spellCooldown = fighter.spells[spellId].getCooldown();
	return Math.max(0, spellCooldown);
};

FightManager.prototype.decrementDuration = function (targetId) {
	this.incrementDuration(targetId, -1);
};

FightManager.prototype.incrementDuration = function (targetId, delta, dispelEffect, incrementMode) {
	if (incrementMode === undefined) {
		incrementMode = this.INCREMENT_MODE_SOURCE;
	}

	var fighterBuffs;
	var fighters = this.getAvailableFighters();
	for (var fighterId in fighters) {
		fighterBuffs = [];
		var fighter = fighters[fighterId];
		var buffs = fighter.buffs;
		for (var i = 0; i < buffs.length; i++) {
			var buff = buffs[i];
			if ((incrementMode === this.INCREMENT_MODE_SOURCE && buff.aliveSource === targetId) ||
				(incrementMode === this.INCREMENT_MODE_TARGET && buff.targetId === targetId)) {
				var modified = buff.incrementDuration(delta, dispelEffect);

				if (buff.isActive()) {
					fighterBuffs.push(buff);
					if (modified) {
						this.emit('BuffUpdate', buff, fighter);
					}
				} else {
					buff.remove();
					this.emit('BuffRemove', buff, fighter);
				}
			} else {
				fighterBuffs.push(buff);
			}
		}
		fighter.buffs = fighterBuffs;
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Remove buffs applied by a caster.
 */
FightManager.prototype.removeLinkedBuff = function (sourceId, forceUndispellable, dying) {
	var fighters = this.getAvailableFighters();
	for (var fighterId in fighters) {
		var fighter = fighters[fighterId];
		var buffs = fighter.buffs;
		for (var i = 0; i < buffs.length; i++) {
			var buff = buffs[i];

			if (buff.source === sourceId) {
				fighter.dispelUniqueBuff(buff.id, forceUndispellable, dying, false);
			}

			if (dying && fighter.isSummon()) {
				buff.aliveSource = fighter.data.stats.summoner;
			}
		}
	}
};

FightManager.prototype.reaffectBuffs = function (sourceId) {
	var caster = this.getFighter(sourceId);
	if (!caster) {
		return console.error(new Error('Reaffecting buffs failed, fighter does not exist'));
	}
	if (caster.isSummon()) {
		var nextFighterId = this.getNextFighterId(sourceId);
		if (nextFighterId === -1) {
			return;
		}
		var fighters = this.getAvailableFighters();
		for (var fighterId in fighters) {
			var buffs = fighters[fighterId].buffs;
			for (var i = 0; i < buffs.length; i++) {
				var buff = buffs[i];
				if (buff.aliveSource === sourceId) {
					buff.aliveSource = nextFighterId;
				}
			}
		}
	}
};

FightManager.prototype.getNextFighterId = function (fighterId) {
	var fighterIndex = this.turnsList.indexOf(fighterId);
	if (fighterIndex === -1) {
		return -1;
	}
	return (fighterIndex + 1) % this.turnsList.length;
};

FightManager.prototype.spellCastSucceeded = function (spellId, characterId) {
	if (playerData.characters.controlledCharacterId !== characterId) {
		return;
	}

	var spellCastCount = this.spellCastCounts[spellId];
	this.spellCastCounts[spellId] = spellCastCount ? spellCastCount + 1 : 1;

	var controlledCharacter = playerData.characters.getControlledCharacter();
	var spell = controlledCharacter.spellData.spells[spellId];
	var apCost = spell.getProperty('apCost', spell.level);
	controlledCharacter.setCharacteristic('actionPointsCurrent',
		controlledCharacter.characteristics.actionPointsCurrent - apCost);
};

FightManager.prototype.processFightSequenceMessage = function (msg) {
	if (this.isProcessing) {
		return this.fightMessagesStack.push(msg);
	}

	var self = this;
	function processNextMessage() {
		self.isProcessing = false;

		if (self.fightMessagesStack.length) {
			self.processFightSequenceMessage(self.fightMessagesStack.shift());
		}
	}

	this.isProcessing = true;

	var asyncProcess = this.asyncFightMessages[msg._messageType];
	if (asyncProcess) {
		window.gui.emit(msg._messageType, msg); // transmitted for others than fightManager
		return asyncProcess.call(this, msg, processNextMessage);
	}
	window.gui.emit(msg._messageType, msg);
	processNextMessage();
};

FightManager.prototype.isInBattle = function () {
	return this.fightState === FIGHT_STATES.BATTLE;
};

FightManager.prototype.isFightersTurn = function (id) {
	return this.currentFighterId === id;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/fightManager/index.js
 ** module id = 216
 ** module chunks = 0
 **/