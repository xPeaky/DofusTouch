var async = require('async');
var EventEmitter = require('events.js').EventEmitter;
var effectInstanceFactory = require('effectInstanceFactory');
var inherits = require('util').inherits;
var staticContent = require('staticContent');
var assetPreloading = require('assetPreloading');
var getText = require('getText').getText;

// livingobject constants (Ankama)
var LEVEL_STEPS = [0, 10, 21, 33, 46, 60, 75, 91, 108, 126, 145, 165, 186, 208, 231, 255, 280, 306, 333, 361];

//TODO: These constants should reside in ActionIdConverter
var ACTION_ID_LIVING_OBJECT_FOOD_DATE = 808;
var ACTION_ID_LIVING_OBJECT_ID = 970;
var ACTION_ID_LIVING_OBJECT_MOOD = 971;
var ACTION_ID_LIVING_OBJECT_SKIN = 972;
var ACTION_ID_LIVING_OBJECT_CATEGORY = 973;
var ACTION_ID_LIVING_OBJECT_LEVEL = 974;

var OBJECT_GID_SOULSTONE = 7010;
var OBJECT_GID_SOULSTONE_BOSS = 10417;
var OBJECT_GID_SOULSTONE_MINIBOSS = 10418;

var EFFECTID_LINKED_CHARACTER = 981;
var EFFECTID_LINKED_ACCOUNT = 982;

function ItemInstance(itemInstanceRaw) {
	EventEmitter.call(this);

	this.exchangeAllowed = true;
	this.isInitialised = false;
	this.shortName = null;
	this.effectsMap = {};

	for (var prop in itemInstanceRaw) {
		this[prop] = itemInstanceRaw[prop];
	}
}
inherits(ItemInstance, EventEmitter);
module.exports = ItemInstance;


ItemInstance.prototype.setItem = function (item) {
	this.exchangeable = item.exchangeable;
	this.isOkForMultiUse = false;
	this.weight = item.realWeight;
	this.item = item;
};

ItemInstance.prototype.isLinked = function () {
	return !this.exchangeable || !this.exchangeAllowed;
};

ItemInstance.prototype.isLinkedCharacter = function () {
	return !!(this.effectsMap[EFFECTID_LINKED_CHARACTER]);
};

function getLivingObjectLevel(xp) {
	for (var i = 0; i < LEVEL_STEPS.length; i += 1) {
		if (LEVEL_STEPS[i] > xp) {
			return i;
		}
	}
	return LEVEL_STEPS.length;
}

function initializeEffectInstances(itemInstance, effectInstances, cb) {
	// raw itemInstance comes in with ObjectEffects array, which is replaced here

	itemInstance.effects = effectInstances;

	if (!itemInstance.effects.length) {
		return cb();
	}

	// we filter effect instances without effects (some effect instances have broken data)
	effectInstances = effectInstances.filter(function (elm) {
		return (elm && elm.effect);
	});

	var shape = 0;
	var ray = 0;
	var item = itemInstance.item;

	if (item && item.isWeapon) {
		switch (item.typeId) {
		case 7: // hammer
			shape = 'X';
			ray = 1;
			break;
		case 4: // stick
			shape = 'T';
			ray = 1;
			break;
		case 8: // shovel
			shape = 'L';
			ray = 1;
			break;
		default:
			break;
		}
	}

	for (var i = 0; i < effectInstances.length; i += 1) {
		var effectInstance = effectInstances[i];

		itemInstance.effectsMap[effectInstance.effectId] = effectInstance;

		if (shape && effectInstance.isDamageEffect()) {
			effectInstance.zoneShape = shape;
			effectInstance.zoneSize = ray;
		}

		// generate properties on living objects based on arbitrary effect values
		// NOTE: raw living object property effects are marked for further filtering
		switch (effectInstance.effectId) {
			case ACTION_ID_LIVING_OBJECT_FOOD_DATE:
				itemInstance.livingObjectFoodDate = effectInstance.description;
				// keep raw effects related to dates
				break;

			case ACTION_ID_LIVING_OBJECT_ID:
				itemInstance.livingObjectId = effectInstance.value;

				effectInstance.isLivingProperty = true;
				break;

			case ACTION_ID_LIVING_OBJECT_MOOD:
				itemInstance.livingObjectMood = effectInstance.value;

				effectInstance.isLivingProperty = true;
				break;

			case ACTION_ID_LIVING_OBJECT_SKIN:
				itemInstance.livingObjectSkin = effectInstance.value;

				effectInstance.isLivingProperty = true;
				break;

			case ACTION_ID_LIVING_OBJECT_CATEGORY:
				itemInstance.livingObjectCategory = effectInstance.value;

				effectInstance.isLivingProperty = true;
				break;

			case ACTION_ID_LIVING_OBJECT_LEVEL:
				var livingObjectLevel = getLivingObjectLevel(effectInstance.value);
				var livingObjectXp = effectInstance.value - LEVEL_STEPS[livingObjectLevel - 1];
				var livingObjectMaxXp = LEVEL_STEPS[livingObjectLevel] - LEVEL_STEPS[livingObjectLevel - 1] || 0;

				itemInstance.livingObjectLevel = livingObjectLevel;
				itemInstance.livingObjectXp = livingObjectXp;
				itemInstance.livingObjectMaxXp = livingObjectMaxXp;

				effectInstance.isLivingProperty = true;
				break;
		}

		// TODO updatePresets(effectInstance);

		// if life or energy point gain
		if (effectInstance.effectId === 139 || effectInstance.effectId === 110) {
			itemInstance.isOkForMultiUse = true;
		}

		//983:exchange only possible after a date
		if (effectInstance.effectId === 983) {
			itemInstance.exchangeAllowed = false;
		}

		//982:link to the account
		if (effectInstance.effectId === EFFECTID_LINKED_CHARACTER ||
				effectInstance.effectId === EFFECTID_LINKED_ACCOUNT) {
			itemInstance.exchangeable = false;
		}
	}

	// icon
	// NOTE: associated living object has livingObjectId (it's own GID), and objectGID (item it’s associated with)
	// otherwise, it only has it's own GID as obejctGID
	if (!itemInstance.livingObjectCategory) {
		return cb();
	}

	var objectId = itemInstance.livingObjectId || itemInstance.objectGID;
	staticContent.getData('LivingObjectSkinJntMood', objectId, function (error, skin) {
		if (error) {
			return cb(error);
		}

		itemInstance.iconId = skin.moods[itemInstance.livingObjectMood][itemInstance.livingObjectSkin - 1];
		assetPreloading.preloadImage('gfx/items/' + itemInstance.iconId + '.png', function (url) {
			itemInstance.image = url;
			cb();
		});
	});
}

// final initialization step (has to be called after effectInstances are set)
function initializeFinalStep(itemInstance, cb) {
	// item weight
	if (itemInstance.effectsMap && itemInstance.effectsMap[1081]) {
		itemInstance.weight += itemInstance.effectsMap[1081].getParams()[0];
	}

	function initializationDone(error) {
		if (error) {
			return cb(error);
		}
		itemInstance.isInitialised = true;
		itemInstance.emit('initialised');
		return cb();
	}

	// enrich for short name
	var bestLevel = 0;
	var shortName;
	var buildShortNameStep;
	switch (itemInstance.item.id) {
		case OBJECT_GID_SOULSTONE:
			buildShortNameStep = function (monster, gradeIndex) {
				var grade = monster.grades[gradeIndex];
				if (grade && grade.level > bestLevel) {
					bestLevel = grade.level;
					shortName = monster.nameId;
				}
			};
			break;
		case OBJECT_GID_SOULSTONE_MINIBOSS:
			buildShortNameStep = function (monster) {
				if (monster.isMiniBoss) {
					if (!shortName) {
						shortName = monster.nameId;
					} else {
						shortName += ', ' + monster.nameId;
					}
				}
			};
			break;
		case OBJECT_GID_SOULSTONE_BOSS:
			buildShortNameStep = function (monster) {
				if (monster.isBoss) {
					if (!shortName) {
						shortName = monster.nameId;
					} else {
						shortName += ', ' + monster.nameId;
					}
				}
			};
			break;
	}

	if (!buildShortNameStep) {
		itemInstance.shortName = itemInstance.item.getRawName();
		return initializationDone();
	}

	var monsterIds = [];
	var monsterGrades = [];
	for (var i = 0; i < itemInstance.effects.length; i++) {
		var effectParams = itemInstance.effects[i].getParams();
		if (effectParams[2]) {
			monsterIds.push(effectParams[2]);
			monsterGrades.push(effectParams[0] - 1);
		}
	}
	staticContent.getData('Monsters', monsterIds, function (error, monsters) {
		if (error) {
			return initializationDone(error);
		}
		for (var i = 0; i < itemInstance.effects.length; i++) {
			if (monsters[i]) {
				buildShortNameStep(monsters[i], monsterGrades[i]);
			}
		}
		itemInstance.shortName = shortName;
		return initializationDone();
	});
}

// initialize a single itemInstance
// (seems to be never called: all items creation seems to go through
// itemManager's createItemInstances that is using initializeList).
ItemInstance.prototype.initialize = function (cb) {
	ItemInstance.initializeList([this], cb);
};

// initialize a collection of itemInstances
ItemInstance.initializeList = function (itemInstances, callback) {
	// collect all effects from all items
	var effectList = [];
	for (var i = 0; i < itemInstances.length; i++) {
		if (itemInstances[i].effects.length > 0) {
			effectList = effectList.concat(itemInstances[i].effects);
		}
	}
	// create all effectInstances
	effectInstanceFactory.createEffectInstances(effectList, function (error, effectInstances) {
		if (error) {
			return callback(error);
		}
		// each item get its own effectInstance(s)...
		async.eachSeries(itemInstances, function (itemInstance, cb) {
			var effectsLength = itemInstance.effects.length;
			var itemEffectInstances = effectsLength > 0 ? effectInstances.splice(0, effectsLength) : [];
			initializeEffectInstances(itemInstance, itemEffectInstances, function (error) {
				if (error) {
					return cb(error);
				}
				// ...and its final final initialization step
				initializeFinalStep(itemInstance, cb);
			});
		}, function (error) {
			callback(error);
		});
	});
};

ItemInstance.prototype.getRawName = function () {
	if (!this.isInitialised) { return ''; }
	var name;
	if (this.objectGID === OBJECT_GID_SOULSTONE) {
		name = getText('ui.item.soul') + getText('ui.common.colon') + this.shortName;
	} else if (this.objectGID === OBJECT_GID_SOULSTONE_MINIBOSS) {
		name = getText('ui.item.miniboss') + getText('ui.common.colon') + this.shortName;
	} else if (this.objectGID === OBJECT_GID_SOULSTONE_BOSS) {
		name = getText('ui.item.boss') + getText('ui.common.colon') + this.shortName;
	} else {
		name = this.shortName;
	}
	return name;
};

ItemInstance.prototype.getName = function () {
	if (!this.isInitialised) { return ''; }
	var name = this.getRawName();
	// TODO: Items' id should not be added to the name but actually queried by the UI when required
	if (window.gui.playerData.isModeratorOrMore()) {
		name += ' (' + this.objectGID + ')';
	}
	return name;
};

// Common API with Item

ItemInstance.prototype.getItem = function () {
	return this.item;
};

ItemInstance.prototype.getItemInstance = function () {
	return this;
};

ItemInstance.prototype.getProperty = function (property) {
	if (property === 'weight') {
		return this.weight;
	} else if (property === 'nameId') {
		return this.getName();
	}
	return this.hasOwnProperty(property) ? this[property] : this.item.getProperty(property);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/itemManager/ItemInstance.js
 ** module id = 385
 ** module chunks = 0
 **/