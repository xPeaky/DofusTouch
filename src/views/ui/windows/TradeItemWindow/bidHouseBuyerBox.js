var ExchangeErrorEnum = require('ExchangeErrorEnum');
var getText = require('getText').getText;
var helper = require('helper');
var inherits = require('util').inherits;
var itemManager = require('itemManager');
var moneyConverter = require('moneyConverter');
var Table = require('TableV2');
var WuiDom = require('wuidom');


function BidHouseBuyerBox() {
	WuiDom.call(this, 'div', { className: 'BidHouseBuyerBox', hidden: true });

	this._createDom();
	this._setupEvents();

	this.tradeItemWindow = null;
	this.item = {};
	this.currentOffer = null; // current offer selected in offer list (price and qty)
	this.descriptor = null;
	this.table = null;

	this._averagePrice = -1;
}
inherits(BidHouseBuyerBox, WuiDom);
module.exports = BidHouseBuyerBox;


BidHouseBuyerBox.prototype.updateDisplay = function () {
	this.tradeItemWindow.updateSelection(null);

	if (this.table) {
		this.table.refreshRows();
		this.table.unSelectRow();
	}

	this._setAveragePrice(this._averagePrice);
};

BidHouseBuyerBox.prototype.updateSettingBox = function (tradeItemWindow, item) {
	var self = this;

	this.tradeItemWindow = tradeItemWindow;
	this.item = item;
	tradeItemWindow.updateSelection(null);

	if (tradeItemWindow.mode === 'list') {
		window.dofus.sendMessage('ExchangeBidHouseListMessage', { id: item.id });
	} else {
		window.dofus.sendMessage('ExchangeBidHouseSearchMessage', { type: item.typeId, genId: item.id });
	}

	this._setAveragePrice(item.averagePrice);
	itemManager.getFreshAveragePrice(item.id, function (price) {
		self._setAveragePrice(price);
	});

	this.table.clearContent();
	this.addClassNames('spinner');
};

// Called by table when formatting hard amount column's value.
// We take this occasion to compute it from soft amount.
function getHardAmount(rowData) {
	rowData.amountHard = moneyConverter.computeHardPrice(rowData.amountSoft); // can return null
	return rowData.amountHard ? helper.intToString(rowData.amountHard) : null;
}

function formatSoftAmount(rowData) {
	return helper.intToString(rowData.amountSoft);
}

function compareItem(rowData1, rowData2) {
	var colName = this.id;
	switch (colName) {
	case 'qty':
	case 'amountSoft':
	case 'amountHard':
		return rowData1[colName] - rowData2[colName];
	default:
		return 0;
	}
}

BidHouseBuyerBox.prototype._updateOffer = function (rowId, amountSoft) {
	if (!this.currentOffer || rowId !== this.currentOffer.id) { return; }

	if (amountSoft > this.currentOffer.amountSoft) {
		// Best offer is not available anymore
		return this.tradeItemWindow.updateSelection(null);
	}

	this.table.selectRow(rowId, /*silently=*/true);
	this.tradeItemWindow.updateBidHouseBuyPriceRealtime(amountSoft, moneyConverter.computeHardPrice(amountSoft));
};

BidHouseBuyerBox.prototype._removeOffer = function (rowId) {
	if (!this.currentOffer || rowId !== this.currentOffer.id) { return; }

	this.tradeItemWindow.updateSelection(null);
};

function rowTapHandler(row, rowData) {
	var self = this.bidHouseBuyerBox;

	self.currentOffer = rowData;
	self.tradeItemWindow.updateSelection(rowData);
}

BidHouseBuyerBox.prototype.setDescriptorData = function (descriptor) {
	this.descriptor = descriptor;

	function createItemIcon(rowData) {
		var icon = new WuiDom('div', { className: 'icon' });
		icon.setStyle('backgroundImage', rowData.item.getProperty('image'));
		return icon;
	}

	var softCurrencyIcon = new WuiDom('div', { className: ['currencyIcon', 'soft'] });
	var hardCurrencyIcon = new WuiDom('div', { className: ['currencyIcon', 'hard'] });
	var headers = [
		{ id: 'icon', format: createItemIcon },
		{ id: 'qty', header: getText('ui.common.quantity'), sort: compareItem },
		{ id: 'amountHard', header: hardCurrencyIcon, format: getHardAmount, sort: compareItem },
		{ id: 'amountSoft', header: softCurrencyIcon, format: formatSoftAmount, sort: compareItem,
		  defaultSorter: true }
	];

	this.item = null;
	this.tableBox.clearContent();

	this.table = this.tableBox.appendChild(new Table(headers, 'id'));
	this.table.bidHouseBuyerBox = this;

	this.table.on('rowTap', rowTapHandler);
};

BidHouseBuyerBox.prototype._setupEvents = function () {
	var self = this;
	var connectionManager = window.dofus.connectionManager;

	connectionManager.on('ExchangeErrorMessage', function (msg) {
		if (msg.errorType !== ExchangeErrorEnum.BID_SEARCH_ERROR) {
			return;
		}

		self.delClassNames('spinner');
	});

	function separateItemBulks(item, list) {
		var quantities = self.descriptor.quantities;
		for (var i = 0; i < quantities.length; i++) {
			var amountSoft = item.prices[i];
			if (!amountSoft) { continue; }
			list.push({
				id: item.getProperty('objectUID') + 'x' + quantities[i],
				item: item,
				qty: quantities[i],
				amountSoft: amountSoft,
				amountHard: null // will be updated in getHardAmount
			});
		}
	}

	function addItems(rawItems, isUpdate) {
		itemManager.createItemInstances(rawItems, function (error, items) {
			if (error) {
				return console.warn(error);
			}
			var itemsMap = items.map;
			var itemList = [];
			for (var itemId in itemsMap) {
				separateItemBulks(itemsMap[itemId], itemList);
			}
			self.table.addList(itemList);
			if (isUpdate) {
				for (var i = 0; i < itemList.length; i++) {
					var item = itemList[i];
					self._updateOffer(item.id, item.amountSoft);
				}
			}
		});
	}

	function removeItem(itemUID, isUpdate) {
		var quantities = self.descriptor.quantities;
		for (var i = 0; i < quantities.length; i++) {
			var rowId = itemUID + 'x' + quantities[i];
			self.table.delRow(rowId);
			if (!isUpdate) { self._removeOffer(rowId); }
		}
	}

	/*
	 * @event module:protocol/inventoryExchanges.client_ExchangeBidHouseInListUpdatedMessage
	 *
	 * @param {object} msg - msg
	 * @param {number} msg.itemUID
	 * @param {number} msg.objGenericId - GID of the item
	 * @param {Array} msg.effects
	 * @param {Array} msg.prices
	 */
	connectionManager.on('ExchangeBidHouseInListUpdatedMessage', function (msg) {
		if (msg.objGenericId !== self.item.id) {
			return;
		}

		removeItem(msg.itemUID, /*isUpdate=*/true);

		var rawItem = {
			objectUID: msg.itemUID,
			objectGID: msg.objGenericId,
			prices: msg.prices,
			effects: msg.effects,
			quantity: 1
		};

		addItems([rawItem], /*isUpdate=*/true);
	});

	/*
	 * @event module:protocol/inventoryExchanges.client_ExchangeBidHouseInListAddedMessage
	 *
	 * @param {object} msg - msg
	 * @param {number} msg.itemUID
	 * @param {number} msg.objGenericId - GID of the item
	 * @param {Array} msg.effects
	 * @param {Array} msg.prices
	 */
	connectionManager.on('ExchangeBidHouseInListAddedMessage', function (msg) {
		if (msg.objGenericId !== self.item.id) {
			return;
		}

		var rawItem = {
			objectUID: msg.itemUID,
			objectGID: msg.objGenericId,
			prices: msg.prices,
			effects: msg.effects,
			quantity: 1
		};

		addItems([rawItem]);
	});

	/**
	 * @event module:protocol/inventoryExchanges.client_ExchangeTypesItemsExchangerDescriptionForUserMessage
	 *
	 * @param {object} msg - msg
	 * @param {number} msg.objectUID
	 * @param {Array} msg.effects
	 * @param {Array} msg.prices
	 */
	connectionManager.on('ExchangeTypesItemsExchangerDescriptionForUserMessage', function (msg) {
		self.table.clearContent();
		self.delClassNames('spinner');

		var rawItems = [];
		var list = msg.itemTypeDescriptions;
		var gid = self.item.id;

		for (var i = 0, len = list.length; i < len; i += 1) {
			var object = list[i];
			rawItems.push({
				objectUID: object.objectUID,
				objectGID: gid,
				prices: object.prices,
				effects: object.effects,
				quantity: 1
			});
		}

		addItems(rawItems);
	});

	/*
	 * @event module:protocol/inventoryExchanges.client_ExchangeBidHouseInListRemovedMessage
	 *
	 * @param {object} msg - msg
	 * @param {number} msg.itemUID
	 */
	connectionManager.on('ExchangeBidHouseInListRemovedMessage', function (msg) {
		removeItem(msg.itemUID);
	});

	moneyConverter.on('computedHardPricesChange', function () {
		if (!self.table) { return; }
		self.table.refreshRows();
	});

	// TODO: Handle moneyConverter.on('canNotComputeHardPrices', function () {});
};

BidHouseBuyerBox.prototype._setAveragePrice = function (priceSoft) {
	this._averagePrice = priceSoft;
	if (priceSoft === -1) { return this.averagePrice.setText(getText('ui.item.averageprice.unavailable')); }

	var priceHard = moneyConverter.computeHardPrice(priceSoft);

	this.averagePrice.setText(helper.hardAndSoftToString(priceHard, priceSoft));
};

BidHouseBuyerBox.prototype._createDom = function () {
	this.tableBox = this.createChild('div', { className: 'tableBox' });

	var averagePrice = this.createChild('div', { className: ['setting', 'averagePrice'] });
	averagePrice.createChild('div', {
		className: 'label',
		text: getText('ui.bidhouse.bigStoreAveragePrice') + getText('ui.common.colon')
	});
	this.averagePrice = averagePrice.createChild('div', { className: 'value' });
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/TradeItemWindow/bidHouseBuyerBox.js
 ** module id = 819
 ** module chunks = 0
 **/