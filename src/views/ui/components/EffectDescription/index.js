require('./styles.less');
var effectSorter = require('effectSorter');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var WuiDom = require('wuidom');

// Original code reference
//   modules/ankama_tooltips/src/blocks/EffectTooltipBlock.as

var BULLET = '&#149;';

function EffectDescription(wuiDomOptions) {
	WuiDom.call(this, 'div', wuiDomOptions);
	this.addClassNames('EffectDescription');
}
inherits(EffectDescription, WuiDom);
module.exports = EffectDescription;


function requiresSubSpellEffectDescription(effect) {
	return (effect.requiresGlyphDescription() || effect.requiresTrapDescription() || effect.requiresBombDescription());
}

function getMonsterDescription(effect) {
	if (!effect.requiresInvocationDescription() || !effect.subEffectDescription) {
		return null;
	}

	var monsterBlock = new WuiDom('div');
	var line, block;

	// we want to display stats side by side instead of top to down
	var halfLinesNb = Math.ceil(effect.subEffectDescription.length / 2);

	for (var i = 0; i < halfLinesNb; i++) {
		// new line
		line = monsterBlock.createChild('div', { className: 'monsterLine' });

		// column 1
		block = line.createChild('div', { className: 'column1' });
		block.setHtml(BULLET + ' ' + effect.subEffectDescription[i]);

		// column 2 (if any)
		if (effect.subEffectDescription[halfLinesNb + i]) {
			block = line.createChild('div', { className: 'column2' });
			block.setHtml(BULLET + ' ' + effect.subEffectDescription[halfLinesNb + i]);
		}
	}
	return monsterBlock;
}

function getSubSpellEffectDescription(effect) {
	if (!requiresSubSpellEffectDescription(effect) || !effect.subEffectDescription) {
		return null;
	}

	var subSpellBlock = new WuiDom('div');

	for (var i = 0; i < effect.subEffectDescription.length; i++) {
		var line = subSpellBlock.createChild('div', { className: 'singleTab' });
		line.setHtml(BULLET + ' ' + effect.subEffectDescription[i]);
	}

	return subSpellBlock;
}

function addEffectList(container, effectDataList) {
	for (var i = 0; i < effectDataList.length; i++) {
		var effectData = effectDataList[i];
		var line = container.createChild('div', { className: 'singleTab' });

		if (effectData.dbEffect.bonusType === -1) {
			line.addClassNames('malus');
		} else if (effectData.dbEffect.bonusType === 1) {
			line.addClassNames('bonus');
		}

		if (typeof effectData.description === 'string') {
			line.setHtml(BULLET + ' ' + effectData.description);
		} else {
			line.appendChild(effectData.description);
		}
	}
}


EffectDescription.prototype._renderDamageAndEffects = function (effects, isCritical) {
	var damageEffectsDescription = [];
	var otherEffectsDescription = [];

	for (var i = 0, len = effects.length; i < len; i++) {
		var effect = effects[i];

		// TODO: Tempory workaround for release 0.9
		//       This test have to be removed, and the following bug have th be fixed the right way:
		//       when opening the spell window after multiple weapon switching and clicking on the weapon,
		//       spell 0 data are corrupted
		if (!effect) {
			continue;
		}

		// retrieve effectInstance's default description
		var description = effect.description;

		// if there is no description or if the effect should not be displayed, we jump to the next one
		if (!description || effect.hidden) {
			continue;
		}

		// if there is a duration we append it to the effect
		var duration = effect.getDurationString();
		if (duration) {
			description += ' (' + duration + ')';
		}

		// if there is a monsterCount, we append it to the description
		var monsterCount = effect.monsterCount;
		if (monsterCount) {
			description += monsterCount;
		}

		// if it's a damage effect or another kind of effect: we push the description in the right group
		var effectGroup = effect.isDamageEffect() ? damageEffectsDescription : otherEffectsDescription;
		effectGroup.push({ dbEffect: effect.effect, description: description });

		// add monsters characteristic for invocations spells
		if (effect.requiresInvocationDescription() && effect.subEffectDescription) {
			effectGroup.push({ dbEffect: effect.effect, description: getMonsterDescription(effect) });
		}
		// add sub-spell effects characteristic for glyphs, traps and bomb spells
		if (requiresSubSpellEffectDescription(effect) && effect.subEffectDescription) {
			effectGroup.push({ dbEffect: effect.effect, description: getSubSpellEffectDescription(effect) });
		}
	}

	var titleText;
	if (damageEffectsDescription.length > 0) {
		titleText = isCritical ?
			getText('ui.common.criticalDamages', 1) : getText('ui.stats.damagesBonus', damageEffectsDescription.length);
		this.createChild('div', { className: 'effectTitle', text: titleText + getText('ui.common.colon') });

		addEffectList(this, damageEffectsDescription);
	}

	if (otherEffectsDescription.length > 0) {
		titleText = isCritical ?
			getText('ui.common.criticalEffects', 1) : getText('ui.common.effects', otherEffectsDescription.length);
		this.createChild('div', { className: 'effectTitle', text: titleText + getText('ui.common.colon') });

		addEffectList(this, otherEffectsDescription);
	}
};



EffectDescription.prototype.setEffectsFromItem = function (item, options) {
	var effects;
	options = options || {};

	this.clearContent();

	var itemData;
	var itemInstance = item.getItemInstance();
	if (options.showPossibleEffects || !itemInstance) {
		itemData = item.getItem();
	} else {
		itemData = itemInstance;
	}

	effects = effectSorter.getSortedEffectInstances(itemData);
	this._renderDamageAndEffects(effects);
};

EffectDescription.prototype.setEffectsFromSpell = function (spell, level) {
	this.clearContent();

	var effects, i, len;

	var spellLevelId = spell.getSpellLevelId();

	effects = [];
	for (i = 0, len = spell.getEffectsIds(level).length; i < len; i++) {
		effects.push(spell.effectInstances[spellLevelId + '-effects-' + i]);
	}
	this._renderDamageAndEffects(effects);

	effects = [];
	for (i = 0, len = spell.getCriticalEffectsIds(level).length; i < len; i++) {
		effects.push(spell.effectInstances[spellLevelId + '-criticalEffect-' + i]);
	}

	this._renderDamageAndEffects(effects, true);
};

EffectDescription.prototype.setEffects = function (effects) {
	this.clearContent();

	this._renderDamageAndEffects(effects);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/EffectDescription/index.js
 ** module id = 396
 ** module chunks = 0
 **/