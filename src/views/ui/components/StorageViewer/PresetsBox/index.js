require('./styles.less');
var addTooltip = require('TooltipBox').addTooltip;
var assetPreloading = require('assetPreloading');
var Button = require('Button').DofusButton;
var dragManager = require('dragManager');
var getText = require('getText').getText;
var itemManager = require('itemManager');
var Slot = require('Slot');
var ItemSlot = require('ItemSlot');
var util = require('util');
var windowsManager = require('windowsManager');
var WuiDom = require('wuidom');

// enum
var actionsEnum = require('ConfirmWindow').actionsEnum;

// const
var MAX_SLOTS_SET = 8;
var MAX_SLOTS_SET_ITEMS = 16;
var MAX_SLOTS_SET_ICONS = 27;
var ICON_SIZE = 40;
var ITEM_TYPE = require('ShortcutBarEnum').GENERAL_SHORTCUT_BAR;
var POS_PETS = itemManager.positions.pets;
var MODEL_EBONY_DRAGOTURKEY = 3;

// class
function PresetsBox() {
	WuiDom.call(this, 'div', { className: 'PresetsBox' });

	var self = this;

	// properties
	this.displayedItems = {};

	// methods
	function refreshUI() {
		// enable/disable ui based on what actions should be available
		var selectedSetSlot = self.setSlotsBox.selectedSlot;

		// instruction panel
		toggleExplanationPanel(!selectedSetSlot.preset);

		// buttons
		if (selectedSetSlot.preset) {
			self.deleteSetButton.enable();
			self.saveSetButton.enable(); // TODO: enable only if difference?
		} else {
			self.deleteSetButton.disable();
			self.saveSetButton.disable();
		}

		var presets = window.gui.playerData.inventory.presets;
		if (Object.keys(presets).length >= MAX_SLOTS_SET) {
			self.addSetButton.disable();
		} else {
			self.addSetButton.enable();
		}
	}

	function toggleExplanationPanel(toggle) {
		self.explanationPanel.toggleDisplay(toggle);
		self.setItemSlotsBox.toggleDisplay(!toggle);
		self.buttonsBox.toggleDisplay(!toggle);
	}

	function setDeleteContextMenu(slot) {
		var itemData = slot.itemInstance || slot.dbItem;

		// context menu unsets itemSlot
		function callback(action) {
			if (action !== 'remove') {
				return;
			}

			var presetId = self.setSlotsBox.selectedSlot.preset.presetId;
			var itemNameId = itemData.nameId || itemData.item.nameId;

			confirmDeleteItemPopup(itemNameId, presetId, function (action) {
				if (action === actionsEnum.YES) {
					self.saveCustom = true;
				} else {
					slot.setItem(itemData);
				}
			});
		}

		slot.setContextMenu('preset', {
				slot: slot,
				canRemove: true,
				onClose: callback
			}
		);
	}

	function slotTapped(tappedSlot) {
		tappedSlot.select();

		// detect container, deselect last selected
		var tappedContainer;
		if (self.setSlotsBox.getChild(tappedSlot.getWuiName())) { // sets
			tappedContainer = self.setSlotsBox;
			self._displaySet(tappedSlot.preset);
		} else if (self.setItemSlotsBox.getChild(tappedSlot.getWuiName())) { // items
			tappedContainer = self.setItemSlotsBox;
			self.emit('setItemSlotTapped', tappedSlot);
		} else { // icons
			tappedContainer = self.setIconsBox;
		}

		if (tappedContainer.selectedSlot && tappedSlot !== tappedContainer.selectedSlot) {
			tappedContainer.selectedSlot.select(false);
		}
		tappedContainer.selectedSlot = tappedSlot;

		// update buttons only when switching sets
		if (tappedContainer === self.setSlotsBox) {
			refreshUI();
		}
	}

	function slotDoubleTapped(tappedSlot) {
		if (!tappedSlot.preset) {
			return;
		}
		// TODO: if preset mount, prevent use during "mount exchange" (breeding window open) via ExchangeStartOkMountMessage
		window.dofus.sendMessage('InventoryPresetUseMessage', { presetId: tappedSlot.preset.presetId });
		self.addClassNames('spinner');
	}

	function setTap(slot) {
		slot.on('tap', function () {
			slotTapped(this);
		});
	}
	function setDoubletap(slot) {
		slot.on('doubletap', function () {
			slotDoubleTapped(this); // equip set
		});
	}
	function setSlotDataSet(slot) {
		slot.on('setData', function () {
			setDeleteContextMenu(this);
		});
	}

	function initSetSlotsBox() {
		for (var i = 0; i < MAX_SLOTS_SET; i += 1) {
			var slot = self.setSlotsBox.appendChild(new Slot({
				name: 'setSlot' + i
			}));
			setTap(slot);
			setDoubletap(slot);

			slot.dragUI = {
				width: ICON_SIZE,
				height: ICON_SIZE,
				onDragClassName: 'slot'
			};

			dragManager.setDraggable(slot, slot.dragUI, 'presets', { type: ITEM_TYPE });
		}
	}

	function initSetItemSlotsBox() {
		for (var i = 0; i < MAX_SLOTS_SET_ITEMS; i += 1) {
			var slot = self.setItemSlotsBox.appendChild(new ItemSlot({ name: 'setItemSlot' + i, errorIcon: true }));
			slot.addClassNames('pos' + i);
			setTap(slot);
			setSlotDataSet(slot);
		}
	}

	function initSetIconsBox() {
		self.setIconsBox.addClassNames('spinner');
		var iconImagePaths = [];
		for (var i = 0; i < MAX_SLOTS_SET_ICONS; i += 1) {
			iconImagePaths.push('gfx/presets/small_' + i + '.png');
			var slot = self.setIconsBox.appendChild(new Slot({ name: 'setIconSlot' + i }));
			setTap(slot);
		}

		assetPreloading.preloadImages(iconImagePaths, function (urls) {
			for (var i = 0; i < urls.length; i += 1) {
				var slot = self.setIconsBox.getChild('setIconSlot' + i);
				slot.setImage(urls[i]);
			}
			self.setIconsBox.delClassNames('spinner');
		});
	}

	function confirmDeleteSetPopup(presetId, callback) {
		window.gui.openConfirmPopup({
			title: getText('ui.popup.warning'),
			message: getText('ui.preset.warningDelete', presetId + 1),
			cb: callback
		});
	}

	function confirmDeleteItemPopup(itemNameId, presetId, callback) {
		window.gui.openConfirmPopup({
			title: getText('ui.popup.warning'),
			message: getText('ui.preset.warningItemDelete', itemNameId, presetId + 1),
			cb: callback
		});
	}

	function initButtons() {
		// new
		self.addSetButton.on('tap', function () {
			this.disable();
			self._addSet();
		});

		// import
		self.importSetButton.on('tap', function () {
			self._importSet();
		});
		addTooltip(self.importSetButton, getText('ui.preset.importCurrentStuff'));

		// delete
		self.deleteSetButton.on('tap', function () {
			var button = self.deleteSetButton;
			button.disable();

			// confirm
			var preset = self.setSlotsBox.selectedSlot && self.setSlotsBox.selectedSlot.preset;
			if (!preset) {
				return button.enable();
			}

			confirmDeleteSetPopup(preset.presetId, function (action) {
				if (action === actionsEnum.YES) {
					window.dofus.sendMessage('InventoryPresetDeleteMessage', { presetId: preset.presetId });
					self.addClassNames('spinner');
				} else {
					button.enable();
				}
			});
		});
		addTooltip(self.deleteSetButton, getText('ui.preset.delete'));

		// choose icon
		self.chooseIconButton.on('tap', function () {
			// confirm
			self._confirmIconPopup(function (action) {
				if (action === actionsEnum.YES) {
					self._saveSet();
				}
			});
		});

		// save
		self.saveSetButton.on('tap', function () {
			this.disable();
			self._saveSet();
		});
	}

	function initPresets() {
		// clean
		var setSlots = self.setSlotsBox.getChildren();
		for (var i = 0; i < setSlots.length; i += 1) {
			var slot = setSlots[i];
			if (slot.preset) {
				self._deleteSet(slot.preset.presetId);
			}
		}

		// update
		var presets = window.gui.playerData.inventory.presets || {};
		// link presets to slots, display first one
		for (var id in presets) {
			self._updateSetSlot(id);
		}
		setSlots[0].emit('tap');
	}

	function openErrorPopup(error) {
		// preset errors
		// NOTE: unknown is common error
		var presetErrStr = {
			usePartial: getText('ui.preset.error.usePartial'),
			badObjectId: getText('ui.preset.error.badObjectId'),
			tooMany: getText('ui.preset.error.tooMany'),
			criterion: getText('ui.preset.error.criterion'),
			badId: getText('ui.preset.error.badId'),
			badPosition: getText('ui.preset.error.badPosition'),
			unknown: getText('ui.common.unknownFail')
		};

		window.gui.openSimplePopup(presetErrStr[error]);
	}

	// init
	this.setSlotsBox = this.createChild('div', { className: 'setSlotsBox' });

	this.addSetButton = this.appendChild(new Button(getText('ui.common.new'), { className: ['addSetButton'] }));

	this.setItemSlotsBox = this.createChild('div', { className: 'setItemSlotsBox' });
	this.setIconsBox = this.createChild('div', { className: 'setIconsBox' });

	var buttonsBox = this.createChild('div', { className: 'buttonsBox' });
	this.importSetButton = buttonsBox.appendChild(new Button('', { className: ['importSetButton'] }));
	this.importSetButton.createChild('div', { className: 'icon' });
	this.deleteSetButton = buttonsBox.appendChild(new Button('', { className: ['deleteSetButton'] }));
	this.deleteSetButton.createChild('div', { className: 'icon' });
	this.chooseIconButton = buttonsBox.appendChild(new Button('!', { className: ['chooseIconButton'] }));
	this.chooseIconButton.createChild('div', { className: 'icon' });

	this.saveSetButton = buttonsBox.appendChild(new Button(getText('ui.common.save'), {
		className: ['saveSetButton']
	}));
	this.buttonsBox = buttonsBox;

	this.createChild('div', { className: 'overlay' });
	this.explanationPanel = this.createChild('div', { className: 'explanationPanel' });
	this.explanationPanel.createChild('div', { className: 'instruction', text: getText('ui.preset.howToUse') });

	initSetSlotsBox();
	initSetItemSlotsBox();
	initSetIconsBox();
	initButtons();

	initPresets();

	// events
	var playerData = window.gui.playerData;
	var inventory = playerData.inventory;

	inventory.on('listUpdate', function () {
		initPresets();
	});

	inventory.on('presetSaved', function (presetId, error) {
		// save successful?
		self.delClassNames('spinner');
		if (error) {
			refreshUI();
			return openErrorPopup(error);
		}

		// NOTE: presets data not actually updated til 'presetUpdated'
	});

	inventory.on('presetDeleted', function (presetId, error) {
		// delete successful?
		self.delClassNames('spinner');
		if (error) {
			refreshUI();
			return openErrorPopup(error);
		}

		self._deleteSet(presetId);

		// ui
		refreshUI();
	});

	inventory.on('presetUpdated', function (presetId, error) {
		// update successful?
		if (error) {
			return openErrorPopup(error);
		}

		self._updateSetSlot(presetId);

		// ui
		refreshUI();
	});

	inventory.on('presetItemUpdated', function (presetId) { // never error
		// item in preset updated
		self._updateSetSlot(presetId);
	});

	inventory.on('presetItemUpdateError', openErrorPopup); // always error

	inventory.on('presetUsed', function (presetId, error) {
		// use successful?
		self.delClassNames('spinner');
		if (error) {
			return openErrorPopup(error);
		}

		// NOTE: server has automatically equippped available items by now
		var preset = inventory.presets[presetId];

		// mount unrideable? notify manuall otherwise silent error
		var shouldNotify = playerData.equippedMount && (preset.mount && !playerData.isRiding);
		if (shouldNotify) {
			window.gui.textNotification.add(getText('tablet.mount.cannotRide'));
		}
	});

	function redisplayMountPreset() {
		// redisplay selected preset if it has a mount
		if (self.displayedPreset && self.displayedPreset.mount) {
			self._displaySet(self.displayedPreset);
		}
	}
	playerData.on('setMount', redisplayMountPreset);
	playerData.on('unsetMount', redisplayMountPreset);
}

util.inherits(PresetsBox, WuiDom);
module.exports = PresetsBox;

// private
PresetsBox.prototype._getItemPosMap = function (setData) {
	if (!setData) {
		return;
	}
	// setData can be preset or list of itemInstances
	var objects = setData.objects || setData;

	// use preset object position to populate array of defined, null, and removed items
	var inventory = window.gui.playerData.inventory;
	var mappedItemInstances = {};
	for (var i = 0; i < objects.length; i += 1) {
		var objectUID = objects[i].objUid || objects[i].objectUID;
		var position = objects[i].position;

		var itemData;
		if (!objectUID) {
			// objectUID of 0, means item removed from outside preset, show db item
			var objectGID = objects[i].objGid; // only preset object can have uid of 0
			itemData = itemManager.items[objectGID];
		} else {
			// otherwise normal itemInstance
			itemData = inventory.objects[objectUID];
		}

		mappedItemInstances[position] = itemData;
	}

	return mappedItemInstances; // [itemInstance, null, itemInstance, dbItem, null, ...] per position
};

PresetsBox.prototype._updateSetSlot = function (presetId) {
	var preset = window.gui.playerData.inventory.presets[presetId];

	// update set slot
	var setSlot = this.setSlotsBox.getChild('setSlot' + preset.presetId);
	setSlot.preset = preset;
	assetPreloading.preloadImage('gfx/presets/icon_' + preset.symbolId + '.png', function (url) {
		setSlot.setImage(url);

		// add dragging
		setSlot.dragUI.backgroundImage = setSlot.getImage();
		dragManager.enableDrag(setSlot);
	});

	// set icon slot
	var setIconSlot = this.setIconsBox.getChild('setIconSlot' + preset.symbolId);
	setIconSlot.preset = preset;

	// display if currently selected
	var selectedPreset = this.setSlotsBox.selectedSlot && this.setSlotsBox.selectedSlot.preset;
	if (selectedPreset && selectedPreset.presetId === preset.presetId) {
		this._displaySet(preset);
	}
};

PresetsBox.prototype._getIsItemUnavailable = function (itemData) {
	// unavailable if item in preset but not an itemInstance or itemInstance with unmet criteria
	if (!itemData) {
		return false; // if item doesn't exist, it cannot be unavailable
	}
	// if mount, check if mount is equipped
	if (itemData.mountLocation) {
		var equippedMount = window.gui.playerData.equippedMount;
		return !equippedMount;
	} else {
		return (!itemData.objectUID) || (itemData.conditions && !itemData.conditions.isRespected());
	}
};

PresetsBox.prototype._updateSetItemSlots = function (mappedItemInstances) {
	if (!mappedItemInstances) {
		return this._resetItemSlots(this.setItemSlotsBox.getChildren());
	}

	function setMount(itemSlot, mountData) {
		itemSlot.setData(mountData);
		assetPreloading.preloadImage('gfx/mounts/' + mountData.model + '.png', function (url) {
			itemSlot.setImage(url);
		});
	}

	// update each item slot based on position map
	for (var i = 0; i < MAX_SLOTS_SET_ITEMS; i += 1) {
		// update based on item or mount
		var itemData = mappedItemInstances[i];
		var itemSlot = this.setItemSlotsBox.getChild('setItemSlot' + i);
		itemSlot.unset();
		itemSlot.delClassNames('unavailable');
		if (!itemData) {
			continue;
		}

		if (itemData.mountLocation) {
			setMount(itemSlot, itemData);
		} else {
			itemSlot.setItem(itemData); // sets or unsets based on defined
		}

		// if db item, show with red X since it's been removed
		itemSlot.toggleClassName('unavailable', !!this._getIsItemUnavailable(itemData));
	}

	var selectedSetItemSlot = this.setItemSlotsBox.selectedSlot;
	if (selectedSetItemSlot) {
		selectedSetItemSlot.select(false);
	}
};

PresetsBox.prototype._resetItemSlots = function (itemSlots) {
	for (var i = 0; i < itemSlots.length; i += 1) {
		itemSlots[i].unset();
	}
};

PresetsBox.prototype._displaySet = function (preset) {
	var playerData = window.gui.playerData;
	var itemMap = this._getItemPosMap(preset);

	// select set icon
	var index = preset && preset.symbolId;
	if (preset) {
		index = preset.symbolId;

		// put mount data that can be displayed regardless of equipped mount
		if (preset.mount) { // NOTE: "mount" is boolean in preset objects
			itemMap[POS_PETS] = playerData.equippedMount || {
				model: MODEL_EBONY_DRAGOTURKEY,
				mountLocation: 'placeholder'
			};
		}
	} else {
		var iconSlots = this.setIconsBox.getChildren();
		var nextIcon = this._getNextAvailableSlot(iconSlots);
		index = iconSlots.indexOf(nextIcon);
	}

	// display items in this set
	this._updateSetItemSlots(itemMap);

	this.shouldSaveEquipment = false;
	this.saveCustom = false;

	this.setIconsBox.getChild('setIconSlot' + index).emit('tap');

	this.displayedPreset = preset;
};

PresetsBox.prototype._deleteSet = function (presetId) {
	// find slot linked with same preset id
	var setSlots = this.setSlotsBox.getChildren();
	for (var i = 0; i < setSlots.length; i += 1) {
		var slot = setSlots[i];
		if (slot.preset && slot.preset.presetId === presetId) {
			delete slot.preset;
			slot.unset();
			dragManager.disableDrag(slot);

			// reset equipment slots
			this._resetItemSlots(this.setItemSlotsBox.getChildren());
			break;
		}
	}
};

PresetsBox.prototype._importSet = function () {
	var playerData = window.gui.playerData;
	// display currently equipped items
	var equippedItems = playerData.inventory.equippedItems;

	// insert mount as equipped item if available
	if (playerData.isRiding) {
		equippedItems[POS_PETS] = playerData.equippedMount;
	}

	this._updateSetItemSlots(equippedItems);

	this.shouldSaveEquipment = true;
};

PresetsBox.prototype._saveSet = function () {
	var self = this;

	var setSlots = this.setSlotsBox.getChildren();
	var setItemSlots = this.setItemSlotsBox.getChildren();
	var setIcons = this.setIconsBox.getChildren();

	// unlink icon
	var selectedSetSlot = this.setSlotsBox.selectedSlot;
	var selectedIconSlot = this.setIconsBox.selectedSlot;

	if (selectedSetSlot.preset) {
		var lastIcon = setIcons[selectedSetSlot.preset.symbolId];
		delete lastIcon.preset;
	}

	// request save
	var msg;
	var request;
	if (this.saveCustom) { // save icon and all items and positions from the preset box
		var setItemSlotPositions = [];
		var setItemSlotUids = [];

		for (var i = 0; i < setItemSlots.length; i += 1) {
			var itemInstance = setItemSlots[i].itemInstance;
			if (itemInstance) { // item
				setItemSlotPositions.push(itemInstance.position);
				setItemSlotUids.push(itemInstance.objectUID || itemInstance.mountLocation && itemInstance.id);
			} else { // mount
				var mount = setItemSlots[i].data;
				if (mount && mount.mountLocation) {
					setItemSlotPositions.push(POS_PETS);
					setItemSlotUids.push(mount.id);
				}
			}
		}

		// NOTE: this process will remove items that have become "unavailable"
		msg = {
			presetId: setSlots.indexOf(selectedSetSlot),
			symbolId: setIcons.indexOf(selectedIconSlot),
			itemsPositions: setItemSlotPositions,
			itemsUids: setItemSlotUids
		};
		request = 'InventoryPresetSaveCustomMessage';
	} else { // save icon and use equipment as preset items
		msg = {
			presetId: setSlots.indexOf(selectedSetSlot),
			symbolId: setIcons.indexOf(selectedIconSlot),
			saveEquipment: this.shouldSaveEquipment // if false, will just save the icon symbolId
		};
		request = 'InventoryPresetSaveMessage';
	}

	window.dofus.sendMessage(request, msg);

	self.addClassNames('spinner');

	// response InventoryPresetSaveResultMessage, InventoryPresetUpdateMessage
};

PresetsBox.prototype._getNextAvailableSlot = function (itemSlots) {
	for (var i = 0; i < itemSlots.length; i += 1) {
		var slot = itemSlots[i];
		if (!slot.preset) {
			return slot;
		}
	}
};

PresetsBox.prototype._confirmIconPopup = function (callback) {
	windowsManager.open('presetChooseIcon', this.setIconsBox);
	windowsManager.getWindow('presetChooseIcon').once('close', callback);
};

PresetsBox.prototype._addSet = function () {
	var self = this;

	// next available set
	var nextAvailableSetSlot = this._getNextAvailableSlot(this.setSlotsBox.getChildren());

	// next available icon
	if (!nextAvailableSetSlot) {
		return;
	}

	var nextAvailableIconSlot = this._getNextAvailableSlot(this.setIconsBox.getChildren());

	nextAvailableSetSlot.emit('tap');
	nextAvailableIconSlot.emit('tap');

	// confirm
	this._confirmIconPopup(function (action) {
		if (action !== actionsEnum.YES) {
			return self.addSetButton.enable();
		}

		// import, save
		self._importSet();
		self._saveSet();
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/StorageViewer/PresetsBox/index.js
 ** module id = 637
 ** module chunks = 0
 **/