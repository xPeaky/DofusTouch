require('./styles.less');
var inherits          = require('util').inherits;
var WuiDom            = require('wuidom');
var helper            = require('helper');
var Button            = require('Button');
var DofusButton       = Button.DofusButton;
var getText           = require('getText').getText;

var BIG_PRICE = 1000000;
var LOW_PRICE = 1000;

function ArticleButtons(article, size) {
	WuiDom.call(this, 'div', { className: 'priceButtonsBox' });

	this._createDom();

	if (article) {
		this.update(article);
	}

	if (size) {
		this.resize(size);
	}
}
inherits(ArticleButtons, WuiDom);
module.exports = ArticleButtons;

function onTapEmit(label) {
	this.emit(label);
}

ArticleButtons.prototype._createDom = function () {
	// Price buttons to buy article
	this.createChild('div', { className: 'priceBorder' });

	var priceButtons = this.priceButtons = this.createChild('div', { className: 'priceButtons' });

	function createPriceButton(clickAction, className) {
		var classNames = className ? ['priceButton', className] : 'priceButton';
		var button = priceButtons.appendChild(
			new DofusButton('', { className: classNames }, clickAction)
		);
		var prices = button.createChild('div', { className: 'prices' });
		var originalPrice = prices.createChild('div', { className: 'original' });
		button.originalPriceText = originalPrice.createChild('div', { className: 'text' });
		originalPrice.createChild('div', { className: 'icon' });
		var currentPrice = prices.createChild('div', { className: 'current' });
		button.currentPriceText = currentPrice.createChild('div', { className: 'text' });
		currentPrice.createChild('div', { className: 'icon' });
		return button;
	}

	this.iapButton = createPriceButton(onTapEmit.bind(this, 'tapIAPButton'));
	this.hardButton = createPriceButton(onTapEmit.bind(this, 'tapHardButton'), 'hard');
	this.softButton = createPriceButton(onTapEmit.bind(this, 'tapSoftButton'), 'soft');
};

function setButtonPrice(button, currentPrice, originalPrice, isIAP) {
	var priceString;
	button.toggleClassName('iap', !!isIAP);
	// For IAP, current price comes from the app store and is already formatted
	if (isIAP) {
		button.delClassNames(['unavailable']);
		button.currentPriceText.setText(currentPrice);
		// TODO: Use product.priceMicros to determine if it's a big price
	} else {
		button.toggleClassName('unavailable', !currentPrice);
		if (!currentPrice) {
			button.currentPriceText.setText(getText('ui.item.averageprice.unavailable'));
			button.replaceClassNames(['lowPrice'], ['bigPrice']);
			button.disable();
		} else {
			button.currentPriceText.setText(helper.kamasToString(currentPrice, ''));
			if (currentPrice >= BIG_PRICE) {
				button.replaceClassNames(['lowPrice'], ['bigPrice']);
			} else if (currentPrice < LOW_PRICE) {
				button.replaceClassNames(['bigPrice'], ['lowPrice']);
			} else {
				button.delClassNames(['lowPrice', 'bigPrice']);
			}
			button.enable();
			if (originalPrice) {
				priceString = helper.kamasToString(originalPrice, '');
				button.originalPriceText.setText(priceString);
			}
		}
	}
}

ArticleButtons.prototype.update = function (article) {
	// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
	this.articleId = article.id;

	var originalPrice = article.original_price;
	var product = article.product;
	if (product) {
		this.hardButton.hide();
		this.softButton.hide();

		setButtonPrice(this.iapButton, product.price, originalPrice, true);

		this.iapButton.show();
	} else {
		this.iapButton.hide();

		this.priceButtons.toggleClassName('promo', !!originalPrice);

		setButtonPrice(this.hardButton, article.price, originalPrice);
		setButtonPrice(this.softButton, article._softPrice, article._softOriginalPrice);

		this.hardButton.show();
		this.softButton.show();
	}
};

ArticleButtons.prototype.resize = function (/*size*/) {
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/MarketWindow/ShopWindow/articleButtons/index.js
 ** module id = 959
 ** module chunks = 0
 **/