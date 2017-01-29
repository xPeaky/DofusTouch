require('./styles.less');
var inherits      = require('util').inherits;
var WuiDom        = require('wuidom');
var ItemSlot      = require('ItemSlot');
var gripBehavior  = require('gripBehavior');
var isEmptyObject = require('helper/JSUtils').isEmptyObject;
var dimensions    = require('dimensionsHelper').dimensions;

var CharacterInventoryPositionEnum = require('CharacterInventoryPositionEnum');

function RoleplayBuffs(dataHandler) {
	WuiDom.call(this, 'div', { className: 'RoleplayBuffs' });
	gripBehavior(this);

	this.slotList = {};

	this._createDom();
	this._setupListeners(dataHandler);

	this.hide();
}
inherits(RoleplayBuffs, WuiDom);
module.exports = RoleplayBuffs;

function isRoleplayBuff(item) {
	return item.position === CharacterInventoryPositionEnum.INVENTORY_POSITION_MUTATION ||
		item.position === CharacterInventoryPositionEnum.INVENTORY_POSITION_BOOST_FOOD ||
		item.position === CharacterInventoryPositionEnum.INVENTORY_POSITION_FIRST_BONUS ||
		item.position === CharacterInventoryPositionEnum.INVENTORY_POSITION_SECOND_BONUS ||
		item.position === CharacterInventoryPositionEnum.INVENTORY_POSITION_FIRST_MALUS ||
		item.position === CharacterInventoryPositionEnum.INVENTORY_POSITION_SECOND_MALUS ||
		item.position === CharacterInventoryPositionEnum.INVENTORY_POSITION_ROLEPLAY_BUFFER ||
		item.position === CharacterInventoryPositionEnum.INVENTORY_POSITION_FOLLOWER;
}

RoleplayBuffs.prototype._setupListeners = function (dataHandler) {
	var self = this;

	window.gui.on('connected', function () {
		self.setStyle('left', ~~(dimensions.mapWidth / 2) + dimensions.mapLeft + 'px');
		self.setStyle('top', dimensions.mapTop + 'px');
	});

	dataHandler.on('listUpdate', function (itemList) {
		self._unloadContent();
		for (var itemUID in itemList) {
			self._addItem(itemList[itemUID]);
		}
	});

	dataHandler.on('unloaded', function () {
		self._unloadContent();
	});

	dataHandler.on('itemAdded', function (item) {
		self._addItem(item);
	});

	dataHandler.on('itemsAdded', function (itemList) {
		for (var itemUID in itemList) {
			self._addItem(itemList[itemUID]);
		}
	});

	dataHandler.on('itemDeleted', function (itemUID) {
		self._removeItem(itemUID);
	});

	dataHandler.on('itemsDeleted', function (itemUIDList) {
		for (var itemUID in itemUIDList) {
			self._removeItem(itemUIDList[itemUID]);
		}
	});

	dataHandler.on('itemModified', function (item) {
		self._modifyItem(item);
	});
};

RoleplayBuffs.prototype._createDom = function () {
	this.slotBox = this.createChild('div', { className: 'slotBox' });
};

RoleplayBuffs.prototype._addItem = function (item) {
	if (!isRoleplayBuff(item)) {
		return;
	}

	var uid = item.objectUID;
	var slot = this.slotList[uid];
	if (slot) {
		return;
	}
	slot = this.slotList[uid] = new ItemSlot({
		itemData: item,
		enableContextMenu: false,
		descriptionOptions: {
			averagePrice: false,
			showCategory: false,
			showWeight: false
		}
	});
	this.slotBox.appendChild(slot);
	this.show();

	// gripBehavior will keep it on the map
	this.emit('resized');
};

RoleplayBuffs.prototype._removeItem = function (itemUID) {
	var slot = this.slotList[itemUID];
	if (!slot) {
		return;
	}
	slot.destroy();
	delete this.slotList[itemUID];
	if (isEmptyObject(this.slotList)) {
		this.hide();
	}

	// gripBehavior will keep it on the map
	this.emit('resized');
};

RoleplayBuffs.prototype._modifyItem = function (item) {
	this._removeItem(item.objectUID);
	this._addItem(item);
};

RoleplayBuffs.prototype._unloadContent = function () {
	this.slotList = {};
	this.slotBox.clearContent();
	this.hide();
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/RoleplayBuffs/index.js
 ** module id = 601
 ** module chunks = 0
 **/