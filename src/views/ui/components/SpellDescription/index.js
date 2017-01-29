require('./styles.less');
var EffectDescription = require('EffectDescription');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var gameOptions = require('gameOptions');

// Original code reference
//   modules/ankama_tooltips/src/blocks/SpellTooltipBlock.as
//   modules/ankama_tooltips/src/blocks/EffectTooltipBlock.as

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * List of game options keys related to displaying or hiding specific parts of spells description
 *   mapped to the key of corresponding WuiDom objects
 */

var VISIBILITY_OPTIONS_MAP = {
	spellTooltipName: ['spellName'],
	spellTooltipApRange: ['pointsLine'],
	spellTooltipCritical: ['criticalHit'],
	spellTooltipEffect: [
		'areaOfEffect', 'level', 'breed', 'rangeBoost', 'castWithoutLos', 'castInLine', 'maxStack', 'maxCastPerTarget',
		'maxCastPerTurn', 'minCastInterval', 'globalCooldown', 'forbiddenStates', 'requiredStates', 'effectsAndDamage'
	],
	spellTooltipDescription: ['description']
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * This class creates a WuiDom containing the complete description of a spell.
 * It's totally recyclable by passing new information to the .updateUI() method.
 *
 * @augments WuiDom
 *
 * @param {Object} spellData       - Data about the spell to display:
 * @param {Object} spellData.spell - Spell object
 * @param {Number} spellData.level - Specific spell level. Optional. Default is the spell's object level
 * @param {Object} [options]       - options that are gonna be passed to the `WuiDom` constructor
 * @param {Object} [options.visibilityOptions] - keys represents blocks we want to display or not, value are booleans
 *                                               possible keys: the keys in VISIBILITY_OPTIONS_MAP
 *                                               If not provided, it follows what is set in game options
 * @param {Object} [options.spellTooltipAll] - equivalent to passing all visibilityOptions flags as true
 */
function SpellDescription(spellData, options) {
	options = options || {};

	// DOM and styles
	WuiDom.call(this, 'div', options);
	this.addClassNames('SpellDescription');
	this._buildDomElements(options);

	// if no visibilityOptions is provided, this component will follow game options config
	this.visibilityBoundToOptions = !options.visibilityOptions && !options.spellTooltipAll;

	// set current visibility
	this.visibilityOptions = options.visibilityOptions || {};
	if (options.spellTooltipAll) {
		for (var flag in VISIBILITY_OPTIONS_MAP) {
			this.visibilityOptions[flag] = true;
		}
	}
	this.updateVisibleBlocks(true);

	// fill the content
	this.updateUI(spellData);
}

inherits(SpellDescription, WuiDom);
module.exports = SpellDescription;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * Update the visibility of different blocks
 */

SpellDescription.prototype.updateVisibleBlocks = function (forceUpdate) {
	var dom = this._domElements;
	for (var optionKey in VISIBILITY_OPTIONS_MAP) {
		var currentState = this.visibilityOptions[optionKey];
		var newState = this.visibilityBoundToOptions ? gameOptions[optionKey] : !!this.visibilityOptions[optionKey];
		if (!forceUpdate && newState === currentState) { continue; }
		this.visibilityOptions[optionKey] = newState;
		var domKeys = VISIBILITY_OPTIONS_MAP[optionKey];
		for (var i = 0; i < domKeys.length; i++) {
			dom[domKeys[i]].toggleDisplay(newState);
		}
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @private
 * @desc Create all the UI elements needed by this class.
 */
SpellDescription.prototype._buildDomElements = function (spellData, options) {
	var dom = this._domElements = {};

	dom.spellName = this.createChild('div', { className: 'spellName' });
	dom.pointsLine = this.createChild('div', { className: 'pointsLine' });
	dom.points = {
		ap:    dom.pointsLine.createChild('span', { className: 'ap' }),
		ra:    dom.pointsLine.createChild('span', { className: 'ra' }),
		range: dom.pointsLine.createChild('span')
	};
	dom.criticalHit = this.createChild('div');
	dom.areaOfEffect = this.createChild('div');
	dom.level = this.createChild('div');
	dom.breed = this.createChild('div');
	dom.rangeBoost = this.createChild('div');
	dom.castWithoutLos = this.createChild('div');
	dom.castInLine = this.createChild('div');
	dom.maxStack = this.createChild('div');
	dom.maxCastPerTarget = this.createChild('div');
	dom.maxCastPerTurn = this.createChild('div');
	dom.minCastInterval = this.createChild('div');
	dom.globalCooldown = this.createChild('div');
	dom.forbiddenStates = this.createChild('div');
	dom.requiredStates = this.createChild('div');
	dom.effectsAndDamage = this.appendChild(new EffectDescription(options));
	dom.description = this.createChild('div', { className: 'description' });
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// functions used by updateUI

function updateSpellName(spell) {
	this._domElements.spellName.setText(spell.getName());
}

function updatePoints(spell, level) {
	var apCost = spell.getProperty('apCost', level);
	var minRange = spell.getProperty('minRange', level);
	var range = spell.getProperty('range', level);

	// ap
	this._domElements.points.ap.setText(getText('ui.common.ap') + ' : ' + apCost);
	// ra
	this._domElements.points.ra.setText(getText('ui.common.ra') + ' : ' + minRange);
	// range
	if (range !== minRange) {
		this._domElements.points.range.setText(' - ' + range);
	} else {
		this._domElements.points.range.clearContent();
	}
}

function updateCriticalHit(spell, level) {
	var criticalHitProbability = spell.getProperty('criticalHitProbability', level);
	if (criticalHitProbability > 0) {
		this._domElements.criticalHit.setText(getText('ui.common.short.CriticalHit') + ': 1/' + criticalHitProbability);
	} else {
		this._domElements.criticalHit.clearContent();
	}
}

function updateAreaOfEffect(spell) {
	var areaText = spell.getHumanReadableZoneInfo();
	if (areaText.length) {
		this._domElements.areaOfEffect.setText(getText('ui.common.spellArea') + ': ' + areaText);
	} else {
		this._domElements.areaOfEffect.setText(areaText);
	}
}

function updateLevel(spell, level) {
	this._domElements.level.setText(getText('ui.common.level') + ' ' + spell.getProperty('grade', level));
}

function updateBreed(spell, level) {
	if (spell.getProperty('typeId', level) !== 0) {
		this._domElements.breed.setText(getText('ui.common.breedSpell') + ': ' + spell.getHumanReadableSpellType());
	} else {
		this._domElements.breed.clearContent();
	}
}

function updateRangeBoost(spell, level) {
	if (spell.getProperty('rangeCanBeBoosted', level)) {
		this._domElements.rangeBoost.setText(getText('ui.spell.rangeBoost'));
	} else {
		this._domElements.rangeBoost.clearContent();
	}
}

function updateLineOfSight(spell, level) {
	if (!spell.getProperty('castTestLos', level) && spell.getProperty('range', level)) {
		this._domElements.castWithoutLos.setText(getText('ui.spellInfo.castWithoutLos'));
	} else {
		this._domElements.castWithoutLos.clearContent();
	}
}

function updateCastInLine(spell, level) {
	if (spell.getProperty('castInLine', level)) {
		this._domElements.castInLine.setText(getText('ui.spellInfo.castInLine'));
	} else {
		this._domElements.castInLine.clearContent();
	}
}

function updateMaxCastPerTurn(spell, level) {
	var maxCastPerTurn = spell.getProperty('maxCastPerTurn', level);

	if (maxCastPerTurn > 0) {
		this._domElements.maxCastPerTurn.setText(getText('ui.spellInfo.maxCastPerTurn') + ': ' + maxCastPerTurn);
	} else {
		this._domElements.maxCastPerTurn.clearContent();
	}
}

function updateMaxCastPerTarget(spell, level) {
	var maxCastPerTarget = spell.getProperty('maxCastPerTarget', level);

	if (maxCastPerTarget > 0) {
		this._domElements.maxCastPerTarget.setText(getText('ui.spellInfo.maxCastPerTarget') + ': ' + maxCastPerTarget);
	} else {
		this._domElements.maxCastPerTarget.clearContent();
	}
}

function updateMaxStack(spell, level) {
	if (spell.getProperty('maxStack', level) > 0) {
		this._domElements.maxStack.setText(getText('ui.spellInfo.maxStack') + ': ' + spell.getProperty('maxStack', level));
	} else {
		this._domElements.maxStack.clearContent();
	}
}

function updateMinCastInterval(spell, level) {
	var minCastInterval = spell.getProperty('minCastInterval', level);

	if (minCastInterval > 0) {
		this._domElements.minCastInterval.setText(getText('ui.spellInfo.minCastInterval') + ': ' + minCastInterval);
	} else {
		this._domElements.minCastInterval.clearContent();
	}
}

function updateGlobalCooldown(spell, level) {
	if (spell.getProperty('globalCooldown', level) === -1) {
		this._domElements.globalCooldown.setText(getText('ui.spellInfo.globalCastInterval'));
	} else {
		this._domElements.globalCooldown.clearContent();
	}
}

function updateForbiddenStates(spell, level) {
	var statesForbidden = spell.getProperty('statesForbidden', level);
	if (statesForbidden && statesForbidden.length > 0) {
		// Create the label
		this._domElements.forbiddenStates.createChild('span', { text: getText('ui.spellInfo.stateForbidden') + ':' });
		// Add the states
		for (var i = 0; i < statesForbidden.length; i++) {
			this._domElements.forbiddenStates.createChild('span', {
				text: ' ' + spell._tables.spellStates[statesForbidden[i]].nameId
			});
		}
	} else {
		this._domElements.forbiddenStates.clearContent();
	}
}

function updateRequiredStates(spell, level) {
	var statesRequired = spell.getProperty('statesRequired', level);
	if (statesRequired && statesRequired.length > 0) {
		// Create the label
		this._domElements.requiredStates.createChild('span', { text: getText('ui.spellInfo.stateRequired') + ':' });
		// Add the states
		for (var i = 0; i < statesRequired.length; i++) {
			this._domElements.requiredStates.createChild('span', {
				text: ' ' + spell._tables.spellStates[statesRequired[i]].nameId
			});
		}
	} else {
		this._domElements.requiredStates.clearContent();
	}
}

function updateAllDamageAndEffects(spell, level) {
	this._domElements.effectsAndDamage.setEffectsFromSpell(spell, level);
}

function updateDescription(spell, level) {
	this._domElements.description.setText(spell.getProperty('descriptionId', level));
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * Update the UI with the new spells values.
 *
 * @param  {Object} spellData - The new spellData object. Please see the constructor in order
 *                              to know how this object is expected to be,
 */
SpellDescription.prototype.updateUI = function (spellData) {
	if (!spellData || !spellData.spell || !spellData.spell.isLoaded) { // do we have data?
		return;
	}

	this.updateVisibleBlocks();

	var spell = spellData.spell;
	var level = spellData.level !== undefined ? spellData.level : spell.level;

	// update each element, line by line
	updateSpellName.call(this, spell);                        // Spell name
	updatePoints.call(this, spell, level);                    // Points
	updateCriticalHit.call(this, spell, level);               // Critical hit
	updateAreaOfEffect.call(this, spell);                     // Area of effect (if any)
	updateLevel.call(this, spell, level);                     // Level
	updateBreed.call(this, spell, level);                     // Breed
	updateRangeBoost.call(this, spell, level);                // Range boost
	updateLineOfSight.call(this, spell, level);               // Cast without line of sight
	updateCastInLine.call(this, spell, level);                // Cast in line
	updateMaxCastPerTurn.call(this, spell, level);            // Max Cast Per Turn
	updateMaxCastPerTarget.call(this, spell, level);          // Max Cast Per Target
	updateMaxStack.call(this, spell, level);                  // Max Effect Accumulation
	updateMinCastInterval.call(this, spell, level);           // Min Cast Interval
	updateGlobalCooldown.call(this, spell, level);            // Global Cooldown
	updateRequiredStates.call(this, spell, level);            // Required states
	updateForbiddenStates.call(this, spell, level);           // Forbidden states
	updateAllDamageAndEffects.call(this, spell, level);       // Damage and effects (regular and critical)
	updateDescription.call(this, spell, level);               // Description
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/SpellDescription/index.js
 ** module id = 574
 ** module chunks = 0
 **/