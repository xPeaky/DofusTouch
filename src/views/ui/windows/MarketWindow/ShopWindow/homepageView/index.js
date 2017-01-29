require('./styles.less');
var inherits          = require('util').inherits;
var WuiDom            = require('wuidom');
var ArticleBox        = require('../articleBox');
var CurrencyCodesEnum = require('CurrencyCodesEnum');
var tapBehavior       = require('tapBehavior');

var IMAGE_950_531_INDEX = 6;
var MIN_BOX_MARGIN = 5;
var MIN_BOX_TOP_MARGIN = 8;
var BOX_WIDTH = 155;
var BOX_HEIGHT = 200;
var MAX_ARTICLE_BOX_RATIO = 1;
var ARTICLE_BOX_WIDTH_RATIO = BOX_WIDTH / BOX_HEIGHT;

function HomepageView() {
	WuiDom.call(this, 'div', { className: 'homepageView' });

	this.highlightArticleBox = null;
	this.highlightCarouselArticle = null;

	this._createDom();
}
inherits(HomepageView, WuiDom);
module.exports = HomepageView;

HomepageView.prototype.clear = function () {
	if (this.highlightArticleBox) {
		this.highlightArticleBox.clear();
		this.highlightArticleBox = null;
	}

	var articleBoxes = this.gondolaHead.getChildren();
	for (var i = 0; i < articleBoxes.length; i++) {
		articleBoxes[i].clear();
	}

	this.highlightCarouselArticle = null;

	this.highlightCarouselImage.hide();
	this.highlightImage.clearContent();
	this.gondolaHead.clearContent();
};

HomepageView.prototype._createDom = function () {
	var self = this;

	var highlights = this.createChild('div', { className: 'highlights' });
	this.gondolaHead = this.createChild('div', { className: 'gondolaHead' });

	var highlightCarousel = highlights.createChild('div', { className: 'highlightCarousel' });
	this.highlightCarouselImage = highlightCarousel.createChild('div', { className: 'highlightCarouselImage' });
	this.highlightCarouselImage.hide();
	tapBehavior(highlightCarousel);
	highlightCarousel.on('tap', function () {
		if (self.highlightCarouselArticle) {
			self.emit('displayItemDetails', self.highlightCarouselArticle.id);
		}
	});
	this.highlightImage = highlights.createChild('div', { className: 'highlightImage' });
};

HomepageView.prototype.resize = function (/*viewContainer*/) {
};

function computeBoxSize(containerWidth, containerHeight) {
	return {
		boxWidth: containerWidth,
		boxHeight: containerHeight
	};
}

HomepageView.prototype.update = function (viewData) {
	this.emit('hideSubCategoryRow');

	if (!viewData) {
		return;
	}

	this.clear();

	// Highlight carousel (top-left)
	var highlightCarousel = viewData.highlightCarousel;
	var isHighlightCarouselVisible = false;
	if (highlightCarousel) {
		var highlightBanner = highlightCarousel.image;
		if (highlightBanner.length > IMAGE_950_531_INDEX) {
			isHighlightCarouselVisible = true;
			this.highlightCarouselArticle = viewData.highlightCarouselArticle;
			this.highlightCarouselImage.setStyle('backgroundImage', 'url(' + highlightBanner[IMAGE_950_531_INDEX].url + ')');
		}
	}
	this.highlightCarouselImage.toggleDisplay(isHighlightCarouselVisible);

	var self = this;
	function purchaseIAPItem() {
		self.emit('purchaseIAP', this.articleId);
	}
	function purchaseItemWithHard() {
		self.emit('purchaseOnAnkama', this.articleId, CurrencyCodesEnum.GOULTINE);
	}
	function purchaseItemWithSoft() {
		self.emit('purchaseOnAnkama', this.articleId, CurrencyCodesEnum.KAMA);
	}
	function seeItem() {
		self.emit('displayItemDetails', this.articleId);
	}

	function createArticleBox(article, size, options) {
		options = options || {};
		options.canTapImage = true;
		options.showButtons = options.showButtons === undefined ? true : options.showButtons;
		options.showTitle   = options.showTitle   === undefined ? true : options.showTitle;
		var box = new ArticleBox(article, size, options);
		box.on('tapIAPButton', purchaseIAPItem);
		box.on('tapHardButton', purchaseItemWithHard);
		box.on('tapSoftButton', purchaseItemWithSoft);
		box.on('tapItemImage', seeItem);
		return box;
	}

	// Highlight image (top-right)
	var highlightImageArticle = viewData.highlightImageArticle;
	var articleBox;
	var boxSize;
	if (!highlightImageArticle) {
		this.highlightImage.hide();
	} else {
		// TODO: Create once and update
		this.highlightImage.show();
		var highlightImageRect = this.highlightImage.rootElement.getBoundingClientRect();
		boxSize = computeBoxSize(highlightImageRect.width, highlightImageRect.height);
		this.highlightArticleBox = createArticleBox(highlightImageArticle, boxSize, { promoType: 'banner' });
		this.highlightImage.appendChild(this.highlightArticleBox);
	}

	// Gondolahead articles
	var gondolaHeadArticles = viewData.gondolaHeadArticles;
	if (!gondolaHeadArticles) {
		// Nothing left to load in the homepage, update is done
		return;
	}

	var gondolaHeadRect = this.gondolaHead.rootElement.getBoundingClientRect();
	var gondolaHeadWidth = ~~gondolaHeadRect.width + MIN_BOX_MARGIN * 2;
	var boxHeight = ~~gondolaHeadRect.height - MIN_BOX_TOP_MARGIN;
	var boxWidth = ~~(boxHeight * ARTICLE_BOX_WIDTH_RATIO) + MIN_BOX_MARGIN * 2;
	var maxArticlesInGondolaHead = Math.min(gondolaHeadArticles.length, ~~(gondolaHeadWidth / boxWidth));
	var remainingSpace = gondolaHeadWidth - boxWidth * maxArticlesInGondolaHead;
	var boxWidthIncrement = ~~(remainingSpace / maxArticlesInGondolaHead);
	var maximalBoxWidth = boxWidth + boxWidthIncrement;
	if (maximalBoxWidth / boxHeight > MAX_ARTICLE_BOX_RATIO) {
		boxWidth = boxHeight * MAX_ARTICLE_BOX_RATIO - MIN_BOX_MARGIN * 2;
	} else {
		boxWidth = maximalBoxWidth - MIN_BOX_MARGIN * 2;
	}
	boxSize = computeBoxSize(boxWidth, boxHeight);

	for (var i = 0; i < maxArticlesInGondolaHead; i++) {
		articleBox = createArticleBox(gondolaHeadArticles[i], boxSize, { promoType: 'corner' });
		this.gondolaHead.appendChild(articleBox);
	}
};

HomepageView.prototype.updateArticlesPrices = function (articlesMap) {
	var articleBoxes = this.gondolaHead.getChildren();
	if (this.highlightArticleBox) {
		articleBoxes.push(this.highlightArticleBox);
	}
	for (var i = 0; i < articleBoxes.length; i++) {
		var articleBox = articleBoxes[i];
		var articleId = articleBox.articleId;
		if (!articleId) {
			continue;
		}
		var article = articlesMap[articleId];
		if (!article) {
			console.error(new Error('Article ' + articleId + ' missing for an ArticleBox'));
			continue;
		}
		articleBox.updatePrice(article);
	}
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/MarketWindow/ShopWindow/homepageView/index.js
 ** module id = 966
 ** module chunks = 0
 **/