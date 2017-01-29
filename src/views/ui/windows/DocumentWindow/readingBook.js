var DocumentBase = require('./DocumentBase.js');
var CSSParser = require('./CSSParser.js');
var inherits = require('util').inherits;
var Button = require('Button');
var MinMaxSelector = require('MinMaxSelector');
var assetPreloading = require('assetPreloading');
var playUiSound = require('audioManager').playUiSound;

var LINKPAGE = 'linkpage'; // For links to go to dedicated page

var BOOK_HEIGHT = 840; // Original height of the book
//var BOOK_WIDTH = 1170; // Original width of the book

function ReadingBook() {
	DocumentBase.call(this);

	this.setClassNames('ReadingBook');

	this.btnClose = this.appendChild(new Button({ className: 'btnClose' }));
	this.btnHome = this.appendChild(new Button({ className: 'btnHome' }));

	this.pageLeft = this.createChild('div', { className: ['page', 'pageLeft'] }); // Container
	this.pageRight = this.createChild('div', { className: ['page', 'pageRight'] }); // Container
	this.pageTitle = this.createChild('div', { className: ['pageTitle', 'page', 'pageRight'] }); // Container

	this.lblTitle = this.pageTitle.createChild('div', { className: 'lblTitle' });
	this.lblSubtitle = this.pageTitle.createChild('div', { className: 'lblSubtitle' });
	this.pageTitle.createChild('div', { className: 'bookOrnament' });
	this.lblAuthor = this.pageTitle.createChild('div', { className: 'lblAuthor' });
	this.txDeco = {};

	this.lblPageNumberLeft = this.appendChild(new Button({ className: ['pageNumber', 'left'] }));
	this.lblPageNumberRight = this.appendChild(new Button({ className: ['pageNumber', 'right'] }));

	this.btnPrevious = this.appendChild(new Button({ className: ['btnNav', 'previous'] }));
	this.btnNext = this.appendChild(new Button({ className: ['btnNav', 'next'] }));

	this._lastIndex = null; // index de la page sélectionnée (-1 : page titre) toujours impair
	this._currentIndex = null; // index de la page sélectionnée (-1 : page titre) toujours impair
	this._nbPages = null; // nombre total de pages

	this._styleSheet = new CSSParser();

	var self = this;
	var pageSelector = this.appendChild(new MinMaxSelector());

	this.btnClose.on('tap', function () {
		self.close();
	});

	this.btnHome.on('tap', function () {
		self._currentIndex = -1;
		self._updateButtons();
		self._updateBook();
		playUiSound('BACK_TO_BEGINNING_DOCUMENT');
	});

	this.btnPrevious.on('tap', function () {
		self._currentIndex -= 2;
		self._updateButtons();
		self._updateBook();
		playUiSound('TURN_PAGE_DOCUMENT_1');
	});

	this.btnNext.on('tap', function () {
		self._currentIndex += 2;
		self._updateButtons();
		self._updateBook();
		playUiSound('TURN_PAGE_DOCUMENT_2');
	});

	this.lblPageNumberLeft.on('tap', function () {
		pageSelector.setStyles({ left: '15%', right: 'initial' });
		pageSelector.open({ min: 1, max: self._nbPages + 1, placeholder: self._currentIndex + 1 });
	});

	this.lblPageNumberRight.on('tap', function () {
		pageSelector.setStyles({ right: '15%', left: 'initial' });
		pageSelector.open({ min: 1, max: self._nbPages + 1, placeholder: self._currentIndex + 2 });
	});

	pageSelector.on('confirm', function (index) {
		self._selectPage(parseInt(index, 10) - 2);
		playUiSound('TURN_PAGE_DOCUMENT_3');
	});
}

inherits(ReadingBook, DocumentBase);
module.exports = new ReadingBook();


ReadingBook.prototype.open = function (document) {
	// TODO: play the sound `SoundTypeEnum.DOCUMENT_OPEN`

	this._title = document.titleId;
	this._author = document.authorId;
	this._subTitle = document.subTitleId;


	if (document.contentCSS) {
		this._styleSheet.create(this._formatText(document.contentCSS), '.ReadingBook');
	}


	this._pages = document.contentId.split('<pagefeed/>');

	this._lastIndex	= -1;
	this._currentIndex = -1;
	this._nbPages = this._pages.length;

	this._initBook();

	var images = this._getAllImagesData(document.contentId);
	this.imageMap = {};

	var imagesSrc = images.map(function (image) {
		return image.imageId;
	});

	this.show();
	var self = this;

	assetPreloading.preloadImageUrls(imagesSrc, function (src) {
		for (var i = 0; i < images.length; i++) {
			self.imageMap[images[i].imageId] = src[i];
		}
		self._selectPage(self._currentIndex);
	});
};


ReadingBook.prototype.close = function () {
	this._clearPages();
	// TODO: play the sound `SoundTypeEnum.DOCUMENT_CLOSE`
	this.hide();
	this._styleSheet.destroy();
	DocumentBase.prototype.close.call(this);
};

/**
 * Clean the pages
 * (Based on clearTextures)
 * @param {string} [pPage] - left, right, all
 */
ReadingBook.prototype._clearPages = function (pPage) {
	if (!pPage || pPage === 'left') {
		this.pageLeft.clearContent();
	}
	if (!pPage || pPage === 'right') {
		this.pageRight.clearContent();
	}
};


ReadingBook.prototype._initBook = function () {
	this.lblTitle.setHtml(this._title);
	this.lblSubtitle.setHtml(this._subTitle);
	this.lblAuthor.setHtml(this._author || '');
};


ReadingBook.prototype._updateBook = function ()  {
	var isFront = this._currentIndex === -1;

	this.pageTitle.toggleDisplay(isFront);
	this.pageRight.toggleDisplay(!isFront);

	this.lblPageNumberLeft.toggleDisplay(!isFront);
	this.lblPageNumberRight.show();

	this._clearPages();

	if (isFront) {
		/*
		if (this._lastIndex > 2) {
			//TODO: play sound `SoundTypeEnum.DOCUMENT_BACK_FIRST_PAGE`
		} else {
			//TODO: play sound `SoundTypeEnum.DOCUMENT_TURN_PAGE`
		}
		*/
		this._updatePageLeft();
		this.lblPageNumberRight.setText(this._currentIndex + 2);
	} else {
		//TODO: play sound `SoundTypeEnum.DOCUMENT_TURN_PAGE`

		this._updatePageLeft();
		this._updatePageRight();
	}

	this._lastIndex = this._currentIndex;
};


ReadingBook.prototype._updatePageLeft = function () {
	var text = '';
	if (this._styleSheet && this._currentIndex !== -1) {
		text = this._formatText(this._pages[this._currentIndex - 1]);
	} else {
		text = this._pages[this._currentIndex - 1] || '';
	}

	this._insertContent(this.pageLeft, text);

	this.lblPageNumberLeft.setText(this._currentIndex + 1);
};

ReadingBook.prototype._updatePageRight = function () {
	if (this._currentIndex < this._nbPages) {
		if (!this.pageRight.isVisible()) {
			this.pageRight.show();
		}

		var text = '';
		if (this._styleSheet && this._currentIndex !== -1) {
			text = this._formatText(this._pages[this._currentIndex]);
		} else {
			text = this._pages[this._currentIndex];
		}

		this._insertContent(this.pageRight, text);

		this.lblPageNumberRight.setText(this._currentIndex + 2);
	} else {
		this.pageRight.hide();
		this.lblPageNumberRight.setText('');
	}
};

/**
 * Update visibility of the buttons based on the current page
 * @private
 */
ReadingBook.prototype._updateButtons = function () {
	var isFirstPage = this._currentIndex === -1;
	var isLastPage = this._currentIndex + 1 >= this._nbPages;

	this.btnHome.toggleDisplay(!isFirstPage);
	this.btnPrevious.toggleDisplay(!isFirstPage);
	this.btnNext.toggleDisplay(!isLastPage);
};

/**
 * Go to the selected page
 * @param {number} index
 * @private
 */
ReadingBook.prototype._selectPage = function (index) {
	this._currentIndex = ((index % 2) ? index : index + 1);

	this._updateButtons();
	this._updateBook();
};


ReadingBook.prototype._linkHandler = function (textEvent) {
	if (textEvent.indexOf(LINKPAGE) !== -1) {
		var index = parseInt(textEvent.substr(LINKPAGE.length), 10);
		return this._selectPage(index);
	}

	DocumentBase.prototype._linkHandler.call(this, textEvent);
};


/**
 * Parse the html of a page
 * (Based on getBitmap)
 * @param {WuiDom} lbl
 * @param {string} str - Html string
 * @private
 */
ReadingBook.prototype._insertContent = function (lbl, str) {
	var images = this._getAllImagesData(str);

	if (!images.length) {
		lbl.appendChild(this._formatLinks(str));
	} else {
		for (var i = 0; i < images.length; i++) {
			var image = images[i];

			if (image.before) {
				lbl.appendChild(this._formatLinks(image.before));
			}

			// add image
			this._addTextureOnPage(lbl, image);

			// remove text + img from string
			str = str.replace(image.regExpResult, '');
		}

		// Left other text
		if (str) {
			lbl.appendChild(this._formatLinks(str));
		}
	}
};

/**
 * Add the image on the page
 * @param {WuiDom} page
 * @param {Object} textureData
 * @private
 */
ReadingBook.prototype._addTextureOnPage = function (page, textureData) {
	var img = page.createChild('div', { className: 'image' });

	var currentHeight = parseInt(this.getComputedStyle('height'), 10);
	var calculatedHeight = (textureData.height / BOOK_HEIGHT) * currentHeight;

	var styles = {
		height: calculatedHeight + 'px',
		width: '100%',
		backgroundImage: 'url(' + this.imageMap[textureData.imageId] + ')'
	};

	if (textureData.align === 'center') {
		styles.backgroundPosition = textureData.align;
	}

	img.setStyles(styles);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/DocumentWindow/readingBook.js
 ** module id = 714
 ** module chunks = 0
 **/