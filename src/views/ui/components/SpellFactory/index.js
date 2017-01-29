var async = require('async');
var effectInstanceFactory = require('effectInstanceFactory');
var CharacterSpellModificationTypeEnum = require('CharacterSpellModificationTypeEnum');
var helper = require('helper');
var staticContent = require('staticContent');
var assetPreloading = require('assetPreloading');
var constants = require('constants');
var SpellModificator = require('SpellModificator');

var WEAPON_SPELL_ID = exports.WEAPON_SPELL_ID = 0;

// If we have spell's 0 data in cache when it needs to be loaded alone, it's loaded synchronously which is solving
// a certain number of issues (especially when a weapon is un-equipped or changed).
var weaponSpellDataCache;

exports.placeHolder = constants.MISSING_TEXTURE_IMAGE_SRC;
function initialize(cb) {
	// we don't want to wait for this cb
	assetPreloading.preloadImage('ui/SpellPlaceholder.png', function (url) {
		exports.placeHolder = url;
	});
	collectSpellsData([WEAPON_SPELL_ID], null, function (err, data) {
		if (err) { return cb(err); }
		weaponSpellDataCache = data;
		cb();
	});
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// js hint pre-declarations

var collectSpellsData, getCriticalHitProbability, getPropertyFromItem, getPropertyFromSpell;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// helpers

function defaultCallback(err, data) {
	if (err) {
		return console.error(err);
	}
	console.log('data:', data);
}

var spellUid = 0;
function generateUid() {
	return ++spellUid;
}

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @class Spell
 * @desc Spell entity. Should not be called directly but retrieved via the following `createSpells` method
 *       All elements provided are for reading purpose only. If something need to be changed then use the
 *       right setter, so far there are only two: `.setLevel()` and `.setPosition()`.
 *       Inside the object we find:
 *
 *       {string}  id         : Spell id
 *       {string}  _uid       : Client spell instance uid
 *       {number}  level      : Spell level. Default is 1 and stays like this until changed with `.setLevel()`
 *       {object}  spell      : Direct access to the spell's staticData from `Spells` table
 *       {boolean} isLoaded   : To check if everything have been loaded successfully
 *       {number}  position   : Not used here: information sent by the server for player's spells
 *       {object}  spellLevel : Direct access to the `spellLevel` staticData for the current spell level
 *                              (updated when using `.setLevel()`)
 *       {object}  _tables    : All the staticData required to work with this spell
 */

function Spell() {
	this._uid = generateUid();
}

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @function spellInitFromSpellId
 * @desc Initialize a Spell object. Should be called right after the `new Spell()` instanciation.
 * @param {string}   spellId - spell id
 * @param {object}   cache   - tables in which we can find all the required data, else it's going to hit the server
 * @param {function} cb      - called when the spell object creation is finished
 */

function spellInitFromSpellId(spellId, cache, cb) {
	var self = this;

	this.id = parseInt(spellId, 10);
	this.ownerId = null;
	this.position = null;
	this.isItem = false;
	this.level = null;
	this.isLoaded = false;

	this.spell = null;
	this._tables = {};

	collectSpellsData(spellId, cache, function (err, tables) {
		if (err) {
			return cb(err);
		}

		// move effectInstances from tables to the root of the spell
		self.effectInstances = tables.effectInstances;
		delete tables.effectInstances;

		self._tables = tables;
		self.spell = tables.spells[self.id];
		self.setLevel(self.level || 1);
		self.isLoaded = true;
		cb();
	});
}

function spellInitFromItemInstance(itemInstance) {
	this.id = WEAPON_SPELL_ID;
	this.ownerId = null;
	this.position = null;
	this.isItem = true;
	this.level = 1;

	this._item = itemInstance;

	this.effectInstances = {};
	for (var i = 0; i < this._item.effects.length; i++) {
		this.effectInstances[this.getSpellLevelId() + '-effects-' + i] = this._item.effects[i];
	}

	// If itemInstance is not completly initialized, effects are not effectInstances yet but just
	// raw data. We need to have real effectInstances to consider the spell to be loaded.
	if (!itemInstance.isInitialised) {
		var self = this;
		return itemInstance.once('initialised', function () {
			spellInitFromItemInstance.call(self, itemInstance);
		});
	}

	this.isLoaded = true;
}

// change the spell level
Spell.prototype.setLevel = function (lvl) {
	if (this.isItem) {
		if (lvl !== 1) { console.warn('Spell#setLevel called on item with level != 1', lvl); }
		return; // for items we do nothing anyway, level stays 1
	}
	this.level = lvl;
	if (!lvl || lvl < 1 || lvl > this.spell.spellLevels.length) {
		return console.error(new Error('invalid level ' + lvl + ' for spell #' + this.id));
	}
	this.spellLevel = this._getSpellLevelByLevel(this.level);
};

// change the spell position
Spell.prototype.setPosition = function (position) {
	this.position = position;
};

/** Gets spellLevel data based on level. Private. See getProperty('spellLevel') for public use.
 *  NB: items should never call this => protect your call with if (!this.isItem) ...
 *  @private
 */
Spell.prototype._getSpellLevelByLevel = function (level) {
	if (this.isItem) {
		return console.error(new Error('Spell#_getSpellLevelByLevel called on item for Spell id ' + this.id));
	}
	return this._tables.spellLevels[this.spell.spellLevels[level - 1]];
};

// default is current level
Spell.prototype.getSpellLevelId = function (level) {
	if (this.isItem) {
		return 'weapon';
	}
	level = (level !== undefined) ? level : this.level;
	return this._getSpellLevelByLevel(level).id;
};

// a spell having multiple effects, each one with its own area of effect, when we want to
//   retrieve the `spell`'s area of effect (for spell information display purpose usually)
//   we have to go through the following logic
//
// NOTE: in 2.14 client source code, this method (named getSpellZone) is duplicated slightly
//       differently over two different places: once in SpellZoneManager.as, that's the version
//       implemented here; and another time in FightSpellCastFrame.as (obviously a copy/paste
//       that has not been updated when the SpellZoneManager.as one was evolving). This
//       outdated version (but still required to behave as we should in fight without having to
//       update the database) is implemented here under the name `getZoneEffectWhenCasting`.
//       In further version of the client (2.16 for instance) the code has been unified and
//       the algorithm is also quite different (taking the larger area).
//       cf. DOT-499
Spell.prototype.getZoneEffect = function () {
	var zoneEffect;
	var ray = 63;

	var isWeapon = this.id === WEAPON_SPELL_ID && window.gui.playerData.inventory.getCurrentWeapon();
	var effects = isWeapon ? this._item.effects : this.spellLevel.effects;

	// We grab the smaller area excluding areas that are the entire map
	// cf. SpellZoneManager.as, getSpellZone
	for (var i = 0; i < effects.length; i++) {
		var ze = this.effectInstances[this.getSpellLevelId() + '-effects-' + i].getZoneEffect();
		if (ze.zoneShape && ze.zoneSize > 0 && ze.zoneSize < ray) {
			ray = ze.zoneSize;
			zoneEffect = ze;
		}
	}

	return zoneEffect || effectInstanceFactory.parseZone('P');
};

// see above getZoneEffect's NOTE
Spell.prototype.getZoneEffectWhenCasting = function () {
	var zoneEffect;

	var isWeapon = this.id === WEAPON_SPELL_ID && window.gui.playerData.inventory.getCurrentWeapon();
	var effects = isWeapon ? this._item.effects : this.spellLevel.effects;

	// We grab the latest area
	// cf. FightSpellCastFrame.as, getSpellZone
	for (var i = 0; i < effects.length; i++) {
		var ze = this.effectInstances[this.getSpellLevelId() + '-effects-' + i].getZoneEffect();
		if (ze.zoneShape && ze.zoneSize > 0) {
			zoneEffect = ze;
		}
	}

	return zoneEffect || effectInstanceFactory.parseZone('P');
};

// return the human readable description of the area of effect
Spell.prototype.getHumanReadableZoneInfo = function () {
	return effectInstanceFactory.getHumanReadableZoneInfo(this.getZoneEffect());
};

/** Returns the maximum level for the spell or item.
 *  NB: items and weapon-spell return a max level of 1
 */
Spell.prototype.getMaxLevel = function () {
	// special case: items and weapon's spell are not upgradable
	if (this.isItem || this.id === WEAPON_SPELL_ID) {
		return 1;
	}
	return this.spell.spellLevels.length;
};

// returns the human readable spell type (character class, monster, glyph...)
Spell.prototype.getHumanReadableSpellType = function () {
	return window.gui.databases.SpellTypes[this.getProperty('typeId')].longNameId;
};

Spell.prototype.getEffectsIds = function (level) {
	// special case: for an item "virtual spell", the list is much simpler than for a spell
	if (this.isItem) {
		return Object.keys(this.effectInstances);
	}
	return this._getSpellLevelByLevel(level || this.level).effects;
};

Spell.prototype.getCriticalEffectsIds = function (level) {
	// special case: for an item "virtual spell", there are no critical effects
	if (this.isItem) {
		return [];
	}
	return this._getSpellLevelByLevel(level || this.level).criticalEffect;
};

// returns the cost for upgrading spell
//   - called with 0 arguments : returns the cost to upgrade from current level to next
//   - called with 1 argument  : returns the cost to upgrade from current level to the given argument
//   - called with 2 arguments : returns the cost to upgrade from first argument level to the second one
Spell.prototype.getUpgradeCost = function (currentLevel, nextLevel) {
	// special case: an item "virtual spell" cannot be upgraded
	if (this.isItem) {
		return null;
	}

	if (nextLevel === undefined && currentLevel === undefined) {
		currentLevel = this.level;
		nextLevel = currentLevel + 1;
	} else if (nextLevel === undefined) {
		nextLevel = currentLevel;
		currentLevel = this.level;
	}

	var initialCost = 0;
	var costReduction = 0;
	for (var i = 1; i <= currentLevel; i += 1) {
		costReduction += (i - 1);
		initialCost += (i - 1);
	}
	// continue to iterate until the next level
	for (; i <= nextLevel; i += 1) {
		initialCost += (i - 1);
	}

	return initialCost - costReduction;
};

// returns the human readable name of the spell
Spell.prototype.getName = function () {
	return this.getProperty('nameId');
};

/** Gets a property from a Spell object - it may be a "real spell" or an item (e.g. weapon)
 *  @param {string} property - name of the property
 *  @param {number} [level] - level required (optional, range 1..6); if not given, spell's level is used
 */
Spell.prototype.getProperty = function (property, level) {
	level = level || this.level;

	var value = this.isItem ?
				getPropertyFromItem.call(this, property) :
				getPropertyFromSpell.call(this, property, level);

	if (property === 'range') {
		var characteristics = window.gui.playerData.characters.getControlledCharacter().characteristics;
		if (!characteristics) {
			return value;
		}
		var controlledEntityRange = characteristics.range;
		var rangeCanBeBoosted = this.isItem ?
								getPropertyFromItem.call(this, 'rangeCanBeBoosted') :
								getPropertyFromSpell.call(this, 'rangeCanBeBoosted', level);
		if (rangeCanBeBoosted) {
			var minimalRange = this.isItem ?
								getPropertyFromItem.call(this, 'minRange') :
								getPropertyFromSpell.call(this, 'minRange', level);
			var bonus = controlledEntityRange.base +
						controlledEntityRange.objectsAndMountBonus +
						controlledEntityRange.alignGiftBonus +
						controlledEntityRange.contextModif;
			if (value + bonus < minimalRange) {
				value = minimalRange;
			} else {
				value += bonus;
			}
		}
	}

	return value;
};

getPropertyFromSpell = function (property, level) {
	var spellLevel = this._getSpellLevelByLevel(level); // this is the *REQUESTED* level (default is current one)
	var spellModif, value;
	var getSpellModif = window.gui.playerData.characters.getSpellModifications;

	switch (property) {
		case 'id':
		case 'nameId':
		case 'descriptionId':
		case 'typeId':
		case 'iconId':
		case 'scriptParams':
		case 'scriptParamsCritical':
		case 'scriptId':
		case 'scriptIdCritical':
		case 'spellLevels':
		case 'useParamCache':
			return this.spell[property];
		case 'minCastInterval':
			spellModif = getSpellModif(this.ownerId, this.id, CharacterSpellModificationTypeEnum.CAST_INTERVAL);
			if (!spellModif) {
				return spellLevel[property];
			}
			value = spellModif.value;
			var intervalBonus = value.contextModif + value.objectsAndMountBonus + value.base + value.alignGiftBonus;
			return spellLevel[property] - intervalBonus;
		case 'apCost':
			spellModif = getSpellModif(this.ownerId, this.id, CharacterSpellModificationTypeEnum.AP_COST);
			if (!spellModif) {
				return spellLevel[property];
			}
			value = spellModif.value;
			var apReduction = value.contextModif + value.objectsAndMountBonus + value.base + value.alignGiftBonus;
			return spellLevel[property] - apReduction;
		case 'maxCastPerTurn':
			spellModif = getSpellModif(this.ownerId, this.id, CharacterSpellModificationTypeEnum.MAX_CAST_PER_TURN);
			if (!spellModif) {
				return spellLevel[property];
			}
			return spellLevel[property] + spellModif.value.contextModif + spellModif.value.objectsAndMountBonus;
		case 'range':
			spellModif = getSpellModif(this.ownerId, this.id, CharacterSpellModificationTypeEnum.RANGE);
			if (!spellModif) {
				return spellLevel[property];
			}
			return spellLevel[property] + spellModif.value.contextModif + spellModif.value.objectsAndMountBonus;
		case 'maxCastPerTarget':
			spellModif = getSpellModif(this.ownerId, this.id, CharacterSpellModificationTypeEnum.MAX_CAST_PER_TARGET);
			if (!spellModif) {
				return spellLevel[property];
			}
			return spellLevel[property] + spellModif.value.contextModif + spellModif.value.objectsAndMountBonus;
		case 'castInLine':
			spellModif = getSpellModif(this.ownerId, this.id, CharacterSpellModificationTypeEnum.CAST_LINE);
			if (!spellModif) {
				return spellLevel[property];
			}
			if (!spellLevel[property]) {
				return false;
			}
			value = spellModif.value;
			return ((value.contextModif + value.objectsAndMountBonus + value.base + value.alignGiftBonus) === 0);
		case 'castTestLos':
			spellModif = getSpellModif(this.ownerId, this.id, CharacterSpellModificationTypeEnum.LOS);
			if (!spellModif) {
				return spellLevel[property];
			}
			if (!spellLevel[property]) {
				return false;
			}
			value = spellModif.value;
			return ((value.contextModif + value.objectsAndMountBonus + value.base + value.alignGiftBonus) === 0);
		case 'rangeCanBeBoosted':
			spellModif = getSpellModif(this.ownerId, this.id, CharacterSpellModificationTypeEnum.RANGEABLE);
			if (!spellModif || spellLevel[property]) {
				return spellLevel[property];
			}
			value = spellModif.value;
			return ((value.contextModif + value.objectsAndMountBonus + value.base + value.alignGiftBonus) > 0);
		case 'maxStack':
		case 'castInDiagonal':
		case 'criticalFailureProbability':
		case 'spellBreed':
		case 'needFreeCell':
		case 'needTakenCell':
		case 'criticalFailureEndsTurn':
		case 'globalCooldown':
		case 'statesRequired':
		case 'statesForbidden':
		case 'minRange':
		case 'minPlayerLevel':
		case 'canSummon':
		case 'canBomb':
			return spellLevel[property];
		case 'spellLevel':
			return spellLevel;
		case 'grade':
			return spellLevel[property] || level;
		case 'isSpellWeapon':
			return (this.id === WEAPON_SPELL_ID);
		case 'isDefaultSpellWeapon':
			return (this.id === WEAPON_SPELL_ID && !window.gui.playerData.inventory.getCurrentWeapon());
		case 'criticalHitProbability':
			return getCriticalHitProbability.call(this);
		default:
			return null;
	}
};

getPropertyFromItem = function (property) {
	var item = this._item.item;

	switch (property) {
		case 'nameId':
		case 'descriptionId':
		case 'apCost':
		case 'iconId':
		case 'criticalFailureProbability':
		case 'criticalHitProbability':
		case 'range':
		case 'castInLine':
		case 'castInDiagonal':
		case 'castTestLos':
		case 'minRange':
		case 'maxCastPerTurn':
			return item[property];
		case 'id':
		case 'minCastInterval':
		case 'minPlayerLevel':
		case 'maxStack':
		case 'maxCastPerTarget':
		case 'scriptId':
		case 'scriptIdCritical':
		case 'spellBreed':
			return 0;
		case 'grade':
			return 1;
		case 'typeId':
			return 24; // Special
		case 'useParamCache':
		case 'needTakenCell':
		case 'rangeCanBeBoosted':
		case 'isDefaultSpellWeapon':
		case 'needFreeCell':
			return false;
		case 'criticalFailureEndsTurn':
		case 'isSpellWeapon':
			return true;
		case 'scriptParams':
		case 'scriptParamsCritical':
		case 'spellLevels':
			return null;
		default: // properties for which the default is null if not defined (e.g. 'globalCooldown')
			return null;
	}
};

// modified properties getters

getCriticalHitProbability = function () {
	var getSpellModif = window.gui.playerData.characters.getSpellModifications;
	var spellModif = getSpellModif(this.ownerId, this.id, CharacterSpellModificationTypeEnum.CRITICAL_HIT_BONUS);
	if (!spellModif) {
		return this.spellLevel.criticalHitProbability;
	}
	var value = spellModif.value;
	return value.contextModif + value.objectsAndMountBonus + value.alignGiftBonus + value.base;
};

Spell.prototype.getIconUri = function () {
	var pathAndPrefix = this.isItem ? '/gfx/items/' : '/gfx/spells/sort_';
	return pathAndPrefix + this.getProperty('iconId') + '.png';
};

Spell.prototype.getIconUrl = function () {
	if (this.isItem) {
		return this._item.item && this._item.item.image;
	} else {
		return this.spell && this.spell.image;
	}
};

Spell.prototype.update = function (cb) {
	// it's the only situation (for the time being) where an update is required:
	// if current weapon changed, has been removed or has been equipped
	if (this.id !== WEAPON_SPELL_ID) {
		return cb();
	}

	var currentWeapon = window.gui.playerData.inventory.getCurrentWeapon();
	if (currentWeapon) {
		spellInitFromItemInstance.call(this, currentWeapon);
		cb();
	} else {
		spellInitFromSpellId.call(this, 0, null, cb);
	}
};

Spell.prototype.clone = function () {
	var clone = new Spell();
	for (var k in this) {
		if (this.hasOwnProperty(k) && k !== '_uid' && k !== 'castingData') {
			clone[k] = this[k];
		}
	}
	clone.setLevel(1);
	return clone;
};

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * live (in combat) functions related
 */

function createCastData() {
	this.castingData = {
		lastCastTurn: 0,
		targetsThisTurn: {},
		castThisTurn: 0,
		lastInitialCooldownReset: 0
	};
}

Spell.prototype.cast = function (currentTurn, targets, useMaxCastPerTurn) {
	targets = targets || [];
	createCastData.call(this);
	useMaxCastPerTurn = useMaxCastPerTurn !== false;
	this.castingData.lastCastTurn = currentTurn;
	for (var i = 0; i < targets.length; i++) {
		var target = targets[i];
		if (!this.castingData.targetsThisTurn[target]) {
			this.castingData.targetsThisTurn[target] = 0;
		}
		this.castingData.targetsThisTurn[target]++;
	}
	if (useMaxCastPerTurn) {
		this.castingData.castThisTurn++;
	}
	window.gui.shortcutBar.updateSpellAvailability(this.id);
};

Spell.prototype.newTurn = function () {
	if (!this.castingData) {
		console.warn('You should not call "newTurn" on a spell that has not been casted');
		createCastData.call(this);
	}
	this.castingData.castThisTurn = 0;
	this.castingData.targetsThisTurn = {};
};

Spell.prototype.getModifiedInterval = function () {
	if (this.isItem) {
		return 0;
	}
	var spellModifs = new SpellModificator();
	var spellModifications = window.gui.playerData.characters.mainCharacter.characteristics.spellModifications;
	for (var i = 0; i < spellModifications.length; i++) {
		var spellModification = spellModifications[i];
		if (spellModification.spellId !== this.id) {
			continue;
		}
		var spellModificationType = spellModification.modificationType;
		if (spellModificationType === CharacterSpellModificationTypeEnum.CAST_INTERVAL) {
			spellModifs.castInterval = spellModification.value;
		} else if (spellModificationType === CharacterSpellModificationTypeEnum.CAST_INTERVAL_SET) {
			spellModifs.castIntervalSet = spellModification.value;
		}
	}
	var interval;
	var castIntervalTotalBonus = spellModifs.getTotalBonus(spellModifs.castInterval);
	var castIntervalSetTotalBonus = spellModifs.getTotalBonus(spellModifs.castIntervalSet);
	if (castIntervalSetTotalBonus) {
		interval = castIntervalSetTotalBonus - castIntervalTotalBonus;
	} else {
		interval = this.spellLevel.minCastInterval - castIntervalTotalBonus;
	}
	return interval;
};

// cf. SpellManager.as > get cooldown
// TODO: still a lot of code to implement
Spell.prototype.getCooldown = function () {
	if (!this.castingData || this.isItem) {
		return 0;
	}
	var interval = this.getModifiedInterval();
	if (interval === 63) {
		return 63;
	}
	var cooldown;
	if (this.spellLevel.initialCooldown === 0 ||
		this.castingData.lastCastTurn >= this.castingData.lastInitialCooldownReset + this.spellLevel.initialCooldown) {
		cooldown = interval + this.castingData.lastCastTurn - window.gui.fightManager.turnCount;
	} else {
		cooldown = this.castingData.lastInitialCooldownReset + this.spellLevel.initialCooldown -
					window.gui.fightManager.turnCount;
	}
	cooldown = Math.max(0, cooldown);
	return cooldown;
};

Spell.prototype.resetInitialCooldown = function (turn) {
	if (!this.castingData) {
		createCastData.call(this);
	}
	this.castingData.lastInitialCooldownReset = turn;
};

// much easier to use than `forceLastCastTurn` used in original Ankama's code
Spell.prototype.forceCooldown = function (cooldown) {
	if (!this.castingData) {
		console.warn('You should not call "forceCooldown" on a spell that has not been casted');
		createCastData.call(this);
	}
	var minCastInterval = this.isItem ? 0 : this.spellLevel.minCastInterval;
	this.castingData.lastCastTurn = cooldown + window.gui.fightManager.turnCount - minCastInterval;
};

Spell.prototype.forceLastCastTurn = function (lastCastTurn) {
	if (!this.castingData) {
		console.warn('You should not call "forceLastCastTurn" on a spell that has not been casted');
		createCastData.call(this);
	}
	this.castingData.lastCastTurn = lastCastTurn;
};

Spell.prototype.hasBeenCast = function () {
	return !!this.castingData;
};

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @method createSpells
 * @desc create a collection of spells objects
 *
 * @param {array.<string, number>|string|integer} spellIds - single spell id or a list of spells ids
 *                                                           that we want to create
 * @param {object} cb                                      - called when all the spells have been created:
 *                                                           first parameter passed is error, second is an object
 *                                                           containing all the spells
 */
function createSpells(spellIds, cb) {
	if (!(spellIds instanceof Array)) {
		spellIds = [spellIds];
	}

	// retrieve all the required data from the server
	collectSpellsData(spellIds, function (err, cache) {
		if (err) {
			return cb(err);
		}
		var spells = {};
		// creates each spell one by one by using the retrieved data
		async.each(
			spellIds,
			function (spellId, callback) {
				spells[spellId] = new Spell();

				// if the spell is the weapon one and if and a weapon is equipped,
				// we create a "virtual spell" based on this item characteristics
				if (~~spellId === WEAPON_SPELL_ID) {
					var currentWeapon = window.gui.playerData.inventory.getCurrentWeapon();
					if (currentWeapon) {
						spellInitFromItemInstance.call(spells[spellId], currentWeapon);
						return callback();
					}
				}

				// regular spell
				spellInitFromSpellId.call(spells[spellId], spellId, cache, callback);
			},
			function (err) {
				if (err) {
					return cb(err);
				}
				cb(null, spells);
			}
		);
	});
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// method called by collectSpellsData to identify and collect data from table `spells`
function getDataSpells(spellIds, cache, cb) {
	if (cache && cache.spells) {
		return cb(null, helper.extractElementsFrom(spellIds, cache.spells, true));
	}
	staticContent.getData('Spells', spellIds, function (error, spells) {
		if (error) {
			return cb(error);
		}
		cb(null, helper.extractElementsFrom(spellIds, spells, true));
	});
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// method called by collectSpellsData to identify and collect data from table `spellLevels`
function getDataSpellLevels(tables, cache, cb) {
	var spellLevelIds = {};
	for (var spellId in tables.spells) {
		var spell = tables.spells[spellId];
		for (var i = 0; i < spell.spellLevels.length; i++) {
			spellLevelIds[spell.spellLevels[i]] = true;
		}
	}
	spellLevelIds = Object.keys(spellLevelIds);
	if (spellLevelIds.length === 0) {
		return cb(null, {});
	}
	if (cache && cache.spellLevels) {
		return cb(null, helper.extractElementsFrom(spellLevelIds, cache.spellLevels, true));
	}
	staticContent.getData('SpellLevels', spellLevelIds, function (error, spellLevels) {
		if (error) {
			return cb(error);
		}
		cb(null, helper.extractElementsFrom(spellLevelIds, spellLevels, true));
	});
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// method called by collectSpellsData to identify and collect data from table `spellStates`
function getDataSpellStates(tables, cache, cb) {
	var spellStatesIds = {};
	// going through spellLevels to see if there are spells that are involving states
	for (var spellLevelId in tables.spellLevels) {
		var spellLevel = tables.spellLevels[spellLevelId], i;

		// if this spellLevel requires to be in a certain state
		for (i = 0; i < spellLevel.statesRequired.length; i++) {
			spellStatesIds[spellLevel.statesRequired[i]] = true;
		}

		// if this spellLevel is not available in a certain state
		for (i = 0; i < spellLevel.statesForbidden.length; i++) {
			spellStatesIds[spellLevel.statesForbidden[i]] = true;
		}
	}
	spellStatesIds = Object.keys(spellStatesIds);
	if (spellStatesIds.length === 0) {
		return cb(null, {});
	}
	if (cache && cache.spellStates) {
		return cb(null, helper.extractElementsFrom(spellStatesIds, cache.spellStates, true));
	}
	staticContent.getData('SpellStates', spellStatesIds, function (error, spellStates) {
		if (error) {
			return cb(error);
		}
		cb(null, helper.extractElementsFrom(spellStatesIds, spellStates, true));
	});
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// method called by collectSpellsData to create all effect instances objects required for this spell
function createEffectInstances(tables, cache, cb) {
	var requests = {}; // to store the raw effectInstances we need to create
	var results = {}; // to store effectInstances we already have in cache
	var index, i;
	var effectsTypes = ['effects', 'criticalEffect'];
	// we are going through each spell
	for (var spellLevelId in tables.spellLevels) {
		// through each spellLevel
		if (tables.spellLevels.hasOwnProperty(spellLevelId)) {
			var spellLevel = tables.spellLevels[spellLevelId];
			// through each effect type (effects and critical  effects)
			for (var f = 0; f < effectsTypes.length; f++) {
				var effectType = effectsTypes[f];
				// through each raw effectInstance
				for (i = 0; i < spellLevel[effectType].length; i++) {
					// we build the key that is going to be used to identify this effectInstance
					// (spellLevelId + effectType + index in the effectType array)
					index = spellLevelId + '-' + effectType + '-' + i;
					if (cache && cache.effectInstances && cache.effectInstances[index]) {
						results[index] = cache.effectInstances[index];
					} else {
						requests[index] = spellLevel[effectType][i];
					}
				}
			}
		}
	}

	// if we had everything in cache... we are happily callbacking
	if (Object.keys(requests).length === 0) {
		return cb(null, results);
	}

	// creates the effect instances
	effectInstanceFactory.createEffectInstancesIndexed(requests, function (error, effectInstances) {
		if (error) {
			return cb(error);
		}

		// if no elements were in cache, we just return what we created
		if (Object.keys(results).length === 0) {
			return cb(null, effectInstances);
		}

		// append what we had in cache
		for (var index in results) {
			if (results.hasOwnProperty(index)) {
				effectInstances[index] = results[index];
			}
		}

		cb(null, effectInstances);
	});
}

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @method collectSpellsData
 * @desc main method to identify and retrieve all data required for a single or multiple spell(s)
 *
 * @param {array}    spellIds - array of ids
 * @param {object}   cache    - if we already have the data and we just need to
 *                              identify and filter the right ones, optional
 * @param {function} cb       - callback; first passed parameter is error,
 *                              second is an object containing the tables wth data
 */
collectSpellsData = function (spellIds, cache, cb) {
	if (typeof cache === 'function' && !cb) {
		cb = cache;
		cache = null;
	}

	cb = cb || defaultCallback;

	// if a single id have been passed
	if (!(spellIds instanceof Array)) {
		spellIds = [spellIds];
	}

	// we remove non number items
	spellIds = spellIds.filter(function (e) {
		return !isNaN(e);
	});

	if (spellIds.length === 0) {
		return cb(new Error('No valid spell id'));
	}

	if (spellIds.indexOf(WEAPON_SPELL_ID) !== -1) {
		if (!cache) {
			cache = {};
		}
		spellDataCacheMerger(cache, weaponSpellDataCache);
	}

	// object to gather the different tables required to manage the spells
	var tables = {};

	getDataSpells(spellIds, cache, function (error, spells) {
		if (error) {
			return cb(error);
		}
		tables.spells = spells;

		getDataSpellLevels(tables, cache, function (error, spellLevels) {
			if (error) {
				return cb(error);
			}
			tables.spellLevels = spellLevels;

			getDataSpellStates(tables, cache, function (error, spellStates) {
				if (error) {
					return cb(error);
				}
				tables.spellStates = spellStates;

				createEffectInstances(tables, cache, function (error, effectInstances) {
					if (error) {
						return cb(error);
					}
					tables.effectInstances = effectInstances;

					// whaoo, we should have all the data we need for this spell
					cb(null, tables);
				});
			});
		});
	});
};

function sortSpells(spells, property, isDescending) {
	// TODO: spells obj? make array
	var spellList = Array.isArray(spells) ? spells : [];
	if (!spellList.length) {
		for (var id in spells) {
			spellList.push(spells[id]);
		}
	}

	var coeff = isDescending ? 1 : -1; // ascend descend (default ascend)
	function sort(a, b) {
		var aProp = a.getProperty(property);
		var bProp = b.getProperty(property);

		if (aProp > bProp) {
			return -coeff;
		} else if (aProp < bProp) {
			return coeff;
		} else if (a.id > b.id) { // default to id
			return -coeff;
		}
	}

	return spellList.sort(sort);
}

// merge spell's data cache2 into cache1
function spellDataCacheMerger(cache1, cache2) {
	for (var key in cache2) {
		if (cache2.hasOwnProperty(key)) {
			if (!cache1[key]) {
				cache1[key] = {};
			}
			for (var data in cache2[key]) {
				if (cache2[key].hasOwnProperty(data)) {
					cache1[key][data] = cache2[key][data];
				}
			}
		}
	}
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// exposing

exports.initialize = initialize;
exports.createSpells = createSpells;
exports.sortSpells = sortSpells;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/SpellFactory/index.js
 ** module id = 280
 ** module chunks = 0
 **/