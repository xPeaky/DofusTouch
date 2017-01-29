var async = require('async');
var criterionFactory = require('criterionFactory');
var effectInstanceFactory = require('effectInstanceFactory');
var getText = require('getText').getText;
var helper = require('helper');
var staticContent = require('staticContent');

var ITEM_DATA_DEFAULT = {
	id: null,
	nameId: null,
	typeId: null,
	descriptionId: null,
	iconId: null,
	level: null,
	realWeight: null,
	cursed: false,
	useAnimationId: -1,
	usable: false,
	targetable: false,
	exchangeable: false,
	price: null,
	twoHanded: false,
	etheral: false,
	itemSetId: -1,
	criteria: 'null',
	criteriaTarget: 'null',
	enhanceable: false,
	nonUsableOnAnother: false,
	appearanceId: null,
	secretRecipe: false,
	recipeSlots: null,
	recipeIds: null,
	dropMonsterIds: null,
	bonusIsSecret: false,
	hideEffects: false,
	possibleEffects: null,
	favoriteSubAreas: null,
	favoriteSubAreasBonus: null

	// TODO: precise dynamicly added properties?
	// isWeapon
	// loaded
	// image
	// averagePrice: -1 // ??
	// conditions
	// targetConditions
	// possibleEffectsMap
	// possibleEffects
	// isPet
	// foodItems
	// foodTypes
	// type
};

function Item(itemData) {
	for (var prop in itemData) {
		if (itemData[prop] !== ITEM_DATA_DEFAULT[prop] && itemData[prop] !== null) {
			this[prop] = itemData[prop];
		}
	}

	this.isWeapon = itemData._type === 'Weapon';
	this.averagePrice = -1;

	if (this.etheral) {
		this.descriptionId = getText('ui.common.etherealWeaponDescription');
	}
}
module.exports = Item;

Item.initializeList = function (itemList, mainCallback) {
	async.parallel([
		function createConditions (cb) { // create the conditions
			async.each(itemList, function (item, callback) {
				if (!item.criteria) {
					return callback();
				}
				item.conditions = criterionFactory.createGroupCriterion(item.criteria, item);
				item.conditions.initialize(callback);
			}, cb);
		},
		function createConditionsOnTarget (cb) { // create the conditions on the target
			async.each(itemList, function (item, callback) {
				if (!item.criteriaTarget) {
					return callback();
				}
				item.targetConditions = criterionFactory.createGroupCriterion(item.criteriaTarget, item);
				item.targetConditions.initialize(callback);
			}, cb);
		},
		function repopulateEffects(cb) { // repopulate the possible effects list with EffectInstances
			// collect all the effects to create from all items
			var effectList = [];
			for (var i = 0; i < itemList.length; i++) {
				if (itemList[i].possibleEffects) {
					effectList = effectList.concat(itemList[i].possibleEffects);
				}
			}

			// create effectInstances and re-distribute them on the items
			effectInstanceFactory.createEffectInstances(effectList, function (error, effectInstances) {
				if (error) {
					return cb(error);
				}

				for (var i = 0; i < itemList.length; i++) {
					var item = itemList[i];

					if (!item.possibleEffects) { continue; }
					var effectsLength = item.possibleEffects.length;
					var itemEffectInstances = effectsLength > 0 ? effectInstances.splice(0, effectsLength) : [];

					// we filter effect instances without effects (some effect instances have broken data)
					itemEffectInstances = itemEffectInstances.filter(function (elm) {
						return (elm && elm.effect);
					});

					item.possibleEffectsMap = {};
					item.possibleEffects = itemEffectInstances;

					for (var f = 0; f < itemEffectInstances.length; f++) {
						item.possibleEffectsMap[itemEffectInstances[f].effectId] = itemEffectInstances[f];
					}
				}

				cb();
			});
		},
		function enrichForPets(cb) { // enrich for pets
			async.each(itemList, function (item, callback) {
				if (item.type.superTypeId !== 12) { // not a pet
					return callback();
				}

				item.isPet = true;
				item.foodItems = [];
				item.foodTypes = [];

				staticContent.getData('Pets', item.id, function (error, data) {
					if (error || !data) {
						// we can feed just pet that exists in the DB (see item * 6718)
						return callback();
					}

					item.foodItems = data.foodItems;
					item.foodTypes = data.foodTypes;
					return callback();
				});
			}, cb);
		},
		function enrichItemSetName(cb) {
			var itemSetIds = [];
			var itemsWithItemSet = [];
			for (var i = 0; i < itemList.length; i++) {
				var item = itemList[i];
				var itemSetId = item.itemSetId;
				if (itemSetId) {
					itemSetIds.push(itemSetId);
					itemsWithItemSet.push(item);
				}
			}
			if (!itemSetIds.length) {
				return cb();
			}
			staticContent.getDataMap('ItemSets', itemSetIds, function (error, itemSets) {
				if (error) {
					return cb(error);
				}
				for (var i = 0; i < itemsWithItemSet.length; i++) {
					var item = itemsWithItemSet[i];
					var itemSet = itemSets[item.itemSetId];
					if (!itemSet) {
						console.error(new Error('ItemSet id ' + item.itemSetId + ' for item id ' + item.id + ' does not exist.'));
						item.itemSetName = null;
					} else {
						item.itemSetName = itemSet.nameId;
					}
				}
				return cb();
			});
		}
	], mainCallback);
};

Item.prototype.initialize = function (cb) {
	Item.initializeList([this], cb);
};

/**
 * Give you the name of the Item
 * @return {string}
 */
Item.prototype.getRawName = function () {
	return this.nameId;
};

/**
 * Give you the name of the Item and the GID if you are MODERATOR or more.
 * @return {string}
 */
Item.prototype.getName = function () {
	var isModeratorOrMore = window.gui.playerData.isModeratorOrMore();

	var name = this.getRawName();
	// TODO: Items' id should not be added to the name but actually queried by the UI when required
	if (isModeratorOrMore) {
		name += ' (' + this.id + ')';
	}
	return name;
};

Item.prototype.getNameForSearch = function () {
	if (this._simplifiedName) { return this._simplifiedName; }
	this._simplifiedName = helper.simplifyString(this.nameId);
	return this._simplifiedName;
};

Item.prototype._getStatsFormatted = function () {
	var formattedStats = [];
	if (!this.isWeapon) {
		console.error(new Error('getProperty(\'statsFormatted\') should never be called on non-weapon Item'));
		return formattedStats;
	}
	// AP
	var ap = getText('ui.stats.shortAP') + getText('ui.common.colon') + this.apCost;
	if (this.maxCastPerTurn) {
		ap += ' (' + getText('ui.item.usePerTurn', this.maxCastPerTurn) + ')';
	}
	formattedStats.push(ap);

	// Range
	var range = getText('ui.common.range') + getText('ui.common.colon');
	range += this.range === this.minRange ? this.range : this.minRange + ' - ' + this.range;
	formattedStats.push(range);

	if (this.criticalFailureProbability || this.criticalHitProbability) {
		var criticalHitPro = '';

		if (this.criticalHitProbability) {
			if (this.criticalHitBonus !== 0) {
				formattedStats.push(getText('ui.item.critical.bonus', this.criticalHitBonus));
			}

			criticalHitPro += getText('ui.common.short.CriticalHit') + getText('ui.common.colon') + '1/' +
				this.criticalHitProbability;

			var playerStats = window.gui.playerData.characters.mainCharacter.characteristics;
			if (playerStats) {
				var criticalHit = playerStats.criticalHit;
				var agility = playerStats.agility;

				var totalCriticalHit = criticalHit.alignGiftBonus + criticalHit.base + criticalHit.contextModif +
					criticalHit.objectsAndMountBonus;
				var totalAgility = agility.alignGiftBonus + agility.base + agility.contextModif + agility.objectsAndMountBonus;
				if (totalAgility < 0) {
					totalAgility = 0;
				}

				var baseCritik = this.criticalHitProbability - totalCriticalHit;
				var critikPlusBonus = parseInt((baseCritik * Math.E * 1.1) / Math.log(totalAgility + 12), 10);
				var critikRate = Math.min(baseCritik, critikPlusBonus);

				if (critikRate < 2) {
					critikRate = 2;
				}

				formattedStats.push(getText('ui.itemtooltip.itemCriticalReal', '1/' +  critikRate));
			}
		}

		if (this.criticalFailureProbability) {
			criticalHitPro += (this.criticalHitProbability ? ' - ' : '') + getText('ui.common.short.CriticalFailure') +
				getText('ui.common.colon') + '1/' + this.criticalFailureProbability;
		}

		formattedStats.push(criticalHitPro);
	}

	if (this.castInLine && this.range > 1) {
		formattedStats.push(getText('ui.spellInfo.castInLine'));
	}

	if (!this.castTestLos && this.range > 1) {
		formattedStats.push(getText('ui.spellInfo.castWithoutLos'));
	}
	return formattedStats;
};

function formatConditions(conditions, prefix) {
	var formattedConditions = [];
	if (!conditions || !conditions.criterions.length) {
		return formattedConditions;
	}
	prefix = prefix || '';

	var criterions = conditions.criterions;
	for (var i = 0; i < criterions.length; i++) {
		var criterion = criterions[i];
		var criterionText;

		if (criterion.criterions) {
			criterionText = [];
			var subCriterions = criterion.criterions;
			var subCriterionsLength = subCriterions.length;
			for (var j = 0; j < subCriterionsLength; j++) {
				var subCriterion = subCriterions[j];
				var subCriterionText = prefix + (j === 0 ? '(' : criterion.getOperatorText() + ' ') +
					subCriterion.getText() + (j === subCriterionsLength - 1 ? ')' : '');
				criterionText.push(subCriterionText);
			}
		} else {
			criterionText = prefix + (i !== 0 &&
				criterion.operator === criterionFactory.groupOperators.or ? criterion.getOperatorText() + ' ' : '') +
				criterion.getText();
		}

		formattedConditions.push({ text: criterionText, isMalus: !criterion.isRespected() });
	}
	return formattedConditions;
}

Item.prototype._getConditionsFormatted = function () {
	return formatConditions(this.conditions);
};

Item.prototype._getTargetConditionsFormatted = function () {
	var prefix = '(' + getText('ui.item.target') + ') ';
	return formatConditions(this.targetConditions, prefix);
};

// Common API with ItemInstance

/**
 * @return {Item}
 */
Item.prototype.getItem = function () {
	return this;
};

Item.prototype.getItemInstance = function () {
	return null;
};

Item.prototype.getProperty = function (property) {
	if (property === 'nameId') {
		return this.getName();
	} else if (property === 'conditionsFormatted') {
		return this._getConditionsFormatted();
	} else if (property === 'targetConditionsFormatted') {
		return this._getTargetConditionsFormatted();
	} else if (property === 'statsFormatted') {
		return this._getStatsFormatted();
	}

	// Item from the DB have no weight, weight property will return the realWeight
	if (property === 'weight') {
		property = 'realWeight';
	}
	return this.hasOwnProperty(property) ? this[property] : ITEM_DATA_DEFAULT[property];
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/itemManager/Item.js
 ** module id = 325
 ** module chunks = 0
 **/