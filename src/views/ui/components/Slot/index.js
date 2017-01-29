require('./styles.less');
var TooltipBox = require('TooltipBox');
var inherits = require('util').inherits;
var tapBehavior = require('tapBehavior');
var WuiDom = require('wuidom');
var assetPreloading = require('assetPreloading');
var getText = require('getText').getText;
var isEquippable = require('itemManager').isEquippable;

// class
/**
 * Display an interactive icon in a box that represents data, can perform menu actions, and display tooltips
 * @param {object} options - init settings for Slot on creation
 * @param {string} options.name - WuiDom name
 * @param {int} options.quantity - number to display in the corner of the slot
 * @param {bool} options.forceQuantity - always show the quantity, even if zero
 * @param {string} options.image - URL of the icon to display
 * @param {WuiDom} options.tooltip - tooltip content for tap and hold
 * @param {object} options.tooltipOptions - default settings for said tooltip
 * @param {bool} options.enableContextMenu - enable/disable context menu on creation
 */
function Slot(options) {
	options = options || {};
	WuiDom.call(this, 'div', { className: 'Slot', name: options.name || '' });
	tapBehavior(this);

	this._quantity = 0;

	// init display
	if (options.errorIcon) {
		this.errorIcon = this.createChild('div', { className: 'errorIcon' });
	}
	this.icon = this.createChild('div', { className: 'slotIcon' });
	this.quantityBox = this.createChild('div', { className: 'quantity' });

	this.forceQuantity = options.forceQuantity; // always show quantity
	if (options.quantity) {
		this.setQuantity(options.quantity); // custom default quantity?
	}

	if (options.image) {
		this.setImage(options.image);
	}

	// tooltip
	this.tooltipOptions = options.tooltipOptions;
	if (options.tooltip) {
		this.setTooltip(options.tooltip, this.tooltipOptions);
	}

	this.on('destroy', this._onDestroy);
	this.on('tap', this._openContextMenu);
	this.on('doubletap', this._useItem);
	this.on('tooltipOn', this._removeHoverStyle);
	this.on('tooltipOut', this._applyHoverStyle);
	if (options.scaleOnPress) {
		this.on('tapstart', this._showAsPressed);
		this.on('tapend', this._showAsReleased);
	}

	this.enableContextMenu(options.hasOwnProperty('enableContextMenu') ? options.enableContextMenu : true);
}

inherits(Slot, WuiDom);
module.exports = Slot;


Slot.prototype._onDestroy = function () {
	this.destroyed = true;
};

Slot.prototype._openContextMenu = function () {
	if (!this._contextMenuId || !this.isContextEnabled) {
		return;
	}
	window.gui.openContextualMenuAround(this._contextMenuId, this, this._getContextualMenuProperties());
};

Slot.prototype._useItem = function () {
	// use item immediately on double tap
	if (!this.itemInstance) { return; }
	var itemInstance = this.itemInstance;
	if (itemInstance.getProperty('usable')) {
		// use
		if (!itemInstance.getProperty('type').needUseConfirm) {
			window.dofus.sendMessage('ObjectUseMessage', { objectUID: itemInstance.getProperty('objectUID') });
			return;
		}
		window.gui.openConfirmPopup({
			title: getText('ui.common.confirm'),
			message: getText('ui.common.confirmationUseItem', itemInstance.getProperty('nameId')),
			cb: function (result) {
				if (!result) {
					return;
				}
				window.dofus.sendMessage('ObjectUseMessage', { objectUID: itemInstance.getProperty('objectUID') });
			}
		});
	} else if (isEquippable(itemInstance.getProperty('type').superTypeId)) {
		// equip
		window.gui.playerData.inventory.equipItem(itemInstance.getProperty('objectUID'));
	}
};

Slot.prototype._showAsPressed = function () {
	if (!this.data) { return; }
	this.icon.setStyle('webkitTransform', 'scale(0.9)');
};

Slot.prototype._showAsReleased = function () {
	this.icon.setStyle('webkitTransform', 'scale(1)');
};

Slot.prototype._removeHoverStyle = function () {
	this.icon.setStyle('webkitTransform', 'scale(1.1)');
};

Slot.prototype._applyHoverStyle = function () {
	this.icon.setStyle('webkitTransform', 'scale(1)');
};

Slot.prototype._getContextualMenuProperties = function () {
	return this._contextMenuParams;
};

// public
Slot.prototype.unset = function () {
	TooltipBox.enableTooltip(this, false);
	this.quantityBox.hide();

	this.setContextMenu();
	this.setImage();
	this.setData();

	this.emit('unset');
};

Slot.prototype.setQuantity = function (quantity) {
	// default show all qunatities > 1
	this._quantity = quantity;
	this.quantityBox.setText(quantity);
	this.quantityBox.toggleDisplay(!!this.forceQuantity || quantity && quantity > 1);
};

Slot.prototype.getQuantity = function () {
	return this._quantity;
};

Slot.prototype.select = function (toggle) {
	toggle = arguments.length ? toggle : true;
	this.toggleClassName('selected', toggle);
	this.selected = toggle;
	this.emit('selected', toggle);
};

Slot.prototype.setImage = function (image) {
	// case of destroyed Slot with a pending assetPreloaded image
	if (!this.rootElement) { return console.warn('trying to set an image on a destroyed object'); }
	this.image = image;

	image = image || 'none';
	this.icon.setStyle('backgroundImage', image);

	this.loadingImage = false;
	this.requestedImages = null;

	this.emit('setImage', this.image);
};

Slot.prototype.getImage = function () {
	return this.image; // NOTE: some slots may set images asynchronously
};

Slot.prototype.setTooltip = function (tooltipContent, tooltipOptions) {
	if (this.hasTooltip) {
		TooltipBox.enableTooltip(this, true);
		return;
	}

	TooltipBox.addTooltip(this, tooltipContent, tooltipOptions || this.tooltipOptions);
	this.hasTooltip = true;
};

Slot.prototype.setContextMenu = function (contextMenuId, contextMenuParams) {
	this._contextMenuId = contextMenuId;
	this._contextMenuParams = contextMenuParams;
};

Slot.prototype.setData = function (data) {
	// spell, item, preset, anything to be bound to this slot
	this.data = data;

	if (!data) { return; }
	// NOTE: listening for this will give data but to ensure you get image listen for 'setImage'
	this.emit('setData', this.data);
};

Slot.prototype.preloadAndSetImages = function (images) {
	images = images || []; // list of images in order of priority

	this.requestedImages = images;

	var self = this;

	this.loadingImage = true;
	assetPreloading.preloadImages(images, function (urls) {
		// only set latest request
		if (self.requestedImages !== images || this.destroyed) {
			return;
		}

		var url = 'none';
		for (var i = 0; i < urls.length; i += 1) {
			url = urls[i];
			if (url !== 'none') {
				break;
			}
		}

		if (self.loadingImage) { // NOTE: setImage may have been called elsewhere
			self.setImage(url);
		}
	});
};

Slot.prototype.enableContextMenu = function (toggle) {
	this.isContextEnabled = arguments.length ? toggle : true;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/Slot/index.js
 ** module id = 567
 ** module chunks = 0
 **/