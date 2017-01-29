require('./styles.less');
var setDroppable = require('dragManager').setDroppable;
var inherits = require('util').inherits;
var itemManager = require('itemManager');
var isEquippable = require('itemManager').isEquippable;
var Window = require('Window');
var getText = require('getText').getText;
var MinMaxSelector = require('MinMaxSelector');
var CheckboxLabel = require('CheckboxLabel');
var craftingManager = require('CraftingManager');

function CraftInventoryWindow(storageViewer) {
	Window.call(this, {
		title: getText('ui.common.inventory'),
		className: 'CraftInventoryWindow',
		positionInfo: { right: '0.5%', bottom: '2%', width: '23.2%', height: '95%' }
	});

	storageViewer.registerView(this, {
		manualReset: true
	});

	var objectUID;
	var objectGID;
	var paymentType;
	var gui = window.gui;
	var inventory = gui.playerData.inventory;
	var jobsData = gui.playerData.jobs;

	var minMaxSelector = gui.windowsContainer.appendChild(new MinMaxSelector());
	var dropFrom = false;
	var filterAdded = true;

	var usefulIngredientMap = null;
	var skillId = null;
	var type = null;
	var filterFunc = null;

	function craftFilter(itemInstance) {
		//#12999 deactivation of the filter for Wrap a Gift
		if (skillId === jobsData.SKILLID_WRAP_GIFT) {
			return true;
		}
		return usefulIngredientMap && usefulIngredientMap[itemInstance.objectGID];
	}

	function craftMagusFilter(itemInstance) {
		var item = itemInstance.item;
		var skill = jobsData.getSkill(skillId);

		return item.typeId === skill.modifiableItemType ||
				item.typeId === craftingManager.SMITHMAGIC_RUNE_ID ||
				item.typeId === craftingManager.SMITHMAGIC_POTION_ID ||
				itemInstance.objectGID === craftingManager.SIGNATURE_RUNE_ID;
	}

	function decraftFilter(itemInstance) {
		return isEquippable(itemInstance.item.type && itemInstance.item.type.superTypeId);
	}

	var filterBox = new CheckboxLabel(getText('ui.craft.craftFilter'), true);
	filterBox.on('change', function (checked) {
		filterAdded = checked;
		if (checked) {
			storageViewer.addFilters([filterFunc]);
		} else {
			storageViewer.removeFilter(filterFunc);
		}
		storageViewer.filterList();
	});

	function moveItem(quantity) {
		if (dropFrom === 'craftPayment') {
			return window.dofus.sendMessage('ExchangeItemObjectAddAsPaymentMessage', {
				paymentType: paymentType,
				bAdd: false,
				objectToMoveId: objectUID,
				quantity: quantity
			});
		} else if (dropFrom === 'ingredientsBag') {
			// removing items from ingredientsBag
			return window.dofus.sendMessage('ExchangeObjectMoveMessage', {
				objectUID: objectUID,
				quantity: -quantity
			});
		}
		jobsData.moveItemBetweenCrafAndInventory(objectUID, objectGID, quantity, (dropFrom !== 'crafting'));
	}

	minMaxSelector.on('confirm', moveItem);

	function updateDisplayedQuantity(msg) {
		if (msg.remote) {
			return;
		}
		var objectUID = msg.object.objectUID;
		var inventoryItem = inventory.objects[objectUID];
		if (!inventoryItem) {
			return;
		}

		storageViewer.setItemQuantity(objectUID, inventoryItem.quantity - msg.object.quantity);
	}

	function updateDisplayedQuantityFactor(msg) {
		var factor = msg.count;
		var craftTable = jobsData.getCraftTable();
		for (var key in craftTable) {
			var UID = parseInt(key, 10);
			var qty = craftTable[key].quantity;
			var inventoryItem = inventory.objects[UID];
			if (!inventoryItem) {
				continue;
			}
			storageViewer.setItemQuantity(UID, inventoryItem.quantity - (qty * factor));
		}
	}

	function resetItemQuantity(msg) {
		storageViewer.resetItemQuantity(msg.objectUID);
	}

	gui.on('ExchangeObjectAddedMessage', this.localizeEvent(updateDisplayedQuantity));
	gui.on('ExchangeObjectModifiedMessage', this.localizeEvent(updateDisplayedQuantity));
	gui.on('ExchangeItemPaymentForCraftMessage', this.localizeEvent(updateDisplayedQuantity));
	gui.on('ExchangeModifiedPaymentForCraftMessage', this.localizeEvent(updateDisplayedQuantity));
	gui.on('ExchangeObjectPutInBagMessage', this.localizeEvent(updateDisplayedQuantity));
	gui.on('ExchangeObjectModifiedInBagMessage', this.localizeEvent(updateDisplayedQuantity));

	// storageViewer will re-display an equippable item after crafting, we call
	// updateDisplayedQuantity to hide it
	this.on('itemModified', this.localizeEvent(function (itemInstance) {
		updateDisplayedQuantity({ object: itemInstance, remote: false });
	}));

	gui.on('ExchangeReplayCountModifiedMessage', this.localizeEvent(updateDisplayedQuantityFactor));

	gui.on('ExchangeObjectRemovedMessage', this.localizeEvent(resetItemQuantity));
	gui.on('ExchangeRemovedPaymentForCraftMessage', this.localizeEvent(resetItemQuantity));
	gui.on('ExchangeClearPaymentForCraftMessage', this.localizeEvent(resetItemQuantity));
	gui.on('ExchangeObjectRemovedFromBagMessage', this.localizeEvent(resetItemQuantity));

	this.on('open', function (params) {
		params = params || {};

		type = params.type;

		// msg is the ExchangeStartOk message from the server
		var msg = params.msg;
		skillId = msg.skillId;
		var nbCase = msg.maxCase || msg.nbCase;

		if (type === 'craftMagus') {
			usefulIngredientMap = {};
			filterFunc = craftMagusFilter;
		} else if (type === 'decrafting') {
			// filter equippable items
			filterFunc = decraftFilter;
		} else {
			usefulIngredientMap = jobsData.getStorageCraftFilterMap(skillId, nbCase);
			filterFunc = craftFilter;
		}

		storageViewer.storageUI.appendChild(filterBox);
		storageViewer.addFilters([itemManager.unlinkedItemsFilter]);

		if (filterAdded) {
			storageViewer.addFilters([filterFunc]);
		}
		storageViewer.filterList();
		storageViewer.resetDisplay();
	});

	this.on('close', function () {
		minMaxSelector.hide();
		usefulIngredientMap = null;
		skillId = null;
		type = null;
	});

	this.on('closed', function () {
		storageViewer.storageUI.removeChild(filterBox);
		storageViewer.removeFilter(itemManager.unlinkedItemsFilter);
		if (filterAdded) {
			storageViewer.removeFilter(filterFunc);
		}
		filterFunc = null;
		storageViewer.resetItemsQuantity();
		storageViewer.filterList();
	});

	function selectSlot(slot, x, y, quantity) {
		objectUID = slot.itemInstance.objectUID;
		objectGID = slot.itemInstance.objectGID;
		paymentType = slot.paymentType;

		if (objectGID === jobsData.RUNE_SIGNATURE_GID && dropFrom !== 'craftPayment') {
			return moveItem(1);
		}

		if (quantity === 1) {
			return moveItem(1);
		}

		minMaxSelector.open({
			min: 1,
			max: quantity,
			x: x,
			y: y
		});
	}

	this.on('slot-doubletap', function (slot, x, y) {
		dropFrom = false;
		// force qty one on double tap
		selectSlot(slot, x, y, 1, false);
	});

	setDroppable(this, ['crafting', 'craftPayment', 'ingredientsBag']);
	this.on('drop', function (slot, sourceId, data) {
		dropFrom = sourceId;
		selectSlot(data.slot, data.x, data.y, data.slot.getQuantity());
	});

	this.on('recipeSelected', function () {
		storageViewer.resetDisplay();
	});
}

inherits(CraftInventoryWindow, Window);
module.exports = CraftInventoryWindow;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/CraftInventoryWindow/index.js
 ** module id = 933
 ** module chunks = 0
 **/