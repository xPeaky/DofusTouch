var EventEmitter = require('events.js').EventEmitter;
var helper = require('helper');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var ObjectErrorEnum = require('ObjectErrorEnum');
var itemManager = require('itemManager');
var playUiSound = require('audioManager').playUiSound;
var itemPositions = itemManager.positions;

// enum
var presetDeleteResultEnum = require('PresetDeleteResultEnum');
var presetSaveResultEnum = require('PresetSaveResultEnum');
var presetSaveUpdateErrorEnum = require('PresetSaveUpdateErrorEnum');
var presetUseResultEnum = require('PresetUseResultEnum');

// const
var ITEM_TYPE_LIVING_OBJECT = 113;

function Inventory() {
	EventEmitter.call(this);

	this.objects = {};
	this.isLoaded = false;
	this.presets = {};
	this.kamas = 0;
	this.goultines = 0;
	this.weight = 0;
	this.maxWeight = 0;
	this.quantityList = {};

	// equipment
	this.equippedItems = {};
	this._lastUpdatedPosition = {};
}
inherits(Inventory, EventEmitter);
module.exports = Inventory;

Inventory.prototype.connect = function () {
	window.dofus.send('moneyGoultinesAmountRequest');
};

Inventory.prototype.isOverloaded = function () {
	return this.weight > this.maxWeight;
};

Inventory.prototype.disconnect = function () {
	this.objects = {};
	this.isLoaded = false;
	this.presets = {};
	this.weight = 0;
	this.maxWeight = 0;
	this.quantityList = {};
	this.equippedItems = {};
	this._lastUpdatedPosition = {};

	// CAUTION: we should ideally use storeValueAndEmit for all values kept by Inventory.
	// This implies that initial value (set during disconnect or, better, during connect)
	// should be null or other invalid value, so that the 1st event is emitted when 1st value comes.
	this.kamas = null;
	this.goultines = null;

	this.emit('unloaded');
};

Inventory.prototype.initialize = function (gui) {
	var self = this;
	var connectionManager = window.dofus.connectionManager;

	function updateQuantityList() {
		self.quantityList = {};
		for (var uid in self.objects) {
			var item = self.objects[uid];
			self.quantityList[item.objectGID] = item.quantity;
		}
	}

	function addCreatedItemInstances(itemInstances) {
		for (var i = 0, len = itemInstances.length; i < len; i += 1) {
			var item = itemInstances[i];
			self.objects[item.objectUID] = item;

			if (item.position !== itemPositions.notEquipped) {
				self.equippedItems[item.position] = item;

				if (item.position === itemPositions.weapon) {
					self.emit('weaponChanged');
				}
			}
		}
		updateQuantityList();
	}

	function afterUpdate() {
		self.isLoaded = true;
		self.emit('loaded');
		return self.emit('listUpdate', self.objects);
	}

	function updateInventoryContent(msg) {
		self.kamas = msg.kamas;
		self.emit('kamasUpdated', msg.kamas);

		var itemInstances = itemManager.createItemInstances(msg.objects, function (error) {
			if (error) { return console.error(error); }

			if (!msg.presets) { return afterUpdate(); }

			// implement the presets (custom sets)
			msg.presets = msg.presets || [];
			self.presets = {};
			var missingItemIds = [];
			for (var i = 0; i < msg.presets.length; i += 1) {
				var preset = msg.presets[i];
				self.presets[preset.presetId] = preset;

				// store all missing db items in preset
				for (var j = 0; j < preset.objects.length; j += 1) {
					var objectGID = preset.objects[j].objGid;
					if (!itemManager.items[objectGID]) {
						missingItemIds.push(objectGID);
					}
				}
			}

			// get missing preset items
			itemManager.getItems(missingItemIds, function (error) {
				if (error) { return console.error(error); }

				afterUpdate();
			});
		});

		addCreatedItemInstances(itemInstances);
	}

	gui.on('ObjectAddedMessage', function (msg) {
		var itemInstances = itemManager.createItemInstances(msg.object, function (error, itemInstances) {
			if (error) { return console.error(error); }
			self.emit('itemAdded', itemInstances.array[0]);
		});

		addCreatedItemInstances(itemInstances);
	});

	gui.on('ObjectsAddedMessage', function (msg) {
		var itemInstances = itemManager.createItemInstances(msg.object, function (error, itemInstances) {
			if (error) { return console.error(error); }
			self.emit('itemsAdded', itemInstances.map);
		});

		addCreatedItemInstances(itemInstances);
	});

	gui.on('ObjectModifiedMessage', function (msg) {
		var itemInstances = itemManager.createItemInstances(msg.object, function (error, itemInstances) {
			if (error) { return console.error(error); }
			var itemInstance = itemInstances.array[0];
			if (!self.objects[msg.object.objectUID] && !itemInstance.livingObjectCategory) {
				return console.error('[ObjectModifiedMessage] unknown object UID');
			}

			if (!itemInstance.isInitialised) { return; }

			itemInstance.emit('modified');
			self.emit('itemModified', itemInstance);
		});

		addCreatedItemInstances(itemInstances);
	});

	gui.on('ObjectMovementMessage', function (msg) {
		var itemInstance = self.objects[msg.objectUID];
		var weaponChanged = false;

		if (!itemInstance) {
			return;
		}

		if (itemInstance.position === itemPositions.weapon || msg.position === itemPositions.weapon) {
			weaponChanged = true;
		}

		var previousPosition = itemInstance.position;
		itemInstance.position = msg.position;

		if (self.equippedItems[previousPosition]) {
			delete self.equippedItems[previousPosition];
		}

		if (msg.position !== itemPositions.notEquipped) {
			self.equippedItems[msg.position] = itemInstance;
		}

		if (!itemInstance.isInitialised) { return; }

		if (weaponChanged) {
			self.emit('weaponChanged');
		}

		itemInstance.emit('moved');
		self.emit('itemMoved', itemInstance, previousPosition, msg.position);
	});

	gui.on('InventoryContentMessage', updateInventoryContent);

	gui.on('InventoryContentAndPresetMessage', updateInventoryContent);


	// presets
	gui.on('InventoryPresetDeleteResultMessage', function (msg) {
		// delete successful? do nothing if fail
		switch (msg.code) {

			case presetDeleteResultEnum.PRESET_DEL_OK:
				delete self.presets[msg.presetId];
				self.emit('presetDeleted', msg.presetId);
				break;

			case presetDeleteResultEnum.PRESET_DEL_ERR_TOO_MANY:
				self.emit('presetDeleted', msg.presetId, 'tooMany');
				break;

			case presetDeleteResultEnum.PRESET_DEL_ERR_UNKNOWN:
				self.emit('presetDeleted', msg.presetId, 'unknown');
				break;

			case presetDeleteResultEnum.PRESET_DEL_ERR_BAD_PRESET_ID:
				self.emit('presetDeleted', msg.presetId, 'badId');
				break;
		}
	});

	gui.on('InventoryPresetSaveResultMessage', function (msg) {
		// save successful? (preset already updated by this point)
		switch (msg.code) {

			case presetSaveResultEnum.PRESET_SAVE_OK:
				self.emit('presetSaved', msg.presetId);
				break;

			case presetSaveResultEnum.PRESET_SAVE_ERR_TOO_MANY:
				self.emit('presetSaved', msg.presetId, 'tooMany');
				break;

			case presetSaveResultEnum.PRESET_SAVE_ERR_UNKNOWN:
				self.emit('presetSaved', msg.presetId, 'unknown');
				break;
		}
	});

	gui.on('InventoryPresetUseResultMessage', function (msg) {
		// able to use preset?
		switch (msg.code) {

			case presetUseResultEnum.PRESET_USE_OK:
				self.emit('presetUsed', msg.presetId);
				break;

			case presetUseResultEnum.PRESET_USE_OK_PARTIAL:
				self.emit('presetUsed', msg.presetId, 'usePartial');
				break;

			case presetUseResultEnum.PRESET_USE_ERR_UNKNOWN:
				self.emit('presetUsed', msg.presetId, 'unknown');
				break;

			case presetUseResultEnum.PRESET_USE_ERR_CRITERION:
				self.emit('presetUsed', msg.presetId, 'criterion');
				break;

			case presetUseResultEnum.PRESET_USE_ERR_BAD_PRESET_ID:
				self.emit('presetUsed', msg.presetId, 'badId');
				break;
		}
	});

	gui.on('InventoryPresetUpdateMessage', function (msg) {
		// preset updated (no error codes)
		// handle mount (done from presets box)
		self.presets[msg.preset.presetId] = msg.preset;

		self.emit('presetUpdated', msg.preset.presetId);
	});

	gui.on('InventoryPresetItemUpdateMessage', function (msg) {
		// item in preset updated (no error codes)
		// NOTE: update error codes in separate message (below)
		var preset = self.presets[msg.presetId];
		for (var i = 0; i < preset.objects.length; i += 1) {
			if (preset.objects[i].position === msg.presetItem.position) {
				preset.objects[i] = msg.presetItem;
				break;
			}
		}

		self.emit('presetItemUpdated', msg.presetId);
	});

	gui.on('InventoryPresetItemUpdateErrorMessage', function (msg) {
		// item in preset could not be updated (always error code)
		switch (msg.code) {

			case presetSaveUpdateErrorEnum.PRESET_UPDATE_ERR_UNKNOWN:
				self.emit('presetItemUpdateError', 'unknown');
				break;

			case presetSaveUpdateErrorEnum.PRESET_UPDATE_ERR_BAD_PRESET_ID:
				self.emit('presetItemUpdateError', 'badId');
				break;

			case presetSaveUpdateErrorEnum.PRESET_UPDATE_ERR_BAD_POSITION:
				self.emit('presetItemUpdateError', 'badPosition');
				break;

			case presetSaveUpdateErrorEnum.PRESET_UPDATE_ERR_BAD_OBJECT_ID:
				self.emit('presetItemUpdateError', 'badObjectId');
				break;
		}
	});



	gui.on('InventoryWeightMessage', function (msg) {
		self.weight = msg.weight;
		self.maxWeight = msg.weightMax;
		self.emit('weightUpdated', msg.weight, msg.weightMax);
	});

	connectionManager.on('ObjectsQuantityMessage', function (msg) {
		var quantities = {};
		for (var i = 0, len = msg.objectsUIDAndQty.length; i < len; i += 1) {
			var info = msg.objectsUIDAndQty[i];
			var item = self.objects[info.objectUID];
			item.quantity = info.quantity;

			if (item.isInitialised) {
				quantities[info.objectUID] = info.quantity;
				item.emit('quantityUpdated');
			}
		}

		updateQuantityList();
		self.emit('itemsQuantity', quantities);
	});

	connectionManager.on('ObjectQuantityMessage', function (msg) {
		var item = self.objects[msg.objectUID];
		item.quantity = msg.quantity;
		updateQuantityList();

		if (item.isInitialised) {
			item.emit('quantityUpdated');
			self.emit('itemQuantity', msg.objectUID, msg.quantity);
		}
	});


	function removeObject(objectUID) {
		var object = self.objects[objectUID];
		if (!object) {
			return console.error('[ObjectDeletedMessage] unknown object UID');
		}

		if (object.position !== itemPositions.notEquipped) {
			delete self.equippedItems[object.position];

			if (object.position === itemPositions.weapon) {
				self.emit('weaponChanged');
			}
		}

		object.emit('deleted');
		delete self.objects[objectUID];
		updateQuantityList();
		return object;
	}

	connectionManager.on('ObjectsDeletedMessage', function (msg) {
		var objects = {};
		for (var i = 0, len = msg.objectUID.length; i < len; i += 1) {
			var uid = msg.objectUID[i];
			objects[uid] = removeObject(uid);
		}

		self.emit('itemsDeleted', msg.objectUID, objects);
	});

	connectionManager.on('ObjectDeletedMessage', function (msg) {
		var object = removeObject(msg.objectUID);
		self.emit('itemDeleted', msg.objectUID, object);
	});

	connectionManager.on('ObjectErrorMessage', function (msg) {
		var objectErrorText;
		switch (msg.reason) {
		case ObjectErrorEnum.INVENTORY_FULL:
			objectErrorText = getText('ui.objectError.InventoryFull');
			break;
		case ObjectErrorEnum.CANNOT_EQUIP_TWICE:
			objectErrorText = getText('ui.objectError.CannotEquipTwice');
			break;
		case ObjectErrorEnum.CANNOT_DROP:
			objectErrorText = getText('ui.objectError.CannotDrop');
			break;
		case ObjectErrorEnum.CANNOT_DROP_NO_PLACE:
			objectErrorText = getText('ui.objectError.CannotDropNoPlace');
			break;
		case ObjectErrorEnum.CANNOT_DESTROY:
			objectErrorText = getText('ui.objectError.CannotDelete');
			break;
		case ObjectErrorEnum.LEVEL_TOO_LOW:
			objectErrorText = getText('ui.objectError.levelTooLow');
			break;
		case ObjectErrorEnum.LIVING_OBJECT_REFUSED_FOOD:
			objectErrorText = getText('ui.objectError.LivingObjectRefusedFood');
			break;
		default:
			break;
		}

		if (objectErrorText) {
			gui.chat.logError(objectErrorText);
		}
	});


	gui.on('KamasUpdateMessage', function (msg) {
		helper.storeValueAndEmit(self, self, 'kamas', msg.kamasTotal, 'kamasUpdated');
	});

	gui.on('CharacterStatsListMessage', function (msg) {
		helper.storeValueAndEmit(self, self, 'kamas', msg.stats.kamas, 'kamasUpdated');
	});

	connectionManager.on('moneyGoultinesAmountSuccess', function (msg) {
		helper.storeValueAndEmit(self, self, 'goultines', msg.goultinesAmount, 'goultinesUpdated');
	});
};

/** Gets the current equipped weapon
 *  @return {ObjectItem} the object found or null */
Inventory.prototype.getCurrentWeapon = function () {
	return this.equippedItems[itemPositions.weapon];
};

var SOUND_BY_POSITION = {
	0:  'EQUIP_NECKLACE',   // amulet
	1:  'EQUIP_WEAPON',     // weapon
	2:  'EQUIP_WRISTBAND',  // ringLeft
	3:  'EQUIP_ACCESORIES', // belt
	4:  'EQUIP_WRISTBAND',  // ringRight
	5:  'EQUIP_BOOTS',      // boots
	6:  'EQUIP_CLOTH_2',    // hat
	7:  'EQUIP_CLOTH_1',    // cape
	8:  'EQUIP_PET',        // pets
	9:  'EQUIP_DOFUS',      // dofus1
	10: 'EQUIP_DOFUS',      // dofus2
	11: 'EQUIP_DOFUS',      // dofus3
	12: 'EQUIP_DOFUS',      // dofus4
	13: 'EQUIP_DOFUS',      // dofus5
	14: 'EQUIP_DOFUS',      // dofus6
	15: 'EQUIP_HAND',       // shield
	16: 'EQUIP_PET'         // mount
};

Inventory.prototype._equip = function (position, item, itemType) {
	this._lastUpdatedPosition[itemType.superTypeId] = position;
	window.dofus.sendMessage('ObjectSetPositionMessage', {
		objectUID: item.objectUID,
		position: position,
		quantity: 1
	});
	var soundId = SOUND_BY_POSITION[position];
	if (soundId) { playUiSound(soundId); }
};

/**
 * Equip an item on the current player. If no position is specified, will find a suitable position.
 * @param {Number} itemUID
 * @param {Number} [position] - a position on the player equipment. See the positions enum in the itemManager.
 * @returns {*}
 */
Inventory.prototype.equipItem = function (itemUID, position) {
	var item = this.objects[itemUID];

	if (!item || item.position !== itemPositions.notEquipped) {
		return;
	}

	var dbItem = item.item;
	var itemType = dbItem.type;

	if (itemType.category !== itemManager.categories.equipment) {
		return;
	}

	// handle living object association
	// NOTE: living objects have no possible positions, server allows them to be positioned or not
	if (dbItem.typeId === ITEM_TYPE_LIVING_OBJECT) {
		// send set position. Successful if receive object deleted and object modified
		return this._equip(position, item, itemType);
	}

	var possibleItemPositions = itemType.possiblePositions;
	if (!possibleItemPositions.length) {
		return;
	}

	// specific position was requested (drag and drop)
	if (position && possibleItemPositions.indexOf(position) !== -1) {
		return this._equip(position, item, itemType);
	}

	// finding a place to put the item
	var i, len, newPosition, equippedItem;
	var equippedItems = this.equippedItems;

	// if item is a ring or is part of a set, we look for an item with the same GID to replace it
	if (itemType.id !== 9 || item.belongsToSet) {
		for (i = 0, len = possibleItemPositions.length; i < len; i += 1) {
			newPosition = possibleItemPositions[i];
			equippedItem = equippedItems[newPosition];

			if (equippedItem && equippedItem.objectGID === item.objectGID) {
				return this._equip(newPosition, item, itemType);
			}
		}
	}

	// if there is an empty position, we put the item there
	for (i = 0, len = possibleItemPositions.length; i < len; i += 1) {
		newPosition = possibleItemPositions[i];
		if (!equippedItems[newPosition]) {
			return this._equip(newPosition, item, itemType);
		}
	}

	// last case, we replace the next in line after the last updated slot in priority or the first..
	var lastIndex = this._lastUpdatedPosition[itemType.superTypeId] || 0;
	var newIndex = lastIndex < possibleItemPositions.length - 1 ? lastIndex + 1 : 0;
	this._equip(possibleItemPositions[newIndex], item, itemType);
};

Inventory.prototype.unEquipItem = function (itemUID) {
	var item = this.objects[itemUID];

	if (!item || item.position === itemPositions.notEquipped) {
		return;
	}

	// Player should not be able to unequip his items while he has actions queued as it may modify his skills
	// TODO: Create an API/component to add a msg in the chat when we block user action within our code
	if (window.isoEngine.actionQueue.isActive()) {
		return;
	}

	window.dofus.sendMessage('ObjectSetPositionMessage', {
		objectUID: itemUID,
		position: itemPositions.notEquipped,
		quantity: 1
	});
};

Inventory.prototype.confirmDestroyItem = function (item, quantity) {
	window.gui.openConfirmPopup({
		title: getText('ui.common.delete.item'),
		message: getText('ui.common.doYouDestroy', quantity, item.item.nameId),
		cb: function (result) {
			if (!result) {
				return;
			}

			window.dofus.sendMessage('ObjectDeleteMessage', { objectUID: item.objectUID, quantity: quantity });
		}
	});
};

Inventory.prototype.getGenericItemCount = function (itemGID) {
	var objects = this.objects;
	var count = 0;
	for (var uid in objects) {
		var object = objects[uid];
		if (object.objectGID === itemGID) { count += object.quantity; }
	}
	return count;
};

Inventory.prototype.isGenericItemEquipped = function (itemGID) {
	var objects = this.objects;
	for (var uid in objects) {
		var object = objects[uid];
		if (object.objectGID !== itemGID) { continue; }
		if (object.position === itemPositions.notEquipped) { continue; }
		return true;
	}
	return false;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/PlayerData/Inventory.js
 ** module id = 527
 ** module chunks = 0
 **/