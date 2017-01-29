require('./styles.less');
var Slot = require('Slot');
var Window = require('Window');
var WuiDom = require('wuidom');
var inherits = require('util').inherits;
var ItemSlot = require('ItemSlot');

/**
 * Just slots row with spinner during loading
 *
 * @param {object} [opts]
 * @param {number} [opts.nbRewards=6] - Number of slot to show. Default: 6
 * @constructor
 */
function RewardBoxes(opts) {
	WuiDom.call(this, 'div', { className: 'RewardBoxes' });
	opts = opts || {};

	this._NB_REWARDS = opts.nbRewards || 6;

	this._slotList = [];
	this._rewardNextSlot = 0;

	this._content = this.createChild('div', { className: 'rewardContent' });

	this.reset();
}

inherits(RewardBoxes, Window);
module.exports = RewardBoxes;

/**
 * Create new fresh empty slots (clear the content)
 */
RewardBoxes.prototype.reset = function () {
	this._slotList = [];
	this._rewardNextSlot = 0;
	this._content.clearContent();

	for (var i = 0; i < this._NB_REWARDS; i += 1) {
		this._slotList.push(this._content.appendChild(new Slot()));
	}
};

/**
 * @param {ItemInstance} item
 */
RewardBoxes.prototype.addItemInstance = function (item) {
	var self = this;
	if (this._rewardNextSlot >= this._NB_REWARDS) {
		return;
	}

	//TODO: add placeholder epic puree

	var emptySlot = this._slotList[this._rewardNextSlot];
	emptySlot.addClassNames('spinner');
	this._rewardNextSlot += 1;

	var itemSlot = new ItemSlot({
		itemData: item,
		quantity: item.quantity
	});
	itemSlot.on('tap', function () {
		self.emit('tapSlot', item);
	});
	itemSlot.insertBefore(emptySlot);
	emptySlot.destroy();
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/RewardBoxes/index.js
 ** module id = 701
 ** module chunks = 0
 **/