require('./styles.less');
var Button = require('Button');
var getText = require('getText').getText;
var helper = require('helper');
var inherits = require('util').inherits;
var moneyConverter = require('moneyConverter');
var Window = require('Window');
var windowsManager = require('windowsManager');
var shopHelper = require('shopHelper');

var ArticleBox = require('MarketWindow/ShopWindow/articleBox');

function ShopConfirmWindow() {
	Window.call(this, {
		title: getText('ui.common.confirm'),
		className: 'ShopConfirmWindow',
		positionInfo: {
			left: 'c', top: 'c', width: 500, height: 300,
			isModal: true
		}
	});

	this._reset();

	this.on('open', this._onOpen);
	this.on('close', this._onClose);

	var self = this;
	moneyConverter.on('canNotComputeSoftPrices', function () {
		if (self.articleBox) {
			// Can be closed only if not already purchasing
			var canBeClosed = !self.isPurchasing;
			// Has to close if not an IAP and has to be converted from soft to hard (conversion way in the Shop)
			var hasToClose = (!self.params.article.product && !!self.params.isSoft);
			if (canBeClosed && hasToClose) {
				windowsManager.close(self.id);
			}
		}
	});

	moneyConverter.on('computedSoftPricesChange', function () {
		if (self.articleBox) {
			var canBeUpdated = !self.isPurchasing;
			var hasToBeUpdated = (!self.params.article.product && !!self.params.isSoft);
			if (canBeUpdated && hasToBeUpdated) {
				shopHelper.enrichWithSoftPrice(self.params.article);
				self.updateAmount();
			}
		}
	});
}
inherits(ShopConfirmWindow, Window);
module.exports = ShopConfirmWindow;


ShopConfirmWindow.prototype._reset = function () {
	this.params = null;
	this.cb = null;

	this.articleBox = null;

	this.buyBtn = null;
	this.buyBtnAmount = null;
	this.buyBtnIcon = null;

	this.purchaseLoader = null;
	this._setIsPurchasing(false);
};

ShopConfirmWindow.prototype._onOpen = function () {
	if (!this.articleBox) { this._createContent(); }
};

ShopConfirmWindow.prototype._onClose = function () {
	return this.cb && this.cb(false);
};

ShopConfirmWindow.prototype.freeContent = function () {
	this.windowBody.clearContent();
	this._reset();
};

ShopConfirmWindow.prototype._createContent = function () {
	var twoColumns = this.windowBody.createChild('div', { className: 'twoColumns' });

	var leftCol = twoColumns.createChild('div', { className: 'leftCol' });

	this.articleBox = leftCol.appendChild(new ArticleBox(null, {
		boxWidth: 190,
		boxHeight: 220
	}, {
		showTitle: true,
		promoType: 'corner'
	}));

	var rightCol = twoColumns.createChild('div', { className: 'rightCol' });

	rightCol.createChild('div', { className: 'buyLabel', text: getText('ui.common.buy') });

	var quantityText = getText('ui.common.quantity') + getText('ui.common.colon') + '1';
	rightCol.createChild('div', { className: 'quantityLabel', text: quantityText });

	var self = this;
	this.buyBtn = rightCol.appendChild(
		new Button({ className: ['buyBtn', 'greenButton'] }, function () {
			self._setIsPurchasing(true);
			self.cb(true);
		}));
	var btnContent = this.buyBtn.createChild('div', { className: 'btnContent' });
	this.buyBtnAmount = btnContent.createChild('div', { className: 'btnAmount' });
	this.buyBtnIcon = btnContent.createChild('div', { className: 'btnIcon' });

	this.purchaseLoader = rightCol.createChild('div', { className: ['purchaseLoader', 'spinner'], hidden: true });
	this.purchaseLoader.createChild('div', {
		className: 'purchaseLoaderLabel',
		text: getText('tablet.shop.transactionInProgress')
	});
};

/**
 * Opens the confirm shop window to confirm the buying of an article.
 * @param {object} params
 * @param     {number} params.article - article being bought
 * @param     {number} [params.isSoft] - pass this for confirming a buying using SOFT currency
 * @param {function} cb - will be called with a single boolean parameter; true means "confirmed"
 */
ShopConfirmWindow.prototype.confirmBuy = function (params, cb) {
	windowsManager.open(this.id);
	this._setIsPurchasing(false);

	this.params = params;
	this.cb = cb;

	this.articleBox.update(params.article);
	this.updateAmount();
};

ShopConfirmWindow.prototype._setIsPurchasing = function (isPurchasing) {
	this.isPurchasing = !!isPurchasing;

	if (!this.articleBox) { return; }

	if (isPurchasing) {
		this.closeButton.disable();
		this.buyBtn.disable();
	} else {
		this.closeButton.enable();
		this.buyBtn.enable();
	}

	this.purchaseLoader.toggleDisplay(isPurchasing);
};

/** Called if the amount changes while the Confirm window is already displayed */
ShopConfirmWindow.prototype.updateAmount = function () {
	if (!this.articleBox) { return; }

	var params = this.params;
	var article = params.article;
	var product = article.product;
	if (product) {
		this.buyBtnAmount.setText(product.price);
		this.buyBtnIcon.hide();
	} else {
		var isSoft = params.isSoft;
		var inventory = window.gui.playerData.inventory;
		var amountAvailable = isSoft ? inventory.kamas : inventory.goultines;
		var price = isSoft ? article._softPrice : article.price;
		if (price > amountAvailable) {
			this.buyBtn.disable();
		} else {
			this.buyBtn.enable();
		}
		this.buyBtnAmount.setText(helper.intToString(price));
		this.buyBtnIcon.show();
		this.buyBtnIcon.toggleClassName('hardCcy', !isSoft);
		this.buyBtnIcon.toggleClassName('softCcy', !!isSoft);
	}
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/ShopConfirmWindow/index.js
 ** module id = 955
 ** module chunks = 0
 **/