require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');
var Button = require('Button').DofusButton;
var NumberInputBox = require('NumberInputBox');
var windowsManager = require('windowsManager');
var helper = require('helper');
var getText = require('getText').getText;
var staticContent = require('staticContent');
var assetPreloading = require('assetPreloading');
var SwitchCurrencyButton = require('SwitchCurrencyButton');
var moneyConverter = require('moneyConverter');
var shopHelper = require('shopHelper');

var SOFT_CURRENCY = 'soft';
var HARD_CURRENCY = 'hard';


function HouseBuySellWindow() {
	Window.call(this, {
		className: 'houseBuySellWindow',
		title: 'house',
		positionInfo: { left: 'c', top: 'c', width: 450, height: 335 }
	});

	var self = this;

	this.currency = SOFT_CURRENCY;

	this.once('open', function () {
		var container = this.windowBody.createChild('div', { className: 'container' });
		var imageContainer = container.createChild('div', { className: 'imageContainer' });
		self.image = imageContainer.createChild('div', { className: 'image' });
		self.image.setStyle('backgroundImage', self.imageUrl);
		self.title = container.createChild('div', { className: ['text', 'title'], text: self.titleText });
		self.description = container.createChild('div', { className: ['text', 'description'], text: self.descriptionText });

		var priceContainer = this.windowBody.createChild('div', { className: 'priceContainer' });
		priceContainer.createChild('div', {
			className: 'priceText',
			text: getText('ui.common.price') + getText('ui.common.colon')
		});
		self.price = priceContainer.appendChild(new NumberInputBox({ title: getText('ui.common.price') }));
		self.currencyIcon = priceContainer.createChild('div', { className: ['currencyIcon', 'soft'] });

		self.price.on('change', function (value) {
			self.proposedPrice = value;
		});

		var footer = this.windowBody.createChild('div', { className: 'footer' });
		self.cancelSaleButton = footer.appendChild(
			new Button(getText('ui.common.cancelTheSale'), { className: 'cancelSaleButton' }));
		self.confirmButton = footer.appendChild(
			new Button(getText('ui.common.validation'), { className: 'confirmButton' }));
		self.switchButton = footer.appendChild(new SwitchCurrencyButton());
		self.switchButton.on('switchToHard', function () {
			self._setCurrency(HARD_CURRENCY);
			self.updateDisplay(self.houseInfo);
		});
		self.switchButton.on('switchToSoft', function () {
			self._setCurrency(SOFT_CURRENCY);
			self.updateDisplay(self.houseInfo);
		});

		self.cancelSaleButton.on('tap', function () {
			if (self.houseInfo && self.houseInfo.buyOrSell) {
				return;
			}

			if (self.fromInside) {
				window.dofus.sendMessage('HouseSellFromInsideRequestMessage', { amount: 0 });
				windowsManager.close(self.id);
				return;
			}

			window.dofus.sendMessage('HouseSellRequestMessage', { amount: 0 });
		});

		self.confirmButton.on('tap', function () {
			if (self.houseInfo && self.houseInfo.buyOrSell) {
				var price;
				if (self.currency === HARD_CURRENCY) {
					price = getText('tablet.price.hard', self.price.getFormattedValue());
				} else {
					price = getText('tablet.price.soft', self.price.getFormattedValue());
				}
				return window.gui.openConfirmPopup({
					title: getText('ui.common.housePurchase'),
					message: getText('tablet.ui.common.doUBuyHouse', self.houseOwner, price),
					cb: function (result) {
						if (result) {
							if (self.currency === SOFT_CURRENCY) {
								return window.dofus.sendMessage('HouseBuyRequestMessage', {
									proposedPrice: self.proposedPrice
								});
							}
							var hardCcyMissing = self.proposedPriceHard - window.gui.playerData.inventory.goultines;
							if (hardCcyMissing > 0) {
								return shopHelper.openNotEnoughHardCurrencyPopup(hardCcyMissing);
							}
							return window.dofus.send('houseBuyRequest', {
								houseId: self.houseInfo.purchasableId,
								amountHard: self.proposedPriceHard,
								amountSoft: self.proposedPrice
							});
						}
					}
				}, {
					isModal: true
				});
			}

			if (self.fromInside) {
				window.dofus.sendMessage('HouseSellFromInsideRequestMessage', { amount: self.proposedPrice });
				windowsManager.close(self.id);
				return;
			}

			window.dofus.sendMessage('HouseSellRequestMessage', { amount: self.proposedPrice });
		});
	});

	this.on('open', function (params) {
		params = params || {};
		self.fromInside = params.fromInside;

		self.switchButton.setCurrency(SOFT_CURRENCY);

		if (self.fromInside) {
			self.fromInsideUpdateDisplay(params.myHouse);
			return;
		}

		self.updateDisplay(params.msg);
	});

	this.setupSocketEvents();
}

inherits(HouseBuySellWindow, Window);
module.exports = HouseBuySellWindow;


HouseBuySellWindow.prototype.setupSocketEvents = function () {
	var self = this;
	var gui = window.gui;
	var connectionManager = window.dofus.connectionManager;

	gui.on('PurchasableDialogMessage', function (msg) {
		windowsManager.openDialog(self.id, { fromInside: false, msg: msg });
	});

	gui.on('HouseBuyResultMessage', function (msg) {
		if (msg.bought) {
			gui.openPopup({
				title: getText('ui.popup.information'),
				message: getText('ui.common.houseBuy', self.houseOwner, helper.kamasToString(msg.realPrice, ''))
			});
		} else {
			gui.openPopup({
				title: getText('ui.popup.information'),
				message: getText('ui.common.cantBuyHouse', helper.kamasToString(msg.realPrice, ''))
			});
		}
	});

	gui.on('HouseSoldMessage', function (msg) {
		if (gui.playerData.identification.nickname === msg.buyerName) {
			var houseOwner = getText('ui.house.homeOf', msg.buyerName);

			if (msg.realPrice === 0) {
				gui.openPopup({
					title: getText('ui.popup.information'),
					message: getText('ui.common.houseNosell', '\'' + houseOwner + '\'')
				});
			} else {
				gui.openPopup({
					title: getText('ui.popup.information'),
					message: getText('ui.common.houseSell', '\'' + houseOwner + '\'', helper.kamasToString(msg.realPrice, ''))
				});
			}
		}
	});

	moneyConverter.on('computedHardPricesChange', function () {
		if (self.currency === HARD_CURRENCY) {
			self.updateDisplay(self.houseInfo);
		}
	});

	// TODO: Handle moneyConverter.on('canNotComputeHardPrices', function () {});

	connectionManager.on('houseBuyError', function (/*msg*/) {
		this.send('moneyGoultinesAmountRequest');
	});

	connectionManager.on('houseBuySuccess', function (/*msg*/) {
		this.send('moneyGoultinesAmountRequest');
	});
};

HouseBuySellWindow.prototype._setCurrency = function (currency) {
	if (this.currency === currency) {
		return;
	}

	var previousCurrency = this.currency;
	this.currency = currency;

	if (this.currencyIcon) {
		this.currencyIcon.replaceClassNames([previousCurrency], [currency]);
	}
};

/**
 * Prepare the dialog title, image and description
 *
 * @param {Objet} data Data structure can be as following:
 *      - 'HouseInformationsInside' (currentHouse) in 'MapComplementaryInformationsDataInHouseMessage' protocol
 *      - any object with these attributes: modelId, ownerName
 */
HouseBuySellWindow.prototype.prepareDialog = function (data) {
	var self = this;

	staticContent.getData('Houses', data.modelId, function (error, result) {
		if (error || !result) {
			return console.warn('Houses Id: ' + data.modelId + ' not found!', error);
		}

		assetPreloading.preloadImage('gfx/houses/' + result.gfxId + '.png', function (url) {
			self.houseOwner = data.ownerName === '?' ?
				getText('ui.common.houseWithNoOwner') : getText('ui.house.homeOf', data.ownerName);
			var descriptionText = result.nameId;

			if (self.image) {
				delete self.imageUrl;
				delete self.titleText;
				delete self.descriptionText;

				self.image.setStyle('backgroundImage', url);
				self.title.setText(self.houseOwner);
				self.description.setText(descriptionText);
				return;
			}

			self.imageUrl = url;
			self.titleText = self.houseOwner;
			self.descriptionText = descriptionText;
		});
	});
};

/**
 * Update the window
 *
 * @param {Objet} msg Data structure can be as following:
 *                     - Message returned by 'PurchasableDialogMessage' protocol
 *                     - any object with these attributes: buyOrSell, price,
 */
HouseBuySellWindow.prototype.updateDisplay = function (msg) {
	if (!msg) {
		return console.warn('Missing purchaseMsg from PurchasableDialogMessage.');
	}

	this.proposedPrice = msg.price;
	this.proposedPriceHard = moneyConverter.computeHardPrice(msg.price);
	this.houseInfo = msg;

	var isHardCurrencySet = this.currency === HARD_CURRENCY;
	var price = isHardCurrencySet ? this.proposedPriceHard : msg.price;

	// buy = true, sell = false
	if (msg.buyOrSell) {
		this.switchButton.show();
		this.price.disable();
		this.windowTitle.setText(getText('ui.common.housePurchase'));
		this.cancelSaleButton.disable();

		var inventory = window.gui.playerData.inventory;
		var isConfirmEnabled = isHardCurrencySet || (price && price <= inventory.kamas);
		if (isConfirmEnabled) {
			this.confirmButton.enable();
		} else {
			this.confirmButton.disable();
		}
	} else {
		this.switchButton.hide();
		this.price.enable();
		this.windowTitle.setText(getText('ui.common.houseSale'));
		this.cancelSaleButton.enable();
		this.confirmButton.enable();
	}

	if (!price) {
		return this.price.setValue(getText('ui.item.averageprice.unavailable'));
	}
	this.price.setValue(helper.kamasToString(price, ''));
};

/**
 * Special logic to update the window when we are inside my house
 *
 * @param {Objet} myHouse Data structure can be as following:
 *        - 'HouseInformationsInside' (currentHouse) in 'MapComplementaryInformationsDataInHouseMessage' protocol
 *        - any object with these attributes: price, modelId,
 */
HouseBuySellWindow.prototype.fromInsideUpdateDisplay = function (myHouse) {
	var self = this;

	this.switchButton.hide();
	this.confirmButton.enable();

	if (!myHouse) {
		return console.warn('Missing current house info.');
	}

	this.price.enable();
	this.windowTitle.setText(getText('ui.common.houseSale'));

	if (myHouse.price) {
		this.cancelSaleButton.enable();
		this.proposedPrice = myHouse.price;
		this.price.setValue(helper.kamasToString(myHouse.price, ''));
		return;
	}

	this.cancelSaleButton.disable();

	staticContent.getData('Houses', myHouse.modelId, function (error, result) {
		if (error || !result) {
			return console.warn('Houses Id: ' + myHouse.modelId + ' not found!', error);
		}

		self.proposedPrice = result.defaultPrice;
		self.price.setValue(helper.kamasToString(self.proposedPrice, ''));
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/HouseBuySellWindow/index.js
 ** module id = 772
 ** module chunks = 0
 **/