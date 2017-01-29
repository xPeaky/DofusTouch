require('./styles.less');
var CheckboxLabel = require('CheckboxLabel');
var effectInstanceFactory = require('effectInstanceFactory');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var ItemBox = require('ItemBox');
var ItemSlot = require('ItemSlot');
var itemManager = require('itemManager');
var Selector = require('Selector');
var staticContent = require('staticContent');
var Table = require('Table');
var Window = require('Window');

// constants
var MIN_SET_ITEMS = 1;
var BONUS_TYPE_MINUS = -1;

function ItemSetsWindow() {
	Window.call(this, {
		className: 'ItemSetsWindow',
		positionInfo: { left: 'c', top: 'c', width: 800, height: 525 }
	});

	var self = this;

	// properties
	this.selectedItemIds = [];

	// methods
	function unselectItemSlots() {
		self.selectedItemIds = [];

		var itemSlots = self.itemListBox.getChildren();
		for (var i = 0; i < itemSlots.length; i += 1) {
			var itemSlot = itemSlots[i];
			itemSlot.select(false);
		}
	}

	function selectItemSlots() {
		var itemIds = [].concat(self.itemSet.items);
		var itemSlots = self.itemListBox.getChildren();
		var itemSlot;

		for (var i = 0; i < itemSlots.length; i += 1) {
			itemSlot = itemSlots[i];
			itemSlot.select(true);
		}

		self.selectedItemIds = itemIds;
	}


	this.once('open', function () {
		// <<< left
		var leftCol = this.windowBody.createChild('div', { className: 'leftCol' });

		// item set list
		this.itemListBox = leftCol.createChild('div', { className: 'itemListBox' });

		// item box
		this.itemBox = new ItemBox({ showDescription: true, showTitle: true, withBidHouseBtn: true });
		leftCol.appendChild(this.itemBox);

		// >>> right
		var rightCol = this.windowBody.createChild('div', { className: 'rightCol' });

		// selector
		var selectorContainer = rightCol.createChild('div', { className: 'selectorContainer' });
		selectorContainer.createChild('div', { className: 'tableTitle', text: getText('ui.set.bonus') });

		this.bonusSelector = selectorContainer.appendChild(new Selector());
		this.bonusSelector.on('change', function (value) {
			self._updateBonusTable(value, self.combineBonusesCheckbox.isActivate());
		});

		// combine bonuses checkbox
		this.combineBonusesCheckbox = selectorContainer.appendChild(new CheckboxLabel(getText('ui.set.addObjectBonus')));
		this.combineBonusesCheckbox.on('change', function (isActivated) {
			if (isActivated) {
				selectItemSlots();
			} else {
				unselectItemSlots();
			}

			var numSelected = self.selectedItemIds.length;

			self.bonusSelector.select(isActivated ? numSelected : MIN_SET_ITEMS); // resets so we can select individual
			                                                                      // items
			self.bonusSelector.toggleOption(numSelected, isActivated);
			self.bonusSelector.setEnable(!isActivated);
			self.bonusSelector.toggleClassName('disabled', isActivated);
		});

		// bonus table
		var tableContainer = rightCol.createChild('div', { className: 'tableContainer' });
		this.bonusTable = tableContainer.appendChild(new Table({ className: 'bonusTable' }));

		// events
		window.gui.on('SetUpdateMessage', function (msg) {
			self._updateEquippedItems(msg.setObjects); // list of equipped item ids
		});
	});

	this.on('open', function (itemData) {
		var dbItem = itemData.item ? itemData.item : itemData;
		this._displayItemSet(dbItem);
	});
}

inherits(ItemSetsWindow, Window);
module.exports = ItemSetsWindow;

ItemSetsWindow.prototype._getEquippedItemById = function (itemId) {
	var equippedItems = window.gui.playerData.inventory.equippedItems;
	for (var id in equippedItems) {
		var itemInstance = equippedItems[id];
		if (itemInstance.item.id === itemId) {
			return itemInstance;
		}
	}
};

ItemSetsWindow.prototype._updateEquippedItems = function (equippedItemIds) {
	var itemSlots = this.itemListBox.getChildren();
	for (var i = 0; i < itemSlots.length; i += 1) {
		var itemSlot = itemSlots[i];
		itemSlot.delClassNames('equipped');

		if (equippedItemIds.indexOf(itemSlot.dbItem.id) > -1) {
			itemSlot.addClassNames('equipped');
		}

		// live update itemBox
		if (itemSlot.dbItem.id === this.itemBox.itemId) {
			this._updateItemBox(itemManager.items[itemSlot.dbItem.id]);
		}

		// update slot
		var itemInstance = this._getEquippedItemById(itemSlot.dbItem.id);
		itemSlot.setItem(itemInstance || itemSlot.dbItem);
	}

	// live update bonus table if combining bonuses
	if (this.combineBonusesCheckbox.isActivate()) {
		this.bonusSelector.select(this.selectedItemIds.length);
	}
};

ItemSetsWindow.prototype._displayItemSet = function (dbItem) {
	if (!dbItem.itemSetId) {
		return;
	}

	var self = this;

	// item box
	this._updateItemBox(dbItem);

	// item set
	staticContent.getData('ItemSets', dbItem.itemSetId, function (error, itemSet) {
		if (error) {
			return console.error(error);
		}
		self.itemSet = itemSet;

		self.windowTitle.setText(itemSet.nameId);

		// item set list & selector
		self.itemListBox.clearContent();
		self.bonusSelector.clearContent();
		itemManager.getItems(itemSet.items, function (error) {
			if (error) {
				return console.error(error);
			}

			// num items for selector
			self.bonusSelector.addOption('0 ' + getText('ui.common.objects'), 0);
			self.bonusSelector.toggleOption(0, false);
			for (var i = 0; i < itemSet.items.length; i += 1) {
				var itemId = itemSet.items[i];
				var item = itemManager.items[itemId];

				var itemSlot = self._createItemSlot(self._getEquippedItemById(itemId) || item);
				self.itemListBox.appendChild(itemSlot);
				self.bonusSelector.addOption((i + 1) + ' ' + getText('ui.common.objects'), i + 1);
			}

			self.combineBonusesCheckbox.deactivate(); // checkbox event updates selector
		});
	});
};

ItemSetsWindow.prototype._createItemSlot = function (itemData) {
	var self = this;

	var itemSlot = new ItemSlot({ itemData: itemData });

	itemSlot.createChild('div', { className: 'equippedIcon' });
	itemSlot.toggleClassName('equipped', !!itemSlot.itemInstance);

	itemSlot.on('tap', function () {
		// item box
		self.itemBox.displayItem(this.itemInstance || this.dbItem);

		// update table if combining bonues
		if (self.combineBonusesCheckbox.isActivate()) {
			var index = self.selectedItemIds.indexOf(itemSlot.dbItem.id);
			if (index < 0) {
				self.selectedItemIds.push(itemSlot.dbItem.id);
				this.select();
			} else {
				self.selectedItemIds.splice(index, 1);
				this.select(false);
			}
			self.bonusSelector.select(self.selectedItemIds.length);
		}
	});

	return itemSlot;
};

ItemSetsWindow.prototype._updateItemBox = function (dbItem) {
	// show specific or theoretical item
	var itemInstance = this._getEquippedItemById(dbItem.id);
	this.itemBox.displayItem(itemInstance || dbItem);
};

ItemSetsWindow.prototype._getEffectInstanceIntegerOrDie = function (effectInstance) {
	// copy
	var newEffectInstance = {};
	for (var id in effectInstance) {
		if (effectInstance.hasOwnProperty(id)) {
			newEffectInstance[id] = effectInstance[id];
		}
	}

	newEffectInstance.diceNum = newEffectInstance.diceNum || 0;
	newEffectInstance.diceSide = newEffectInstance.diceSide || 0;
	newEffectInstance.value = newEffectInstance.value || 0;

	// identify appropriate type and mutate
	// NOTE: ObjectEffectInteger type can have non-range "value", EffectInstanceDice can have "diceNum" & "diceSide"
	// NOTE: false dice have a diceNum but no diceSide
	if (!effectInstance.diceSide) {
		newEffectInstance._type = 'ObjectEffectInteger';

		if (effectInstance.diceNum) {
			newEffectInstance.value += effectInstance.diceNum;
		}

		newEffectInstance.diceNum = 0;
		newEffectInstance.diceSide = 0;
	} else if (effectInstance.diceNum && effectInstance.diceSide) {
		newEffectInstance._type = 'EffectInstanceDice';

		// distributively add "value" to dice ranges
		newEffectInstance.diceNum += newEffectInstance.value;
		newEffectInstance.diceSide += newEffectInstance.value;

		newEffectInstance.value = 0;
	}

	return newEffectInstance;
};

ItemSetsWindow.prototype._getMergedEffectInstances = function (effectInstancesToMerge, callback) {
	var mergedEffectInstances = [];
	var effectInstancesMap = {};
	var mergedEffectInstance;

	for (var i = 0; i < effectInstancesToMerge.length; i += 1) {
		var effectInstanceToMerge = effectInstancesToMerge[i];
		if (!effectInstanceToMerge) {
			continue;
		}
		mergedEffectInstance = effectInstancesMap[effectInstanceToMerge.effectId];

		// create new effectInstance as base to increment values, handle false dice
		if (!mergedEffectInstance) {
			mergedEffectInstance = this._getEffectInstanceIntegerOrDie(effectInstanceToMerge);
			effectInstancesMap[effectInstanceToMerge.effectId] = mergedEffectInstance;

			continue;
		}

		// no numerical display, just description
		if (!mergedEffectInstance.effect.useDice) {
			continue;
		}

		// merge into existing effect by incrementing value and dice ranges
		mergedEffectInstance.diceNum += effectInstanceToMerge.diceNum || 0;
		mergedEffectInstance.diceSide += effectInstanceToMerge.diceSide || 0;
		mergedEffectInstance.value += effectInstanceToMerge.value || 0;
	}

	// create correctly formatted ObjectEffectIntegers and EffectInstanceDice for effectInstanceFactory
	for (var effectId in effectInstancesMap) {
		mergedEffectInstance = this._getEffectInstanceIntegerOrDie(effectInstancesMap[effectId]);
		mergedEffectInstances.push(mergedEffectInstance);
	}

	// generate effectInstances with correct descriptions
	effectInstanceFactory.createEffectInstances(mergedEffectInstances, callback);
};

ItemSetsWindow.prototype._updateBonusTable = function (selectedNumItems, isCombineBonuses) {
	var self = this;

	this.bonusTable.clearContent();

	// NOTE: 2d array of effects ids represents tier of bonuses received per number of items equipped
	// format of itemSet data:
	/*
		"items": [
			2411,
			...
		],
		"effects": [
			[
				null
			],
			[
				{
					"_type": "EffectInstanceDice",
					"effectId": 118,
					...
				}, ...
			], ...
		],
	*/

	// NOTE: item set bonus effects are in the EffectInstanceDice data type
	var itemSetEffectInstances = [];

	// add applicable set bonus effects for this num of equipped items, if not secret
	var i;
	if (self.itemSet.effects.length && !self.itemSet.isBonusSecret) {
		var effectsPerNumItems = self.itemSet.effects[Math.max(selectedNumItems - 1, 0)];
		for (i = 0; i < effectsPerNumItems.length; i += 1) {
			var effectInstanceDie = effectsPerNumItems[i];
			// if you open the itemSets with Pink Piwi Ring (8224), you can notice that
			// effectInstanceDie can be an empty object {} (go from the DB)
			if (effectInstanceDie && Object.keys(effectInstanceDie).length) {
				itemSetEffectInstances.push(effectInstanceDie);
			}
		}
	}
	// give theoretical possibleeffects or equipped iteminstance effects for each id
	if (isCombineBonuses && self.selectedItemIds.length) {
		var selectedItemsEffectInstances = [];
		for (i = 0; i < self.selectedItemIds.length; i += 1) {
			var itemId = self.selectedItemIds[i];
			// NOTE: possible effects is empty array if this item's isBonusSecret and unequipped
			var equippedItem = self._getEquippedItemById(itemId);
			var effects = equippedItem ? equippedItem.effectsMap : itemManager.items[itemId].possibleEffectsMap;
			for (var id in effects) {
				if (effects[id].effect.showInSet) { // .effect here is raw effect data
					selectedItemsEffectInstances.push(effects[id]);
				}
			}
		}

		itemSetEffectInstances = itemSetEffectInstances.concat(selectedItemsEffectInstances);
	}

	// generate effectInstances for table
	effectInstanceFactory.createEffectInstances(itemSetEffectInstances, function (error, effectInstances) {
		if (error) {
			return console.error('_updateBonusTable createEffectInstances', error);
		}

		self._getMergedEffectInstances(effectInstances, function (error, mergedEffectInstances) {
			if (error) {
				return console.error('_updateBonusTable _getMergedEffectInstances', error);
			}
			self._addEffectsToTable(mergedEffectInstances);
		});
	});
};

/**
 * Create all the rows on the bonusTable UI part
 *
 * @param {array} effectInstances
 * @private
 */
ItemSetsWindow.prototype._addEffectsToTable = function addEffectsToTable(effectInstances) {
	// secret?
	if (this.itemSet.bonusIsSecret && !effectInstances.length) {
		this.bonusTable.addRow([getText('ui.set.secretBonus')]);
		return;
	}

	for (var i = 0; i < effectInstances.length; i += 1) {
		var effectInstance = effectInstances[i];
		if (!effectInstance) {
			continue;
		}
		var row = this.bonusTable.addRow([effectInstance.description]);

		row.toggleClassName('negative', effectInstance.effect.bonusType === BONUS_TYPE_MINUS);
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/ItemSetsWindow/index.js
 ** module id = 784
 ** module chunks = 0
 **/