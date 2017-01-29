require('./styles.less');
var CharacterDisplay = require('CharacterDisplayWebGL');
var tapBehavior = require('tapBehavior');
var dragManager = require('dragManager');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var ItemBox = require('ItemBox');
var itemManager = require('itemManager');
var ItemSlot = require('ItemSlot');
var assetPreloading = require('assetPreloading');
var WuiDom = require('wuidom');

var positions = itemManager.positions;
// used to initialize the UI
var displayedPositions = {
	bottom: [
		positions.amulet,
		positions.shield,
		positions.ringLeft,
		positions.ringRight,
		positions.belt,
		positions.boots
	],
	left: [
		positions.dofus1,
		positions.dofus2,
		positions.dofus3,
		positions.dofus4,
		positions.dofus5,
		positions.dofus6
	],
	right: [
		positions.hat,
		positions.weapon,
		positions.cape,
		positions.pets,
		positions.mount
	]
};

function EquipmentDrawer() {
	WuiDom.call(this, 'div', { className: 'EquipmentDrawer' });
	this.content = this.createChild('div', { className: 'drawerContent' });

	this._slots = {}; // position => ItemSlot

	this._createDom();
	this._setupEvents();
}
inherits(EquipmentDrawer, WuiDom);
module.exports = EquipmentDrawer;

function slotDoubleTap() {
	if (!this.data) { return; }
	window.gui.playerData.inventory.unEquipItem(this.data.objectUID);
}

EquipmentDrawer.prototype._createSlot = function (container, position) {
	var self = this;
	var slot = this._slots[position] = container.appendChild(new ItemSlot({ scaleOnPress: true }));

	slot.addClassNames('pos' + position);
	slot.position = position;

	dragManager.setDroppable(slot, ['characterBox', 'equipment'], { matchPositionOnDrop: true });

	function onDrop(source) {
		window.gui.playerData.inventory.equipItem(source.data.objectUID, this.position);
		self.emit('itemDropped', source.data, this.position);
	}
	slot.on('drop', onDrop);

	slot.itemUI = {};

	dragManager.setDraggable(slot, slot.itemUI, 'characterBox');

	slot.on('tap', function () {
		if (!this.data) { return; }
		self.displayItem(this.data);
		self.emit('itemSelect', this.data);
	});

	slot.on('doubletap', slotDoubleTap);
};

EquipmentDrawer.prototype._createDom = function () {
	var characterBox = this.content.createChild('div', { className: 'characterBox' });

	var slotBox = {};
	slotBox.left = characterBox.createChild('div', { className: 'leftSlotBox' });
	var rightContainer = characterBox.createChild('div', { className: 'rightContainer' });
	var topBox = rightContainer.createChild('div', { className: 'topBox' });
	var character = this._character = topBox.appendChild(new CharacterDisplay({
		scale: 'fitin', horizontalAlign: 'center'
	}));

	function onCharacterDrop(source) {
		window.gui.playerData.inventory.equipItem(source.itemInstance.objectUID);
	}
	dragManager.setDroppable(character, ['equipment']);
	character.on('drop', onCharacterDrop);

	var leftBtn = character.createChild('div', { className: 'leftButton' });
	tapBehavior(leftBtn, { repeatDelay: 100 });
	leftBtn.on('tap', function () {
		character.rotateCharacter(false);
	});

	var rightBtn = character.createChild('div', { className: 'rightButton' });
	tapBehavior(rightBtn, { repeatDelay: 100 });
	rightBtn.on('tap', function () {
		character.rotateCharacter(true);
	});

	slotBox.right = topBox.createChild('div', { className: 'rightSlotBox' });
	slotBox.bottom = rightContainer.createChild('div', { className: 'bottomSlotBox' });

	for (var boxId in displayedPositions) {
		var positionList = displayedPositions[boxId];
		var container = slotBox[boxId];
		for (var i = 0, len = positionList.length; i < len; i += 1) {
			this._createSlot(container, positionList[i]);
		}
	}

	this._placeHolder = this.content.createChild('div', {
		className: 'itemBoxPlaceHolder',
		text: getText('ui.common.selectItem')
	});

	this._itemBox = this.content.appendChild(new ItemBox({
		showTitle: true,
		showItemActions: true,
		minRows: 7
	}));
};

EquipmentDrawer.prototype._setSlot = function (position, data) {
	var slot = this._slots[position];
	if (!slot) { return; }

	if (data.mountLocation) {
		slot.setData(data);
		assetPreloading.preloadImage('gfx/mounts/' + data.model + '.png', function (url) {
			slot.setImage(url);
		});
	} else {
		slot.setItem(data);
		slot.itemUI.backgroundImage = slot.getImage();
		dragManager.enableDrag(slot);

		var weaponSlot = this._slots[positions.weapon];
		var shieldSlot = this._slots[positions.shield];
		var weaponItem = weaponSlot.itemInstance && weaponSlot.itemInstance.item;

		// lock shield if twoHanded weapon is equipped
		if (weaponItem && weaponItem.twoHanded) {
			shieldSlot.lock();
		} else if (!shieldSlot.itemInstance) {
			shieldSlot.unset();
		}
	}
};

EquipmentDrawer.prototype._unsetSlot = function (position) {
	var slot = this._slots[position];
	if (!slot) { return; }

	slot.unset();
	dragManager.disableDrag(slot);
};

EquipmentDrawer.prototype.updateCharacterLook = function (look) {
	this._character.setLook(look, {
		riderOnly: true,
		boneType: 'characters/',
		skinType: 'characters/',
		keepDirection: true,
		keepModels: true
	});
};

EquipmentDrawer.prototype.updateCharacter = function () {
	var characterBaseInformations = window.gui.playerData.characterBaseInformations;

	// set character look
	this.updateCharacterLook(characterBaseInformations.entityLook);

	// set chracter renderer background image accordingly to player's breed
	var characterDisplay = this._character;
	assetPreloading.preloadImage(
		'gfx/illusUi/symboles_classe/FichePerso_tx_symboleClasse_frame' +
		(characterBaseInformations.breed - 1) +
		'.png',
		function (image) {
			characterDisplay.setStyle('backgroundImage', image);
		}
	);
};

EquipmentDrawer.prototype.disconnect = function () {
	// on disconnection, clear and clean character renderer
	this._character.release();
};

EquipmentDrawer.prototype.setEquipment = function () {
	var position;

	var playerData = window.gui.playerData;
	var equippedItems = playerData.inventory.equippedItems;
	for (position in this._slots) {
		var item = equippedItems[position];
		if (item) {
			this._setSlot(position, item);
		} else {
			this._unsetSlot(position);
		}
	}

	if (playerData.isRiding) {
		this._setSlot(positions.pets, playerData.equippedMount);
	}
};

EquipmentDrawer.prototype._setupEvents = function () {
	var self = this;
	var gui = window.gui;
	var playerData = gui.playerData;
	var inventory = playerData.inventory;

	inventory.on('itemMoved', function (item, previousPosition, newPosition) {
		if (newPosition === positions.notEquipped) {
			self._unsetSlot(previousPosition);
		} else {
			self._setSlot(newPosition, item);
		}
	});

	inventory.on('itemAdded', function (item) {
		if (item.position === positions.notEquipped) { return; }
		self._setSlot(item.position, item);
	});

	inventory.on('itemDeleted', function (itemUID, item) {
		var curItem = self._itemBox.item;

		if (curItem && curItem === item) {
			self.resetItem();
		}

		if (item.position === positions.notEquipped) { return; }
		self._unsetSlot(item.position);
	});

	inventory.on('itemModified', function (item) {
		if (item.position === positions.notEquipped) { return; }
		self._setSlot(item.position, item);
	});

	inventory.on('listUpdate', function () {
		self.setEquipment();
	});

	playerData.on('lookUpdate', function (look) {
		self.updateCharacterLook(look);
	});

	playerData.on('mountRiding', function () {
		// if mounted, replace inventory pet slot with the mount
		if (!playerData.isRiding) {
			self._unsetSlot(positions.pets);
		} else {
			self._setSlot(positions.pets, playerData.equippedMount);
		}
	});

	// listen on the setMount to update the mount level on the ItemBox in the inventory
	playerData.on('setMount', function () {
		if (!playerData.isRiding) {
			return;
		}
		self._setSlot(positions.pets, playerData.equippedMount);
	});
};

EquipmentDrawer.prototype.displayItem = function (data) {
	this._placeHolder.hide();
	this._itemBox.show();
	if (data.mountLocation) {
		this._itemBox.displayMount(data);
	} else {
		this._itemBox.displayItem(data);
	}
};

EquipmentDrawer.prototype.resetItem = function () {
	this._placeHolder.show();
	this._itemBox.hide();
};

EquipmentDrawer.prototype.getSlots = function () {
	return this._slots;
};

EquipmentDrawer.prototype.highlightPossiblePositions = function (possiblePositions) {
	possiblePositions = possiblePositions || [];

	for (var i = 0; i < possiblePositions.length; i += 1) {
		var pos = possiblePositions[i];
		this._slots[pos].addClassNames('selected');
	}

	this.emit('equippableHighlighted', possiblePositions);
};

EquipmentDrawer.prototype.removePossiblePositionsHighlight = function () {
	for (var position in this._slots) {
		this._slots[position].delClassNames('selected');
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/EquipmentWindow/EquipmentDrawer/index.js
 ** module id = 717
 ** module chunks = 0
 **/