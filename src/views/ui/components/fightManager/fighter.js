var WuiDom = require('wuidom');
var CharacterDisplay = require('CharacterDisplayWebGL');
var DirectionsEnum = require('DirectionsEnum');
var gameOptions = require('gameOptions');
var TeamEnum = require('TeamEnum');
var Buff = require('Buff');
var FighterData = require('fightManager/fighterData');
var getText = require('getText').getText;

                                           // Original values in Dofus
var DEFAULT_FRAME_WIDTH = 40;              // 59
var SUMMON_FRAME_WIDTH = 30;

var SHIELD_BAR_WIDTH = 7;
var MAX_RESISTANCE_PERCENTAGE = 50;
var MIN_TACKLE_BLOCK = 0;

function Fighter(id, isIllusion) {
	this.data = new FighterData();

	this.id = id;
	this.name = null;
	this.level = null;
	this.isBomb = false;
	this.isCreature = false;
	this.canTackle = true;
	this.buffs = [];
	this._finishingBuffs = [];
	this.states = [];

	this.spells = {};

	if (!isIllusion) {
		this.picto = this.createPicto(id);
		this.isShieldBarVisible = false;

		window.gui.timeline.linkToTimeline(this);
	}
}
module.exports = Fighter;

Fighter.prototype.clear = function () {
	if (this.picto) {
		this.picto.destroy();
	}
};

Fighter.prototype.createPicto = function (id) {
	var picto = new WuiDom('div', { name: id, className: 'fighter' });

	picto.fighterTimeBar    = picto.createChild('div', { className: 'fighterTimeBar' });
	picto.fighterTimeValue  = picto.fighterTimeBar.createChild('div', { className: 'fighterTimeValue' });

	picto.fighterIllus      = picto.appendChild(new CharacterDisplay({ className: 'fighterIllus', scale: 'fitin' }));

	picto.fighterHPBar      = picto.createChild('div', { className: 'fighterHPBar' });
	picto.fighterHPValue    = picto.fighterHPBar.createChild('div', { className: 'fighterHPValue' });

	picto.fighterShieldBar   = picto.createChild('div', { className: 'fighterShieldBar', hidden: true });
	picto.fighterShieldValue = picto.fighterShieldBar.createChild('div', { className: 'fighterShieldValue' });

	picto.fighterNumber = picto.createChild('div', { className: 'fighterNumber' });

	picto.fighterNumber.toggleDisplay(!!gameOptions.orderFighters);

	return picto;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Create stats details WuiDom element
 *  @private
 */
Fighter.prototype.createStatsTooltipContent = function () {
	var newLine;
	var statsDetails = new WuiDom('table', { className: 'statsDetails', name: 'statsDetails' });
	newLine = statsDetails.createChild('tr');

	statsDetails.fighterName = newLine.createChild('td', { className: 'fighterName', attr: { colspan: 3 } });
	statsDetails.level = newLine.createChild('td', { className: 'fighterLevel', attr: { colspan: 2 } });

	newLine = statsDetails.createChild('tr');

	statsDetails.lifePoints = newLine.createChild('td', { className: ['label', 'iconLifePoints'],
		attr: { colspan: 2 }
	});
	statsDetails.shieldPoints = newLine.createChild('td', { className: ['label', 'iconShieldPoints'] });
	statsDetails.fighterUsedAP = newLine.createChild('td', { className: ['label', 'iconActionPoints'] });
	statsDetails.movementPoints = newLine.createChild('td', { className: ['label', 'iconMovementPoints'] });

	newLine = statsDetails.createChild('tr');

	statsDetails.dodgePALostProbability = newLine.createChild('td', { className: ['label', 'iconActionPoints'] });
	statsDetails.dodgePMLostProbability = newLine.createChild('td', { className: ['label', 'iconMovementPoints'] });
	statsDetails.tackleBlock = newLine.createChild('td', { className: ['label', 'iconTackle'] });
	statsDetails.criticalDamageReduction = newLine.createChild('td', { className: ['label', 'iconCriticalDamage'] });
	statsDetails.pushDamageReduction = newLine.createChild('td', { className: ['label', 'iconPushDamageReduction'] });

	newLine = statsDetails.createChild('tr');

	statsDetails.neutral = newLine.createChild('td', { className: ['label', 'iconYinyang'] });
	statsDetails.strength = newLine.createChild('td', { className: ['label', 'iconStrength'] });
	statsDetails.intelligence = newLine.createChild('td', { className: ['label', 'iconIntelligence'] });
	statsDetails.chance = newLine.createChild('td', { className: ['label', 'iconChance'] });
	statsDetails.agility = newLine.createChild('td', { className: ['label', 'iconAgility'] });

	newLine = statsDetails.createChild('tr');

	statsDetails.neutralPercent = newLine.createChild('td', { className: ['label', 'iconYinyang'] });
	statsDetails.strengthPercent = newLine.createChild('td', { className: ['label', 'iconStrength'] });
	statsDetails.intelligencePercent = newLine.createChild('td', { className: ['label', 'iconIntelligence'] });
	statsDetails.chancePercent = newLine.createChild('td', { className: ['label', 'iconChance'] });
	statsDetails.agilityPercent = newLine.createChild('td', { className: ['label', 'iconAgility'] });

	this.refreshStatsTooltipContent(statsDetails);

	return statsDetails;
};

Fighter.prototype.refreshStatsTooltipContent = function (statsDetails) {
	var stats = this.data.stats;

	statsDetails.fighterName.setText(this.name);
	statsDetails.level.setText(getText('ui.common.short.level') + ' ' + this.level);
	statsDetails.lifePoints.setText(stats.lifePoints + ' / ' + stats.maxLifePoints);
	statsDetails.shieldPoints.setText(stats.shieldPoints);
	statsDetails.fighterUsedAP.setText(stats.actionPoints);
	statsDetails.movementPoints.setText(stats.movementPoints);
	statsDetails.dodgePALostProbability.setText(stats.dodgePALostProbability);
	statsDetails.dodgePMLostProbability.setText(stats.dodgePMLostProbability);
	statsDetails.tackleBlock.setText(Math.max(MIN_TACKLE_BLOCK, stats.tackleBlock));
	statsDetails.criticalDamageReduction.setText(stats.criticalDamageFixedResist);
	statsDetails.pushDamageReduction.setText(stats.pushDamageFixedResist);
	statsDetails.neutral.setText(stats.neutralElementReduction);
	statsDetails.strength.setText(stats.earthElementReduction);
	statsDetails.intelligence.setText(stats.fireElementReduction);
	statsDetails.chance.setText(stats.waterElementReduction);
	statsDetails.agility.setText(stats.airElementReduction);
	if (this.data._type === 'GameFightCharacterInformations') {
		statsDetails.neutralPercent.setText(Math.min(MAX_RESISTANCE_PERCENTAGE, stats.neutralElementResistPercent) + '%');
		statsDetails.strengthPercent.setText(Math.min(MAX_RESISTANCE_PERCENTAGE, stats.earthElementResistPercent) + '%');
		statsDetails.intelligencePercent.setText(
			Math.min(MAX_RESISTANCE_PERCENTAGE, stats.fireElementResistPercent) + '%'
		);
		statsDetails.chancePercent.setText(Math.min(MAX_RESISTANCE_PERCENTAGE, stats.waterElementResistPercent) + '%');
		statsDetails.agilityPercent.setText(Math.min(MAX_RESISTANCE_PERCENTAGE, stats.airElementResistPercent) + '%');
	} else {
		statsDetails.neutralPercent.setText(stats.neutralElementResistPercent + '%');
		statsDetails.strengthPercent.setText(stats.earthElementResistPercent + '%');
		statsDetails.intelligencePercent.setText(stats.fireElementResistPercent + '%');
		statsDetails.chancePercent.setText(stats.waterElementResistPercent + '%');
		statsDetails.agilityPercent.setText(stats.airElementResistPercent + '%');
	}
};

Fighter.prototype.getFinishingBuffs = function () {
	var finishingBuffs = this._finishingBuffs;
	this._finishingBuffs = [];
	return finishingBuffs;
};

Fighter.prototype.synchronizeData = function (fighterData) {
	this.applyFinishingBuffs(fighterData);

	this.setAlive(fighterData.alive);

	this.data.updateData(fighterData);

	this.setHP(fighterData.stats.lifePoints);
	this.setShield(fighterData.stats.shieldPoints);
};

Fighter.prototype.applyFinishingBuffs = function (fighterData) {
	var finishingBuffs = this.getFinishingBuffs();
	if (finishingBuffs.length === 0) {
		return;
	}
	for (var i = 0; i < finishingBuffs.length; i++) {
		var finishingBuff = finishingBuffs[i];
		var statName = finishingBuff.statName;
		for (var j = 0; j < this.buffs.length; j++) {
			var buff = this.buffs[j];
			if (buff.id !== finishingBuff.id || !statName || !fighterData.stats.hasOwnProperty(statName) ||
				!buff.effect.effect.active) {
				continue;
			}
			if (statName === 'actionPoints') {
				fighterData.stats.maxActionPoints = fighterData.stats.maxActionPoints - finishingBuff.getDelta();
			}
			fighterData.stats[statName] = fighterData.stats[statName] - finishingBuff.getDelta();
		}
	}
};

Fighter.prototype.getAvailableWidth = function () {
	var frameWidth = this.isSummon() ? SUMMON_FRAME_WIDTH : DEFAULT_FRAME_WIDTH;
	return this.isShieldBarVisible ? frameWidth - SHIELD_BAR_WIDTH : frameWidth;
};

Fighter.prototype.isSummon = function () {
	return this.data.stats.summoned;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Resize fighter illustration depending on shield bar visibility
 */
Fighter.prototype.resizeFighterIllustration = function () {
	if (!this.picto) {
		return;
	}
	var width = this.getAvailableWidth();

	this.picto.fighterTimeBar.setStyles({ width: width + 'px' });
	this.picto.fighterIllus.setStyles({ width: width + 'px' });
	this.picto.fighterIllus.resize();
};

Fighter.prototype.setData = function (fighterInformations) {
	this.data.updateData(fighterInformations);

	// Force the fighter to be set whether alive or dead when reconnecting in fight
	var alive = fighterInformations.alive;
	this.data.alive = null;
	this.setAlive(alive);

	this.setHP(this.data.stats.lifePoints);
	this.setShield(this.data.stats.shieldPoints);
	this.setNameAndLevel(fighterInformations);

	if (this.picto) {
		if (fighterInformations.teamId === TeamEnum.TEAM_CHALLENGER) {
			this.picto.addClassNames('challenger');
		}
		if (fighterInformations.stats.summoned) {
			this.picto.addClassNames('summoned');
		}
		if (this.data.look) {
			this.updateFighterIllustration();
		}
		this.resizeFighterIllustration();
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Set if a fighter is alive
 * @param {boolean} isAlive - whether the fighter is alive or dead
 * @param {boolean} isRefresh - true when timeline refreshes
 */
Fighter.prototype.setAlive = function (isAlive, isRefresh) {
	if (this.data.alive === isAlive && !isRefresh) { return; }

	this.data.alive = isAlive;
	if (!isAlive) {
		this.setHP(0);
		this.setShield(0);
	}

	if (this.picto) {
		this.picto.toggleClassName('dead', !isAlive);
		// We do NOT change visibility until the whole timeline refreshes (doing otherwise would break the layout)
		if (isRefresh) { this.picto.toggleDisplay(isAlive || !gameOptions.hideDeadFighters); }
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Set life bar progress of a fighter
 * @param {Number} lifePoints - current life points of the fighter
 */
Fighter.prototype.setHP = function (lifePoints) {
	if (!this.data.stats) {
		return;
	}

	lifePoints = Math.max(0, lifePoints);

	var stats = this.data.stats;
	stats.lifePoints = lifePoints;

	var isCurrentPlayedFighter = this.id === window.gui.playerData.characters.controlledCharacterId;
	if (isCurrentPlayedFighter) {
		var controlledCharacter = window.gui.playerData.characters.getControlledCharacter();
		controlledCharacter.setCharacteristic('lifePoints', stats.lifePoints);
		controlledCharacter.setCharacteristic('maxLifePoints', stats.maxLifePoints);
	}

	// TODO: Cap at 100% since buff are not yet supported
	if (this.picto) {
		this.picto.fighterHPValue.setStyle('height', Math.min((lifePoints / stats.maxLifePoints) * 100, 100) + '%');
	}
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Set shield bar progress of a fighter
 * @param {Number} shieldPoints - current shield points of the fighter
 */
Fighter.prototype.setShield = function (shieldPoints) {
	if (!this.data.stats) {
		return;
	}

	shieldPoints = Math.max(0, shieldPoints);

	var stats = this.data.stats;
	stats.shieldPoints = shieldPoints;

	if (this.picto) {
		var visible = stats.shieldPoints !== 0;
		if (visible) {
			this.picto.fighterShieldValue.setStyle('height', (shieldPoints / stats.maxLifePoints) * 100 + '%');
		}

		if (this.isShieldBarVisible !== visible) {
			this.isShieldBarVisible = visible;
			this.picto.fighterShieldBar.toggleDisplay(visible);
			this.resizeFighterIllustration();
		}
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Set name and level of a fighter
 * @param {Number} fighterInformations - fighter data
 */
Fighter.prototype.setNameAndLevel = function (fighterInformations) {
	switch (fighterInformations._type) {
		case 'GameFightCharacterInformations':
			this.name = fighterInformations.name;
			this.level = fighterInformations.level;
			break;

		case 'GameFightMutantInformations':
			this.name = fighterInformations.name;
			this.level = fighterInformations.powerLevel;
			break;

		case 'GameFightMonsterInformations':
		case 'GameFightMonsterWithAlignmentInformations':
			this.name = fighterInformations._name;
			this.level = fighterInformations._level;
			this.isBomb = fighterInformations._isBomb;
			this.isCreature = fighterInformations._isCreature;
			this.canTackle = fighterInformations._canTackle;
			break;

		case 'GameFightTaxCollectorInformations':
			this.name = fighterInformations._name;
			this.level = fighterInformations.level;
			break;

		default:
			console.warn('Retrieving details of fighter type "' + fighterInformations._type + '" not supported');
			break;
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Update fighter's illustration
 */
Fighter.prototype.updateFighterIllustration = function () {
	if (!this.picto) {
		return;
	}
	this.picto.fighterIllus.setLook(this.data.look, {
		riderOnly: true,
		direction: DirectionsEnum.DIRECTION_SOUTH_EAST,
		animation: 'AnimArtwork',
		boneType:  'timeline/',
		skinType:  'timeline/',
		showSubentities: false
	});
};

Fighter.prototype.refreshHP = function () {
	if (this.data.alive) {
		this.setHP(this.data.stats.lifePoints);
	}
};

Fighter.prototype.refreshShield = function () {
	this.setShield(this.data.stats.shieldPoints);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Update the turn number of a fighter
 * @param {Number} number - fighter turn number
 */
Fighter.prototype.updateNumber = function (number) {
	if (!this.picto) {
		return;
	}
	var turnNumber = number || '';
	this.picto.fighterNumber.setText(turnNumber);

	if (gameOptions.orderFighters) {
		window.actorManager.turnNumberOn(this.id, turnNumber);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// Buffs related methods

Fighter.prototype.addBuff = function (buff, applyBuff) {
	applyBuff = applyBuff === undefined ? true : applyBuff;

	var sameBuff;

	for (var i = 0, len = this.buffs.length; i < len; i++) {
		if (buff.equals(this.buffs[i])) {
			sameBuff = this.buffs[i];
			break;
		}
	}

	if (sameBuff) {
		var spellCanStack = sameBuff.castingSpell.spellRank && sameBuff.castingSpell.spellRank.maxStack > 0;
		var buffStackFull = spellCanStack && sameBuff.stack &&
			sameBuff.stack.length === sameBuff.castingSpell.spellRank.maxStack;
		if (buffStackFull) {
			return;
		}
		sameBuff.add(buff);
	} else {
		this.buffs.push(buff);
	}

	if (applyBuff) {
		buff.apply();
	}

	if (sameBuff) {
		window.gui.fightManager.emit('BuffUpdate', sameBuff, this);
	} else {
		window.gui.fightManager.emit('BuffAdd', buff, this);
	}
};

Fighter.prototype.updateBuff = function (buff) {
	var buffIndex = this.getBuffIndex(buff.id);

	if (buffIndex === -1) {
		return false;
	}

	var oldBuff = this.buffs[buffIndex];
	oldBuff.remove();
	oldBuff.updateParam(buff.getParam1(), buff.getParam2(), buff.getParam3(), buff.id);
	oldBuff.apply();

	window.gui.fightManager.emit('BuffUpdate', oldBuff, this);

	return true;
};

Fighter.prototype.getBuff = function (buffId) {
	for (var i = 0; i < this.buffs.length; i++) {
		var buff = this.buffs[i];
		if (buffId === buff.id) {
			return buff;
		}
	}
	return null;
};

Fighter.prototype.getBuffIndex = function (buffId) {
	for (var i = 0; i < this.buffs.length; i++) {
		var buff = this.buffs[i];
		if (buffId === buff.id) {
			return i;
		} else if (buff.stack) {
			for (var j = 0; j < buff.stack.length; j++) {
				if (buffId === buff.stack[j].id) {
					return i;
				}
			}
		}
	}
	return -1;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// States related methods

Fighter.prototype.addState = function (stateId) {
	this.states.push(stateId);
};

Fighter.prototype.removeState = function (stateId) {
	if (this.states.indexOf(stateId) !== -1) {
		this.states.splice(this.states.indexOf(stateId), 1);
	}
};

Fighter.prototype.hasState = function (stateId) {
	return this.states.indexOf(stateId) !== -1;
};

/**
 * Try to remove all the dispellable spells
 * @param {Boolean} forceUndispellable - remove also undispellable spells (but not critical ones)
 * @param {Boolean} critical           - remove critical buffs also
 * @param {Boolean} dying              - dispel is triggered by character death
 */
Fighter.prototype.dispel = function (forceUndispellable, critical, dying) {
	var remainingBuffs = [];
	for (var i = 0; i < this.buffs.length; i++) {
		var buff = this.buffs[i];
		if (buff.canBeDispell(forceUndispellable, Number.MIN_VALUE, dying)) {
			window.gui.fightManager.emit('BuffRemove', buff, this);
			buff.remove();
		} else {
			remainingBuffs.push(buff);
		}
	}

	this.buffs = remainingBuffs;
};

/**
 * Remove all the buffs from a specific spell
 * @param {Number} spellId             - id of the spell which is buffed
 * @param {Boolean} forceUndispellable - remove also undispellable spells (but not critical ones)
 * @param {Boolean} critical           - remove critical buffs also
 * @param {Boolean} dying              - dispel is triggered by character death
 */
Fighter.prototype.dispelSpell = function (spellId, forceUndispellable, critical, dying) {
	var deletedBuffs = [];
	var remainingBuffs = [];
	var i;
	for (i = 0; i < this.buffs.length; i++) {
		var buff = this.buffs[i];
		if (spellId === buff.castingSpell.spell.id && buff.canBeDispell(forceUndispellable, Number.MIN_VALUE, dying)) {
			buff.remove();
			deletedBuffs.push(buff);
		} else {
			remainingBuffs.push(buff);
		}
	}

	this.buffs = remainingBuffs;

	for (i = 0; i < deletedBuffs.length; i++) {
		window.gui.fightManager.emit('BuffRemove', deletedBuffs[i], this);
	}
};

Fighter.prototype.dispelUniqueBuff = function (boostUID, forceUndispellable, dying, ultimateDebuff) {
	var buffIndex = this.getBuffIndex(boostUID);
	if (buffIndex === -1) {
		//TODO: fix me that should be an error
		return console.warn('Buff id', boostUID, 'does not exist');
	}
	var buff = this.buffs[buffIndex];
	var fightManager = window.gui.fightManager;

	if (!buff.canBeDispell(forceUndispellable, ultimateDebuff ? boostUID : Number.MIN_VALUE, dying)) {
		return;
	}

	buff.remove();
	if (!dying && buff.stack && buff.stack.length > 1) {
		switch (buff.actionId) {
			case 293:
				buff.setParam1(buff.stack[0].getParam1());
				buff.setParam2(buff.getParam2() - buff.stack[0].getParam2());
				buff.setParam3(buff.getParam3() - buff.stack[0].getParam3());
				break;
			case 788:
				buff.setParam1(buff.getParam1() - buff.stack[0].getParam2());
				break;
			case 950:
			case 951:
				break;
			default:
				buff.setParam1(buff.getParam1() - buff.stack[0].getParam1());
				buff.setParam2(buff.getParam2() - buff.stack[0].getParam2());
				buff.setParam3(buff.getParam3() - buff.stack[0].getParam3());
				break;
		}
		buff.stack.shift();
		buff.refreshDescription();
		buff.apply();
		fightManager.emit('BuffUpdate', buff, this);
	} else {
		this.buffs.splice(buffIndex, 1);
		// Called twice in Ankama's code
		fightManager.emit('BuffRemove', buff, this);
		fightManager.emit('BuffRemove', buff, this);
	}
};

Fighter.prototype.markFinishingBuffs = function () {
	var fightManager = window.gui.fightManager;
	for (var buffId in this.buffs) {
		var buff = this.buffs[buffId];
		if (buff.duration !== 1) {
			continue;
		}
		var mark = false;
		var state = 0;
		var casterFound = false;
		for (var i = 0; i < fightManager.turnsList.length; i++) {
			var fighterId = fightManager.turnsList[i];
			if (fighterId === buff.aliveSource) {
				casterFound = true;
			}
			if (fighterId === fightManager.currentFighterId) {
				state = 1;
			}
			if (state === 1) {
				if (casterFound && fighterId !== fightManager.currentFighterId) {
					state = 2;
					mark = true;
				} else if (fighterId === this.id && fighterId !== fightManager.currentFighterId) {
					state = 2;
					mark = false;
				}
			}
		}
		if (mark) {
			if (buff instanceof Buff.StatBuff && this.id !== window.gui.playerData.characters.mainCharacterId) {
				if (buff.statName) {
					var fighter = fightManager.getFighter(buff.targetId);
					if (!fighter) {
						return console.error('Mark finishing buffs failed, fighter does not exist');
					}
					fighter._finishingBuffs.push(buff);
				}
			}
			buff.disable();
		}
	}
};

Fighter.prototype.enableBuffs = function () {
	for (var buffId in this.buffs) {
		this.buffs[buffId].enable();
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/fightManager/fighter.js
 ** module id = 236
 ** module chunks = 0
 **/