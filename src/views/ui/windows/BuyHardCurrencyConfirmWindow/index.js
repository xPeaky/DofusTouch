require('./styles.less');
var Button = require('Button');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var Window = require('Window');
var windowsManager = require('windowsManager');
var shopHelper = require('shopHelper');

var ArticleBox = require('MarketWindow/ShopWindow/articleBox');

var ERROR_TYPES = {
	NO_PACK: 0,
	AMOUNT_TOO_HIGH: 1
};

function BuyHardCurrencyConfirmWindow() {
	Window.call(this, {
		title: getText('tablet.shop.needMoreHardCurrency').toUpperCase(),
		className: 'BuyHardCurrencyConfirmWindow',
		positionInfo: {
			left: 'c', top: 'c', width: 540, height: 440,
			isModal: true
		}
	});

	this._reset();

	this.on('open', this._onOpen);

	var self = this;
	var connectionManager = window.dofus.connectionManager;
	connectionManager.on('shopIAPArticlesSuccess', function (msg) {
		if (!self.content) {
			return;
		}
		self.displayHardCurrencyPack(msg);
	});

	connectionManager.on('shopIAPArticlesError', function (/*msg*/) {
		if (!self.content) {
			return;
		}
		self.displayError(ERROR_TYPES.NO_PACK, new Error('IAP articles are not available'));
	});
}
inherits(BuyHardCurrencyConfirmWindow, Window);
module.exports = BuyHardCurrencyConfirmWindow;


BuyHardCurrencyConfirmWindow.prototype._reset = function () {
	this.content = null;
	this.buyPackText = null;
	this.articleBoxContainer = null;
	this.articleBox = null;
	this.hardCurrencyAmountMissing = 0;
};

BuyHardCurrencyConfirmWindow.prototype._onOpen = function () {
	if (!this.content) { this._createContent(); }
};

BuyHardCurrencyConfirmWindow.prototype.freeContent = function () {
	this.windowBody.clearContent();
	this._reset();
};

BuyHardCurrencyConfirmWindow.prototype._createContent = function () {
	this.content = this.windowBody.createChild('div', { className: 'content' });
	var buyPackTextContainer = this.content.createChild('div', { className: 'buyPackTextContainer' });
	this.buyPackText = buyPackTextContainer.createChild('div', { className: 'buyPackText' });

	this.articleBoxContainer = this.content.createChild('div', { className: 'articleBoxContainer' });
	this.articleBox = this.articleBoxContainer.appendChild(new ArticleBox(null, {
		boxWidth: 190,
		boxHeight: 220
	}, {
		showTitle: true,
		showButtons: true,
		promoType: 'corner'
	}));
	this.content.appendChild(new Button({
		text: getText('tablet.shop.seeAllHardCurrencyPacks'),
		className: ['greenButton', 'seePacksBtn']
	}, function () {
		windowsManager.close('buyHardCurrencyConfirm');
		windowsManager.open('market', { tabId: 'shop', tabParams: { category: 'goultines' } });
	}));
};

/**
 * Opens the confirm shop window to confirm the buying of an article.
 * @param {number} hardCurrencyAmountMissing
 */
BuyHardCurrencyConfirmWindow.prototype.confirmBuy = function (hardCurrencyAmountMissing) {
	windowsManager.open(this.id);

	this.content.hide();
	this.windowBody.addClassNames('spinner');

	this.hardCurrencyAmountMissing = hardCurrencyAmountMissing;

	var self = this;
	shopHelper.getStoreInfos(function (error) {
		if (error) {
			return self.displayError(ERROR_TYPES.NO_PACK, error);
		}
		window.dofus.send('shopIAPArticlesRequest');
	});
};

BuyHardCurrencyConfirmWindow.prototype.displayError = function (type, error) {
	if (error) {
		console.error(error);
	}

	if (!this.content) {
		return;
	}

	this.content.show();
	this.articleBoxContainer.hide();
	this.windowBody.delClassNames('spinner');

	if (type === ERROR_TYPES.AMOUNT_TOO_HIGH) {
		this.buyPackText.setText(getText('tablet.shop.noHardCurrencyPackForAmount'));
	} else {
		this.buyPackText.setText(getText('tablet.shop.noHardCurrencyPack'));
	}
};

/**
 * @event BuyHardCurrencyConfirmWindow#shopIAPArticlesSuccess
 *
 * @param {object} msg          - shopIAPArticlesSuccess message
 * @param {array}  msg.articles - articles in the category
 */
BuyHardCurrencyConfirmWindow.prototype.displayHardCurrencyPack = function (msg) {
	var validArticles = shopHelper.validateArticles(msg.articles);
	var bestHardCurrencyPack = null;
	var lowestAmount = Number.MAX_VALUE;
	if (!validArticles.length) {
		return this.displayError(ERROR_TYPES.NO_PACK, new Error('No valid IAP ' + validArticles.length + ' out of ' +
			msg.articles.length + ' articles'));
	}
	for (var i = 0; i < validArticles.length; i++) {
		var article = validArticles[i];
		// Only pure Hard Currency IAP are looked up
		var reference = article.references.length === 1 && article.references[0];
		if (!reference || reference.type !== 'GOULTINE') {
			continue;
		}
		var quantity = parseInt(reference.quantity, 10);
		if (isNaN(quantity) || quantity < this.hardCurrencyAmountMissing) {
			continue;
		}
		if (quantity < lowestAmount) {
			lowestAmount = quantity;
			bestHardCurrencyPack = article;
		}
	}
	if (!bestHardCurrencyPack) {
		return this.displayError(ERROR_TYPES.AMOUNT_TOO_HIGH);
	}

	this.content.show();
	this.articleBoxContainer.show();
	this.windowBody.delClassNames('spinner');

	this.buyPackText.setText(getText('tablet.shop.buyHardCurrencyPack', lowestAmount));
	this.articleBox.update(bestHardCurrencyPack);

	this.articleBox.on('tapIAPButton', function () {
		windowsManager.close('buyHardCurrencyConfirm');
		shopHelper.purchaseArticleOnStore(bestHardCurrencyPack);
	});
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/BuyHardCurrencyConfirmWindow/index.js
 ** module id = 973
 ** module chunks = 0
 **/