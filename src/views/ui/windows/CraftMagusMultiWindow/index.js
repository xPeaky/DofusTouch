require('./styles.less');
var Button = require('Button').DofusButton;
var CheckboxLabel = require('CheckboxLabel');
var craftingManager = require('CraftingManager');
var CraftMagusWindow = require('CraftMagusWindow');
var dragManager = require('dragManager');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var itemManager = require('itemManager');
var ItemSlot = require('ItemSlot');
var PaginationUI = require('PaginationUI');
var windowsManager = require('windowsManager');
var WuiDom = require('wuidom');

var SLOT_ROW_LENGTH = 40;
var SLOT_COL_LENGTH = 40;
var PAGINATION_HEIGHT = 30;

var SMITHMAGIC_RUNE_ID = craftingManager.SMITHMAGIC_RUNE_ID;
var SMITHMAGIC_POTION_ID = craftingManager.SMITHMAGIC_POTION_ID;
var SIGNATURE_RUNE_ID = craftingManager.SIGNATURE_RUNE_ID;
var SIGNATURE_AVAILABLE_LEVEL = craftingManager.SIGNATURE_AVAILABLE_LEVEL;

function CraftMagusMultiWindow() {
	CraftMagusWindow.call(this);
	this.addClassNames('CraftMagusMultiWindow');

	this.on('opened', function () {
		this._resizeIngredientSlots();
	});
}

inherits(CraftMagusMultiWindow, CraftMagusWindow);
module.exports = CraftMagusMultiWindow;

CraftMagusMultiWindow.prototype._initVariables = function () {
	CraftMagusWindow.prototype._initVariables.call(this);
	this.isCrafter = null;
	this.isCraftingMode = false;
	this.allowCrafterIngredients = false;
	this.crafterSkillLevel = 1;

	// ingredients bag paging system
	this.currentPage = -1;
	this.pageCount = -1;
};

CraftMagusMultiWindow.prototype._initialize = function () {
	CraftMagusWindow.prototype._initialize.call(this);

	var self = this;

	function crafterCanUseHisResourcesUpdate(msg) {
		self.allowCrafterIngredients = !!msg.allowed;
		var isSilent = true;
		self.allowCrafterIngredientsCheckbox.toggleActivation(self.allowCrafterIngredients, isSilent);
	}

	function addIngredientToBag(msg) {
		var item = msg.object;
		itemManager.createItemInstances(item, function (error, itemInstances) {
			if (error) {
				return console.error(error);
			}

			var itemInstance = itemInstances.map[item.objectUID];
			var slot = new ItemSlot({ itemData: itemInstance, name: item.objectUID });
			slot.setQuantity(itemInstance.quantity);
			self.ingredientsSlots.appendChild(slot);

			dragManager.setDraggable(
				slot,
				{ backgroundImage: slot.getImage() },
				'ingredientsBag',
				{ slot: slot }
			);

			self._updateIngrediensSlotsPageCount();
		});
	}

	function updateIngredientInBag(msg) {
		var obj = msg.object;
		var objectUID = obj.objectUID;
		var quantity = obj.quantity;
		var slot = self.ingredientsSlots.getChild(objectUID);

		if (slot) {
			slot.setQuantity(quantity);
		}
	}

	function removeIngredientFromBag(msg) {
		var objectUID = msg.objectUID;
		var slot = self.ingredientsSlots.getChild(objectUID);

		if (slot) {
			slot.destroy();
			self._updateIngrediensSlotsPageCount();
		}
	}

	function itemDropOnBag(slot, source, tap) {
		if (!self.skillId || !slot.itemInstance || !self._getItemSlotType(slot.itemInstance.item) ||
			(self.isCrafter && source === 'craftInventory') ||
			(self.isCrafter && source === 'crafting' && self._isMyItem(slot.itemInstance.objectUID))) {
			return;
		}

		self.newItemInstance = slot.itemInstance;
		self.droppedLocation = 'ingredientsBag';
		self.droppedItemSource = source;

		var quantity = slot.getQuantity();

		if (quantity === 1) {
			return self._moveItem(1);
		}

		self._positionMinMaxSelector(tap.x, tap.y);

		self.minMaxSelector.open({
			min: 1,
			max: quantity
		});
	}

	this.itemDropOnBag = itemDropOnBag;

	var gui = window.gui;
	gui.on('ExchangeMultiCraftCrafterCanUseHisRessourcesMessage', this.localizeEvent(crafterCanUseHisResourcesUpdate));
	gui.on('ExchangeObjectPutInBagMessage', this.localizeEvent(addIngredientToBag));
	gui.on('ExchangeObjectRemovedFromBagMessage', this.localizeEvent(removeIngredientFromBag));
	gui.on('ExchangeObjectModifiedInBagMessage', this.localizeEvent(updateIngredientInBag));

	function onExchangeReady(msg) {
		var ready = msg.ready;
		self._updateExchangeReadyDisplay(!!ready);
	}

	gui.on('ExchangeIsReadyMessage', this.localizeEvent(onExchangeReady));

	var incrementStep = this.incrementStep;
	gui.on('ExchangeGoldPaymentForCraftMessage', this.localizeEvent(incrementStep));
	gui.on('ExchangeItemPaymentForCraftMessage', this.localizeEvent(incrementStep));
	gui.on('ExchangeModifiedPaymentForCraftMessage', this.localizeEvent(incrementStep));
	gui.on('ExchangeRemovedPaymentForCraftMessage', this.localizeEvent(incrementStep));
	gui.on('ExchangeClearPaymentForCraftMessage', this.localizeEvent(incrementStep));
};

CraftMagusMultiWindow.prototype._createDom = function () {
	CraftMagusWindow.prototype._createDom.call(this);

	var self = this;

	var crafter = this.craftingBox.createChild('div');
	this.crafterName = crafter.createChild('span', { className: 'playerName' });
	this.crafterDescription = crafter.createChild('span');

	var client = this.craftingBox.createChild('div');
	this.clientName = client.createChild('span', { className: 'playerName' });
	this.clientDescription = client.createChild('span');

	this.craftingBoxOverlay = new WuiDom('div', { className: 'craftingBoxOverlay', hidden: true });
	this.craftingBoxContainer.appendChild(this.craftingBoxOverlay);

	this.acceptBtn = new Button(getText('ui.common.accept'), { className: 'acceptBtn' });

	this.acceptBtn.on('tap', function () {
		window.dofus.sendMessage('ExchangeReadyMessage', {
			ready: true,
			step: self.exchangeStep
		});
	});

	this.acceptBtn.insertBefore(this.stopBtn);

	this.ingredientsBag = this.col1.createChild('div', { className: 'ingredientsBag' });
	this.ingredientsBag.createChild('div', { className: 'title', text: getText('ui.craft.ingredientBag') });

	this.ingredientsSlotsContainer = this.ingredientsBag.createChild('div', { className: 'ingredientsSlotsContainer' });

	this.ingredientsSlotsBox = this.ingredientsSlotsContainer.createChild('div', { className: 'ingredientsSlotsBox' });

	this.ingredientsSlotsMask = this.ingredientsSlotsBox.createChild('div', { className: 'ingredientsSlotsMask' });
	dragManager.setDroppable(this.ingredientsSlotsMask, ['craftInventory', 'crafting']);
	this.ingredientsSlotsMask.on('drop', this.itemDropOnBag);

	this.ingredientsSlots = this.ingredientsSlotsMask.createChild('div', { className: 'ingredientsSlots' });

	this.ingredientsSlotsOverlay = this.ingredientsSlotsBox.createChild('div',
		{ className: 'ingredientsSlotsOverlay', hidden: true }
	);

	this.pagination = this.ingredientsSlotsContainer.appendChild(new PaginationUI());
	this.pagination.on('previous', function () {
		self._ingrediensSlotsGoToPage(self.currentPage - 1);
	});
	this.pagination.on('next', function () {
		self._ingrediensSlotsGoToPage(self.currentPage + 1);
	});
	this.pagination.on('page', function (page) {
		self._ingrediensSlotsGoToPage(page);
	});

	this.allowCrafterIngredientsCheckbox = this.ingredientsBag.appendChild(
		new CheckboxLabel('', false)
	);
	this.allowCrafterIngredientsCheckbox.on('change', function (isActive) {
		window.dofus.sendMessage('ExchangeMultiCraftSetCrafterCanUseHisRessourcesMessage', { allow: isActive });
	});

	this.craftClientDescription = new WuiDom('div',
		{ className: 'craftClientDescription', text: getText('ui.craft.smithMagicTutorial'), hidden: true }
	);
	this.craftClientDescription.insertBefore(this.itemBox);

	this.paymentBtn = new Button(getText('ui.common.payment'), { className: 'paymentBtn' });
	this.paymentBtn.on('tap', function () {
		windowsManager.open('craftPayment');
	});
	this.col2.appendChild(this.paymentBtn);
};

CraftMagusMultiWindow.prototype._onOpen = function (params) {
	// msg is the ExchangeStartOk message from the server
	var msg = params.msg;
	this.skillId = msg.skillId;
	this.skillData = window.gui.playerData.jobs.getSkill(msg.skillId);
	this.setTitle(this.skillData.nameId);
	this._roleSetup(params);
	this._updateSlotsImage();
	windowsManager.close('cancel', { keepDialog: true });
};

CraftMagusMultiWindow.prototype._onClose = function () {
	CraftMagusWindow.prototype._onClose.call(this);
	this.ingredientsSlots.clearContent();
};

CraftMagusMultiWindow.prototype._roleSetup = function (params) {
	var isCrafter = this.isCrafter = params.isCrafter;

	this.mergeAllBtn.toggleDisplay(isCrafter);
	this.mergeBtn.toggleDisplay(isCrafter);
	this.acceptBtn.toggleDisplay(!isCrafter);

	this.allowCrafterIngredientsCheckbox.setText(
		isCrafter ? getText('ui.craft.crafterRunesAllowed') : getText('ui.craft.allowCrafterRunes')
	);
	var shouldActivate = false;
	var isSilent = true;
	this.allowCrafterIngredientsCheckbox.toggleActivation(shouldActivate, isSilent);
	this.allowCrafterIngredientsCheckbox.setEnable(!isCrafter);

	var craftPaymentWindow = windowsManager.getWindow('craftPayment');
	craftPaymentWindow.setForCrafter(isCrafter);
	craftPaymentWindow.setOnSuccess(true);

	var jobData = window.gui.playerData.jobs.list[this.skillData.parentJobId] || {};
	var experience = jobData.experience || {};
	this.crafterSkillLevel = params.msg.crafterJobLevel || experience.jobLevel;

	this.crafterName.setText(params.sourceName);
	this.clientName.setText(params.targetName);

	var jobName = params.msg.enrichData.jobName;

	this.crafterDescription.setText(' - ' + jobName + ' ' + getText('ui.common.level') + ' ' + this.crafterSkillLevel);
	this.clientDescription.setText(' - ' + getText('ui.craft.client'));

	this._updateExchangeReadyDisplay(false);
};

CraftMagusMultiWindow.prototype._hasSignatureSlot = function () {
	return this.crafterSkillLevel >= SIGNATURE_AVAILABLE_LEVEL;
};

CraftMagusMultiWindow.prototype._setEnableIngredientsBag = function (shouldEnable) {
	this.ingredientsSlotsOverlay.toggleDisplay(!shouldEnable);
	this.ingredientsSlotsBox.toggleClassName('disabled', !shouldEnable);
};

CraftMagusMultiWindow.prototype._setEnableCraftingBox = function (shouldEnable) {
	this.craftingBoxOverlay.toggleDisplay(!shouldEnable);
};

CraftMagusMultiWindow.prototype._resizeIngredientSlots = function () {
	var rootElement = this.ingredientsSlotsContainer.rootElement;

	var width = rootElement.offsetWidth;
	var height = rootElement.offsetHeight - PAGINATION_HEIGHT;

	var ingredientsSlotsRowNum = this.ingredientsSlotsRowNum = Math.floor(height / SLOT_ROW_LENGTH);
	var ingredientsSlotsColNum = Math.floor(width / SLOT_COL_LENGTH);

	this.maxIngredientsSlotsPerPage = ingredientsSlotsRowNum * ingredientsSlotsColNum;

	var maskWidth = ingredientsSlotsColNum * SLOT_COL_LENGTH;
	var maskHeight = ingredientsSlotsRowNum * SLOT_ROW_LENGTH;

	this.ingredientsSlotsBox.setStyles({
		width: width + 'px',
		height: height + 'px'
	});

	this.ingredientsSlotsMask.setStyles({
		width: maskWidth + 'px',
		height: maskHeight + 'px'
	});

	this.ingredientsSlotsOverlay.setStyles({
		height: maskHeight + 'px'
	});

	this._updateIngrediensSlotsPageCount();
};

CraftMagusMultiWindow.prototype._updateExchangeReadyDisplay = function (ready) {
	var isCraftingMode = this.isCraftingMode = ready;

	if (this.isCrafter) {
		this._setEnableCraftingBox(isCraftingMode);
		this._setEnableIngredientsBag(isCraftingMode);
		this.craftClientDescription.hide();
		return;
	}

	this._setEnableCraftingBox(false);
	this._setEnableIngredientsBag(!isCraftingMode);
	this.acceptBtn.setEnable(!isCraftingMode);
	this.stopBtn.setEnable(isCraftingMode);
	this._handleCraftClientItemBoxDisplay();
};

CraftMagusMultiWindow.prototype._handleCraftClientItemBoxDisplay = function () {
	var showItemBox = this.isCraftingMode && this._slotHasItem('item');
	this.itemBox.toggleClassName('hidden', !showItemBox);
	this.craftClientDescription.toggleDisplay(!showItemBox);
};

CraftMagusMultiWindow.prototype._updateCraftingButtons = function () {
	if (this.isCrafter) {
		CraftMagusWindow.prototype._updateCraftingButtons.call(this);
	}
};

CraftMagusMultiWindow.prototype._sendItemMoveMessageForMultiCraft = function (uid, quantity, toCraftTable) {
	window.dofus.sendMessage('ExchangeObjectUseInWorkshopMessage', {
		objectUID: uid,
		quantity: toCraftTable ? quantity : -quantity
	});
};

CraftMagusMultiWindow.prototype._isMyItem = function (objectUID) {
	return !!window.gui.playerData.inventory.objects[objectUID];
};

CraftMagusMultiWindow.prototype._isValidCrafterIngredients = function (itemInstance) {
	var item = itemInstance.item;
	return this.allowCrafterIngredients && this.isCraftingMode && this.isCrafter &&
		this._isMyItem(itemInstance.objectUID) &&
		(item.typeId === SMITHMAGIC_RUNE_ID || item.typeId === SMITHMAGIC_POTION_ID ||
		item.id === SIGNATURE_RUNE_ID);
};

CraftMagusMultiWindow.prototype._removeCurrentItemInCraftBox = function () {
	if (!this.newItemSlotType || this.droppedLocation !== 'crafting') {
		return;
	}

	var newItemInstance = this.newItemInstance;
	var currentSlot = this._getSlotByType(this.newItemSlotType);
	var currentItemInstance = currentSlot.itemInstance;

	// if there is item in craftBox, send exchange message with negative quantity to remove the item
	if (currentItemInstance && currentItemInstance.objectGID !== SIGNATURE_RUNE_ID &&
		(currentItemInstance.objectUID !== newItemInstance.objectUID || this._isCraftableItem(currentItemInstance.item))) {
		var itemMoveMessageFunc = this._isMyItem(currentItemInstance.objectUID) ?
			this._sendItemMoveMessage : this._sendItemMoveMessageForMultiCraft;
		itemMoveMessageFunc(currentItemInstance.objectUID, currentItemInstance.quantity, false);
	}
};

CraftMagusMultiWindow.prototype._ingrediensSlotsGoToPage = function (page) {
	if (this.currentPage === page || page < 0 || page > this.pageCount - 1) {
		return;
	}

	this.currentPage = page;

	var transform = 'translateY(-' + page * this.ingredientsSlotsRowNum * SLOT_ROW_LENGTH + 'px)';
	this.ingredientsSlots.setStyles({
		webkitTransform: transform,
		transform: transform
	});

	this.pagination.setCurrent(page);
};

CraftMagusMultiWindow.prototype._updateIngrediensSlotsPageCount = function () {
	var ingredientsNum = this.ingredientsSlots.getChildren().length;
	this.pageCount = Math.ceil(ingredientsNum / this.maxIngredientsSlotsPerPage) || 1;
	this.pagination.setPageCount(this.pageCount);
	this._ingrediensSlotsGoToPage(this.pageCount - 1);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// Overriding CraftMagusWindow's prototypes for multicraft

CraftMagusMultiWindow.prototype._moveItem = function (quantity) {
	this._removeCurrentItemInCraftBox();

	var itemMessageFunc = this.isCraftingMode &&  this.droppedItemSource !== 'craftInventory' ?
		this._sendItemMoveMessageForMultiCraft : this._sendItemMoveMessage;

	var toCraftTable = this.droppedLocation === 'crafting';

	// handle differently for ingredientsBag, only toCraftTable is true if move item from 'craftInventory'
	// to 'ingredientsBag'
	if (this.droppedLocation === 'ingredientsBag') {
		toCraftTable = this.droppedItemSource === 'craftInventory';
	}

	var newItemInstance = this.newItemInstance;
	itemMessageFunc(newItemInstance.objectUID, quantity, toCraftTable);
};

CraftMagusMultiWindow.prototype._itemDropOnCraftBox = function (slot, source, tap) {
	if (!this.skillId || !slot.itemInstance ||
		(source === 'craftInventory' && !this._isValidCrafterIngredients(slot.itemInstance))) {
		return;
	}

	CraftMagusWindow.prototype._itemDropOnCraftBox.call(this, slot, source, tap);
};

CraftMagusMultiWindow.prototype._onStopBtnTap = function () {
	if (this.isCrafter) {
		return CraftMagusWindow.prototype._onStopBtnTap.call(this);
	}
	window.dofus.sendMessage('ExchangeReadyMessage', {
		ready: false,
		step: this.exchangeStep
	});
};

CraftMagusMultiWindow.prototype._onAutoCraftStopped = function (msg) {
	if (this.isCrafter) {
		return CraftMagusWindow.prototype._onAutoCraftStopped.call(this, msg);
	}
	craftingManager.displayAutoCraftStopReasonMessage(msg.reason);
	this.isInAutoCraft = false;
};

CraftMagusMultiWindow.prototype._updateDisplayOnCraftingItemEquipped = function () {
	if (this.isCrafter) {
		return CraftMagusWindow.prototype._updateDisplayOnCraftingItemEquipped.call(this);
	}
	this._handleCraftClientItemBoxDisplay();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/CraftMagusMultiWindow/index.js
 ** module id = 926
 ** module chunks = 0
 **/