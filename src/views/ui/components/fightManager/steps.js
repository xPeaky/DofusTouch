var FightEventEnum = require('FightEventEnum');
var GameActionFightInvisibilityStateEnum = require('GameActionFightInvisibilityStateEnum');
var ActionIdConverter = require('ActionIdConverter');
var Buff = require('Buff');
var FightEventsHelper = require('fightEventsHelper');

function pushStep(step, args) {
	step.apply(null, args);
}
exports.pushStep = pushStep;

function fightMovementPointsVariationStep(castingSpellId, targetId, intValue, voluntarilyUsed,
	updateCharacteristicManager, showChatMessage) {
	if (updateCharacteristicManager === undefined) {
		updateCharacteristicManager = true;
	}
	if (showChatMessage === undefined) {
		showChatMessage = true;
	}

	var fighter = window.gui.fightManager.getFighter(targetId);
	if (!fighter) {
		return console.error('Movement points variation step failed, fighter does not exist');
	}
	if (updateCharacteristicManager) {
		fighter.data.stats.movementPoints += intValue;

		if (window.gui.playerData.characters.controlledCharacterId === targetId) {
			var controlledCharacter = window.gui.playerData.characters.getControlledCharacter();
			controlledCharacter.setCharacteristic('movementPointsCurrent', fighter.data.stats.movementPoints);
		}
	}

	if (showChatMessage) {
		if (intValue > 0) {
			FightEventsHelper.push(FightEventEnum.FIGHTER_MP_GAINED, [targetId, intValue], targetId,
				castingSpellId, false, 2);
		} else if (intValue < 0) {
			if (voluntarilyUsed) {
				FightEventsHelper.push(FightEventEnum.FIGHTER_MP_USED, [targetId, Math.abs(intValue)], targetId,
					castingSpellId, false, 2);
			} else {
				FightEventsHelper.push(FightEventEnum.FIGHTER_MP_LOST, [targetId, Math.abs(intValue)], targetId,
					castingSpellId, false, 2);
			}
		}
	}
}
exports.fightMovementPointsVariationStep = fightMovementPointsVariationStep;

function fightActionPointsVariationStep(castingSpellId, targetId, intValue, voluntarilyUsed, updateFighterInfos,
	showChatMessage) {
	if (updateFighterInfos === undefined) {
		updateFighterInfos = true;
	}
	if (showChatMessage === undefined) {
		showChatMessage = true;
	}

	var fighter = window.gui.fightManager.getFighter(targetId);
	if (!fighter) {
		return console.error('Action points variation step failed, fighter does not exist');
	}
	if (updateFighterInfos) {
		fighter.data.stats.actionPoints += intValue;

		if (window.gui.playerData.characters.controlledCharacterId === targetId && !voluntarilyUsed) {
			var controlledCharacter = window.gui.playerData.characters.getControlledCharacter();
			controlledCharacter.setCharacteristic('actionPointsCurrent',
				controlledCharacter.characteristics.actionPointsCurrent + intValue);
		}
	}

	if (showChatMessage) {
		if (intValue > 0) {
			FightEventsHelper.push(FightEventEnum.FIGHTER_AP_GAINED, [targetId, intValue], targetId,
				castingSpellId, false, 2);
		} else if (intValue < 0) {
			if (voluntarilyUsed) {
				FightEventsHelper.push(FightEventEnum.FIGHTER_AP_USED, [targetId, Math.abs(intValue)], targetId,
					castingSpellId, false, 2);
			} else {
				FightEventsHelper.push(FightEventEnum.FIGHTER_AP_LOST, [targetId, Math.abs(intValue)], targetId,
					castingSpellId, false, 2);
			}
		}
	}
}
exports.fightActionPointsVariationStep = fightActionPointsVariationStep;

function fightLeavingStateStep(castingSpellId, fighterId, stateId) {
	FightEventsHelper.push(FightEventEnum.FIGHTER_LEAVING_STATE, [fighterId, stateId], fighterId, -1);
}
exports.fightLeavingStateStep = fightLeavingStateStep;

function fightEnteringStateStep(castingSpellId, fighterId, stateId, durationString) {
	FightEventsHelper.push(FightEventEnum.FIGHTER_ENTERING_STATE, [fighterId, stateId, durationString], fighterId, -1);
}
exports.fightEnteringStateStep = fightEnteringStateStep;

function fightTemporaryBoostStep(castingSpellId, fighterId, statName, duration, durationText) {
	FightEventsHelper.push(FightEventEnum.FIGHTER_TEMPORARY_BOOSTED,
		[fighterId, statName, duration, durationText], fighterId, castingSpellId, false, 2);
}
exports.fightTemporaryBoostStep = fightTemporaryBoostStep;

function fightDisplayBuffStep(castingSpellId, buff) {
	var fighter = window.gui.fightManager.getFighter(buff.targetId);
	if (!fighter) {
		return console.error('Display buff step failed, fighter does not exist');
	}

	if (buff.actionId === ActionIdConverter.ACTION_CHARACTER_UPDATE_BOOST) {
		return fighter.updateBuff(buff);
	}

	fighter.addBuff(buff);

	if (!(buff instanceof Buff.StatBuff)) {
		return;
	}
	if (buff.statName === 'movementPoints') {
		fightMovementPointsVariationStep(castingSpellId, buff.targetId, buff.getDelta(), false, false, false);
	} else if (buff.statName === 'actionPoints') {
		fightActionPointsVariationStep(castingSpellId, buff.targetId, buff.getDelta(), false, false, false);
	}
}
exports.fightDisplayBuffStep = fightDisplayBuffStep;

function fightSummonStep(castingSpellId, summonerId, summonInfos) {
	var fightManager = window.gui.fightManager;

	fightManager.emit('updateSpellsAvailability');

	var summonId = summonInfos.contextualId;
	var deadSummonIndex = fightManager.deadTurnsList.indexOf(summonId);
	if (deadSummonIndex !== -1) {
		fightManager.deadTurnsList.splice(deadSummonIndex, 1);
	}

	var playerData = window.gui.playerData;
	if (summonId === playerData.id) {
		var mainCharacter = playerData.characters.mainCharacter;
		fightManager.prepareSpellsWithInitialCooldown(mainCharacter);
		mainCharacter.setCharacteristic('lifePoints', summonInfos.stats.lifePoints);
	}

	fightManager.emit(FightEventEnum.FIGHTER_SUMMONED, [summonerId, summonId], summonId, castingSpellId);
}
exports.fightSummonStep = fightSummonStep;

function fightSpellCooldownVariationStep(castingSpellId, fighterId, spellId, value) {
	var fightManager = window.gui.fightManager;
	var playerData = window.gui.playerData;
	if (fighterId === playerData.characters.controlledCharacterId) {
		fightManager.getFighterSpell(spellId, fighterId, function (error, spell) {
			if (error) {
				return console.error(error);
			}
			if (!spell.castingData) {
				spell.cast(fightManager.turnCount, [], false);
			}
			spell.forceCooldown(value);
			window.gui.shortcutBar.updateSpellAvailability(spellId);
		});
	}
}
exports.fightSpellCooldownVariationStep = fightSpellCooldownVariationStep;

function fightModifyEffectsDurationStep(castingSpellId, sourceId, targetId, delta) {
	var fightManager = window.gui.fightManager;
	fightManager.incrementDuration(targetId, delta, true, fightManager.INCREMENT_MODE_TARGET);
	FightEventsHelper.push(FightEventEnum.FIGHTER_EFFECTS_MODIFY_DURATION, [targetId, sourceId, delta], targetId,
		castingSpellId);
}
exports.fightModifyEffectsDurationStep = fightModifyEffectsDurationStep;

function fightExchangePositionsStep(castingSpellId, sourceId, sourceCell, targetId, targetCell) {
	var fightManager = window.gui.fightManager;
	var sourceFighter = fightManager.getFighter(sourceId);
	var targetFighter = fightManager.getFighter(targetId);
	if (!sourceFighter || !targetFighter) {
		return console.error('Exchange position step failed, fighters do not exist');
	}
	sourceFighter.data.disposition.cellId = sourceCell;
	targetFighter.data.disposition.cellId = targetCell;
	fightManager.emit(FightEventEnum.FIGHTERS_POSITION_EXCHANGE, [sourceId, targetId], 0, castingSpellId);
}
exports.fightExchangePositionsStep = fightExchangePositionsStep;

function fightSlideStep(castingSpellId, targetId, endCellId) {
	var fightManager = window.gui.fightManager;
	var fighter = fightManager.getFighter(targetId);
	if (!fighter) {
		return console.error('Slide step failed, fighter does not exist');
	}
	fighter.data.disposition.cellId = endCellId;
	fightManager.emit(FightEventEnum.FIGHTER_SLIDE, [targetId], targetId, castingSpellId);
}
exports.fightSlideStep = fightSlideStep;

function fightTeleportOnSameMapStep(castingSpellId, targetId, cellId) {
	var fightManager = window.gui.fightManager;
	var fighter = fightManager.getFighter(targetId);
	if (!fighter) {
		return console.error('Teleport step failed, fighter does not exist');
	}
	fighter.data.disposition.cellId = cellId;
	fightManager.emit(FightEventEnum.FIGHTER_TELEPORTED, [targetId], 0, castingSpellId);
}
exports.fightTeleportOnSameMapStep = fightTeleportOnSameMapStep;

function mapMovementStep(castingSpellId, fighterId, cellId) {
	var fighter = window.gui.fightManager.getFighter(fighterId);
	if (!fighter) {
		return console.error('Map movement step failed, fighter does not exist');
	}
	fighter.data.disposition.cellId = cellId;
}
exports.mapMovementStep = mapMovementStep;

function fightCarryCharacterStep(castingSpellId, fighterId, carriedId) {
	window.gui.fightManager.emit(FightEventEnum.FIGHTER_CARRY, [fighterId, carriedId], 0, castingSpellId);
}
exports.fightCarryCharacterStep = fightCarryCharacterStep;

function fightThrowCharacterStep(castingSpellId, fighterId, carriedId, cellId) {
	var fightManager = window.gui.fightManager;
	if (cellId !== -1) {
		var fighter = fightManager.getFighter(carriedId);
		if (!fighter) {
			return console.error('Throw character step failed, fighter does not exist');
		}
		fighter.data.disposition.cellId = cellId;
	}
	fightManager.emit(FightEventEnum.FIGHTER_THROW, [fighterId, carriedId, cellId], 0, castingSpellId);
}
exports.fightThrowCharacterStep = fightThrowCharacterStep;

function fightShieldPointsVariationStep(castingSpellId, targetId, delta, actionId) {
	var fighter = window.gui.fightManager.getFighter(targetId);
	if (!fighter) {
		return console.error('Fighter ' + targetId + ' does not exist.');
	}
	var shieldPoints = fighter.data.stats.shieldPoints + delta;
	fighter.setShield(shieldPoints);
	if (delta < 0) {
		FightEventsHelper.push(FightEventEnum.FIGHTER_SHIELD_LOSS, [targetId, Math.abs(delta), actionId], targetId,
			castingSpellId);
	} else if (delta > 0) {
		FightEventsHelper.push(FightEventEnum.FIGHTER_SHIELD_GAIN, [targetId, delta], targetId, castingSpellId);
	} else {
		FightEventsHelper.push(FightEventEnum.FIGHTER_NO_CHANGE, [targetId], targetId, castingSpellId);
	}
}
exports.fightShieldPointsVariationStep = fightShieldPointsVariationStep;

function fightLifePointsVariationStep(castingSpellId, targetId, delta, permanentDamages, actionId) {
	var fightManager = window.gui.fightManager;
	var fighter = fightManager.getFighter(targetId);
	if (!fighter) {
		return console.error('Fighter ' + targetId + ' does not exist.');
	}
	var stats = fighter.data.stats;
	stats.maxLifePoints = Math.max(1, stats.maxLifePoints + permanentDamages);
	var lifePoints = Math.min(Math.max(0, stats.lifePoints + delta), stats.maxLifePoints);
	fighter.setHP(lifePoints);
	if (delta <= 0) {
		FightEventsHelper.push(FightEventEnum.FIGHTER_LIFE_LOSS, [targetId, Math.abs(delta), actionId], targetId,
			castingSpellId, false, 2);
	} else if (delta > 0) {
		FightEventsHelper.push(FightEventEnum.FIGHTER_LIFE_GAIN, [targetId, delta, actionId], targetId, castingSpellId,
			false, 2);
	}
}
exports.fightLifePointsVariationStep = fightLifePointsVariationStep;

function fightReduceDamages(castingSpellId, fighterId, amount) {
	FightEventsHelper.push(FightEventEnum.FIGHTER_REDUCED_DAMAGES, [fighterId, amount], fighterId, castingSpellId);
}
exports.fightReduceDamages = fightReduceDamages;

function fightActionPointsLossDodge(castingSpellId, fighterId, amount) {
	FightEventsHelper.push(FightEventEnum.FIGHTER_AP_LOSS_DODGED, [fighterId, amount], fighterId, castingSpellId);
}
exports.fightActionPointsLossDodge = fightActionPointsLossDodge;

function fightMovementPointsLossDodge(castingSpellId, fighterId, amount) {
	FightEventsHelper.push(FightEventEnum.FIGHTER_MP_LOSS_DODGED, [fighterId, amount], fighterId, castingSpellId);
}
exports.fightMovementPointsLossDodge = fightMovementPointsLossDodge;

function fightSpellImmunity(castingSpellId, fighterId) {
	FightEventsHelper.push(FightEventEnum.FIGHTER_SPELL_IMMUNITY, [fighterId], 0, castingSpellId);
}
exports.fightSpellImmunity = fightSpellImmunity;

function fightDispelEffectStep(castingSpellId, fighterId, boostUID) {
	var fighter = window.gui.fightManager.getFighter(fighterId);
	if (!fighter) {
		return console.error('Fighter ' + fighterId + ' does not exist.');
	}
	var buff = fighter.getBuff(boostUID);
	if (buff && buff instanceof Buff.StateBuff) {
		if (buff.actionId === 952) { // COMPAT226 952: ActionIdConverter.ACTION_FIGHT_DISABLE_STATE in 2.26 code
			fightEnteringStateStep(-1, buff.targetId, buff.stateId, buff.effect.getDurationString());
		} else {
			fightLeavingStateStep(-1, buff.targetId, buff.stateId);
		}
	}
	fighter.dispelUniqueBuff(boostUID, true, false, true);
}
exports.fightDispelEffectStep = fightDispelEffectStep;

function fightDispelSpellStep(castingSpellId, fighterId, spellId) {
	var fighter = window.gui.fightManager.getFighter(fighterId);
	if (!fighter) {
		return console.error('Fighter ' + fighterId + ' does not exist.');
	}
	fighter.dispelSpell(spellId, true);
	FightEventsHelper.push(FightEventEnum.FIGHTER_SPELL_DISPELLED, [fighterId, spellId], fighterId, castingSpellId);
}
exports.fightDispelSpellStep = fightDispelSpellStep;

function fightDispelStep(castingSpellId, fighterId) {
	var fighter = window.gui.fightManager.getFighter(fighterId);
	if (!fighter) {
		return console.error('Fighter ' + fighterId + ' does not exist.');
	}
	fighter.dispel();
	FightEventsHelper.push(FightEventEnum.FIGHTER_GOT_DISPELLED, [fighterId], fighterId, castingSpellId);
}
exports.fightDispelStep = fightDispelStep;

function fightReflectSpellStep(castingSpellId, fighterId) {
	FightEventsHelper.push(FightEventEnum.FIGHTER_REFLECTED_SPELL, [fighterId], fighterId, castingSpellId);
}
exports.fightReflectSpellStep = fightReflectSpellStep;

function fightReflectDamagesStep(castingSpellId, fighterId) {
	FightEventsHelper.push(FightEventEnum.FIGHTER_REFLECTED_DAMAGES, [fighterId], fighterId, castingSpellId);
}
exports.fightReflectDamagesStep = fightReflectDamagesStep;

function fightTackledStep(castingSpellId, fighterId) {
	FightEventsHelper.push(FightEventEnum.FIGHTER_GOT_TACKLED, [fighterId], 0, castingSpellId);
}
exports.fightTackledStep = fightTackledStep;

function fightKillStep(castingSpellId, fighterId, killerId) {
	FightEventsHelper.push(FightEventEnum.FIGHTER_GOT_KILLED, [killerId, fighterId], fighterId, castingSpellId);
}
exports.fightKillStep = fightKillStep;

function fightInvisibilityStep(castingSpellId, fighterId, visibilityState) {
	var fighter = window.gui.fightManager.getFighter(fighterId);
	if (!fighter) {
		return console.error('Fighter ' + fighterId + ' does not exist.');
	}
	var dispatchedState;
	var currentVisibilityState = fighter.data.stats.invisibilityState;
	if (visibilityState !== GameActionFightInvisibilityStateEnum.VISIBLE &&
		currentVisibilityState === GameActionFightInvisibilityStateEnum.VISIBLE) {
		dispatchedState = GameActionFightInvisibilityStateEnum.INVISIBLE;
	} else if (visibilityState === GameActionFightInvisibilityStateEnum.VISIBLE &&
		currentVisibilityState !== GameActionFightInvisibilityStateEnum.VISIBLE) {
		dispatchedState = GameActionFightInvisibilityStateEnum.VISIBLE;
	}
	if (dispatchedState) {
		FightEventsHelper.push(FightEventEnum.FIGHTER_VISIBILITY_CHANGED, [fighterId, dispatchedState], fighterId,
			castingSpellId);
	}
	fighter.data.stats.invisibilityState = visibilityState;
}
exports.fightInvisibilityStep = fightInvisibilityStep;

function fightTriggerGlyphTrapStep(castingSpellId, fighterId, casterId, triggeredSpellId) {
	// Process is the same for FIGHTER_TRIGGERED_TRAP so we actually do not care about the triggered type
	FightEventsHelper.push(FightEventEnum.FIGHTER_TRIGGERED_GLYPH, [fighterId, casterId, triggeredSpellId], 0,
		castingSpellId);
}
exports.fightTriggerGlyphTrapStep = fightTriggerGlyphTrapStep;

function fightCloseCombatStep(castingSpellId, fighterId, weaponId, critical) {
	FightEventsHelper.send(FightEventEnum.FIGHTER_CLOSE_COMBAT, [fighterId, weaponId, critical], fighterId,
		castingSpellId);
}
exports.fightCloseCombatStep = fightCloseCombatStep;

function fightSpellCastStep(castingSpellId, fighterId, spellId, critical) {
	FightEventsHelper.push(FightEventEnum.FIGHTER_CASTED_SPELL, [fighterId, spellId, critical], 0, castingSpellId);
}
exports.fightSpellCastStep = fightSpellCastStep;

function fightDeathStep(castingSpellId, entityId, naturalDeath) {
	if (naturalDeath === undefined) {
		naturalDeath = true;
	}
	var fightManager = window.gui.fightManager;
	var fighter = fightManager.getFighter(entityId);
	if (!fighter) {
		return console.error('Fighter ' + entityId + ' does not exist.');
	}
	fightManager.deadTurnsList.push(entityId);
	fighter.dispel(false, false, true);
	fightManager.removeLinkedBuff(entityId, false, true);
	fightManager.reaffectBuffs(entityId);
	fighter.setAlive(false);
	FightEventsHelper.push(naturalDeath ? FightEventEnum.FIGHTER_DEATH : FightEventEnum.FIGHTER_LEAVE, [entityId],
		entityId, castingSpellId);
}
exports.fightDeathStep = fightDeathStep;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/fightManager/steps.js
 ** module id = 282
 ** module chunks = 0
 **/