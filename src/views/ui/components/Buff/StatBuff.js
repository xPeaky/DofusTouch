var BasicBuff = require('./BasicBuff.js');
var inherits = require('util').inherits;
var ActionIdConverter = require('ActionIdConverter');

function StatBuff(effect, castingSpell, actionId, cb) {
	var self = this;
	BasicBuff.call(this, effect, castingSpell, actionId, effect.delta, null, null, function (error, buff) {
		if (error) {
			return cb(error);
		}
		self.statName = ActionIdConverter.getActionStatName(actionId);
		self.isABoost = ActionIdConverter.getIsABoost(actionId);
		return cb(null, buff);
	});
}
inherits(StatBuff, BasicBuff);
module.exports = StatBuff;

StatBuff.prototype.getDelta = function () {
	if (this.effect._type === 'EffectInstanceDice') {
		return this.isABoost ? this.effect.diceNum : -this.effect.diceNum;
	}
	return 0;
};

StatBuff.prototype.apply = function () {
	var delta = this.getDelta();
	this.incrementStats(delta);

	BasicBuff.prototype.apply.call(this);
};

StatBuff.prototype.remove = function () {
	if (!this._removed) {
		if (!this.effect.effect.active) {
			var delta = this.getDelta();
			this.decrementStats(delta);
		}
	}

	BasicBuff.prototype.remove.call(this);
};

StatBuff.prototype.disable = function () {
	if (!this._disabled) {
		if (this.effect.effect.active) {
			var delta = this.getDelta();
			this.decrementStats(delta);
		}
	}

	BasicBuff.prototype.disable.call(this);
};

StatBuff.prototype.incrementStats = function (delta) {
	var gui = window.gui;

	var fighter = gui.fightManager.getFighter(this.targetId);
	if (!fighter) {
		console.error('Trying to apply a stats buff on non-existing fighter ' + this.targetId);
		return;
	}

	// Apply stats modifications to fighter entities
	var stats = fighter.data.stats;
	switch (this.statName) {
		case 'vitality':
			stats.lifePoints += delta;
			stats.maxLifePoints += delta;
			break;
		case 'lifePointsMalus':
			stats.lifePoints = Math.min(stats.lifePoints + delta, stats.maxLifePoints);
			break;
		case 'lifePoints':
		case 'shieldPoints':
		case 'dodgePALostProbability':
		case 'dodgePMLostProbability':
			stats[this.statName] = Math.max(stats[this.statName] + delta, 0);
			break;
		case 'agility':
			stats.tackleEvade += ~~(delta / 10);
			stats.tackleBlock += ~~(delta / 10);
			break;
		case 'globalResistPercentMalus':
		case 'globalResistPercentBonus':
			var multi = (this.statName === 'globalResistPercentBonus') ? 1 : -1;
			stats.neutralElementResistPercent += delta * multi;
			stats.airElementResistPercent += delta * multi;
			stats.waterElementResistPercent += delta * multi;
			stats.earthElementResistPercent += delta * multi;
			stats.fireElementResistPercent += delta * multi;
			break;
		case 'actionPoints':
			stats.actionPoints += delta;
			stats.maxActionPoints += delta;
			break;
		case 'movementPoints':
			stats.movementPoints += delta;
			stats.maxMovementPoints += delta;
			break;
		default:
			if (stats.hasOwnProperty(this.statName)) {
				stats[this.statName] += delta;
			}
			break;
	}

	// Finally we update the character entity.
	// NB: setCharacteristic sends an event
	var characters = gui.playerData.characters;
	if (characters.mainCharacterId === this.targetId || characters.controlledCharacterId === this.targetId) {
		var character;
		if (characters.mainCharacterId === this.targetId) {
			character = characters.mainCharacter;
		} else {
			character = characters.getControlledCharacter();
		}

		// If the buff is applied at creation but stats of the character has been synchronized, do not update his stats
		if (character.timeStatsSynchronized - this.timeCreationStarted > 0) {
			if (this.statName === 'summonableCreaturesBoost') {
				gui.fightManager.emit('updateSpellsAvailability');
			} else if (this.statName === 'range') {
				window.foreground.refreshSpellRange();
			}
			return;
		}

		var targetCaracs = character.characteristics;

		if (targetCaracs.hasOwnProperty(this.statName)) {
			targetCaracs[this.statName].contextModif += delta;
		}

		switch (this.statName) {
			case 'vitality': // change max life points AND current life points
				character.setCharacteristic('maxLifePoints', Math.max(0, targetCaracs.maxLifePoints + delta));
				character.setCharacteristic('lifePoints', Math.max(0, targetCaracs.lifePoints + delta));
				break;
			case 'lifePoints': // change only current life points
			case 'lifePointsMalus': // change only current life points
				character.setCharacteristic('lifePoints', Math.max(0, targetCaracs.lifePoints + delta));
				break;
			case 'movementPoints':
				character.setCharacteristic('movementPointsCurrent', targetCaracs.movementPointsCurrent + delta);
				break;
			case 'actionPoints':
				character.setCharacteristic('actionPointsCurrent', targetCaracs.actionPointsCurrent + delta);
				break;
			case 'summonableCreaturesBoost':
				gui.fightManager.emit('updateSpellsAvailability');
				break;
			case 'range':
				window.foreground.refreshSpellRange();
				break;
		}
	}
	// Do not add code below (unless you read the comment above about setCharacteristic and know it is OK)
};

StatBuff.prototype.decrementStats = function (delta) {
	this.incrementStats(-delta);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/Buff/StatBuff.js
 ** module id = 229
 ** module chunks = 0
 **/