var assetPreloading = require('assetPreloading');
var barTypes = require('ShortcutBarEnum');
var dragManager = require('dragManager');
var inherits = require('util').inherits;
var itemManager = require('itemManager');
var ItemSlot = require('ItemSlot');

function ShortcutItemSlot(options) {
	ItemSlot.call(this, options);

	this.type = barTypes.GENERAL_SHORTCUT_BAR;
	this.index = 0;
	this.id = null;
	this.isDisabled = false;
	this.isEmpty = true;
	this.addClassNames('empty');

	this.on('unset', function () {
		this.isEmpty = true;
		this.id = null;
		this.isDisabled = false;
		dragManager.disableDrag(this);
		this.icon.delClassNames('disabled');
		this.addClassNames('empty');
	});

	this.on('setData', function () {
		this.delClassNames('empty');
		this.isEmpty = false;
	});
}
inherits(ShortcutItemSlot, ItemSlot);
module.exports = ShortcutItemSlot;

ShortcutItemSlot.getId = function (shortcut) {
	if (shortcut.hasOwnProperty('presetId')) {
		return 'preset' + shortcut.presetId;
	} else {
		return 'item' + shortcut.itemUID;
	}
};

ShortcutItemSlot.prototype.setShortcut = function (shortcut) {
	if (!shortcut) {
		if (!this.isEmpty) { this.unset(); }
		return;
	}

	var inventory = window.gui.playerData.inventory;
	var self = this;

	this.shortcut = shortcut;

	function onRemove(action) {
		if (action !== 'remove') { return; }
		self.emit('removed');
	}

	this.id = ShortcutItemSlot.getId(shortcut);

	if (shortcut.hasOwnProperty('presetId')) {
		var preset = inventory.presets[shortcut.presetId];
		this.isDisabled = false;

		assetPreloading.preloadImage('gfx/presets/icon_' + preset.symbolId + '.png', function (url) {
			self.setImage(url);
		});
		this.setData(preset);
		this.icon.delClassNames('disabled');

		this.setContextMenu('preset', {
			presetId: shortcut.presetId,
			canRemove: true,
			onClose: onRemove
		});
	} else {
		var item = inventory.objects[shortcut.itemUID];
		if (item) {
			if (!item.isInitialised) {
				return item.once('initialised', function () {
					self.setShortcut(shortcut);
				});
			}
			this.isDisabled = false;
			this.icon.delClassNames('disabled');

			this.setContextMenu('item', {
				item: item,
				onClose: onRemove,
				remove: true,
				enableActions: true
			});

			this.setItem(item);
		} else {
			this.isDisabled = true;
			this.icon.addClassNames('disabled');
			itemManager.getItems([shortcut.itemGID], function (error, items) {
				if (error) { return console.error(error); }

				var item = items[0];
				self.setContextMenu('item', {
					item: item,
					onClose: onRemove,
					remove: true,
					enableActions: true
				});

				self.setItem(item);
			});
		}
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/ShortcutBar/itemSlot.js
 ** module id = 564
 ** module chunks = 0
 **/