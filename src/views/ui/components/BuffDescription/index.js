require('./styles.less');
var EffectDescription = require('EffectDescription');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var WuiDom = require('wuidom');

// Original code reference
//   modules/ankama_tooltips/src/makers/EffectTooltipMaker.as
//   modules/ankama_tooltips/src/blocks/EffectTooltipBlock.as


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * This class creates a WuiDom containing the complete description of a buff.
 * It's totally recyclable by passing new information to the .updateUI() method.
 *
 * @augments WuiDom
 *
 * @param {Object} buffData        - Data about the spell to display:
 * @param {Object} [wuiDomOptions] - options that are gonna be passed to the `WuiDom` constructor
 */
function BuffDescription(buffData, wuiDomOptions) {
	WuiDom.call(this, 'div', wuiDomOptions);
	this.addClassNames('BuffDescription');
	this._buildDomElements(wuiDomOptions);
	this.updateUI(buffData);
}
inherits(BuffDescription, WuiDom);
module.exports = BuffDescription;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @private
 * @desc Create all the UI elements needed by this class.
 */
BuffDescription.prototype._buildDomElements = function (spellData, wuiDomOptions) {
	var dom = this._domElements = {};

	dom.spellName = this.createChild('div', { className: 'spellName' });
	dom.casterName = this.createChild('div', { className: 'casterName' });
	dom.effectsAndDamage = this.appendChild(new EffectDescription(wuiDomOptions));
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// functions used by updateUI

function updateSpellName(spellName) {
	this._domElements.spellName.setText(spellName);
}

function updateCasterName(casterName) {
	this._domElements.casterName.setText(getText('ui.fight.caster') + getText('ui.common.colon') + casterName);
}

function updateAllDamageAndEffects(effects) {
	this._domElements.effectsAndDamage.setEffects(effects);
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * Update the UI with the new buff values.
 *
 * @param  {Object} buffData - The new buffData object. Please see the constructor in order
 *                             to know how this object is expected to be,
 */
BuffDescription.prototype.updateUI = function (buffData) {
	if (!buffData) { // do we have data?
		return;
	}

	var spellName = buffData.spellName;
	var casterName = buffData.casterName;
	var effects = buffData.effects;

	// update each element, line by line
	updateSpellName.call(this, spellName);         // Spell name
	updateCasterName.call(this, casterName);       // Points
	updateAllDamageAndEffects.call(this, effects); // Damage and effects (regular and critical)
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/BuffDescription/index.js
 ** module id = 585
 ** module chunks = 0
 **/