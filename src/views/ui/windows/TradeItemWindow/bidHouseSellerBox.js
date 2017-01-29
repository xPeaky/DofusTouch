var inherits = require('util').inherits;
var NumberInputBox = require('NumberInputBox');
var getText = require('getText').getText;
var Button = require('Button');
var helper = require('helper');
var itemManager = require('itemManager');
var Selector = require('Selector');
var WuiDom = require('wuidom');

var sellPriceCache = {}; // e.g. sellPriceCache['2475x1'] = 50 (item GID 2475 was sold by qty 1 at 50 kamas)
var sellQtyCache = {}; // e.g. sellQtyCache[2475] = 10 (item 2475 was sold by qty 10)


function BidHouseSellerBox() {
	WuiDom.call(this, 'div', { className: 'BidHouseSellerBox', hidden: true });

	this.tradeItemWindow = null;
	this.item = {};
	this.mode = null;
	this.descriptor = null;

	this.quantity = 0;
	this.price = 0;
	this.fees = 0;

	this._createDom();
	this._setupEvents();
}
inherits(BidHouseSellerBox, WuiDom);
module.exports = BidHouseSellerBox;


function cacheUsualPriceAndQuantity(item, qty, price) {
	sellPriceCache[item.objectGID + 'x' + qty] = price;
	sellQtyCache[item.objectGID] = qty;
}

function getUsualPriceFromCache(item, qty) {
	return sellPriceCache[item.objectGID + 'x' + qty] || 0;
}

BidHouseSellerBox.prototype.updateSettingBox = function (tradeItemWindow, item) {
	var self = this;

	this.tradeItemWindow = tradeItemWindow;
	var mode = this.mode = tradeItemWindow.mode;
	this.item = item;

	this._hideAll();

	switch (mode) {
	case 'modify-bidHouse':
		this.priceLabel.setText(helper.kamasToString(item.objectPrice));
		this.priceLabel.show();
		this.quantityLabel.setText(helper.intToString(item.quantity));
		this.quantityLabel.show();
		this.quantity = item.quantity;
		this.removeBtn.show();
		//this.modifyBtn.show(); // TODO uncomment when the server versions handles price modification
		this.timeLeft.setText(item.unsoldDelay + ' ' + getText('ui.common.hourShort'));
		this.timeLeftBox.show();
		break;
	case 'sell-bidHouse':
		if (this.descriptor.types.indexOf(item.item.typeId) === -1) { // not happening in Dofus Touch
			return tradeItemWindow.showError(getText('ui.bidhouse.badType'));
		}
		if (item.isLinked()) {
			return tradeItemWindow.showError(getText('ui.bidhouse.badExchange'));
		}
		if (item.item.level > this.descriptor.maxItemLevel) { // not happening in Dofus Touch
			return tradeItemWindow.showError(getText('ui.bidhouse.badLevel'));
		}

		this.sellBtn.show();
		this.sellBtn.disable();

		var quantities = this.descriptor.quantities;
		this.quantitySelect.clearContent();
		var maxSelectableQty = 1;
		for (var i = 0, len = quantities.length; i < len; i += 1) {
			var quantity = quantities[i];
			if (item.quantity >= quantity) {
				this.quantitySelect.addOption(quantity, quantity);
				maxSelectableQty = quantity;
			}
		}
		var usualQty = sellQtyCache[item.objectGID];
		var quantityToSelect = usualQty ? Math.min(usualQty, maxSelectableQty) : maxSelectableQty;

		this.quantitySelect.select(quantityToSelect);
		this.quantitySelect.show();

		var price = getUsualPriceFromCache(item, quantityToSelect);
		this.priceInput.setValue(price);
		this.price = price;
		this.priceInput.show();

		this._updateFees();
		break;
	}

	this.quantityBox.show();
	this.averagePriceBox.show();
	this.priceBox.show();

	this._displayAveragePrice(item.item.averagePrice);
	itemManager.getFreshAveragePrice(item.objectGID, function (price) {
		self._displayAveragePrice(price);
	});
};

BidHouseSellerBox.prototype._hideAll = function () {
	this.quantityBox.hide();
	this.averagePriceBox.hide();
	this.quantitySelect.hide();
	this.quantityLabel.hide();
	this.priceBox.hide();
	this.priceLabel.hide();
	this.priceInput.hide();
	this.timeLeftBox.hide();
	this.saleFeeBox.hide();
	this.sellBtn.hide();
	this.removeBtn.hide();
	// this.modifyBtn.hide();
};

BidHouseSellerBox.prototype.setDescriptorData = function (descriptor) {
	this.descriptor = descriptor;
};

BidHouseSellerBox.prototype._displayAveragePrice = function (price) {
	if (price === -1) {
		this.averagePrice.setText(getText('ui.item.averageprice.unavailable'));
	} else {
		this.averagePrice.setText(helper.kamasToString(price));
	}
};

BidHouseSellerBox.prototype._updateFees = function () {
	this.fees = Math.max(1, Math.round(this.descriptor.taxPercentage * (this.price - (this.item.objectPrice || 0)) / 100));
	this.saleFee.setText(helper.kamasToString(this.fees));
	this.saleFeeBox.show();

	var hasMoney = window.gui.playerData.inventory.kamas >= this.fees;
	this.saleFee.toggleClassName('red', !hasMoney);
	this.sellBtn.setEnable(hasMoney);
};

BidHouseSellerBox.prototype._setupEvents = function () {
	window.gui.on('disconnect', function () {
		sellPriceCache = {};
		sellQtyCache = {};
	});
};

BidHouseSellerBox.prototype._createDom = function () {
	var self = this;

	var settingBox = this.createChild('div', { className: 'settingBox' });

	var quantity = this.quantityBox = settingBox.createChild('div', { className: ['setting', 'quantity'] });
	quantity.createChild('div', {
		className: 'label',
		text: getText('ui.common.quantity') + getText('ui.common.colon')
	});
	this.quantitySelect = quantity.appendChild(new Selector());
	this.quantitySelect.on('change', function (qty) {
		self.quantity = qty;
		self.price = getUsualPriceFromCache(self.item, qty);
		self.priceInput.setValue(self.price);
		self._updateFees();
	});
	this.quantityLabel = quantity.createChild('div', { className: 'value' });

	var batchPrice = this.priceBox = settingBox.createChild('div', { className: ['setting', 'batchPrice'] });
	batchPrice.createChild('div', {
		className: 'label',
		text: getText('ui.bidhouse.setPrice') + getText('ui.common.colon')
	});
	this.priceLabel = batchPrice.createChild('div', { className: 'value' });
	this.priceInput = batchPrice.appendChild(new NumberInputBox({ title: getText('ui.bidhouse.setPrice'),
		attr: { placeholder: getText('tablet.price.placeHolder') } }));
	this.priceInput.on('change', function (newPrice) {
		self.price = newPrice;
		self._updateFees();
	});

	var averagePrice = this.averagePriceBox = settingBox.createChild('div', { className: ['setting', 'averagePrice'] });
	averagePrice.createChild('div', {
		className: 'label',
		text: getText('ui.bidhouse.bigStoreAveragePrice') + getText('ui.common.colon')
	});
	this.averagePrice = averagePrice.createChild('div', { className: 'value' });

	var saleFee = this.saleFeeBox = settingBox.createChild('div', { className: ['setting', 'saleFee'] });
	saleFee.createChild('div', {
		className: 'label',
		text: getText('ui.bidhouse.bigStoreTax') + getText('ui.common.colon')
	});
	this.saleFee = saleFee.createChild('div', { className: ['value', 'text'] });


	var timeLeft = this.timeLeftBox = settingBox.createChild('div', { className: ['setting', 'timeLeft'] });
	timeLeft.createChild('div', {
		className: 'label',
		text: getText('ui.bidhouse.bigStoreTime') + getText('ui.common.colon')
	});
	this.timeLeft = timeLeft.createChild('div', { className: 'value' });


	var buttonBox = this.createChild('div', { className: 'buttonBox' });

	this.sellBtn = buttonBox.appendChild(
		new Button({ className: 'greenButton', text: getText('ui.common.putOnSell') }, function () {
			if (self.price === 0) { return self.priceInput.promptForValue(); }
			cacheUsualPriceAndQuantity(self.item, self.quantity, self.price);
			self.tradeItemWindow.sellInBidHouse(self.item, self.price, self.quantity, self.fees);
		})
	);

	this.removeBtn = buttonBox.appendChild(
		new Button({ className: 'greenButton', text: getText('ui.common.remove') }, function () {
			self.tradeItemWindow.removeFromBidHouse(self.item, self.item.objectPrice, self.quantity);
		})
	);

	// TODO: uncomment when the server versions handles price modification
	// this.modifyBtn = buttonBox.appendChild(
	//  	new Button({ className: 'greenButton', text: getText('ui.common.modify') }, function () {
	// 		self.tradeItemWindow.modifyInBidHouse(self.item, self.price, self.quantity, self.fees);
	// 	})
	// );
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/TradeItemWindow/bidHouseSellerBox.js
 ** module id = 818
 ** module chunks = 0
 **/