var async = require('async');
var getText = require('getText').getText;
var helper = require('helper');
var processText = require('getText').processText;
var staticContent = require('staticContent');

/*
Original code reference
  core/src/com/ankamagames/dofus/datacenter/effects/EffectInstance.as
         ^--- main reference (EFFECT_SHAPES's hasMinSize + .parseZone() logic + ...)
  modules-library/src/d2enums/SpellShapeEnum.as: EFFECT_SHAPES
  modules/Ankama_Tooltips/src/blocks/SpellTooltipBlock.as
         ^--- EFFECT_SHAPES code, alt and desc + .getZoneEffect() logic
  modules/Ankama_Tooltips/src/blocks/EffectTooltipBlock.as: .requiresInvocationDescription()
  jerakine/src/com/ankamagames/jerakine/utils/display/spellZone/spellZoneCellManager.as: .getZoneEffect() logic
*/

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// misc definitions

var EFFECT_SHAPES = {
	// cross - getText('ui.spellarea.cross')
	X: { code: 88,   desc: 'ui.spellarea.cross',      alt: '',      hasMinSize: true },
	// inline - getText('ui.spellarea.line')
	L: { code: 76,   desc: 'ui.spellarea.line',       alt: '',      hasMinSize: false },
	// perpendicular line - getText('ui.spellarea.tarea')
	T: { code: 84,   desc: 'ui.spellarea.tarea',      alt: '',      hasMinSize: false },
	// point (circle size 0)
	P: { code: 80,   desc: '',                        alt: '',      hasMinSize: false },
	// circle with chessboard pattern - getText('ui.spellarea.chessboard')
	D: { code: 68,   desc: 'ui.spellarea.chessboard', alt: '',      hasMinSize: false },
	// circle - getText('ui.spellarea.circle')
	C: { code: 67,   desc: 'ui.spellarea.circle',     alt: '',      hasMinSize: true },
	// ring (circle perimeter) - getText('ui.spellarea.ring')
	O: { code: 79,   desc: 'ui.spellarea.ring',       alt: '',      hasMinSize: false },
	// cross without central point - getText('ui.spellarea.crossVoid')
	Q: { code: 81,   desc: 'ui.spellarea.crossVoid',  alt: '',      hasMinSize: true },
	// directional cone - getText('ui.spellarea.cone')
	V: { code: 86,   desc: 'ui.spellarea.cone',       alt: '',      hasMinSize: false },
	// 4 cones without diagonals
	W: { code: 87,   desc: '',                        alt: '',      hasMinSize: false },
	// 4 diagonals
	'+': { code: 43, desc: '',                        alt: 'plus',  hasMinSize: true },
	// diagonals without the central point
	'#': { code: 35, desc: '',                        alt: 'sharp', hasMinSize: true },
	// lines and diagonals
	'*': { code: 42, desc: '',                        alt: 'star',  hasMinSize: false },
	// aligned diagonals
	'/': { code: 47, desc: '',                        alt: 'slash', hasMinSize: false },
	// perpendicular diagonal - getText('ui.spellarea.diagonal')
	'-': { code: 45, desc: 'ui.spellarea.diagonal',   alt: 'minus', hasMinSize: false },
	// diamond - getText('ui.spellarea.square')
	G: { code: 71,   desc: 'ui.spellarea.square',     alt: '',      hasMinSize: false },
	// inverted circle (infinite if min range > 0)
	I: { code: 73,   desc: '',                        alt: '',      hasMinSize: false },
	// halfcircle - getText('ui.spellarea.halfcircle')
	U: { code: 85,   desc: 'ui.spellarea.halfcircle', alt: '',      hasMinSize: false },
	// whole map, all players - getText('ui.spellarea.everyone')
	A: { code: 65,   desc: 'ui.spellarea.everyone',   alt: '',      hasMinSize: false }
};

var EFFECT_INSTANCE_DEFAULT = {
	effectId: 0,
	targetId: 0,
	targetMask: null,
	duration: 0,
	delay: 0,
	random: 0,
	group: 0,
	modificator: 0,
	trigger: false,
	triggers: null,
	hidden: true,
	zoneSize: 0,
	zoneShape: 0,
	zoneMinSize: 0,
	zoneEfficiencyPercent: 0,
	zoneMaxEfficiency: 0
};

var objectInstanceTypes = {
	ObjectEffectString: 'EffectInstanceString',
	ObjectEffectInteger: 'EffectInstanceInteger',
	ObjectEffectMinMax: 'EffectInstanceMinMax',
	ObjectEffectDice: 'EffectInstanceDice',
	ObjectEffectDate: 'EffectInstanceDate',
	ObjectEffectDuration: 'EffectInstanceDuration',
	ObjectEffectLadder: 'EffectInstanceLadder',
	ObjectEffectCreature: 'EffectInstanceCreature',
	ObjectEffectMount: 'EffectInstanceMount'
};

var category = {
	undefined: -1,
	miscellaneous: 0,
	resistance: 1,
	damage: 2,
	special: 3
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// js hint pre-declarations
var collectEffectInstanceData, createDescriptionBase, createDescriptionSubEffect, createDescription;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// helpers

// decipher a raw `area of effect` and returns a more understandable and usable object
function parseZone(rawZone) {
	var zoneShape = rawZone.substr(0, 1);
	var params = rawZone.length > 1 ? rawZone.substr(1).split(',') : [];
	var zoneSize = 0, zoneMinSize = 0, zoneEfficiencyPercent = 0, zoneMaxEfficiency = 0;

	switch (params.length) {
		case 1:
			zoneSize = parseInt(params[0], 10);
			break;
		case 2:
			zoneSize = parseInt(params[0], 10);
			if (EFFECT_SHAPES[zoneShape].hasMinSize) {
				zoneMinSize = parseInt(params[1], 10);
			} else {
				zoneEfficiencyPercent = parseInt(params[1], 10);
			}
			break;
		case 3:
			zoneSize = parseInt(params[0], 10);
			if (EFFECT_SHAPES[zoneShape].hasMinSize) {
				zoneMinSize = parseInt(params[1], 10);
				zoneEfficiencyPercent = parseInt(params[2], 10);
			} else {
				zoneEfficiencyPercent = parseInt(params[1], 10);
				zoneMaxEfficiency = parseInt(params[2], 10);
			}
			break;
		case 4:
			zoneSize = parseInt(params[0], 10);
			zoneMinSize = parseInt(params[1], 10);
			zoneEfficiencyPercent = parseInt(params[2], 10);
			zoneMaxEfficiency = parseInt(params[3], 10);
			break;
	}
	return {
		zoneShape: zoneShape,
		zoneSize: zoneSize,
		zoneMinSize: zoneMinSize,
		zoneEfficiencyPercent: zoneEfficiencyPercent,
		zoneMaxEfficiency: zoneMaxEfficiency
	};
}

// generate human readable zone of effect from a deciphered one
function getHumanReadableZoneInfo(zoneEffect) {
	if (!zoneEffect) {
		return '';
	}
	var zoneShape = zoneEffect.zoneShape;
	var zoneSize = zoneEffect.zoneSize;

	// in the original code, there is a hack to add +1 to zone size if the shape is 'L'
	if (zoneShape === 'L') {
		zoneSize += 1;
	}

	if (EFFECT_SHAPES[zoneShape].desc) {
		return getText(EFFECT_SHAPES[zoneShape].desc, zoneSize);
	}
	return '';
}

// determine if a variable is null or undefined
function isNullOrUndefined(v) {
	return v === undefined || v === null;
}

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @class EffectInstance
 * @desc EffectInstance entity.
 * Should not be called directly but retrieved via the following `createEffectInstances` method
 *       All elements provided are for reading purpose only. If something need to be changed then use the
 *       right setter
 */

function EffectInstance(rawEffectInstance) {
	// we put all original effectInstance data in the class object
	for (var key in rawEffectInstance) {
		if (rawEffectInstance.hasOwnProperty(key)) {
			this[key] = rawEffectInstance[key];
		}
	}

	this._init();
}

EffectInstance.prototype._init = function () {
	this.description = '';
	this.subEffectDescription = '';
	this.effect = null;

	this._retrieveInstanceType();

	if (!this.hasOwnProperty('actionId')) { // case of ObjectEffect****
		return;
	}

	this.duration = 0;
	this.effectId = this.actionId;

	if (this._type === 'EffectInstanceDice' && this.effectId === 669) { // 669 is the effect id for incarnations
		this._type = 'EffectInstanceDate';
		this.year = this.diceNum; // incarnation Id
		this.month = this.diceSide * 32768 + this.diceConst; // hardcoded in ankama's source..

		var level = 1;
		var nextFloor = 0;
		var incarnationLevels = window.gui.databases.IncarnationLevels;

		while (nextFloor < this.month && level < 50) { // 50 is the max level you can get with an incarnation
			var incLevelPlusOne = incarnationLevels[this.diceNum * 100 + level];
			if (incLevelPlusOne) {
				nextFloor = incLevelPlusOne.requiredXp;
			}
			level += 1;
		}

		this.day = level;
		this.hour = 0;
		this.minute = 0;
	} else {
		switch (this._type) {
		case 'EffectInstanceString':
			this.text = this.value;
			delete this.value;
			break;
		case 'EffectInstanceDice':
			this.value = this.diceConst;
			delete this.diceConst;
			break;
		case 'EffectInstanceDate':
			this.month += 1; // server sends month date starting from 0
			break;
		default:
			break;
		}
	}
};

EffectInstance.prototype._retrieveInstanceType = function () {
	if (this._type) {
		if (objectInstanceTypes[this._type]) {
			this._type = objectInstanceTypes[this._type];
		}
		return;
	}

	if (this.hasOwnProperty('diceNum')) {
		this._type = 'EffectInstanceDice';
	} else if (this.hasOwnProperty('year')) {
		this._type = 'EffectInstanceDate';
	} else if (this.hasOwnProperty('days')) {
		this._type = 'EffectInstanceDuration';
	} else if (this.hasOwnProperty('min')) {
		this._type = 'EffectInstanceMinMax';
	} else if (this.hasOwnProperty('monsterCount')) {
		this._type = 'EffectInstanceLadder';
	} else if (this.hasOwnProperty('monsterFamilyId')) {
		this._type = 'EffectInstanceCreature';
	} else if (this.hasOwnProperty('mountId')) {
		this._type = 'EffectInstanceMount';
	} else if (this.hasOwnProperty('text')) {
		this._type = 'EffectInstanceString';
	} else {
		this._type = 'EffectInstanceInteger';
	}
};

// get the default params for a certain type
EffectInstance.prototype.getParams = function () {
	switch (this._type) {
	case 'EffectInstanceString':
		return [null, null, null, this.text];

	case 'EffectInstanceInteger':
		return [this.value];

	case 'EffectInstanceMinMax':
		return [this.min, this.min !== this.max ? this.max : null];

	case 'EffectInstanceDice':
		var value = this.value || null;
		var diceSide = this.diceSide || null;
		return [this.diceNum !== 0 ? this.diceNum : null, diceSide, value];

	case 'EffectInstanceDate':
		var month = this.month > 9 ? this.month : '0' + this.month;
		var day = this.day > 9 ? this.day : '0' + this.day;
		var hour = this.hour > 9 ? this.hour : '0' + this.hour;
		var minute = this.minute > 9 ? this.minute : '0' + this.minute;
		return [this.year, month + '' + day, hour + '' + minute, this.month, this.day];

	case 'EffectInstanceDuration':
		return [this.days, this.hours, this.minutes];

	case 'EffectInstanceLadder':
		return [this.monsterFamilyId, this.monsterCount];

	case 'EffectInstanceCreature':
		return [this.monsterFamilyId];

	case 'EffectInstanceMount':
		return [this.date, this.modelId, this.mountId];

	default:
		return [];
	}
};

EffectInstance.prototype.setParameter = function (index, value) {
	switch (this._type) {
	case 'EffectInstanceString':
		if (index === 3) {
			this.text = value.toString();
		}
		return;

	case 'EffectInstanceInteger':
		if (index === 2) {
			this.value = value;
		}
		return;

	case 'EffectInstanceMinMax':
		if (index === 0) {
			this.min = value;
		} else if (index === 1) {
			this.max = value;
		}
		return;

	case 'EffectInstanceDice':
		if (index === 0) {
			this.diceNum = value;
		} else if (index === 1) {
			this.diceSide = value;
		} else if (index === 2) {
			this.value = value;
		}
		return;

	case 'EffectInstanceDate':
		if (index === 0) {
			this.year = value;
		} else if (index === 1) {
			this.month = value.substr(0, 2);
			this.day = value.substr(2, 2);
		} else if (index === 2) {
			this.hour = value.substr(0, 2);
			this.minute = value.substr(2, 2);
		} else if (index === 3) {
			this.month = value;
		} else if (index === 4) {
			this.day = value;
		}
		return;

	case 'EffectInstanceDuration':
		if (index === 0) {
			this.days = value;
		} else if (index === 1) {
			this.hours = value;
		} else if (index === 2) {
			this.minutes = value;
		}
		return;

	case 'EffectInstanceLadder':
		if (index === 0) {
			this.monsterFamilyId = value;
		} else if (index === 2) {
			this.monsterCount = value;
		}
		return;

	case 'EffectInstanceCreature':
		if (index === 0) {
			this.monsterFamilyId = value;
		}
		return;

	case 'EffectInstanceMount':
		if (index === 0) {
			this.date = Number(value);
		} else if (index === 1) {
			this.modelId = Number(value);
		} else if (index === 2) {
			this.mountId = Number(value);
		}
		return;

	default:
		return;
	}
};

// Instead of accessing directly effectInstance data it's better to go through getValue():
//   if the requested property doesn't exists it returns the default value
EffectInstance.prototype.getValue = function (property) {
	return this.hasOwnProperty(property) ? this[property] : EFFECT_INSTANCE_DEFAULT[property];
};

// Create the description field based on formatted params
EffectInstance.prototype.setDescription = function (params) {
	if (!this.effect.hasOwnProperty('descriptionId')) { return; } // e.g. Effects #1060 for Rogue
	params.unshift(this.effect.descriptionId);
	var formattedDescription = processText.apply(null, params);
	this.description = formattedDescription || '';

	// sort specific curse boost
	var modificator = this.getValue('modificator');
	if (modificator !== 0) {
		this.description += ' ' + getText('ui.effect.boosted.spell.complement', [modificator], '%');
	}

	// random
	var random = this.getValue('random');
	if (random > 0) {
		if (this.getValue('group') > 0) {
			this.description += ' (' + getText('ui.common.random') + ')';
		} else {
			this.description += ' ' + getText('ui.effect.randomProbability', [random], '%');
		}
	}

	// if it's a triggered effect
	if (this.trigger) {
		this.description = getText('ui.spell.trigger', this.description);
	}
};

// Retrieve the effect duration info as string
EffectInstance.prototype.getDurationString = function (showLast) {
	if (this.delay) {
		return getText('ui.common.delayTurn', this.delay, this.delay <= 1);
	}

	if (!this.duration || isNaN(this.duration)) {
		return '';
	}

	if (this.duration < 0) {
		return getText('ui.common.infinit');
	} else if (this.duration > 1) {
		return getText('ui.common.turn', this.duration, true);
	} else { // this.duration === 1
		if (showLast) {
			return getText('ui.common.lastTurn');
		}
		return getText('ui.common.turn', this.duration, false);
	}
};

// we may add also isMiscEffect, isResistanceEffect and isSpecialEffect, but it's not needed yet
EffectInstance.prototype.isDamageEffect = function () {
	return (this.effect && this.effect.category === category.damage);
};

// returns the zone of effect
EffectInstance.prototype.getZoneEffect = function () {
	if (this.rawZone) {
		return parseZone(this.rawZone);
	}
	// if we don't have a raw zone (as for weapon's effects)
	return {
		zoneShape: this.getValue('zoneShape'),
		zoneSize: this.getValue('zoneSize'),
		zoneMinSize: this.getValue('zoneMinSize'),
		zoneEfficiencyPercent: this.getValue('zoneEfficiencyPercent'),
		zoneMaxEfficiency: this.getValue('zoneMaxEfficiency')
	};
};

// return the human readable zone of effect
EffectInstance.prototype.getHumanReadableZoneInfo = function () {
	return getHumanReadableZoneInfo(this.getZoneEffect());
};

// is it an invocation effect requiring the monster description to be shown?
EffectInstance.prototype.requiresInvocationDescription = function () {
	return (this.effectId === 181 || this.effectId === 1011);
};

// is it a glyph effect requiring the glyph description to be shown?
EffectInstance.prototype.requiresGlyphDescription = function () {
	return (this.effectId === 401 || this.effectId === 402);
};

// is it a trap effect requiring the trap description to be shown?
EffectInstance.prototype.requiresTrapDescription = function () {
	return (this.effectId === 400);
};

// is it a bomb effect requiring the bomb description to be shown?
EffectInstance.prototype.requiresBombDescription = function () {
	return (this.effectId === 1008);
};

EffectInstance.prototype.forceDescriptionRefresh = function (cb) {
	this.description = '';
	this.subEffectDescription = '';
	createDescription([this], null, function (err) {
		if (cb) {
			return cb(err);
		}
		if (err) {
			console.error(err);
		}
	});
};

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @method createEffectInstances
 * @desc create a collection of effectInstance objects
 *
 * @param {Object[]|Object} rawEffectInstances - single or multiple raw effectInstance,
 * as found in spells' effects, items' effects, etc.
 * @param {function} cb - called when all the effectInstances have been created:
 *   first parameter passed is error,
 *   second is an array containing all the effectInstances in the same order as they have been passed
 */
function createEffectInstances(rawEffectInstances, cb) {
	// if only a single object have been passed, let's change it into an array
	if (!(rawEffectInstances instanceof Array)) {
		rawEffectInstances = [rawEffectInstances];
	}

	// array for the final effectInstance objects
	var effectInstances = [];
	for (var i = 0; i < rawEffectInstances.length; i++) {
		effectInstances.push(new EffectInstance(rawEffectInstances[i]));
	}

	// retrieve, prepare and attach all the required data from the server to manage these effectInstances
	collectEffectInstanceData(effectInstances, cb);
}

// an effectInstance doesn't have an id,
// so the developer may want to provide a map with his own ids as key instead of an array of anonymous objects
function createEffectInstancesIndexed(rawEffectInstances, cb) {
	var list = [];
	for (var index in rawEffectInstances) {
		if (rawEffectInstances.hasOwnProperty(index)) {
			list.push(rawEffectInstances[index]);
			rawEffectInstances[index] = list.length - 1;
		}
	}
	createEffectInstances(list, function (error, effectInstances) {
		if (error) {
			return cb(error);
		}
		for (var index in rawEffectInstances) {
			if (rawEffectInstances.hasOwnProperty(index)) {
				rawEffectInstances[index] = effectInstances[rawEffectInstances[index]];
			}
		}
		return cb(null, rawEffectInstances);
	});
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// `Effects` table retriever, called by `collectEffectInstanceData`

// debug log helper
function validateEffectInstance(effectInstance) {
	if (effectInstance.effectId !== null && effectInstance.effectId !== 'null') {
		return true;
	}
	var errorString = 'effectInstanceFactory: an effectId is null. ';
	errorString += 'description: ' + effectInstance.description + ' ';
	errorString += 'type: ' + effectInstance._type + ' ';
	errorString += 'keys: ' + JSON.stringify(Object.keys(effectInstance));
	console.error(new Error(errorString));
	return false;
}

function getDataEffects(effectInstances, cb) {
	var effectsIds = {};
	for (var i = 0; i < effectInstances.length; i++) {
		var effectInstance = effectInstances[i];
		if (!validateEffectInstance(effectInstance)) {
			continue;
		}
		effectsIds[effectInstance.effectId] = true;
	}
	effectsIds = Object.keys(effectsIds);
	if (effectsIds.length === 0) {
		return cb(null, {});
	}
	staticContent.getData('Effects', effectsIds, function (error, effects) {
		if (error) {
			return cb(error);
		}
		cb(null, helper.extractElementsFrom(effectsIds, effects, true));
	});
}

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * EffectInstance description creator.
 * Called by `collectEffectInstanceData` and by himself.
 * It's about dealing with particular cases. General default case is:
 *   effectInstance.setDescription(params);
 * But for specific effects, extra work have to be done, like switching some parameters or retrieve
 * more information from other tables.
 *
 * The general logic is: we iterate on all effectInstance we have to deal with and:
 *   - if an effectInstance already have a description, we skip it
 *   - if we have enough information to create the description right away, we do
 *   - if we don't have enough information, we push the table(s) and the id(s) we need in the request list
 *   At the end of the loop, we check if the request list is empty:
 *   - if it is, all the descriptions are done, it's finished, we call the callback.
 *   - if it's not, we retrieve all the requested table(s)/id(s), and we call this function again
 *
 * Sometimes (like for learning a spell, case 604) this function is called 2 times because we
 *  need to retrieve informations from a first table to know what we need to retrieve for another one.
 */

createDescription = function (effectInstances, cache, cb) {
	// The object recording the desideratas of each effect: it's the waiter.
	//   - keys are table names
	//   - values are objects with requested ids as key (serialized into an array at the very last moment)
	var requests = {};

	// Small helper to send orders to the waiter
	var requestData = function (tableName, id) {
		if (!requests[tableName]) {
			requests[tableName] = {};
		}
		requests[tableName][id] = true;
	};

	// We go through each effectInstance
	var params;

	async.each(
		effectInstances,
		function (effectInstance, callback) {
			if (!effectInstance) {
				return callback();
			}

			// try to set description if not done yet
			if (!effectInstance.description) {
				params = effectInstance.getParams();
				createDescriptionBase(effectInstance, params, cache, requestData);
			}

			// try to set sub-effect description if not done yet
			if (effectInstance.subEffectDescription === '') {
				params = effectInstance.getParams();
				createDescriptionSubEffect(effectInstance, params, cache, requestData, callback);
			} else {
				callback();
			}
		},
		function (err) {
			if (err) {
				return cb(err);
			}

			// no table request, everything is done, we can finalize the description string
			if (Object.keys(requests).length === 0) {
				return cb(null, effectInstances);
			}

			for (var tableName in requests) {
				if (requests.hasOwnProperty(tableName)) {
					requests[tableName] = Object.keys(requests[tableName]);
				}
			}

			async.each(
				Object.keys(requests),
				function (tableName, callback) {
					staticContent.getData(tableName, requests[tableName], function (error, data) {
						if (error) {
							return callback(error);
						}

						var results = helper.extractElementsFrom(requests[tableName], data, true);

						// protection against broken data
						for (var i = 0; i < requests[tableName].length; i++) {
							var requestedId = requests[tableName][i];
							if (!results[requestedId]) {
								return callback(new Error('id ' + requests[tableName][requestedId] + ' unavailable in table ' + tableName));
							}
						}

						requests[tableName] = results;

						// append result to cache
						if (!cache) {
							cache = {};
						}
						if (!cache[tableName]) {
							cache[tableName] = {};
						}
						for (var key in requests[tableName]) {
							if (requests[tableName].hasOwnProperty(key)) {
								cache[tableName][key] = requests[tableName][key];
							}
						}

						callback();
					});
				},
				function (err) {
					if (err) {
						return cb(err);
					}

					createDescription(effectInstances, cache, cb);
				}
			);
		}
	);
};

createDescriptionBase = function (effectInstance, params, cache, requestData) {
	switch (effectInstance.effectId) {

	case 10: // Apprentissage d'un emote
		// for the itemSet #130 Vampyre set the Emoticons params is at the index 2, when you open the itemSetsWindow
		if (params[0] === null && params[2]) { // this condition was not in original code but seems to be required
			params[0] = params[2];
		}
		if (cache) {
			params[2] = cache.Emoticons[params[0]].nameId;
			effectInstance.setDescription(params);
		} else {
			requestData('Emoticons', params[0]);
		}
		break;

	case 165:  // Maîtrise d'arme
	case 1084: // Type d'un objet
		if (cache) {
			params[0] = cache.ItemTypes[params[0]].nameId;
			effectInstance.setDescription(params);
		} else {
			requestData('ItemTypes', params[0]);
		}
		break;

	case 197:  // Transformation en monstre
	case 181:  // Invoque une créature
	case 185:  // Invoque une créature statique
	case 717:  // Ladder (monstre)
	case 1008: // Invoque une bombe
	case 1011: // Invoque une bombe
		if (cache) {
			params[0] = cache.Monsters[params[0]].nameId;
			effectInstance.setDescription(params);
		} else {
			requestData('Monsters', params[0]);
		}
		break;

	case 281:  // Modificateur de portée numérique
	case 282:  // La portée du sort peut-elle être boostée?
	case 283:  // Modificateur de dommages finaux numérique
	case 284:  // Modificateur de soins finaux numérique
	case 285:  // Modificateur de coût en PA
	case 286:  // Modificateur de l'interval de relance
	case 287:  // Modificateur de probabilités de coup critique
	case 288:  // Le sort peut-il être lancé en diagonale?
	case 289:  // Le sort peut-il être lancé sans ligne de vue?
	case 290:  // Modificateur de nombre de lancé maximal par tour
	case 291:  // Modificateur de nombre de lancé maximal par cible
	case 292:  // Modificateur d'interval (défini l'interval)
	case 293:  // Modificateur de dégâts de base
	case 294:  // Modificateur de portée
	case 1160: // ?
	case 787:  // Executer un sort
	case 792:  // Executer un sort
	case 793:  // Executer un sort
	case 1017: // Executer un sort
	case 1018: // Executer un sort
	case 1019: // Executer un sort
	case 1035: // Augmentation de cooldown
	case 1036: // Suppression de cooldown
	case 1044: // Immunité à un sort
	case 1045: // Fixe le cooldown d'un sort
		if (cache) {
			params[0] = cache.Spells[params[0]].nameId;
			effectInstance.setDescription(params);
		} else {
			requestData('Spells', params[0]);
		}
		break;

	case 406: // Dissipation d'un sort
		if (!params[2]) {
			// TODO: fix triggeredBuff description
			break;
		}
		if (cache) {
			params[2] = cache.Spells[params[2]].nameId;
			effectInstance.setDescription(params);
		} else {
			requestData('Spells', params[2]);
		}
		break;

	case 603: // Apprendre un métier
	case 615: // Oubli de métier
		if (params[0] === null && params[2]) { // this condition was not in original code but seems to be required
			params[0] = params[2];
		}
		if (cache) {
			params[2] = cache.Jobs[params[0]].nameId;
			effectInstance.setDescription(params);
		} else {
			requestData('Jobs', params[0]);
		}
		break;

	case 604: // Apprendre un sort
		if (isNullOrUndefined(params[2])) {
			params[2] = params[0];
		}
		if (!cache || !cache.SpellLevels || !cache.SpellLevels[params[2]]) {
			requestData('SpellLevels', params[2]);
		} else if (!cache.Spells || !cache.Spells[cache.SpellLevels[params[2]].spellId]) {
			requestData('Spells', cache.SpellLevels[params[2]].spellId);
		} else {
			params[2] = cache.Spells[cache.SpellLevels[params[2]].spellId].nameId;
			effectInstance.setDescription(params);
		}
		break;

	case 614:  // Gagner de l'expérience de métier
	case 1050: // Gagner des niveaux de métier
		params[0] = params[2]; // Valeur d'expérience ou de niveau
		if (cache) {
			params[1] = cache.Jobs[params[1]].nameId;
			effectInstance.setDescription(params);
		} else {
			requestData('Jobs', params[1]);
		}
		break;

	case 616: // Oubli de sort
	case 624: // Oubli de sort de guilde
		// protection against broken data (as DB item 1170's possibleEffects)
		if (isNullOrUndefined(params[0])) { break; }

		if (cache) {
			params[2] = cache.Spells[params[0]].nameId;
			effectInstance.setDescription(params);
		} else {
			requestData('Spells', params[0]);
		}
		break;

	case 620: // Consulter un document
		// protection against broken data (as DB item 12356's possibleEffects)
		if (isNullOrUndefined(params[0])) { break; }

		if (cache) {
			params[2] = cache.Documents[params[0]].titleId;
			effectInstance.setDescription(params);
		} else {
			requestData('Documents', params[0]);
		}
		break;
	case 621: // Invoquer un monstre (style oeuf de Bwak)
		if (cache) {
			params[2] = cache.Monsters[params[1]].nameId;
			effectInstance.setDescription(params);
		} else {
			requestData('Monsters', params[1]);
		}
		break;

	case 623: // Invoquer un monstre (style pierre d'âme pleine)
	case 628: // Invoquer un monstre (style pierre d'âme préremplie)
		// protection against broken data, when you get a soul stone (get and equip the item 9688, get the spell of
		// capture 413, beat a boss moveto 1311748, during the fight, cast capture and doom the group and you will get
		// a Dungeon Keeper Soul Stone)
		if (isNullOrUndefined(params[2])) { break; }

		if (cache) {
			var monster = cache.Monsters[params[2]];
			params[1] = monster.grades[params[0] - 1].level;
			params[2] = monster.nameId;
			effectInstance.setDescription(params);
		} else {
			requestData('Monsters', params[2]);
		}
		break;

	case 649: // Se faire passer pour étant d'un alignement
	case 960: // Affiche un alignement
		if (cache) {
			params[2] = cache.AlignmentSides[params[0]].titleId;
			effectInstance.setDescription(params);
		} else {
			requestData('AlignmentSides', params[0]);
		}
		break;

	case 699: // Référencement métier
		if (cache) {
			params[0] = cache.Jobs[params[0]].nameId;
			effectInstance.setDescription(params);
		} else {
			requestData('Jobs', params[0]);
		}
		break;

	/* TODO: being unable to test this, I prefer to comment it out
	case 715: // Ladder (superrace)
		if (!cache || !cache.MonsterRaces || !cache.MonsterRaces[params[0]]) {
			requestData('MonsterRaces', params[0]);
		} else if (!cache.MonsterSuperRaces || !cache.MonsterSuperRaces[cache.MonsterRaces[params[0]].id]) {
			requestData('MonsterSuperRaces', cache.MonsterRaces[params[0]].id);
		} else {
			params[0] = cache.MonsterSuperRaces[cache.MonsterRaces[params[0]].id].nameId;
			effectInstance.setDescription(params);
		}
		break;*/

	case 716:  // Ladder (race)
		if (cache) {
			params[0] = cache.MonsterRaces[params[0]].nameId;
			effectInstance.setDescription(params);
		} else {
			requestData('MonsterRaces', params[0]);
		}
		break;

	case 724: // Débloque un titre
		// protection against data with wrong format (cf. DOT-1950 / title given as set bonus from item 13329)
		if (isNullOrUndefined(params[0]) && !isNullOrUndefined(params[2])) { params[0] = params[2]; }

		if (cache) {
			var genre = (!window.gui.playerData.characterBaseInformations ||
			!window.gui.playerData.characterBaseInformations.sex) ? 'nameMaleId' : 'nameFemaleId';

			params[2] = cache.Titles[params[0]][genre];
			effectInstance.setDescription(params);
		} else {
			requestData('Titles', params[0]);
		}
		break;

	case 800: // pets life points
		params[2] = params[0];
		effectInstance.setDescription(params);
		break;

	case 806: // pet state
		if (params[1] > 6) {
			params[0] = getText('ui.petWeight.fat', [params[1]]);
		} else if (params[2] > 6) {
			params[0] = getText('ui.petWeight.lean', [params[2]]);
		} else if (effectInstance._type === 'EffectInstanceInteger' && params[0] > 6) {
			params[0] = getText('ui.petWeight.lean', [params[0]]);
		} else {
			params[0] = getText('ui.petWeight.nominal');
		}
		effectInstance.setDescription(params);
		break;

	case 807: // Dernier repas du familier
		if (params[0]) {
			if (cache) {
				params[0] = cache.Items[params[0]].nameId;
				effectInstance.setDescription(params);
			} else {
				requestData('Items', params[0]);
			}
		} else {
			params[0] = getText('ui.common.none');
			effectInstance.setDescription(params);
		}
		break;

	case 814:  // Clé de donjon
	case 1151: // Objet apparence d'un objet symbioté
		if (cache) {
			params[0] = cache.Items[params[0]].nameId;
			effectInstance.setDescription(params);
		} else {
			requestData('Items', params[0]);
		}
		break;

	case 905: // Lance un combat contre un monstre
		if (cache) {
			params[1] = cache.Monsters[params[1]].nameId;
			effectInstance.setDescription(params);
		} else {
			requestData('Monsters', params[1]);
		}
		break;

	case 939: // Capacités accrues
		// protection against broken data (as DB item 10754's possibleEffect 939)
		if (isNullOrUndefined(params[0])) { break; }

		if (cache) {
			params[2] = cache.Items[params[0]].nameId;
			effectInstance.setDescription(params);
		} else {
			requestData('Items', params[0]);
		}
		break;

	case 950: // Fixe un état
	case 951: // Enlève un état
	case 952: // Désactive un état
		if (!params[2]) {
			params[2] = params[0];
		}
		// protection against broken data (addsummonedmonster 1x3470 and fight him, effectId 950 have missing params)
		//TODO: see DOT-1732 the client is not breaking anymore but the state information is missing
		if (isNullOrUndefined(params[2])) { break; }

		if (cache) {
			params[2] = cache.SpellStates[params[2]].nameId;
			effectInstance.setDescription(params);
		} else {
			requestData('SpellStates', params[2]);
		}
		break;

	// Grade et niveau (exemple: parchemin de traque)
	case 961:
	case 962:
		params[2] = params[0];
		effectInstance.setDescription(params);
		break;

	case 988: // Affichage du nom du forgemage
	case 987: // Affichage du nom du proprio
	case 985: // Affichage du nom du crafter
	case 996: // Affichage du nom du proprio de la monture
		effectInstance.setDescription(params); //TODO hyperlink on the name
		break;

	case 1111:  // Affichage du butin dans les pierres d'ames
		params[2] = params[0];
		effectInstance.setDescription(params);
		break;

	case 1161: // Companion
		if (cache) {
			params[0] = cache.Companions[params[0]].nameId;
			effectInstance.setDescription(params);
		} else {
			requestData('Companions', params[0]);
		}
		break;

	case 805: // Date 1: AAAA, 2: MMJJ, 3: HHMM
	case 808: // Date 1: AAAA, 2: MMJJ, 3: HHMM
	case 983: // Date 1: AAAA, 2: MMJJ, 3: HHMM Date echangeable
		// Extraction
		params[2] = isNullOrUndefined(params[2]) ? '0' : params[2];

		// protection against broken data (as DB item 8539's possibleEffect 983)
		if (typeof params[1] !== 'string' || typeof params[2] !== 'string') { break; }

		var nYear = params[0];
		var nMonth = params[1].substr(0, 2);
		var nDay = params[1].substr(2, 2);
		var nHours = params[2].substr(0, 2);
		var nMinutes = params[2].substr(2, 2);

		var lang = window.Config.language;
		switch (lang) {
		case 'fr':
			params[0] = nDay + '/' + nMonth + '/' + nYear + ' ' + nHours + ':' + nMinutes;
			break;

		// case 'en':
		default:
			params[0] = nMonth + '/' + nDay + '/' + nYear + ' ' + nHours + ':' + nMinutes;
			break;
		}
		effectInstance.setDescription(params);
		break;

	// case 669: // Incarnation
	// case 706: // Capture de monture
	// case 982: // Non-echangeable, jamais (linked to the account)
	// case 940: // Augmente les capacités d'un familier
	default:
		effectInstance.setDescription(params);
		break;
	}
};

createDescriptionSubEffect = function (effectInstance, params, cache, requestData, cb) {
	// effect includes a monster definition (usually invocations)
	if (effectInstance.requiresInvocationDescription()) {
		var monsterId = params[0];

		if (!cache || !cache.Monsters || !cache.Monsters[monsterId]) {
			requestData('Monsters', monsterId);
			return cb();
		}

		var monster = cache.Monsters[monsterId];
		var txt = [];

		var gradeId = params[1];

		if (gradeId < 1 || gradeId > monster.grades.length) {
			gradeId = monster.grades.length;
		}

		var grade = monster.grades[gradeId - 1];

		var level = 1;
		if (window.gui.playerData.characterBaseInformations && window.gui.playerData.characterBaseInformations.level) {
			level = window.gui.playerData.characterBaseInformations.level;
		}

		var lifePoints = Math.floor(grade.lifePoints + (grade.lifePoints * level / 100));
		var bonusDodge = Math.floor((grade.wisdom + (grade.wisdom * level / 100)) / 10);

		txt.push(getText('ui.stats.HP') + getText('ui.common.colon') + lifePoints);
		txt.push(getText('ui.stats.shortAP') + getText('ui.common.colon') + grade.actionPoints);
		txt.push(getText('ui.stats.shortMP') + getText('ui.common.colon') + grade.movementPoints);
		txt.push(getText('ui.stats.dodgeAP') + getText('ui.common.colon') + (grade.paDodge + bonusDodge));
		txt.push(getText('ui.stats.dodgeMP') + getText('ui.common.colon') + (grade.pmDodge + bonusDodge));
		txt.push(getText('ui.stats.neutralReductionPercent') + getText('ui.common.colon') + grade.neutralResistance);
		txt.push(getText('ui.stats.earthReductionPercent') + getText('ui.common.colon') + grade.earthResistance);
		txt.push(getText('ui.stats.fireReductionPercent') + getText('ui.common.colon') + grade.fireResistance);
		txt.push(getText('ui.stats.waterReductionPercent') + getText('ui.common.colon') + grade.waterResistance);
		txt.push(getText('ui.stats.airReductionPercent') + getText('ui.common.colon') + grade.airResistance);

		effectInstance.subEffectDescription = txt;

		cb();
	} else if (effectInstance.requiresGlyphDescription() ||
		effectInstance.requiresTrapDescription() || effectInstance.requiresBombDescription()) {
		// effect includes another spell's effects definition (glyphs, traps and bombs)

		var spellId = params[0];

		// bombs specific case
		if (effectInstance.requiresBombDescription()) {
			var spellBombId = params[0];
			if (!cache || !cache.SpellBombs || !cache.SpellBombs[spellBombId]) {
				requestData('SpellBombs', spellBombId);
				return cb();
			}
			spellId = cache.SpellBombs[spellBombId].explodSpellId;
		}

		if (!cache || !cache.Spells || !cache.Spells[spellId]) {
			requestData('Spells', spellId);
			return cb();
		}

		var spellLevelId = cache.Spells[spellId].spellLevels[(params[1] - 1) || 0];

		if (!cache || !cache.SpellLevels || !cache.SpellLevels[spellLevelId]) {
			requestData('SpellLevels', spellLevelId);
			return cb();
		}

		var subEffectInstances = cache.SpellLevels[spellLevelId].effects;

		createEffectInstances(subEffectInstances, function (err, effectInstances) {
			if (err) {
				return cb(err);
			}

			var txt = [];

			for (var i = 0; i < effectInstances.length; i++) {
				if (effectInstances[i].description) {
					if (effectInstances[i].hidden) {
						continue;
					}
					txt.push(effectInstances[i].description);
					// if there is a duration we append it to the description
					var duration = effectInstances[i].getDurationString();
					if (duration) {
						txt[txt.length - 1] += ' (' + duration + ')';
					}
				}
			}

			effectInstance.subEffectDescription = (txt.length > 0) ? txt : false;

			cb();
		});
	} else {
		effectInstance.subEffectDescription = false;
		cb();
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// retrieve, prepare and attach all the required data from the server
collectEffectInstanceData = function (effectInstances, cb) {
	// retrieve all the `Effects` in one go
	getDataEffects(effectInstances, function (error, effects) {
		if (error) {
			return cb(error);
		}

		// dispatch them into each effect instance
		for (var i = 0; i < effectInstances.length; i++) {
			var effectInstance = effectInstances[i];
			var effect = effects[effectInstance.effectId];
			if (effect) {
				effectInstance.effect = effect;
			} else {
				effectInstances[i] = null; // we remove effect instances without effect (broken database)
			}
		}

		// feed in their descriptions
		createDescription(effectInstances, null, cb);
	});
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// exposing
module.exports = {
	createEffectInstances: createEffectInstances,
	createEffectInstancesIndexed: createEffectInstancesIndexed,
	EffectInstance: EffectInstance,
	collectEffectInstanceData: collectEffectInstanceData,
	category: category,
	getHumanReadableZoneInfo: getHumanReadableZoneInfo,
	parseZone: parseZone,
	EFFECT_SHAPES: EFFECT_SHAPES
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/effectInstanceFactory/index.js
 ** module id = 223
 ** module chunks = 0
 **/