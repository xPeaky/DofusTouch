require('./styles.less');
var Button = require('Button').DofusButton;
var craftingManager = require('CraftingManager');
var CraftResultEnum = require('CraftResultEnum');
var dragManager = require('dragManager');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var ItemBox = require('ItemBox');
var itemManager = require('itemManager');
var ItemSlot = require('ItemSlot');
var MinMaxSelector = require('MinMaxSelector');
var Window = require('Window');

var craftResultText = require('./craftResultText.js');

var SMITHMAGIC_RUNE_ID = craftingManager.SMITHMAGIC_RUNE_ID;
var SMITHMAGIC_POTION_ID = craftingManager.SMITHMAGIC_POTION_ID;
var SIGNATURE_RUNE_ID = craftingManager.SIGNATURE_RUNE_ID;
var SIGNATURE_AVAILABLE_LEVEL = craftingManager.SIGNATURE_AVAILABLE_LEVEL;

var SLOT_TYPES = ['item', 'rune', 'signatureRune'];


function CraftMagusWindow() {
	Window.call(this, {
		className: 'CraftMagusWindow',
		title: '',
		positionInfo: { left: '0.5%', bottom: '2%', width: '76%', height: '95%' },
		noCloseButton: true
	});

	this._initialize();

	this.once('open', function () {
		this._createDom();
	});

	this.on('open', function (params) {
		this._onOpen(params);
	});

	this.on('close', function () {
		this._onClose();
	});
}
inherits(CraftMagusWindow, Window);
module.exports = CraftMagusWindow;


CraftMagusWindow.prototype._initVariables = function () {
	this.exchangeStep = 0;
	this.isInAutoCraft = false;
	this.newItemInstance = null;
	this.newItemSlotType = null;
	this.skillId = null;
	this.skillData = null;
	this.droppedLocation = '';
	this.droppedItemSource = '';
	this.currentCraftingItem = null;
};

CraftMagusWindow.prototype._initialize = function () {
	this._initVariables();

	var self = this;
	var sendMessage = window.dofus.sendMessage;

	var incrementStep = this.incrementStep = function () {
		self.exchangeStep += 1;
	};

	function onMergeAllBtnTap() {
		self.isInAutoCraft = true;
		self._updateCraftingButtons();
		sendMessage('ExchangeReplayMessage', { count: -1 });
		sendMessage('ExchangeReadyMessage', {
			ready: true,
			step: self.exchangeStep
		});
	}

	function onMergeBtnTap() {
		self.isInAutoCraft = false;
		self._updateCraftingButtons();
		sendMessage('ExchangeReadyMessage', {
			ready: true,
			step: self.exchangeStep
		});
	}

	// methods to be used by dom elements
	this.onMergeAllBtnTap = onMergeAllBtnTap;
	this.onMergeBtnTap = onMergeBtnTap;

	function updateSlot(msg) {
		itemManager.createItemInstances(msg.object, function (error, instances) {
			if (error) {
				return console.error('Craft Magus: updateSlot cannot createItemInstances', error);
			}
			var instance = instances.array[0];
			var slotType = self._getItemSlotType(instance.item);
			var target = self._getSlotByType(slotType);

			target.setItem(instance);
			target.dragUiInfo.backgroundImage = target.getImage();
			dragManager.enableDrag(target);

			if (slotType === 'item') {
				self.currentCraftingItem = instance;
				self.itemBox.displayItem(instance);
				self._updateDisplayOnCraftingItemEquipped();
			}

			self._updateCraftingButtons();
		});
	}

	function objectRemoved(msg) {
		var objectUID = msg.objectUID;
		var slotType = self._getSlotTypeByUID(objectUID);

		if (!slotType) {
			return;
		}

		self._resetSlot(slotType);
		self._updateSlotsImage();

		self._updateCraftingButtons();
	}

	function exchangeAdded(msg) {
		updateSlot(msg);
		incrementStep();
	}

	function exchangeRemoved(msg) {
		objectRemoved(msg);
		incrementStep();
	}

	function handleCraftResult(msg) {
		var gui = window.gui;

		if (msg.craftResult === CraftResultEnum.CRAFT_IMPOSSIBLE) {
			var message = getText('ui.craft.noResult');
			gui.openSimplePopup(message);
			gui.chat.logMsg(message);
			sendMessage('ExchangeReadyMessage', { ready: false, step: self.exchangeStep });
			self.isInAutoCraft = false;
			self._updateCraftingButtons();
			return;
		}
		itemManager.createItemInstances(msg.objectInfo, function (error, instances) {
			if (error) {
				return console.error('CraftMagusWindow createItemInstances', error);
			}
			var instance = instances.array[0];
			craftResultText.display(self.currentCraftingItem, instance, msg);
		});
	}

	var gui = window.gui;
	gui.on('ObjectModifiedMessage', this.localizeEvent(updateSlot));
	gui.on('ExchangeObjectAddedMessage', this.localizeEvent(exchangeAdded));
	gui.on('ExchangeObjectModifiedMessage', this.localizeEvent(exchangeAdded));
	gui.on('ExchangeObjectRemovedMessage', this.localizeEvent(exchangeRemoved));
	gui.on('ExchangeCraftResultMagicWithObjectDescMessage', this.localizeEvent(handleCraftResult));
	gui.on('ExchangeCraftResultMessage', this.localizeEvent(handleCraftResult));
	gui.on('ExchangeItemAutoCraftStopedMessage', this.localizeEvent(this._onAutoCraftStopped.bind(this)));
};

CraftMagusWindow.prototype._createDom = function () {
	var col1 = this.col1 = this.windowBody.createChild('div', { className: 'col1' });
	var col2 = this.col2 = this.windowBody.createChild('div', { className: 'col2' });

	var craftingBoxContainer = this.craftingBoxContainer = col1.createChild('div', { className: 'craftingBoxContainer' });

	var craftingBoxDropArea = craftingBoxContainer.createChild('div', { className: 'craftingBoxDropArea' });
	dragManager.setDroppable(craftingBoxDropArea, ['craftInventory', 'ingredientsBag']);
	craftingBoxDropArea.on('drop', this._itemDropOnCraftBox.bind(this));

	var craftingBox = this.craftingBox = craftingBoxDropArea.createChild('div', { className: 'craftingBox' });

	function createSlot(type) {
		var slot = new ItemSlot({ name: type });
		slot.dragUiInfo = { backgroundImage: 'none' };

		dragManager.setDraggable(
			slot,
			slot.dragUiInfo,
			'crafting',
			{ slot: slot }
		);
		dragManager.disableDrag(slot);

		return slot;
	}

	var craftingSlots = this.craftingSlots = craftingBox.createChild('div', { className: 'craftingSlots' });

	// add all the item slots
	for (var i = 0; i < SLOT_TYPES.length; i += 1) {
		var type = SLOT_TYPES[i];
		craftingSlots.appendChild(createSlot(type));
	}

	this.minMaxSelector = this.windowContent.appendChild(new MinMaxSelector());
	this.minMaxSelector.on('confirm', this._moveItem.bind(this));

	var buttonsContainer = col1.createChild('div', { className: 'buttonsContainer' });

	this.mergeAllBtn = buttonsContainer.appendChild(
		new Button(getText('ui.common.mergeAll'), { className: 'mergeAllBtn' })
	);
	this.mergeAllBtn.on('tap', this.onMergeAllBtnTap);

	this.mergeBtn = buttonsContainer.appendChild(
		new Button(getText('ui.common.merge'), { className: 'mergeBtn' })
	);
	this.mergeBtn.on('tap', this.onMergeBtnTap);

	this.stopBtn = buttonsContainer.appendChild(
		new Button(getText('ui.common.stop'), { className: 'stopBtn' })
	);
	this.stopBtn.on('tap', this._onStopBtnTap.bind(this));

	this._setEnableCraftingButtons(false);

	this.itemBox = col2.appendChild(new ItemBox({ showDescription: true, showTitle: true, minRows: 0 }));
	this.itemBox.addClassNames('hidden');
};

CraftMagusWindow.prototype._onOpen = function (params) {
	// msg is the ExchangeStartOk message from the server
	var msg = params.msg;
	this.skillId = msg.skillId;
	this.skillData = window.gui.playerData.jobs.getSkill(msg.skillId);
	this.setTitle(this.skillData.nameId);
	this._updateSlotsImage();
};

CraftMagusWindow.prototype._onClose = function () {
	this._initVariables();
	this._resetSlots();
	this.itemBox.addClassNames('hidden');
	this._setEnableCraftingButtons(false);
};

CraftMagusWindow.prototype._isCraftableItem = function (item) {
	return this.skillData.modifiableItemType === item.typeId;
};

CraftMagusWindow.prototype._hasSignatureSlot = function () {
	var availableJob = window.gui.playerData.jobs.list;
	var parentJobId = this.skillData.parentJobId;
	var job = availableJob[parentJobId] || {};
	var experience = job.experience || {};
	return experience.jobLevel >= SIGNATURE_AVAILABLE_LEVEL;
};

CraftMagusWindow.prototype._getSlotByType = function (type) {
	return this.craftingSlots.getChild(type);
};

CraftMagusWindow.prototype._slotHasItem = function (type) {
	var slot = this._getSlotByType(type);
	return !!slot.itemInstance;
};

CraftMagusWindow.prototype._updateSlotsImage = function () {
	var itemType = this.skillData.modifiableItemType;
	this._getSlotByType('item').setBackgroundImageByItemType(itemType);
	this._getSlotByType('rune').setBackgroundImageByItemType(SMITHMAGIC_RUNE_ID);

	var hasSignatureSlot = this._hasSignatureSlot();
	var signatureRuneSlot = this._getSlotByType('signatureRune');
	signatureRuneSlot.toggleClassName('signatureSlot', hasSignatureSlot);
	signatureRuneSlot.toggleClassName('locked', !hasSignatureSlot);
};

CraftMagusWindow.prototype._resetSlot = function (type) {
	var slot = this._getSlotByType(type);
	slot.unset();
	dragManager.disableDrag(slot);
};

CraftMagusWindow.prototype._resetSlots = function () {
	for (var i = 0; i < SLOT_TYPES.length; i += 1) {
		this._resetSlot(SLOT_TYPES[i]);
	}
};

CraftMagusWindow.prototype._getItemSlotType = function (itemData) {
	var slotType;
	var skill = this.skillData;
	if (this._isCraftableItem(itemData)) {
		slotType = 'item';
	} else if (skill.isForgemagus &&
		(itemData.typeId === SMITHMAGIC_RUNE_ID || itemData.typeId === SMITHMAGIC_POTION_ID)) {
		slotType = 'rune';
	} else if (itemData.id === SIGNATURE_RUNE_ID) {
		slotType = 'signatureRune';
	}
	return slotType;
};

CraftMagusWindow.prototype._getSlotTypeByUID = function (UID) {
	for (var i = 0; i < SLOT_TYPES.length; i += 1) {
		var slotType = SLOT_TYPES[i];
		var slot = this._getSlotByType(slotType);

		if (slot.itemInstance && slot.itemInstance.objectUID === UID) {
			return slotType;
		}
	}
};

CraftMagusWindow.prototype._setEnableMergeButtons = function (shoudEnable) {
	this.mergeAllBtn.setEnable(shoudEnable);
	this.mergeBtn.setEnable(shoudEnable);
};

CraftMagusWindow.prototype._setEnableCraftingButtons = function (shoudEnable) {
	this._setEnableMergeButtons(shoudEnable);
	this.stopBtn.setEnable(shoudEnable);
};

CraftMagusWindow.prototype._updateCraftingButtons = function () {
	this._setEnableMergeButtons(!this.isInAutoCraft && this._slotHasItem('item') && this._slotHasItem('rune'));
	this.stopBtn.setEnable(this.isInAutoCraft);
};

CraftMagusWindow.prototype._sendItemMoveMessage = function (uid, quantity, toCraftTable) {
	window.dofus.sendMessage('ExchangeObjectMoveMessage', {
		objectUID: uid,
		quantity: toCraftTable ? quantity : -quantity
	});
};

CraftMagusWindow.prototype._positionMinMaxSelector = function (x, y) {
	this.minMaxSelector.setStyles({
		left: x + 'px',
		top: y + 'px'
	});
};

CraftMagusWindow.prototype._removeCurrentItemInCraftBox = function () {
	if (!this.newItemSlotType) {
		return;
	}

	var newItemInstance = this.newItemInstance;
	var currentSlot = this._getSlotByType(this.newItemSlotType);
	var currentItemInstance = currentSlot.itemInstance;

	// if there is item in craftBox, send exchange message with negative quantity to remove the item
	if (currentItemInstance && currentItemInstance.objectGID !== SIGNATURE_RUNE_ID &&
		(currentItemInstance.objectUID !== newItemInstance.objectUID || this._isCraftableItem(currentItemInstance.item))) {
		this._sendItemMoveMessage(currentItemInstance.objectUID, currentItemInstance.quantity, false);
	}
};

CraftMagusWindow.prototype._moveItem = function (quantity) {
	this._removeCurrentItemInCraftBox();
	this._sendItemMoveMessage(this.newItemInstance.objectUID, quantity, true);
};

CraftMagusWindow.prototype._itemDropOnCraftBox = function (slot, source, tap) {
	if (!this.skillId || !slot.itemInstance) {
		return;
	}

	this.newItemSlotType = this._getItemSlotType(slot.itemInstance.item);

	if (!this.newItemSlotType) {
		return;
	}

	var newItemInstance = this.newItemInstance = slot.itemInstance;
	this.droppedLocation = 'crafting';
	this.droppedItemSource = source;

	var objectGID = newItemInstance.objectGID;
	var quantity = slot.getQuantity();

	if (objectGID === SIGNATURE_RUNE_ID && !this._hasSignatureSlot()) {
		return;
	}

	if (objectGID === SIGNATURE_RUNE_ID || quantity === 1 ||
		(this._isCraftableItem(newItemInstance.item) && quantity > 1)) {
		return this._moveItem(1);
	}

	this._positionMinMaxSelector(tap.x, tap.y);

	this.minMaxSelector.open({
		min: 1,
		max: quantity
	});
};

CraftMagusWindow.prototype._onStopBtnTap = function () {
	window.dofus.sendMessage('ExchangeReplayStopMessage');
};

CraftMagusWindow.prototype._onAutoCraftStopped = function (msg) {
	craftingManager.displayAutoCraftStopReasonMessage(msg.reason);
	this.isInAutoCraft = false;
	this._updateCraftingButtons();
};

CraftMagusWindow.prototype._updateDisplayOnCraftingItemEquipped = function () {
	this.itemBox.delClassNames('hidden');
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/CraftMagusWindow/index.js
 ** module id = 922
 ** module chunks = 0
 **/