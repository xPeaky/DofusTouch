require('./styles.less');
var EffectDescription = require('EffectDescription');
var helper = require('helper');
var inherits = require('util').inherits;
var itemManager = require('itemManager');
var Item = itemManager.Item;
var ItemInstance = itemManager.ItemInstance;
var getText = require('getText').getText;
var WuiDom = require('wuidom');

var BULLET = '&#149;';
var DURABILITY_EFFECT_ID = 812;

function updateDescription(dom, item) {
	dom.setText(item.getProperty('descriptionId'));
	return true;
}

function updateAveragePrice(dom, item) {
	if (!item.getProperty('exchangeable')) {
		return false;
	}
	var content = getText('ui.common.averagePrice') + getText('ui.common.colon');
	var averagePrice = item.getProperty('averagePrice');
	content += averagePrice === -1 ? getText('ui.item.averageprice.unavailable') :
		helper.kamasToString(averagePrice);
	dom.setText(content);
	return true;
}

function updateEffects(dom, item) {
	dom.setEffectsFromItem(item);
	return true;
}

function displayConditions(conditions, dom) {
	for (var i = 0;	i < conditions.length; i++) {
		var condition = conditions[i];
		var conditionText = condition.text;
		var line = dom.createChild('div', { className: 'singleTab' });
		if (typeof conditionText === 'string') {
			line.setHtml(BULLET + ' ' + conditionText);
		} else {
			for (var j = 0; j < conditionText.length; j++) {
				var subConditionText = conditionText[j];
				line.createChild('div', { text: subConditionText });
			}
		}
		if (condition.isMalus) {
			line.addClassNames('malus');
		}
	}
}

function updateConditions(dom, item) {
	if (!item.getProperty('targetConditions') && !item.getProperty('conditions')) {
		return false;
	}

	dom.clearContent();

	dom.createChild('div', { className: 'conditionsTitle',
		text: getText('ui.common.conditions') + getText('ui.common.colon') });

	displayConditions(item.getProperty('conditionsFormatted'), dom);
	displayConditions(item.getProperty('targetConditionsFormatted'), dom);

	return true;
}

function getCriticalHitProbability(item, playerStats) {
	var criticalOutput = '';

	var sign;
	var criticalHitBonus = item.getProperty('criticalHitBonus');
	if (criticalHitBonus > 0) {
		sign = '+';
	} else if (criticalHitBonus < 0) {
		sign = '-';
	}

	criticalOutput += getText('ui.common.short.CriticalHit') + getText('ui.common.colon') + '1/';

	var criticalHitProbability = item.getProperty('criticalHitProbability');
	if (!playerStats) {
		criticalOutput += criticalHitProbability;
	} else {
		var criticalHit = playerStats.criticalHit;
		var agility = playerStats.agility;

		var totalCriticalHit = criticalHit.alignGiftBonus + criticalHit.base + criticalHit.contextModif +
			criticalHit.objectsAndMountBonus;
		var totalAgility = agility.alignGiftBonus + agility.base + agility.contextModif + agility.objectsAndMountBonus;
		if (totalAgility < 0) {
			totalAgility = 0;
		}

		var baseCritik = criticalHitProbability - totalCriticalHit;
		var critikPlusBonus = parseInt(baseCritik * Math.E * 1.1 / Math.log(totalAgility + 12), 10);
		var critikRate = Math.min(baseCritik, critikPlusBonus);

		if (critikRate < 2) {
			critikRate = 2;
		}

		criticalOutput += critikRate;
	}

	if (sign) {
		criticalOutput += ' (' + sign + criticalHitBonus + getText('ui.common.damageShort') + ')';
	}

	return criticalOutput;
}

function getCriticalFailureProbability(item, playerStats) {
	var value = item.getProperty('criticalFailureProbability');

	if (playerStats) {
		var criticalMiss = playerStats.criticalMiss;
		value += criticalMiss.alignGiftBonus - criticalMiss.base - criticalMiss.contextModif -
			criticalMiss.objectsAndMountBonus;
	}
	return (item.getProperty('criticalHitProbability') ? ' - ' : '') + getText('ui.common.short.CriticalFailure') +
		getText('ui.common.colon') + '1/' + value + ' ';
}

function setItemSetName(dom, item) {
	dom.setText(item.getProperty('itemSetName'));
}

function setDurabilityDescription(dom, item) {
	// resistance (durability) of the object
	var itemInstance = item.getItemInstance();
	if (!itemInstance) {
		return;
	}

	var durabilityEffect = itemInstance.effectsMap[DURABILITY_EFFECT_ID];
	if (durabilityEffect) {
		dom.createChild('div', { className: 'extra', text: durabilityEffect.description });
	}
}

function updateHeader(dom, item, options) {
	dom.name.setText(item.getProperty('nameId'));
	dom.name.toggleClassName('etheral', !!item.getProperty('etheral'));
	if (options.showCategory === false) {
		dom.category.hide();
	} else {
		var typeId = item.getProperty('typeId');
		var itemTypeMap = itemManager.getItemTypeMap();
		dom.category.setText(
			getText('ui.common.category') + getText('ui.common.colon') + itemTypeMap[typeId].nameId
		);
		dom.category.show();
	}

	if (options.showWeight === false) {
		dom.weight.hide();
	} else {
		dom.weight.setText(getText('ui.common.short.weight', item.getProperty('weight')));
		dom.weight.show();
	}
	dom.level.setText(getText('ui.common.short.level') + ' ' + item.getProperty('level'));

	var extra = dom.extra;
	extra.clearContent();

	var itemSetId = item.getProperty('itemSetId');
	if (item.getProperty('isWeapon')) {
		dom.points.ap.setText(getText('ui.common.ap') + ' : ' + item.getProperty('apCost'));
		var range = item.getProperty('range');
		var minRange = item.getProperty('minRange');
		dom.points.ra.setText(getText('ui.common.ra') + ' : ' + minRange);
		dom.points.range.setText(range !== minRange ? ' - ' + range : '');
		dom.points.show();

		if (itemSetId && itemSetId !== -1) {
			setItemSetName(extra.createChild('div', { className: 'extra' }), item);
		}

		if (item.getProperty('twoHanded')) {
			extra.createChild('div', { className: 'extra', text: getText('ui.common.twoHandsWeapon') });
		}

		var maxCastPerTurn = item.getProperty('maxCastPerTurn');
		if (maxCastPerTurn) {
			var castPerTurn = getText('ui.item.maxUsePerTurn') + getText('ui.common.colon') + maxCastPerTurn;
			extra.createChild('div', { className: 'extra', text: castPerTurn });
		}

		if (item.getProperty('castInLine') && range > 1) {
			extra.createChild('div', { className: 'extra', text: getText('ui.spellInfo.castInLine') });
		}

		if (item.getProperty('castTestLos') && range > 1) {
			extra.createChild('div', { className: 'extra', text: getText('ui.spellInfo.castWithoutLos') });
		}

		setDurabilityDescription(extra, item);

		var criticalFailureProbability = item.getProperty('criticalFailureProbability');
		var criticalHitProbability = item.getProperty('criticalHitProbability');
		if (options.showCritical && (criticalFailureProbability || criticalHitProbability)) {
			var criticalOutput = '';

			var playerStats = window.gui.playerData.characters.mainCharacter.characteristics;

			if (criticalHitProbability) {
				criticalOutput += getCriticalHitProbability(item, playerStats);
			}

			if (criticalFailureProbability) {
				criticalOutput += getCriticalFailureProbability(item, playerStats);
			}

			extra.createChild('div', { className: 'extra', text: criticalOutput });
		}
	} else {
		dom.points.hide();

		if (itemSetId && itemSetId !== -1) {
			setItemSetName(extra.createChild('div', { className: 'extra' }), item);
		}

		setDurabilityDescription(extra, item);
	}
	return true;
}

var descriptionUpdateFn = {
	description: updateDescription,
	averagePrice: updateAveragePrice,
	effects: updateEffects,
	conditions: updateConditions,
	header: updateHeader
};

function ItemDescription(itemData, options) {
	WuiDom.call(this, 'div', { className: 'ItemDescription' });

	this._buildDomElements(options);

	if (!itemData) {
		return;
	}

	this.updateUI(itemData, options);
}
inherits(ItemDescription, WuiDom);
module.exports = ItemDescription;

ItemDescription.prototype._buildDomElements = function (options) {
	var dom = this._domElements = {};

	dom.header = this.createChild('div', { className: 'header' });

	var nameAndLevel = dom.header.createChild('div', { className: 'nameAndLevel' });
	dom.header.name = nameAndLevel.createChild('div', { className: 'name' });
	dom.header.level = nameAndLevel.createChild('div', { className: 'right' });

	var categoryAndWeight = dom.header.createChild('div', { className: 'categoryAndWeight' });
	dom.header.category = categoryAndWeight.createChild('div');
	dom.header.weight = categoryAndWeight.createChild('div', { className: 'right' });

	var pointsLine = dom.header.points = dom.header.createChild('div', { className: 'pointsLine' });
	pointsLine.ap = pointsLine.createChild('span', { className: 'ap' });
	pointsLine.ra = pointsLine.createChild('span', { className: 'ra' });
	pointsLine.range = pointsLine.createChild('span');
	dom.header.extra = dom.header.createChild('div', { className: 'extra' });

	dom.effects = this.appendChild(new EffectDescription(options));
	dom.conditions = this.createChild('div', { className: 'topSpacing' });
	dom.description = this.createChild('div', { className: ['topSpacing', 'description'] });
	dom.averagePrice = this.createChild('div', { className: 'topSpacing' });
};


/**
 *
 * @param {Item|ItemInstance} item - must contain either an ItemInstance or an Item
 */
ItemDescription.prototype.updateUI = function (item, options) {
	if (!(item instanceof Item) && !(item instanceof ItemInstance)) {
		return console.error(new Error('ItemDescription: item is not Item or ItemInstance'));
	}
	options = options || {};

	for (var category in descriptionUpdateFn) {
		var dom = this._domElements[category];
		if (options[category] !== false && descriptionUpdateFn[category](dom, item, options)) {
			dom.show();
		} else {
			dom.hide();
		}
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/ItemDescription/index.js
 ** module id = 394
 ** module chunks = 0
 **/