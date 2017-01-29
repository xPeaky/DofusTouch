require('./styles.less');
var Slot = require('Slot');
var ItemDescription = require('ItemDescription');
var TooltipBox = require('TooltipBox');
var inherits = require('util').inherits;
var assetPreloading = require('assetPreloading');

var ITEM_TYPE_DEFAULT_IMAGE_ID = 0; // Default to weapon image
var IMAGE_AVAILABLE_ITEM_TYPE_LIST = [
	1,  // amulet
	9,  // ring
	10, // belt
	11, // boots
	16, // hat
	17, // cloak
	81, // backpack,
	26, // Smithmagic potion
	78  // Smithmagic rune
];

// class
function ItemSlot(options) {
	options = options || {}; // itemData
	Slot.call(this, options);
	this.addClassNames('ItemSlot');

	this.itemTypeStyle = '';
	this.descriptionOptions = options.descriptionOptions;

	// init item
	this.setItem(options.itemData, options.quantity);
}

inherits(ItemSlot, Slot);
module.exports = ItemSlot;

ItemSlot.prototype._getContextualMenuProperties = function () {
	this._contextMenuParams.item = this.data;
	return Slot.prototype._getContextualMenuProperties.call(this);
};

/**
 * @param {Item|ItemInstance} itemData - itemData must be Item or ItemInstance
 * @param {number} quantity
 */
ItemSlot.prototype.setItem = function (itemData, quantity) {
	if (!itemData) {
		return this.unset();
	}
	this._itemData = itemData;

	//TODO: refactor in order to remove itemInstance and dbItem properties
	this.itemInstance = itemData.getItemInstance();
	this.dbItem = itemData.getItem();

	var image = itemData.getProperty('image');
	quantity = quantity || itemData.getProperty('quantity') || 1;
	this.setImage(image);

	this.setQuantity(quantity);

	this.setDescriptionTooltip(this.descriptionOptions);

	this.setData(itemData);
};

ItemSlot.prototype.unset = function () {
	Slot.prototype.unset.call(this);

	this._itemData = null;
	this.itemInstance = null;
	this.dbItem = null;
};

ItemSlot.prototype.lock = function () {
	var self = this;

	this.unset();
	assetPreloading.preloadImage('ui/slots/tx_slotLockedimg.png', function (url) {
		self.setImage(url);
	});
};

ItemSlot.prototype.setDescriptionTooltip = function (descriptionOptions, tooltipOptions) {
	this.descriptionOptions = descriptionOptions || this.descriptionOptions;

	if (this.hasTooltip) {
		TooltipBox.enableTooltip(this, true);
		return;
	}

	this.setTooltip(this._getTooltipContent, tooltipOptions);
};

ItemSlot.prototype._getTooltipContent = function () {
	return new ItemDescription(this._itemData, this.descriptionOptions);
};

/**
* Set the background image if item type has the available item type style
* Will default to weapon image if there is no supported item type style
*/
ItemSlot.prototype.setBackgroundImageByItemType = function (itemType) {
	if (IMAGE_AVAILABLE_ITEM_TYPE_LIST.indexOf(itemType) === -1) {
		itemType = ITEM_TYPE_DEFAULT_IMAGE_ID;
	}
	var newItemTypeStyle = 'itemType' + itemType;
	this.replaceClassNames([this.itemTypeStyle], [newItemTypeStyle]);
	this.itemTypeStyle = newItemTypeStyle;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/ItemSlot/index.js
 ** module id = 565
 ** module chunks = 0
 **/