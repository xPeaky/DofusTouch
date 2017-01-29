require('./styles.less');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var getText = require('getText').getText;
var MinMaxSelector = require('MinMaxSelector');
var itemManager = require('itemManager');
var ItemSlot = require('ItemSlot');
var Button = require('Button');
var dragManager = require('dragManager');

function CraftResultBox() {
	WuiDom.call(this, 'div', { className: 'CraftResultBox' });
	var self = this;
	this._maxQuantity = 1;

	this._minMaxSelector = this.appendChild(new MinMaxSelector());
	this._minMaxSelector.on('confirm', function (result) {
		window.dofus.sendMessage('ExchangeReplayMessage', { count: result });
	});

	var resultContainer = this.createChild('div', { className: 'resultContainer' });

	var resultObjectLine = resultContainer.createChild('div', { className: 'resultObjectLine' });

	this._resultSlot = resultObjectLine.appendChild(new ItemSlot());
	this._resultName = resultObjectLine.createChild('div', { className: 'resultName' });
	this._qtyButton = resultObjectLine.appendChild(new Button({ className: ['simpleButton', 'qtyButton'] }));

	this._quantity = resultObjectLine.createChild('div', { className: 'quantity', text: 'x1' });

	var successLine = resultContainer.createChild('div', { className: 'successLine' });
	successLine.createChild('span', { className: 'label', text: getText('ui.craft.success') + ': ' });
	this._successValue = successLine.createChild('span', { className: 'value' });

	var resultStatsLine = resultContainer.createChild('div', { className: 'resultStatsLine' });

	var failureLine = resultStatsLine.createChild('div', { className: 'failureLine' });
	failureLine.createChild('span', { className: 'label', text: getText('ui.craft.failure') + ': ' });
	this._failureValue = failureLine.createChild('span', { className: 'value' });

	this._progressLine = resultStatsLine.createChild('div', { className: 'progressLine', hidden: true });
	this._progressLine.createChild('span', { className: 'label', text: getText('ui.craft.progress') + ': ' });
	this._progressValue = this._progressLine.createChild('span', { className: 'value' });

	// add the possibility to drop into the entire box

	dragManager.setDroppable(this, ['recipeList']);
	this.on('drop', function (element, source, sourceData) {
		// send the recipe to the crafting panel
		sourceData.selectRecipe();
	});

	this._qtyButton.on('tap', function () {
		self._minMaxSelector.open({
			min: 1,
			max: self._maxQuantity
		});
	});
}

inherits(CraftResultBox, WuiDom);
module.exports = CraftResultBox;


CraftResultBox.prototype.prepareItem = function (id) {
	var self = this;

	itemManager.getItems([id], function (error) {
		if (error) {
			return console.error(error);
		}

		var itemData = itemManager.items[id];
		self._resultSlot.setItem(itemData);
		self._resultName.setText(itemData.nameId);
	});
};


CraftResultBox.prototype.setQty = function (value) {
	this._quantity.setText('x' + value);
};


CraftResultBox.prototype.setMaxQuantity = function (maxQuantity) {
	this._maxQuantity = maxQuantity;
};


CraftResultBox.prototype.setProgress = function (value) {
	this._progressValue.setText(value);
	this._progressLine.show();
};


CraftResultBox.prototype.updateFailSuccessValues = function (fail, sucess) {
	this._failureValue.setText(fail);
	this._successValue.setText(sucess);
};

/**
 * @param {object[]} givenIngredientsInfo - If empty the xQuantity button is disable
 * @param {object} checkedRecipe
 */
CraftResultBox.prototype.checkRecipe = function (givenIngredientsInfo, checkedRecipe) {
	var xQuantityDisable = givenIngredientsInfo.length <= 0;

	function getMaxQuantity() {
		var playerData = window.gui.playerData;
		var inventory = playerData.inventory.objects;
		var qtyInInventoryMapByGID = {};
		var i, len;
		var maxQuantityCraft = -1;

		// create map of the quantities from inventory
		for (i = 0, len = givenIngredientsInfo.length; i < len; i += 1) {
			var ingredient = givenIngredientsInfo[i];
			if (!inventory[ingredient.UID]) {
				continue;
			}
			var qtyInInventory = inventory[ingredient.UID].quantity;
			qtyInInventoryMapByGID[ingredient.GID] = qtyInInventory;
		}

		for (i = 0, len = givenIngredientsInfo.length; i < len; i += 1) {
			if (!givenIngredientsInfo[i].GID) {
				continue;
			}
			var recipeIngredient = givenIngredientsInfo[i].GID;
			var recipeQuantity = givenIngredientsInfo[i].quantity;
			var qtyInInv = qtyInInventoryMapByGID[recipeIngredient];
			var maxQuantity = Math.floor(qtyInInv / recipeQuantity);
			if (maxQuantityCraft === -1 || maxQuantityCraft > maxQuantity) {
				maxQuantityCraft = maxQuantity;
			}
		}

		// check the number of rune signature
		var runeSignatureQty = qtyInInventoryMapByGID[playerData.jobs.RUNE_SIGNATURE_GID];
		if (runeSignatureQty && maxQuantityCraft > runeSignatureQty) {
			maxQuantityCraft = runeSignatureQty;
		}

		return maxQuantityCraft;
	}

	if (checkedRecipe.isRecipeKnown) {
		// TODO: play sound
		// soundApi.playSound (SoundTypeEnum.RECIPE_MATCH);
		this.prepareItem(checkedRecipe.itemToCraft.resultId);
	} else {
		this._clearItem();
	}
	if (xQuantityDisable) {
		this._qtyButton.disable();
		this.setMaxQuantity(1);
	} else {
		this._qtyButton.enable();
		var maxQuantity = getMaxQuantity();
		this.setMaxQuantity(maxQuantity);
	}
};


CraftResultBox.prototype._clearItem = function () {
	this._resultSlot.unset();
	this._resultName.setText('');
	this.setQty(1);
};


CraftResultBox.prototype.toggleReady = function (forceDisplay) {
	this.toggleClassName('isReady', forceDisplay);
};


CraftResultBox.prototype._clearProgress = function () {
	this._progressLine.hide();
	this._progressValue.setText('');
	this._failureValue.setText('-');
	this._successValue.setText('-');
};


CraftResultBox.prototype.clear = function () {
	this._clearItem();
	this._clearProgress();
	this.setMaxQuantity(1);
};



CraftResultBox.prototype.selectSlot = function (shouldSelect) {
	this._resultSlot.toggleClassName('selected', shouldSelect);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/CraftResultBox/index.js
 ** module id = 912
 ** module chunks = 0
 **/