require('./styles.less');
var BidHouseShopWindow = require('BidHouseShopWindow');
var CheckboxLabel = require('CheckboxLabel');
var dimensions = require('dimensionsHelper').dimensions;
var inherits = require('util').inherits;
var TradeItemWindow = require('TradeItemWindow');
var Window = require('Window');
var windowsManager = require('windowsManager');
var getText = require('getText').getText;

var modes = {
	ExchangeStartOkNpcShopMessage:  'sell-npc',
	ExchangeShopStockStartedMessage: 'sell-myShop', // "sell in my shop" mode - right side (Inventory side)
	ExchangeStartedBidSellerMessage: 'sell-bidHouse'
};

var MIN_WIDTH = 198; // px


/**
 * @class TradeInventoryWindow
 * @desc Used for the modes listed above (i.e. SELL to NPC, SELL to myShop or BidHouse).
 * When open, TradeStorageWindow will be open on the other side.
 */
function TradeInventoryWindow(storageView) {
	Window.call(this, {
		title: getText('ui.common.inventory'),
		className: 'TradeInventoryWindow'
	});

	var self = this;

	this.mode = null;
	this.openOnItem = null;
	this.storageView = storageView;

	storageView.registerView(this);

	var descriptor;
	var isFilterEnabled = false;

	function bidHouseFilter(item) {
		if (descriptor.types.indexOf(item.item.typeId) === -1) {
			return false;
		}

		if (item.isLinked()) {
			return false;
		}

		if (item.item.level > descriptor.maxItemLevel) {
			return false;
		}

		return true;
	}

	function enableFilter(isEnabled) {
		if (isEnabled === isFilterEnabled) { return; }
		isFilterEnabled = isEnabled;

		if (isEnabled) {
			storageView.addFilters([bidHouseFilter]);
		} else {
			storageView.removeFilter(bidHouseFilter);
		}
		storageView.filterList();
	}

	var filterBox = new CheckboxLabel(getText('ui.bidhouse.bigStoreFilter'));
	filterBox.on('change', function (checked) {
		enableFilter(checked);
	});

	this.on('open', function (msg) {
		var mode = this.mode = modes[msg._messageType];

		var width = dimensions.windowFullScreenWidth - BidHouseShopWindow.minWidth - TradeItemWindow.minWidth;
		width = Math.max(width, MIN_WIDTH);

		windowsManager.positionWindow(this.id, { right: 0, top: 0, width: width, height: '100%' });

		if (mode === 'sell-bidHouse') {
			storageView.storageUI.appendChild(filterBox);
			descriptor = msg.sellerDescriptor || msg.buyerDescriptor;

			// In all cases, we turn OFF filter when closing and turn it ON when opening
			enableFilter(true);
			filterBox.activate(/*isSilent=*/true);

			if (this.openOnItem) { this.navigateToItem(this.openOnItem); }
		}

		if (msg.token) {
			storageView.filter.toggleCategoryDisplay(msg.token.type.category, true);
			storageView.filter.selectCategory(msg.token.type.category);
		}
	});

	this.on('closed', function () {
		if (this.mode === 'sell-bidHouse') {
			storageView.storageUI.removeChild(filterBox);

			enableFilter(false);
		}
	});

	this.on('slot-tap', function (slot) {
		if (!this.mode) {
			return;
		}
		windowsManager.getWindow('tradeItem').displayItem(this.mode, slot.itemInstance);
	});

	function selectItem(item) { self._selectItem(item); }

	this.on('itemAdded', selectItem);
	this.on('itemQuantity', selectItem);

	this.on('itemRemoved', function (objectUID) {
		var tradeItemWindow = windowsManager.getWindow('tradeItem');
		var item = tradeItemWindow.getCurrentItem();
		if (item && objectUID === item.getProperty('objectUID')) {
			windowsManager.close('tradeItem');
		}
	});
}
inherits(TradeInventoryWindow, Window);
module.exports = TradeInventoryWindow;


TradeInventoryWindow.prototype.isMyShopOpen = function () {
	return this.openState && this.mode === 'sell-myShop';
};

TradeInventoryWindow.prototype.navigateToItem = function (itemOrId) {
	this.openOnItem = null;

	var itemId, itemInstance;
	if (typeof itemOrId === 'number') {
		itemId = itemOrId;
	} else {
		itemId = itemOrId.getProperty('id');
		itemInstance = itemOrId.getItemInstance();
	}

	if (itemInstance && this._selectItem(itemInstance, true)) { return true; }

	itemInstance = this.storageView.selectAndShowSlotByGID(itemId);
	if (!itemInstance) { return false; } // item not visible in storage

	this._selectItem(itemInstance, true);
	return true;
};

TradeInventoryWindow.prototype._selectItem = function (itemInstance, alsoSetFilter) {
	if (!this.mode || this.mode === 'sell-myShop') {
		return false;
	}
	if (!this.storageView.selectAndShowSlotByUID(itemInstance.objectUID)) {
		return false;
	}
	if (alsoSetFilter) {
		windowsManager.getWindow('tradeStorage').setFilter(itemInstance.getProperty('typeId'));
	}
	windowsManager.getWindow('tradeItem').displayItem(this.mode, itemInstance);
	return true;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/TradeInventoryWindow/index.js
 ** module id = 825
 ** module chunks = 0
 **/