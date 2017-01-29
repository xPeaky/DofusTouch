require('./styles.less');
var inherits       = require('util').inherits;
var WuiDom         = require('wuidom');
var tapBehavior    = require('tapBehavior');
var getText        = require('getText').getText;
var ArticleButtons = require('./../articleButtons');
var Countdown      = require('./../countdown.js');

var IMAGE_200_200_INDEX = 1;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** ArticleBox constructor
 *
 * @param {Object}  [article]                 - enriched Article structure returned by Haapi
 * @param {Object}  [size]                    - size object for the box and the slot
 * @param {Object}  [options]                 - ArticleBox creation options
 * @param {boolean} [options.canTapImage]     - activate tap on image
 * @param {string}  [options.promoType]       - define how a sale is displayed: as a banner, corner or strip
 * @param {boolean} [options.showButtons]     - display price buttons to buy the article
 * @param {boolean} [options.showDescription] - display description of the article
 * @param {boolean} [options.showTitle]       - display title of the article
 */
function ArticleBox(article, size, options) {
	WuiDom.call(this, 'div', { className: 'box' });

	this.options = options || {};
	this._createDom();

	if (article) {
		this.update(article);
	}

	if (size) {
		this.resize(size);
	}
}
inherits(ArticleBox, WuiDom);
module.exports = ArticleBox;

function emitTapItemImage() {
	this.emit('tapItemImage');
}

ArticleBox.prototype._createDom = function () {
	var self = this;
	var options = this.options;

	// Slot with article image
	var slot = this.createChild('div', { className: 'slot' });
	slot.createChild('div', { className: 'slotBackground' });
	var slotIllu = slot.createChild('div', { className: 'slotIllu' });
	this.slotImg = slotIllu.createChild('div', { className: 'slotImg' });

	if (options.showDescription) {
		this.description = slot.createChild('div', { className: 'description' });
	}

	slot.createChild('div', { className: 'slotBorder' });

	if (options.canTapImage) {
		tapBehavior(slot);
		slot.on('tap', emitTapItemImage.bind(this));
	}

	// Title of the article
	if (options.showTitle) {
		this.title = this.createChild('div', { className: 'title' });
	}

	// Price buttons to buy article
	if (options.showButtons) {
		var articleButtons = this._articleButtons = this.appendChild(new ArticleButtons());
		articleButtons.on('tapIAPButton', function () {
			self.emit('tapIAPButton');
		});
		articleButtons.on('tapHardButton', function () {
			self.emit('tapHardButton');
		});
		articleButtons.on('tapSoftButton', function () {
			self.emit('tapSoftButton');
		});
	}

	// Promotions related DOM
	if (options.promoType === 'banner') {
		this._promoBanner = slot.createChild('div', { className: 'promoBanner' });
	} else if (options.promoType === 'corner') {
		var promoCorner = this._promoCorner = slot.createChild('div', { className: 'promoCorner' });
		promoCorner.createChild('div', { className: 'promoDummy' });
		var promoElement = promoCorner.createChild('div', { className: 'promoElement' });
		promoElement.createChild('div', { className: 'margin' });
		var rotatedContainer = promoElement.createChild('div', { className: 'rotatedContainer' });
		this._promoRate = rotatedContainer.createChild('div', { className: 'text' });
	} else if (options.promoType === 'strip') {
		this._promoStrip = this.createChild('div', { className: 'promoStrip' });
	}
};

ArticleBox.prototype.clear = function () {
	if (this.countdown) {
		this.countdown.clear();
	}
};

function getImage(article) {
	if (article.promo.length === 1 && article.promo[0].image) {
		return article.promo[0].image;
	} else if (article.image.length > IMAGE_200_200_INDEX) {
		return article.image[IMAGE_200_200_INDEX].url;
	}
	return null;
}

function getShortPromoText(article) {
	var promoRate = article._promoRate;
	return promoRate ? promoRate : getText('tablet.shop.offer');
}

ArticleBox.prototype.update = function (article) {
	// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
	var options = this.options;

	this.articleId = article.id;
	var image = getImage(article);
	this.slotImg.setStyle('backgroundImage', image ? ('url(' + image + ')') : 'none');

	var promoType = options.promoType;
	var promoRate;
	var hasPromo;
	if (promoType === 'banner') {
		var endDate = article.enddate;
		this._promoBanner.toggleDisplay(!!endDate);

		if (endDate) {
			var self = this;
			if (this.countdown) {
				this.countdown.clear();
			}
			this.countdown = new Countdown(new Date(endDate), function (error, time, formattedTime) {
				if (error) {
					return console.error(error);
				}
				self._promoBanner.setText(getText('tablet.shop.promo.banner', formattedTime).toUpperCase());
			}, function () {
				self._promoBanner.hide();
			});
		}
	} else if (promoType === 'corner') {
		promoRate = article._promoRate;
		hasPromo = !!(promoRate || article.promo.length || article.enddate);

		this._promoCorner.toggleDisplay(hasPromo);

		if (hasPromo) {
			this._promoRate.setText(getShortPromoText(article));
		}
	} else if (promoType === 'strip') {
		promoRate = article._promoRate;
		hasPromo = !!(promoRate || article.promo.length || article.enddate);

		this._promoStrip.toggleDisplay(hasPromo);

		if (hasPromo) {
			this._promoStrip.setText(getShortPromoText(article));
		}
	}

	if (options.showTitle) {
		this.title.setText(article.name);
	}

	this.updatePrice(article);

	if (options.showDescription) {
		this.description.setHtml(article.description);
	}
};

ArticleBox.prototype.updatePrice = function (article) {
	if (this.options.showButtons) {
		this._articleButtons.update(article);
	}
};

ArticleBox.prototype.resize = function (size) {
	this.setStyles({ width: size.boxWidth + 'px', height: size.boxHeight + 'px' });

	if (this.options.showButtons) {
		this._articleButtons.resize(size);
	}
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/MarketWindow/ShopWindow/articleBox/index.js
 ** module id = 957
 ** module chunks = 0
 **/