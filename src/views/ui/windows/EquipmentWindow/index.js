require('./styles.less');
var dragManager = require('dragManager');
var EquipmentDrawer = require('EquipmentWindow/EquipmentDrawer');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var itemManager = require('itemManager');
var setDroppable = dragManager.setDroppable;
var Window = require('Window');
var windowsManager = require('windowsManager');


function EquipmentWindow(storageView) {
	Window.call(this, {
		title: getText('ui.common.inventory'),
		className: 'EquipmentWindow',
		plusButton: false,
		positionInfo: { left: '10%', top: 'c', width: 636, height: '90%', minHeight: 550 },
		openingSound: 'OPEN_INVENTORY',
		closingSound: 'CLOSE_INVENTORY'
	});

	this.storageView = storageView;
	this.storageView.registerView(this, {
		manualOpening: true,
		enableAveragePrice: false,
		enableSlotContext: false,
		contextParams: {
			enableActions: true
		},
		filters: {
			quest: true,
			preset: true
		}
	});

	this.once('open', function () {
		this._createDom();
		this._setupEvents();
	});

	this.once('opened', function () {
		this.drawer.setEquipment();
	});

	this.on('open', function () {
		this.alignWithCharacteristics();

		this.storageBox.appendChild(this.storageView.storageUI);
		this.drawer.resetItem();
	});

	var self = this;
	var gui = window.gui;

	function updateDrawerCharacter() {
		var drawer = self.drawer;
		drawer.updateCharacter();
	}

	gui.on('connected', function () {
		self.once('opened', updateDrawerCharacter);
	});

	gui.on('disconnect', function () {
		self.removeListener('opened', updateDrawerCharacter);

		if (self.drawer) {
			self.drawer.disconnect();
		}
	});
}
inherits(EquipmentWindow, Window);
module.exports = EquipmentWindow;


/** Align equipment window with characteristics window. Equipment window is opening */
EquipmentWindow.prototype.alignWithCharacteristics = function () {
	var characteristics = windowsManager.getWindow('characteristics');
	if (!characteristics.openState) { return; }
	this.setStyle('top', characteristics.getStyle('top'));
	windowsManager.arrangeOpeningWindow(this.id, { rightOf: characteristics.id, sameHeight: true });
};

EquipmentWindow.prototype.getEquipmentSlots = function () {
	if (!this.drawer) { return; }
	return this.drawer.getSlots();
};

EquipmentWindow.prototype._setupEvents = function () {
	var self = this;
	var gui = window.gui;

	this.on('slot-tap', function (slot) {
		if (!slot.itemInstance) { return; }
		this.drawer.displayItem(slot.itemInstance);
	});

	function onDragEnd() {
		self.drawer.removePossiblePositionsHighlight();
	}

	this.on('slot-dragStart', function (slot) {
		var possiblePositions = slot.dbItem.type.possiblePositions;
		if (possiblePositions.length) {
			this.drawer.highlightPossiblePositions(possiblePositions);
		}

		dragManager.once('dragEnd', onDragEnd);
	});

	this.on('focus', function () {
		gui.shortcutBar.openPanel('item');
	});

	this.drawer.on('equippableHighlighted', function (possiblePositions) {
		self.emit('equippableHighlighted', possiblePositions);
	});

	this.drawer.on('itemDropped', function (item, position) {
		self.emit('itemDropped', item, position);
	});
};

EquipmentWindow.prototype._createDom = function () {
	this.storageBox = this.windowBody.createChild('div', { className: 'storageBox' });
	setDroppable(this.storageBox, ['characterBox']);
	this.storageBox.on('drop', function (slot) {
		window.dofus.sendMessage('ObjectSetPositionMessage', {
			objectUID: slot.itemInstance.objectUID,
			position: itemManager.positions.notEquipped,
			quantity: 1
		});
	});

	this.drawer = this.windowBody.appendChild(new EquipmentDrawer());

	/*
	Note: This was commented out as opposed to being deleted according to the ticket description:
	https://wizcorp.atlassian.net/browse/DOF-350

	var self = this;
	this.plusButton.on('tap', function () {
		if (self.drawer.isOpen) {
			self.drawer.close();
		} else {
			self.drawer.open();
		}
	});
	*/
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/EquipmentWindow/index.js
 ** module id = 715
 ** module chunks = 0
 **/