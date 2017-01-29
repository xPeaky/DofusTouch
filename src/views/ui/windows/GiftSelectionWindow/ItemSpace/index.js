require('./styles.less');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var ItemBox = require('ItemBox');
var RewardBoxes = require('RewardBoxes');
var getText = require('getText').getText;

function ItemSpace() {
	WuiDom.call(this, 'div', { className: 'ItemSpace' });
	var self = this;

	var topContainer = this.createChild('div', { className: 'topContainer' });
	var top = topContainer.createChild('div', { className: 'top' });
	this._title = top.createChild('div', { className: 'title' });
	this._description = top.createChild('div', { className: 'description' });

	// content

	top.createChild('div', {
		className: 'contentText',
		text: getText('ui.connection.contents')
	});

	this._rewardBoxes = top.appendChild(new RewardBoxes({ nbRewards: 8 }));

	this._itemBox = this.appendChild(new ItemBox({
		showTitle: true
	}));

	this._rewardBoxes.on('tapSlot', function (itemInstance) {
		self._updateItemBox(itemInstance);
	});
}

inherits(ItemSpace, WuiDom);
module.exports = ItemSpace;

/**
 * @typedef {object} Item
 * @typedef {number} Item.objectGID
 * @typedef {number} Item.quantity
 */

/**
 * Update the page with given new gift
 * @param {object} gift
 * @param {string} gift.title
 * @param {string} gift.text
 * @param {Item[]} gift.items
 */
ItemSpace.prototype.update = function (gift) {
	gift = gift || {};

	this._title.setText(gift.title);
	this._description.setText(gift.text);

	var items = gift.items || [];

	var firstItemData = items[0];
	if (!firstItemData) {
		this._itemBox.hide();
	} else {
		this._updateItemBox(firstItemData);
	}

	// fill slot
	this._rewardBoxes.reset();

	for (var i = 0, len = items.length; i < len; i += 1) {
		var item = items[i];
		this._rewardBoxes.addItemInstance(item);
	}
};

ItemSpace.prototype._updateItemBox = function (itemData) {
	this._itemBox.displayItem(itemData);
	this._itemBox.show();
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/GiftSelectionWindow/ItemSpace/index.js
 ** module id = 697
 ** module chunks = 0
 **/