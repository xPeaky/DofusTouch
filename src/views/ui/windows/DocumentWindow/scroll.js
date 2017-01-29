var inherits = require('util').inherits;
var DocumentBase = require('./DocumentBase.js');
var Button = require('Button');
var CSSParser = require('./CSSParser.js');
var assetPreloading = require('assetPreloading');

var EXP_TAG = /(<[a-zA-Z]+\s*[^>]*>)+([^<].*?)/gi; // parse documents

var SCROLL_HEIGHT = 829; // Original height of the scroll
var SCROLL_WIDTH = 1150; // Original width of the scroll

function Scroll() {
	DocumentBase.call(this, { className: 'Scroll' });

	this.setClassNames('Scroll');

	this.btnClose = this.appendChild(new Button({ className: 'btnClose' }));
	this.lblTitle = this.createChild('div', { className: 'lblTitle' });
	this.createChild('div', { className: 'scrollOrnament' });
	this.lblContent = this.createChild('div', { className: 'lblContent' });
	this.txIllu = this.createChild('div', { className: 'scrollImage' });

	this._image = null;

	this._illuUri = null;

	this._styleSheet = new CSSParser();

	this._hasText = true;

	var self = this;

	this.btnClose.on('tap', function () {
		self.close();
	});
}

inherits(Scroll, DocumentBase);
module.exports = new Scroll();

Scroll.prototype.open = function (document) {
	this._title = document.titleId;
	this._page = document.contentId;
	this._image = this._getImageData(this._page);

	if (this._page) {
		if (document.contentCSS) {
			this._styleSheet.create(this._formatText(document.contentCSS), '.Scroll');
		}
		this._preInitData();
	} else {
		// Scroll may not exist
		// Based on original this might happen
		console.warn('Scroll does not exist', document.id);
		return this.close();
	}

	this.show();
};

/**
 * Check if this is a document with text
 * @param {string} page
 * @return {boolean}
 */
function documentHasText(page) {
	var data = new RegExp(EXP_TAG).exec(page);
	return data !== null;
}

Scroll.prototype._preInitData = function () {
	// if we have text in the document
	this._hasText = documentHasText(this._page);

	if (!this._image) {
		this._initScroll();
		return;
	}

	var self = this;
	assetPreloading.preloadImageUrl(this._image.imageId, function (src) {
		// Making sure image still exists, scroll could have been removed while image was loading
		if (self._image) {
			self._image.src = src;
			self._initScroll();
		}
	});
};

Scroll.prototype.close = function () {
	this.hide();
	this.lblTitle.clearContent();
	this.lblContent.clearContent();
	this._image = null;
	this.txIllu.setStyle('backgroundImage', '');
	this._styleSheet.destroy();
	DocumentBase.prototype.close.call(this);
};

function createImageStyle(image) {
	var currentWidth = parseInt(this.getComputedStyle('width'), 10);
	var currentHeight = parseInt(this.getComputedStyle('height'), 10);
	var calculatedWidth = (image.height || 539 / SCROLL_WIDTH) * currentWidth;
	var calculatedHeight = (image.width || 354 / SCROLL_HEIGHT) * currentHeight;

	var styles = {
		backgroundImage: 'url(' + image.src + ')',
		backgroundSize: calculatedWidth + 'px ' + calculatedHeight + 'px'
	};
	return styles;
}

/**
 * Initialise les différents composants du parchemin
 */
Scroll.prototype._initScroll = function () {
	// titre
	var styles;
	this.lblTitle.setHtml(this._title);

	var text = '';
	if (this._styleSheet) {
		text = this._formatText(this._page);
	} else {
		text = this._page;
	}

	this.lblContent.clearContent();

	if (!this._hasText && this._image) {
		// No text on scroll
		this.lblContent.hide();
		styles = createImageStyle.call(this, this._image);
		styles.backgroundPosition = 'center center';
		styles.width = '100%';
		this.txIllu.setStyles(styles);
	} else {
		this.lblContent.show();

		var hasImage = !!this._image;

		// image
		this.lblContent.toggleClassName('small', hasImage);
		this.txIllu.toggleDisplay(hasImage);

		// default size
		if (hasImage) {
			text = text.replace(this._image.regExpResult, '');
			styles = createImageStyle.call(this, this._image);
			styles.width = '';
			this.txIllu.setStyles(styles);
		}

		this.lblContent.appendChild(this._formatLinks(text));
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/DocumentWindow/scroll.js
 ** module id = 711
 ** module chunks = 0
 **/