require('./styles.less');
var BidHouseShopWindow = require('BidHouseShopWindow');
var Button = require('Button');
var getText = require('getText').getText;
var helper = require('helper');
var inherits = require('util').inherits;
var itemManager = require('itemManager');
var ShopViewer = require('ShopViewer');
var tooltip = require('TooltipBox');
var Window = require('Window');
var windowsManager = require('windowsManager');
var WuiDom = require('wuidom');

var msgToMode = {
	ExchangeStartOkNpcShopMessage: 'buy-npc',
	ExchangeShopStockStartedMessage: 'modify-myShop', // "organize my shop" mode - LEFT side (Shop side)
	ExchangeStartedBidSellerMessage: 'modify-bidHouse',
	ExchangeStartOkHumanVendorMessage: 'buy-human'
};

var windowPosInfo = { left: 0, top: 0, width: 300, height: '100%' }; // default position; we change it!


/**
 * @class TradeStorageWindow
 * @desc Used for the modes listed above (i.e. BUY from human or NPC + MODIFY myShop or BidHouse).
 * When open, TradeInventoryWindow will be open on the other side, except in 'buy-human' mode.
 */
function TradeStorageWindow() {
	Window.call(this, {
		className: 'TradeStorageWindow',
		positionInfo: windowPosInfo
	});

	this.openOnItem = null;
	this.mode = null;
	this.currentItem = null;

	this.on('open', this._onOpen);
	this.on('closed', this._onClose);
}
inherits(TradeStorageWindow, Window);
module.exports = TradeStorageWindow;


TradeStorageWindow.prototype.navigateToItem = function (itemOrId) {
	this.openOnItem = null;

	var itemId, itemInstance;
	if (typeof itemOrId === 'number') {
		itemId = itemOrId;
	} else {
		itemId = itemOrId.getProperty('id');
		itemInstance = itemOrId.getItemInstance();
	}

	// Search in tradeInventory by instance or GID
	var tradeInventory = windowsManager.getWindow('tradeInventory');
	if (tradeInventory.navigateToItem(itemOrId)) { return; }

	// Search by itemInstance
	if (itemInstance && this._selectItemByUID(itemInstance.objectUID, true)) { return; }

	// Search using itemId (GID)
	var uid = this.shopViewer.findItemByGID(itemId);
	if (uid && this._selectItemByUID(uid, true)) { return; }
};

TradeStorageWindow.prototype._onOpen = function (msg) {
	this.mode = msgToMode[msg._messageType];
	if (!this.mode) { return console.error(new Error('Unexpected msg type for TradeStorageWindow: ' + msg._messageType)); }

	if (!this.shopViewer) {
		this._createContent();
		this._setupEventListeners();
	}

	var self = this;
	var isHeaderRowShowed = false;
	var withWallet = false;

	switch (this.mode) {
	case 'buy-npc':
		this.setTitle(getText('ui.common.shop'));
		this.shopViewer.table.setSlideEnable(false);
		break;
	case 'modify-myShop':
		this.setTitle(getText('ui.common.shop'));
		this.shopViewer.table.setSlideEnable(true);
		this._slideBack.modify.show();
		this._slideBack.remove.hide();
		break;
	case 'modify-bidHouse':
		this.setTitle(getText('ui.common.shopStock'));
		var descriptor = this.descriptor = msg.sellerDescriptor;
		this.npcId = descriptor.npcContextualId;
		isHeaderRowShowed = true;
		this.infoContent.setHtml(this._getBidHouseInfoHtml(descriptor));
		this._updateItemCount(msg.objectsInfos.length);
		this.switchToBuyModeBtn.enable();
		this.shopViewer.table.setSlideEnable(true);
		this._slideBack.modify.hide();
		this._slideBack.remove.show();
		break;
	case 'buy-human':
		withWallet = true;
		window.actorManager.getActorData(msg.sellerId, function (error, data) {
			if (error) {
				console.error(error);
				return self.setTitle('');
			}
			self.setTitle(data.name);
		});
		this.shopViewer.table.setSlideEnable(false);
	}

	// Reposition/resize our window depending if WalletWindow is displayed above us
	if (withWallet) {
		windowsManager.arrangeOpeningWindowVertically(this.id, { below: 'wallet', fullHeight: true });
	} else {
		windowsManager.positionWindow(this.id, windowPosInfo);
	}

	this.headerRow.toggleDisplay(isHeaderRowShowed);

	this.shopViewer.table.setContentLoading(true);
	itemManager.createItemInstances(msg.objectsInfos, function (error, items) {
		if (error) { return console.error(error); }

		self.currency = msg.tokenId;
		self.token = msg.token || null;
		self.shopViewer.table.setContentLoading(false);
		self.shopViewer.setItemList(items.array);

		if (self.openOnItem) { self.navigateToItem(self.openOnItem); }
	});

	if (this.lastOpenMode !== this.mode) {
		if (this.lasOpenMode) {
			this.delClassNames(this.lasOpenMode);
		}
		this.addClassNames(this.mode);
	}
	this.lasOpenMode = this.mode;
};

TradeStorageWindow.prototype._onClose = function () {
	this.currentItem = null;
	this.shopViewer.clearContent();
	windowsManager.close('tradeItem');
};

TradeStorageWindow.prototype._createContent = function () {
	this._createHeader();
	this._createViewer();
};

TradeStorageWindow.prototype._createHeader = function () {
	// BID HOUSE
	var headerRow = this.headerRow = this.windowBody.createChild('div', { className: 'headerRow' });

	this.itemCountElt = headerRow.createChild('div', { className: 'itemCount' });
	this.itemCountTooltip = new WuiDom('div');
	tooltip.addTooltip(this.itemCountElt, this.itemCountTooltip);

	this._createInfoButton();

	this._createSwitchToBuyModeButton();
};

TradeStorageWindow.prototype._updateItemCount = function (itemCount) {
	this.itemCount = itemCount;
	this.itemCountElt.setText(itemCount + '/' + this.descriptor.maxItemPerAccount);
	this.itemCountTooltip.setText(getText('ui.bidhouse.quantityObjectSold',
		itemCount,
		this.descriptor.maxItemPerAccount
	));
};

TradeStorageWindow.prototype._getBidHouseInfoHtml = function (descriptor) {
	var colon = getText('ui.common.colon');
	var text = '';
	if (descriptor.maxItemLevel < 1000) {
		text += getText('ui.common.maxLevel') + colon + descriptor.maxItemLevel + '<br/>';
	}
	return text +
		getText('ui.bidhouse.bigStoreTax') + colon + descriptor.taxPercentage + '%<br/>' +
		getText('ui.bidhouse.bigStoreMaxSellTime') + colon + descriptor.unsoldDelay + ' ' +
		getText('ui.time.hours', descriptor.unsoldDelay);
};

TradeStorageWindow.prototype._createInfoButton = function () {
	var infoContent = this.infoContent = new WuiDom('div');

	var infoButton = this.headerRow.createChild('div', { className: 'infoButton' });
	tooltip.addTooltip(infoButton, infoContent, { openOnTap: true });
};

TradeStorageWindow.prototype._createSwitchToBuyModeButton = function () {
	var self = this;
	this.switchToBuyModeBtn = this.headerRow.appendChild(new Button({
		addIcon: true,
		className: ['buyModeBtn', 'greenButton'],
		tooltip: getText('ui.bidhouse.bigStoreModeBuy') },
		function () {
			BidHouseShopWindow.switchBuySellMode(/*isSellMode=*/false, self.npcId);
			this.disable();
		}));
};

TradeStorageWindow.prototype._createViewer = function () {
	var self = this;

	function sortRow(item1, item2) {
		return item1.objectPrice - item2.objectPrice;
	}

	var tableDescription = [
		{ id: 'icon', format: function (item) {
			// TODO: we may want to use the Slot component here and remove TradeStorageWindow's .slot's specific css
			var slot = new WuiDom('div', { className: 'slot' });
			var icon = slot.createChild('div', { className: 'icon' });
			icon.setStyle('backgroundImage', item.item.image);
			icon.createChild('div', { className: 'quantity', text: item.quantity > 1 ? item.quantity : '' });
			return slot;
		} },
		{
			id: 'name',
			header: getText('ui.common.name'),
			getContent: function (item) { return item.item.nameId; },
			sort: true
		},
		{ id: 'price', header: getText('ui.common.price'), format: function (item) {
			var price;
			if (!self.currency) {
				price = helper.kamasToString(item.objectPrice);
			} else {
				price = new WuiDom('div', { className: 'token' });
				var icon = price.createChild('div', { className: 'icon' });
				icon.setStyle('backgroundImage', self.token.image);
				price.createChild('div', { className: 'quantity', text: 'x' + item.objectPrice });
			}

			return price;
		}, sort: sortRow, defaultSorter: true }
	];

	var slideBack = this._slideBack = new WuiDom('div', { className: 'slideBack' });
	slideBack.modify = slideBack.createChild('div', { className: 'modify', text: getText('ui.common.modify') });
	slideBack.remove = slideBack.createChild('div', { className: 'remove', text: getText('ui.common.remove') });
	slideBack.createChild('div', { className: ['remove', 'right'], text: getText('ui.common.remove') });

	this.shopViewer = this.windowBody.appendChild(new ShopViewer(tableDescription, function (item) {
		if (item.hasOwnProperty('objectUID')) { return item.objectUID; }
		if (item.hasOwnProperty('objectGID')) { return item.objectGID; }
		return 0;
	}, { tableOption: { slidable: slideBack } }));

	function removeItem(item) {
		window.dofus.sendMessage('ExchangeObjectMoveMessage', {
			objectUID: item.objectUID,
			quantity: -item.quantity
		});
	}

	this.shopViewer.on('itemSelected', function (item) { self._showCurrentItem(item); });

	this.shopViewer.on('rowSlidedRight', function (row, item) {	removeItem(item); });

	this.shopViewer.on('rowSlidedLeft', function (row, item) {
		if (self.mode === 'modify-myShop') {
			self._showCurrentItem(item);
			row.slideBack();
		} else {
			removeItem(item);
		}
	});
};

TradeStorageWindow.prototype._showCurrentItem = function (item) {
	this.currentItem = item;
	windowsManager.getWindow('tradeItem').displayItem(this.mode, item, this.token && this.token.nameId);
};

TradeStorageWindow.prototype._selectItemByUID = function (itemUID, alsoSetFilter) {
	var itemInstance = this.shopViewer.getItem(itemUID);
	if (!itemInstance) { return false; }

	if (alsoSetFilter) {
		this.setFilter(itemInstance.getProperty('typeId'));
	}
	this.shopViewer.selectItem(itemUID);
	this._showCurrentItem(itemInstance);
	return true;
};

TradeStorageWindow.prototype.setFilter = function (itemTypeId) {
	return this.shopViewer.selectFilter(itemTypeId);
};

TradeStorageWindow.prototype._updateHumanBuyQuantity = function (availableQty) {
	var tradeItem = windowsManager.getWindow('tradeItem');
	tradeItem.updateHumanBuyQuantityRealtime(availableQty);
	if (!availableQty) { this.currentItem = null; }
};

TradeStorageWindow.prototype._setupEventListeners = function () {
	var connectionManager = window.dofus.connectionManager;
	var self = this;

	function updateItems(itemList, shouldSelectFirst) {
		if (self.mode === 'buy-human' && self.currentItem) {
			var currentItemUID = self.currentItem.objectUID;
			for (var i = 0; i < itemList.length; i++) {
				if (itemList[i].objectUID === currentItemUID) {
					self._updateHumanBuyQuantity(itemList[i].quantity);
					break;
				}
			}
		}

		itemManager.createItemInstances(itemList, function (error, items) {
			if (error) { return console.error(error); }

			if (shouldSelectFirst) {
				self.shopViewer.addItemsAndHighlightThem(items.array);
			} else {
				self.shopViewer.addItems(items.array);
			}
		});
	}

	function removeItems(itemIdList) {
		// Was the "current item" removed?
		if (self.currentItem && itemIdList.indexOf(self.currentItem.objectUID) >= 0) {
			if (self.mode === 'buy-human') {
				self._updateHumanBuyQuantity(0);
			} else if (self.mode === 'modify-bidHouse' || self.mode === 'modify-myShop') {
				windowsManager.close('tradeItem');
			}
		}
		for (var i = 0; i < itemIdList.length; i++) {
			self.shopViewer.table.endSlide(itemIdList[i]);
		}
		self.shopViewer.removeItems(itemIdList);
	}

	connectionManager.on('ExchangeShopStockMultiMovementUpdatedMessage', function (msg) {
		updateItems(msg.objectInfoList);
	});

	connectionManager.on('ExchangeShopStockMovementUpdatedMessage', function (msg) {
		var shouldSelectFirst = self.mode === 'modify-myShop';
		updateItems([msg.objectInfo], shouldSelectFirst);
	});

	connectionManager.on('ExchangeShopStockMultiMovementRemovedMessage', function (msg) {
		removeItems(msg.objectIdList);
	});

	connectionManager.on('ExchangeShopStockMovementRemovedMessage', function (msg) {
		removeItems([msg.objectId]);
	});

	/**
	 * @event module:protocol/inventoryExchanges.client_ExchangeBidHouseItemAddOkMessage
	 * @param {object} msg - msg
	 * @param {Object} msg.itemInfo - raw item instance of a new item added to the selling list
	 */
	connectionManager.on('ExchangeBidHouseItemAddOkMessage', function (msg) {
		// NB: we don't select the new item on sale: player might want to sell another one from his stack
		updateItems([msg.itemInfo], /*shouldSelectFirst=*/false);
		self._updateItemCount(self.itemCount + 1);
	});

	/**
	 * @event module:protocol/inventoryExchanges.client_ExchangeBidHouseItemRemoveOkMessage
	 * @param {object} msg - msg
	 * @param {number} msg.sellerId - uid of the removed object
	 */
	connectionManager.on('ExchangeBidHouseItemRemoveOkMessage', function (msg) {
		removeItems([msg.sellerId]);
		self._updateItemCount(self.itemCount - 1);
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/TradeStorageWindow/index.js
 ** module id = 827
 ** module chunks = 0
 **/