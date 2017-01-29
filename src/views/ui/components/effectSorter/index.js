var effectInstanceFactory = require('effectInstanceFactory');
var ItemInstance = require('itemManager').ItemInstance;

function EffectSorter() {
	// properties
	this.exoticEffects = {};
}

EffectSorter.prototype._getEffectInstances = function (dbItem, itemInstance) {
	var itemEffects = itemInstance && itemInstance.effects; // effects that this item actually has
	var possibleEffects = dbItem.possibleEffects; // effects that the item can have
	var hasEffect = itemEffects && itemEffects.length > 0;
	var hasPossibleEffect = possibleEffects && possibleEffects.length > 0;

	if (!hasEffect && !hasPossibleEffect) {
		return;
	}

	// to know whether we are displaying theoretical effects
	var effectInstances;
	var isTheoretical;
	// if the itemInstance is given we need to show the effects from the effectInstances (see DOT-1645)
	if (itemInstance) {
		effectInstances = itemEffects;
		// if the objectUID is missing, means the item is not owned yet, we show the theoretical effects (see DOT-613)
		isTheoretical = !itemInstance.objectUID;
	} else if (hasPossibleEffect) {
		effectInstances = possibleEffects;
		isTheoretical = true;
	} else {
		return;
	}

	// filter null & living object effects
	effectInstances = effectInstances.filter(function (effectInstance) {
		return effectInstance && effectInstance.effect && !effectInstance.isLivingProperty;
	});

	// identify exotics
	this.exoticEffects = {};
	if (!isTheoretical && !dbItem.hideEffects && dbItem.enhanceable) {
		for (var i = 0; i < effectInstances.length; i += 1) {
			var effect = effectInstances[i].effect;

			// it's possible that an effect doesn't exist in the DB.. -_-.. i know..
			if (!effect || !effect.showInSet || !possibleEffects) {
				continue;
			}

			// check for exotic effect. An effect is exotic if it is not in the possibleEffects list
			var isExotic = true;
			for (var j = 0; j < possibleEffects.length; j += 1) {
				if (effect.id === possibleEffects[j].effectId) {
					isExotic = false;
					break;
				}
			}

			this.exoticEffects[effect.id] = isExotic;
		}
	}

	return effectInstances;
};

// public
EffectSorter.prototype.sortEffects = function (effectInstances) {
	var self = this;

	// sort by exotics & priority
	function byPriority(effectInstance1, effectInstance2) {
		var effect1 = effectInstance1.effect;
		var effect2 = effectInstance2.effect;

		if (self.exoticEffects[effect1.id]) { // exotic effects should be displayed first
			return -1;
		}

		if (self.exoticEffects[effect2.id]) {
			return 1;
		}

		return effect1.effectPriority - effect2.effectPriority;
	}
	var prioritizedEffectInstances = effectInstances.sort(byPriority);

	// sort by categories
	var effectCategories = effectInstanceFactory.category;
	var categoryOrder = [
		effectCategories.damage,
		effectCategories.miscellaneous,
		effectCategories.resistance,
		effectCategories.special
	];

	var i, j, effect;

	var categories = {};
	for (i = 0; i < prioritizedEffectInstances.length; i += 1) {
		effect = prioritizedEffectInstances[i].effect;

		// special case: 'Résistance armes éthérées'
		if (effect.category === effectCategories.undefined || effect.id === 812) {
			continue;
		}

		var currentCategory = effect.showInSet ? effect.category : effectCategories.special;
		if (!categories[currentCategory]) {
			categories[currentCategory] = [];
		}
		categories[currentCategory].push(prioritizedEffectInstances[i]);
	}

	var sortedEffectInstances = [];
	for (i = 0; i < categoryOrder.length; i += 1) {
		var category = categories[categoryOrder[i]];
		if (!category) {
			continue;
		}

		for (j = 0; j < category.length; j += 1) {
			var effectInstance = category[j];
			sortedEffectInstances.push(effectInstance);
		}
	}

	return sortedEffectInstances;
};

EffectSorter.prototype.getSortedEffectInstances = function (itemData) {
	// itemData can be dbItem or itemInstance
	var itemInstance = itemData instanceof ItemInstance ? itemData : null;
	var dbItem = (itemInstance && itemInstance.item) || itemData;

	//NOTE: itemInstance is optional
	var effectInstances = this._getEffectInstances(dbItem, itemInstance);
	if (effectInstances) {
		return this.sortEffects(effectInstances);
	}

	return [];
};

module.exports = new EffectSorter();



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/effectSorter/index.js
 ** module id = 398
 ** module chunks = 0
 **/