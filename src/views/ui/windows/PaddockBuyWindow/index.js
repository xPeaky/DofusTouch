require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');
var Button = require('Button').DofusButton;
var helper = require('helper');
var getText = require('getText').getText;
var NumberInputBox = require('NumberInputBox');
var windowsManager = require('windowsManager');
var assetPreloading = require('assetPreloading');
var SwitchCurrencyButton = require('SwitchCurrencyButton');
var moneyConverter = require('moneyConverter');
var keyboard = require('keyboard');
var shopHelper = require('shopHelper');

var SOFT_CURRENCY = 'soft';
var HARD_CURRENCY = 'hard';


function PaddockBuyWindow() {
	Window.call(this, {
		className: 'PaddockBuyWindow',
		positionInfo: { left: 'c', top: 'c', width: 350, height: 270 }
	});

	this.currency = SOFT_CURRENCY;

	var self = this;

	var price, priceHard, sellMode, maxOutdoorMount, maxItems;
	var isNotForSale, initialPrice;

	var wrapContainer = this.windowBody.createChild('div', { className: 'wrapContainer' });
	var container = wrapContainer.createChild('div', { className: 'container' });
	var illus = container.createChild('div', { className: 'illus' });
	var description = container.createChild('div', { className: 'description' });

	var priceElm = this.windowBody.createChild('div', { className: 'price' });
	var priceValue = priceElm.appendChild(
		new NumberInputBox({ className: 'priceValue', attr: { readonly: true }, title: getText('ui.common.price') }));
	priceElm.createChild('div', { className: 'priceLabel', text: getText('ui.common.price') + ':' });

	var buttons = this.windowBody.createChild('div', { className: 'buttons' });
	var cancelButton = buttons.appendChild(new Button(null, { className: 'cancel' }));
	cancelButton.on('tap', function () {
		if (sellMode) {
			keyboard.hide();
			window.dofus.sendMessage('PaddockSellRequestMessage', { price: 0 });
		} else {
			windowsManager.close(self.id);
		}
	});
	var confirmButton = buttons.appendChild(new Button(getText('ui.common.validation'), { className: 'confirm' }));
	confirmButton.on('tap', function () {
		if (sellMode) {
			keyboard.hide();
			price = priceValue.getValue();
			var priceText = priceValue.getFormattedValue();

			window.gui.openConfirmPopup({
				title: getText('ui.mount.paddockSell'),
				message: getText('ui.mount.doUSellPaddock', priceText),
				cb: function (result) {
					if (result) {
						window.dofus.sendMessage('PaddockSellRequestMessage', { price: price });
					}
				}
			});
		} else {
			var formattedPrice;
			var isSoftCurrency = self.currency === SOFT_CURRENCY;
			if (isSoftCurrency) {
				formattedPrice = getText('tablet.price.soft', helper.kamasToString(price, ''));
			} else {
				formattedPrice = getText('tablet.price.hard', helper.kamasToString(priceHard, ''));
			}

			window.gui.openConfirmPopup({
				title: getText('ui.mount.paddockPurchase'),
				message: getText('tablet.ui.mount.doUBuyPaddock', formattedPrice),
				cb: function (result) {
					if (result) {
						if (isSoftCurrency) {
							return window.dofus.sendMessage('PaddockBuyRequestMessage');
						}
						var hardCcyMissing = priceHard - window.gui.playerData.inventory.goultines;
						if (hardCcyMissing > 0) {
							return shopHelper.openNotEnoughHardCurrencyPopup(hardCcyMissing);
						}
						return window.dofus.send('paddockBuyRequest', {
							amountHard: priceHard,
							amountSoft: price
						});
					}
				}
			}, {
				isModal: true
			});
		}
	});

	function setEnable(element, enabled) {
		if (enabled) {
			element.enable();
		} else {
			element.disable();
		}
	}

	// Called when sales price has changed (only in sell mode of course!)
	priceValue.on('change', function (newPrice) {
		if (self.currency === SOFT_CURRENCY) {
			// Only enable confirm button if the sales price has actually changed (avoids useless messaging)
			setEnable(confirmButton, newPrice !== initialPrice);
		} else {
			setEnable(confirmButton, true);
		}
	});

	var switchButton = buttons.appendChild(new SwitchCurrencyButton());
	switchButton.on('switchToHard', function () {
		self._setCurrency(HARD_CURRENCY);
		updateWindow();
	});
	switchButton.on('switchToSoft', function () {
		self._setCurrency(SOFT_CURRENCY);
		updateWindow();
	});

	var hasIllu = false;
	function updateWindow() {
		if (!hasIllu) {
			assetPreloading.preloadImage('gfx/illusUi/enclos_tx_illuEnclos.png', function (url) {
				hasIllu = true;
				illus.setStyle('backgroundImage', url);
			});
		}

		var isHardCurrencySet = self.currency === HARD_CURRENCY;
		var paddockPrice = isHardCurrencySet ? priceHard : price;

		if (sellMode) {
			buttons.replaceClassNames(['buy'], ['sell']);
			switchButton.hide();
			self.windowTitle.setText(getText('ui.mount.paddockSell'));
			cancelButton.setText(getText('ui.common.cancelTheSale'));
			priceValue.setReadonly(false);
			setEnable(confirmButton, isNotForSale); // when not yet for sale, even the initial price is fine
		} else {
			buttons.replaceClassNames(['sell'], ['buy']);
			switchButton.show();
			self.windowTitle.setText(getText('ui.mount.paddockPurchase'));
			cancelButton.setText(getText('ui.common.cancel'));
			priceValue.setReadonly(true);

			var inventory = window.gui.playerData.inventory;
			var isConfirmEnabled = isHardCurrencySet || (paddockPrice && paddockPrice <= inventory.kamas);
			setEnable(confirmButton, isConfirmEnabled);
		}
		description.setText(getText('ui.mount.paddockDescription', maxOutdoorMount, maxItems));

		if (!paddockPrice) {
			return priceValue.setValue(getText('ui.item.averageprice.unavailable'));
		}
		priceValue.setValue(paddockPrice);
	}

	/** We receive this message when we enter on a map with a paddock; or when the paddock info has changed */
	window.gui.on('PaddockPropertiesMessage', function (msg) {
		maxOutdoorMount = msg.properties.maxOutdoorMount;
		maxItems = msg.properties.maxItems;
		isNotForSale = msg.properties.price === 0; // paddock we own shows a price of 0 unless already for sale
	});

	window.gui.on('PaddockSellBuyDialogMessage', function (msg) {
		sellMode = msg.bsell;
		price = initialPrice = msg.price;
		priceHard = moneyConverter.computeHardPrice(price);

		switchButton.setCurrency(SOFT_CURRENCY);

		updateWindow();
		windowsManager.openDialog('paddockBuy');
	});

	moneyConverter.on('computedHardPricesChange', function () {
		priceHard = moneyConverter.computeHardPrice(price);
		if (self.currency === HARD_CURRENCY) {
			updateWindow();
		}
	});

	// TODO: Handle moneyConverter.on('canNotComputeHardPrices', function () {});

	var connectionManager = window.dofus.connectionManager;
	connectionManager.on('paddockBuyError', function (/*msg*/) {
		this.send('moneyGoultinesAmountRequest');
	});

	connectionManager.on('paddockBuySuccess', function (/*msg*/) {
		this.send('moneyGoultinesAmountRequest');
	});

	this.on('close', function () {
		keyboard.hide();
	});
}

inherits(PaddockBuyWindow, Window);
module.exports = PaddockBuyWindow;

PaddockBuyWindow.prototype._setCurrency = function (currency) {
	if (this.currency === currency) {
		return;
	}

	var previousCurrency = this.currency;
	this.currency = currency;

	if (this.currencyIcon) {
		this.currencyIcon.replaceClassNames([previousCurrency], [currency]);
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/PaddockBuyWindow/index.js
 ** module id = 890
 ** module chunks = 0
 **/