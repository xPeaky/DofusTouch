var inherits = require('util').inherits;
var NumberInputBox = require('NumberInputBox');
var getText = require('getText').getText;
var Button = require('Button');
var helper = require('helper');
var moneyConverter = require('moneyConverter');
var WuiDom = require('wuidom');

var SELLING_RATIO = 10;


function ExchangeBox() {
	WuiDom.call(this, 'div', { className: 'ExchangeBox', hidden: true });

	this._createDom();

	this.mode = null;
	this.current = {};
	this.tradeItemWindow = null;
	this.currency = '';
	this.tokenItem = null;
}
inherits(ExchangeBox, WuiDom);
module.exports = ExchangeBox;


ExchangeBox.prototype._createDom = function () {
	var self = this;

	var settingBox = this.createChild('div', { className: 'settingBox' });

	function updatePrices() {
		// Enable "Modify" button only if price or quantity has changed
		var prevQty = self.current.quantity, prevPrice = self.current.unitPrice;
		self._updatePrices();
		var hasChanged = self.current.quantity !== prevQty || self.current.unitPrice !== prevPrice;
		self.modifyButton.setEnable(hasChanged);
	}

	var quantityContainer = settingBox.createChild('div', { className: 'setting' });
	quantityContainer.createChild('div', {
		className: 'label',
		text: getText('ui.common.quantity') + getText('ui.common.colon')
	});
	var quantityValue = this.quantityValue = quantityContainer.appendChild(
		new NumberInputBox({ minValue: 1, title: getText('ui.common.quantity') }));

	quantityValue.on('focus', function () {
		quantityValue.maxValue = self._getMaxQuantity();
	});
	quantityValue.on('change', updatePrices);

	var unitPriceContainer = settingBox.createChild('div', { className: 'setting' });
	unitPriceContainer.createChild('div', {
		className: 'label',
		text: getText('ui.common.unitPrice') + getText('ui.common.colon')
	});
	this.unitPriceInput = unitPriceContainer.appendChild(
		new NumberInputBox({ minValue: 1, title: getText('ui.common.unitPrice') }));
	this.unitPriceInput.on('change', updatePrices);

	this.unitPriceValue = unitPriceContainer.createChild('div', { className: 'value' });

	var totalPriceContainer = this.totalPrice = settingBox.createChild('div', { className: 'setting' });
	totalPriceContainer.createChild('div', {
		className: 'label',
		text: getText('ui.common.totalPrice') + getText('ui.common.colon')
	});
	this.totalPriceValue = totalPriceContainer.createChild('div', { className: 'value' });

	// Buttons

	var buttonContainer = this.createChild('div', { className: 'buttonBox' });
	this.removeButton = buttonContainer.appendChild(
		new Button({ text: getText('ui.common.remove'), className: ['greenButton', 'removeButton'] }, function () {
			this.disable();
			self._updatePrices();
			var current = self.current;
			self.tradeItemWindow.removeItemQuantityFromMyShop(current.item, current.quantity);
		})
	);
	this.modifyButton = buttonContainer.appendChild(
		new Button({ text: getText('ui.common.modify'), className: 'greenButton' }, function () {
			this.disable();
			self._updatePrices();
			var current = self.current;
			self.tradeItemWindow.modifyItemPriceInMyShop(current.item, current.quantity, current.unitPrice);
		})
	);
	this.onSaleButton = buttonContainer.appendChild(
		new Button({ text: getText('ui.common.putOnSell'), className: 'greenButton' }, function () {
			var current = self.current;
			if (current.unitPrice === 0) { return self.unitPriceInput.promptForValue(); }
			self.tradeItemWindow.sellItemInMyShop(current.item, current.quantity, current.unitPrice);
		})
	);
	this.sellButton = buttonContainer.appendChild(
		new Button({ text: getText('ui.common.sell'), className: 'greenButton' }, function () {
			var current = self.current;
			self.tradeItemWindow.sellItemToNpc(current.item, current.quantity, current.unitPrice);
		})
	);
	this.buyButton = buttonContainer.appendChild(
		new Button({ text: getText('ui.common.buy'), className: 'greenButton' }, function () {
			var current = self.current;
			self.tradeItemWindow.buyItemFromNpc(current.item, current.quantity, current.unitPrice);
		})
	);
};

ExchangeBox.prototype._updatePrices = function () {
	var isPlayerShop = this.mode === 'sell-myShop' || this.mode === 'modify-myShop';
	var isBuyHuman = this.mode === 'buy-human';

	var unitPrice = isPlayerShop ? this.unitPriceInput.getValue() : this.pricePerUnit;
	var quantity = this.quantityValue.getValue();

	this.current.quantity = quantity;
	this.current.unitPrice = unitPrice;
	var totalPrice = quantity * unitPrice;
	var amountHard = null;

	this.totalPrice.toggleDisplay(!isBuyHuman);
	if (isBuyHuman) {
		amountHard = moneyConverter.computeHardPrice(totalPrice); // can return null
		this.totalPrice.hide();

		this.tradeItemWindow.updateSelection({
			item: this.current.item,
			amountHard: amountHard,
			amountSoft: totalPrice,
			qty: quantity
		});
	} else {
		this.totalPrice.show();
		if (this.currency) {
			this.totalPriceValue.setText(this.currency + ' x ' + helper.intToString(totalPrice));
		} else {
			this.totalPriceValue.setText(helper.kamasToString(totalPrice));
		}
	}

	if (this.buyButton.isVisible()) {
		var inventory = window.gui.playerData.inventory;
		var maxBuyQty = this.tokenItem ? inventory.getGenericItemCount(this.tokenItem.id) : inventory.kamas;
		if (totalPrice > maxBuyQty) {
			this.buyButton.disable();
			this.totalPriceValue.addClassNames('red');
		} else {
			this.buyButton.enable();
			this.totalPriceValue.delClassNames('red');
		}
	}
};

ExchangeBox.prototype._getMaxQuantity = function () {
	var playerData = window.gui.playerData;
	var item = this.current.item;
	if (this.mode === 'modify-myShop') {
		return playerData.myShop.getItemSellableAmount(item.objectGID);
	}
	return item.quantity;
};

/**
 * @param {TradeItemWindow}   tradeItemWindow
 * @param {Object}   item - the item instance
 * @param {String}   [currencyName] - the name of the item used as a currency.
 */
ExchangeBox.prototype.updateSettingBox = function (tradeItemWindow, item, currencyName) {
	this.tradeItemWindow = tradeItemWindow;
	this.current.item = item;
	var mode = this.mode = tradeItemWindow.mode;
	this.tokenItem = tradeItemWindow.msg.token;
	this.currency = currencyName; // refactor later: remove currencyName param; we can use this.tokenItem.nameId
	var isPlayerShop = false, isSell = false;

	this.totalPriceValue.delClassNames('red');
	this._hideButtons();

	var maxQty = item.getProperty('quantity');
	var qty = 1;
	var unitPrice;

	switch (mode) {
	case 'modify-myShop':
		isPlayerShop = true;
		this.removeButton.show();
		this.removeButton.enable();
		this.modifyButton.show();
		this.modifyButton.disable();
		unitPrice = item.getProperty('objectPrice');
		qty = maxQty;
		break;
	case 'sell-myShop':
		isSell = true;
		isPlayerShop = true;
		this.onSaleButton.show();
		unitPrice = 0;
		qty = maxQty;
		break;
	case 'sell-npc':
		isSell = true;
		this.sellButton.show();
		var dbPrice = item.getProperty('price');
		unitPrice = dbPrice > 0 ? Math.max(1, Math.floor(dbPrice / SELLING_RATIO)) : 0;
		break;
	case 'buy-npc':
		this.buyButton.show();
		// unitPrice comes from objectPrice when buying with tokens; from DB ("price") otherwise
		unitPrice = item.getProperty('objectPrice') || item.getProperty('price');
		break;
	case 'buy-human':
		unitPrice = item.getProperty('objectPrice');
		break;
	default:
		throw new Error('Invalid exchange mode: ' + mode);
	}

	if (isSell && item.isLinked()) { return tradeItemWindow.showError(getText('ui.bidhouse.badExchange')); }
	this.pricePerUnit = unitPrice;
	this.quantityValue.setValue(qty);
	this.quantityValue.setReadonly(maxQty === 1);

	if (isPlayerShop) {
		this.unitPriceInput.setValue(unitPrice);
	} else {
		this.unitPriceValue.setText(currencyName ?
			currencyName + ' x ' + helper.intToString(unitPrice) :
			helper.kamasToString(unitPrice));
	}
	this.unitPriceInput.toggleDisplay(isPlayerShop);
	this.unitPriceValue.toggleDisplay(!isPlayerShop);

	this._updatePrices();
};


ExchangeBox.prototype._hideButtons = function () {
	this.removeButton.hide();
	this.modifyButton.hide();
	this.onSaleButton.hide();
	this.sellButton.hide();
	this.buyButton.hide();
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/TradeItemWindow/exchangeBox.js
 ** module id = 820
 ** module chunks = 0
 **/