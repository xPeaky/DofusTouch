require('./styles.less');
var inherits          = require('util').inherits;
var getText           = require('getText').getText;
var WuiDom            = require('wuidom');
var Scroller          = require('Scroller');
var ArticleBox        = require('../articleBox');
var CurrencyCodesEnum = require('CurrencyCodesEnum');

var MIN_ARTICLES_PER_LINE = 2;
var MIN_ARTICLES_PER_COLUMN = 1;

var SCROLLBAR_SPACE = 9;
var VIEW_CONTAINER_PADDING = 0;
var MIN_BOX_TOP_MARGIN = 11;
var MIN_BOX_SIDE_MARGIN = 9;
var BOX_WIDTH = 155;
var BOX_HEIGHT = 200;
var INITIAL_BOX_HEIGHT = BOX_HEIGHT + MIN_BOX_TOP_MARGIN;
var LOAD_CONTENT_WIDTH = 40;

var DEFAULT_CONSTRAINT_VALUES = {
	lines: null,
	columns: null,
	promoType: 'corner',
	showArticleDescription: false,
	canTapImage: true
};

function ItemsListView() {
	WuiDom.call(this, 'div', { className: 'itemsListView' });

	this.articlesPerLine = MIN_ARTICLES_PER_LINE;
	this.articlesPerColumn = MIN_ARTICLES_PER_COLUMN;

	this._isAdditionalContentLoading = false;

	this._boxHeight = BOX_HEIGHT;
	this._boxWidth = BOX_WIDTH;
	this._scrollMargin = 0;

	this.constraints = {};
	this.setConstraints(DEFAULT_CONSTRAINT_VALUES);

	this._createDom();
}
inherits(ItemsListView, WuiDom);
module.exports = ItemsListView;

ItemsListView.prototype.clear = function () {
	var articleBoxes = this._getArticleBoxes();
	for (var i = 0; i < articleBoxes.length; i++) {
		articleBoxes[i].clear();
	}
};

ItemsListView.prototype._createDom = function () {
	var self = this;

	this._itemsScroll = this.appendChild(new Scroller({ className: 'scroll' }, { isHorizontal: true }));
	this._itemsList = this._itemsScroll.content.createChild('div', { className: 'itemsList' });
	for (var i = 0; i < this.articlesPerColumn; i++) {
		this._itemsList.createChild('div', { className: 'itemsLine' });
	}

	this._loadContent = this._itemsScroll.content.createChild('div', { className: 'loadContent' });
	this._loadContent.hide();
	this._noResultMessage = this._itemsScroll.content.createChild('div', { className: 'rightLabel' });
	this._noResultMessageText = this._noResultMessage.createChild('div', { className: 'text' });
	this._noResultMessage.hide();

	this._itemsScroll.on('scrollEnd', function () {
		if (self._isAdditionalContentLoading || !self._loadContent.isVisible()) {
			return;
		}
		if (Math.abs(this.iScroll.maxScrollX - this.iScroll.x) < LOAD_CONTENT_WIDTH) {
			self.emit('loadAdditionalContent');
		}
	});
};

ItemsListView.prototype.update = function (/*viewData*/) {
};

ItemsListView.prototype.resize = function (viewContainer) {
	this._computeMargins(viewContainer);

	// Resize articles
	var items = this._getItemsMap();
	var size = this.getArticleBoxSize();
	for (var id in items) {
		items[id].resize(size);
	}
	this._itemsScroll.refresh();

	this.emit('nbArticlesVisibleUpdated', (this.articlesPerLine + 1) * this.articlesPerColumn);
};

ItemsListView.prototype.getArticleBoxSize = function () {
	return {
		boxWidth: this._boxWidth,
		boxHeight: this._boxHeight
	};
};

ItemsListView.prototype.setConstraints = function (constraints) {
	constraints = constraints || DEFAULT_CONSTRAINT_VALUES;
	var hasConstraintsChanged = false;
	for (var key in DEFAULT_CONSTRAINT_VALUES) {
		var value = constraints.hasOwnProperty(key) ? constraints[key] : DEFAULT_CONSTRAINT_VALUES[key];
		if (this.constraints[key] !== constraints[key]) {
			this.constraints[key] = value;
			hasConstraintsChanged = true;
		}
	}
	return hasConstraintsChanged;
};

ItemsListView.prototype.addArticles = function (validArticles, isLastPage) {
	this.setSpinnerVisible(false);
	this.setLoadingAdditionalContent(false);
	this._loadContent.toggleDisplay(!isLastPage);
	this._addArticles(validArticles);
};

// TODO: From ShopWindow

ItemsListView.prototype.showNoResult = function (categoryName) {
	this.clearItems();
	var noResultText;
	if (categoryName) {
		noResultText = getText('ui.search.noResultFor', categoryName);
	} else {
		noResultText = getText('ui.search.noResult');
	}
	this._noResultMessageText.setText(noResultText);
	this._noResultMessage.show();
};

ItemsListView.prototype._addArticles = function (articles) {
	var lineIndex = 0;
	var lines = this._itemsList.getChildren();
	var numberOfLines = lines.length;
	var size = this.getArticleBoxSize();

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

	var options = {
		showButtons: true,
		showTitle: true,
		promoType: this.constraints.promoType,
		showDescription: this.constraints.showArticleDescription,
		canTapImage: this.constraints.canTapImage
	};
	for (var i = 0; i < articles.length; i++) {
		var box = new ArticleBox(articles[i], size, options);
		box.on('tapIAPButton', purchaseIAPItem);
		box.on('tapHardButton', purchaseItemWithHard);
		box.on('tapSoftButton', purchaseItemWithSoft);
		box.on('tapItemImage', seeItem);
		lines[lineIndex % numberOfLines].appendChild(box);
		lineIndex++;
	}
	this._itemsScroll.refresh();
};

ItemsListView.prototype.setLoadingAdditionalContent = function (isLoading) {
	this._isAdditionalContentLoading = isLoading;
	if (isLoading) {
		this._loadContent.addClassNames('spinner');
		this._loadContent.delClassNames('showArrow');
	} else {
		this._loadContent.delClassNames('spinner');
		this._loadContent.addClassNames('showArrow');
	}
};

ItemsListView.prototype.setSpinnerVisible = function (isVisible) {
	if (isVisible) {
		this._itemsScroll.addClassNames('spinner');
	} else {
		this._itemsScroll.delClassNames('spinner');
	}
};

ItemsListView.prototype.clearItems = function () {
	this.setSpinnerVisible(false);
	this.setLoadingAdditionalContent(false);

	var itemsLine = this._itemsList.getChildren();
	for (var i = 0; i < itemsLine.length; i++) {
		itemsLine[i].clearContent();
	}
	this._loadContent.hide();
	this._noResultMessage.hide();
	this._itemsScroll.refresh();
	this._itemsScroll.goToTop();
};

ItemsListView.prototype._setNumberOfLines = function (numberOfLines) {
	if (numberOfLines === this.articlesPerColumn) {
		return;
	}
	this.articlesPerColumn = numberOfLines;

	// Adapt number of lines in the list and restore content if any
	var i;
	var itemsToRestore = [];
	var lines = this._itemsList.getChildren();
	var nbLinesToRemove = lines.length - numberOfLines;
	for (i = 0; i < lines.length; i++) {
		var line = lines[i];
		var items = line.getChildren();
		for (var j = 0; j < items.length; j++) {
			itemsToRestore.push(line.removeChild(items[j]));
		}
		if (nbLinesToRemove > 0) {
			line.destroy();
			nbLinesToRemove--;
		}
	}
	if (lines.length < numberOfLines) {
		var nbLinesToAdd = numberOfLines - lines.length;
		for (i = 0; i < nbLinesToAdd; i++) {
			this._itemsList.createChild('div', { className: 'itemsLine' });
		}
	}
	if (!itemsToRestore.length) {
		return;
	}
	lines = this._itemsList.getChildren();
	for (i = 0; i < itemsToRestore.length; i++) {
		lines[i % numberOfLines].appendChild(itemsToRestore[i]);
	}
};

ItemsListView.prototype._computeMargins = function (viewContainer) {
	var constraints = this.constraints;
	var viewContainerRect = viewContainer.rootElement.getBoundingClientRect();
	var scrollWidth = viewContainerRect.width - VIEW_CONTAINER_PADDING * 2;
	var scrollHeight = viewContainerRect.height - (VIEW_CONTAINER_PADDING * 2 + SCROLLBAR_SPACE);
	var articlesPerColumn = constraints.lines || Math.max(MIN_ARTICLES_PER_COLUMN, ~~(scrollHeight / INITIAL_BOX_HEIGHT));
	var remainingSpace = scrollHeight - INITIAL_BOX_HEIGHT * articlesPerColumn;
	var boxSizeIncrement = ~~(remainingSpace / articlesPerColumn);
	this._boxHeight = BOX_HEIGHT + boxSizeIncrement;
	if (constraints.columns) {
		var remainingWidth = scrollWidth - (BOX_WIDTH + MIN_BOX_SIDE_MARGIN * 2) * constraints.columns;
		var boxWidthIncrement = ~~(remainingWidth / constraints.columns);
		this._boxWidth = BOX_WIDTH + boxWidthIncrement;
	} else {
		this._boxWidth = BOX_WIDTH + boxSizeIncrement;
	}
	var fullBoxHeight = this._boxHeight + MIN_BOX_TOP_MARGIN;
	var fullBoxWidth = this._boxWidth + MIN_BOX_SIDE_MARGIN * 2;
	this.articlesPerLine = constraints.columns || Math.max(MIN_ARTICLES_PER_LINE, ~~(scrollWidth / fullBoxWidth));
	remainingSpace = scrollHeight - fullBoxHeight * articlesPerColumn;

	if (remainingSpace > 1) {
		this._scrollMargin = ~~(remainingSpace * 0.5);
		this._itemsScroll.setStyles({
			'margin-top': this._scrollMargin + 'px',
			'margin-bottom': this._scrollMargin + 'px'
		});
	}
	this._setNumberOfLines(articlesPerColumn);
	this._itemsScroll.refresh();
};

ItemsListView.prototype._getArticleBoxes = function () {
	var articleBoxes = [];
	var lines = this._itemsList.getChildren();
	for (var i = 0; i < lines.length; i++) {
		articleBoxes = articleBoxes.concat(lines[i].getChildren());
	}
	return articleBoxes;
};

ItemsListView.prototype.updateArticlesPrices = function (articlesMap) {
	var articleBoxes = this._getArticleBoxes();
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

ItemsListView.prototype._getItemsMap = function () {
	var itemsMap = {};
	var lines = this._itemsList.getChildren();
	for (var i = 0; i < lines.length; i++) {
		var items = lines[i].getChildren();
		for (var j = 0; j < items.length; j++) {
			var item = items[j];
			itemsMap[item.getWuiName()] = item;
		}
	}
	return itemsMap;
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/MarketWindow/ShopWindow/itemsListView/index.js
 ** module id = 968
 ** module chunks = 0
 **/