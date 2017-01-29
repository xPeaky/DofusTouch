require('./styles.less');
var inherits          = require('util').inherits;
var getText           = require('getText').getText;
var WuiDom            = require('wuidom');
var List              = require('List');
var playUiSound       = require('audioManager').playUiSound;
var Button            = require('Button');
var tapBehavior       = require('tapBehavior');
var windowsManager    = require('windowsManager');
var Wallet            = require('Wallet');
var moneyConverter    = require('moneyConverter');
var HomepageView      = require('./homepageView');
var ItemsListView     = require('./itemsListView');
var ItemDetailsView   = require('./itemDetailsView');
var Countdown         = require('./countdown.js');
var shopHelper        = require('shopHelper');
var analytics         = require('analytics');

var DELAY_BETWEEN_REQUESTS = 500;

var ITEMS_LIST_VIEW = 'itemsList';
var HOMEPAGE_VIEW = 'homepage';
var ITEM_DETAILS_VIEW = 'itemDetails';

var HOMEPAGE_CATEGORY_ID = 'homepage';
var homepageCategory = {
	id: HOMEPAGE_CATEGORY_ID,
	name: '',
	child: []
};

var GOULTINES_CATEGORY_ID = 556;
var BONUSPACK_CATEGORY_ID = 557;

var GOULTINES_VIEW_CONSTRAINTS = {
	canTapImage: false
};

var BONUS_PACK_VIEW_CONSTRAINTS = {
	lines: 1,
	columns: 2,
	promoType: 'strip',
	showArticleDescription: true,
	canTapImage: false
};

var VIEWS_CONSTRAINTS = {
	556: GOULTINES_VIEW_CONSTRAINTS,
	557: BONUS_PACK_VIEW_CONSTRAINTS
};

var CATEGORY_HAS_BONUS_DETAILS = {
	557: true
};

function close() {
	windowsManager.close('market');
}

function ShopWindow() {
	WuiDom.call(this, 'div', { className: 'ShopWindow', name: 'shop' });

	this.nbArticlesVisible = 1;

	this.activeTopTab = null;
	this.selectedTopTab = null;
	this.selectedSubTab = null;
	this.openedCategory = null;
	this.categoriesName = {};
	this.categoriesData = {};
	this.bonusCountdown = null;

	this.requestTimestamp = 0;
	this.requestTimeout = null;
	this.lastAction = null;

	this.isInitializing = false;
	this.articlesMap = {};

	this._views = {};
	this._currentViewName = null;
	this._previousViewName = null;

	this.viewPreviousToGoultines = null;

	this.categoryToOpenWhenReady = null;
	this.needsResize = false;

	var openedTimestamp, scBalanceWhenOpen, hcBalanceWhenOpen;

	this.once('open', function () {
		this._createDom();
		this._setupEvents();
	});

	this.on('opened', function (params) {
		// Check if the window is not already opened
		if (this._currentViewName) {
			if (params.category) {
				this._navigateToCategory(params.category);
			}
			return;
		}

		var playerData = window.gui.playerData;
		openedTimestamp = Date.now();

		scBalanceWhenOpen = playerData.inventory.kamas;
		hcBalanceWhenOpen = playerData.inventory.goultines;

		this.categoryToOpenWhenReady = params.category;
		// Check if the shop is already initializing
		if (!this.isInitializing) {
			this.reinitializeShop();
		}

		if (this.needsResize) {
			this.resize();
		}
	});

	this.on('close', function () {
		var sessionInSec = ~~((Date.now() - openedTimestamp) / 1000);

		var playerData = window.gui.playerData;
		var gainedSc = playerData.inventory.kamas - scBalanceWhenOpen;
		var gainedHc = playerData.inventory.goultines - hcBalanceWhenOpen;

		//jscs:disable requireCamelCaseOrUpperCaseIdentifiers
		analytics.log('HUD.Display_Menu', {
			interface_id: 'UI_SHOP',
			time_spent_on_action: sessionInSec,
			relative_soft_currency_gained: gainedSc,
			relative_hard_currency_gained: gainedHc
		});
		//jscs:enable requireCamelCaseOrUpperCaseIdentifiers

		this.clearShop();
	});
}
inherits(ShopWindow, WuiDom);
module.exports = ShopWindow;

var isActivatedByTap = true;

var isSubCategoryRowVisible = true;
ShopWindow.prototype.setSubCategoryRowVisible = function (isVisible) {
	var isToggled = isSubCategoryRowVisible !== isVisible;
	isSubCategoryRowVisible = isVisible;
	this.subCategoryRow.toggleDisplay(isVisible);
	this.subCategoryRowSeparator.toggleDisplay(isVisible);
	if (isToggled) {
		this.viewContainer.toggleClassName('hasSubCategory', isVisible);
		this.resize();
	}
};

ShopWindow.prototype._activateTopTab = function (tab) {
	var tabId = tab.getWuiName();
	var activeTopTab = this.activeTopTab;
	if (activeTopTab) {
		if (tab === activeTopTab) {
			return;
		}
		this._deactivateTopTab(activeTopTab);
	}

	if (tabId === HOMEPAGE_CATEGORY_ID) {
		this.closeCategory(this.openedCategory);
		this.setSubCategoryRowVisible(false);
		this.setView(HOMEPAGE_VIEW);
	} else {
		// This tab corresponds to a shop category
		if (this._isSameCategory(tabId)) {
			return;
		}

		if (tab.sublist) {
			var items = this.subCategoryRow.getChildren();
			for (var i = 0; i < items.length; i++) {
				this.subCategoryRow.removeChild(items[i]);
			}
			this.subCategoryRow.appendChild(tab.sublist);
			this.setSubCategoryRowVisible(true);

			if (isActivatedByTap) {
				tab.sublist.deactivate();
				this.selectedSubTab = null;
			}
		}

		this._openCategory(tabId);
	}

	this.activeTopTab = tab;
	this.selectedTopTab = tabId;
	tab.addClassNames('on');
	playUiSound('TAB');
};

ShopWindow.prototype._activateSubCategory = function (category) {
	var categoryId = category.getWuiName();
	if (this._isSameCategory(categoryId)) {
		return;
	}

	this.selectedSubTab = categoryId;
	this._openCategory(categoryId);
	playUiSound('TAB');
};

var isDeactivatedByTap = true;

ShopWindow.prototype._deactivateTopTab = function (tab) {
	var tabId = tab.getWuiName();
	if (tabId !== HOMEPAGE_CATEGORY_ID) {
		// This tab corresponds to a shop category
		if (tab.sublist) {
			this.setSubCategoryRowVisible(false);
			tab.sublist.deactivate();
		}

		if (this._isSameCategory(tabId)) {
			this.closeCategory(tabId);
		}
	}
	tab.delClassNames('on');
	this.activeTopTab = null;
};

ShopWindow.prototype._deactivateSubCategory = function (category) {
	var categoryId = category.getWuiName();

	if (!this._isSameCategory(categoryId)) {
		return;
	}
	this.closeCategory(categoryId);
	if (!isDeactivatedByTap) {
		return;
	}
	this.selectedSubTab = null;
	this._openCategory(this.selectedTopTab);
};

ShopWindow.prototype.deactivateAllCategories = function () {
	isDeactivatedByTap = false;
	if (this.activeTopTab) {
		this._deactivateTopTab(this.activeTopTab);
	}
	isDeactivatedByTap = true;
};

ShopWindow.prototype.reactivateCategories = function () {
	var selectedTopTab = this.selectedTopTab;
	if (!selectedTopTab) {
		return;
	}
	isActivatedByTap = false;
	var topTab = this.topTabsList.getChild(selectedTopTab);
	this._activateTopTab(topTab);
	if (!topTab.sublist || !this.selectedSubTab) {
		isActivatedByTap = true;
		return;
	}
	topTab.sublist.selectItem(this.selectedSubTab);
	isActivatedByTap = true;
};

ShopWindow.prototype._openGoultinesCategory = function () {
	if (this._isSameCategory(GOULTINES_CATEGORY_ID)) {
		return;
	}

	this.wallet.goultinesBtn.addClassNames('sunk');
	this.viewPreviousToGoultines = this._currentViewName;
	this.deactivateAllCategories();
	this.setSubCategoryRowVisible(false);
	this._openCategory(GOULTINES_CATEGORY_ID);
};

ShopWindow.prototype._closeGoultinesCategory = function () {
	if (!this._isSameCategory(GOULTINES_CATEGORY_ID)) {
		return;
	}

	this.wallet.goultinesBtn.delClassNames('sunk');
	this.closeCategory(GOULTINES_CATEGORY_ID);
	if (this.viewPreviousToGoultines === ITEMS_LIST_VIEW) {
		return this.reactivateCategories();
	}
	this.goToPreviousView();
};

ShopWindow.prototype._toggleGoultinesCategory = function () {
	if (this._isSameCategory(GOULTINES_CATEGORY_ID)) {
		return this._closeGoultinesCategory();
	}
	this._openGoultinesCategory();
};

ShopWindow.prototype._createDom = function () {
	var self = this;

	// Top row
	var row1 = this.createChild('div', { className: 'row1' });

	// Line separators
	row1.createChild('div', { className: ['separator', 'first'] });
	this.subCategoryRowSeparator = row1.createChild('div', { className: ['separator', 'second'] });

	// Tabs
	homepageCategory.name = getText('tablet.shop.homepage.name');
	this.topTabsList = row1.createChild('div', { className: 'topTabsList' });

	// Close button
	var closeButton = row1.appendChild(new Button({ className: 'closeButton', scaleOnPress: true }));
	closeButton.on('tap', function () {
		close();
	});

	this.wallet = row1.appendChild(new Wallet({ emitTap: true }));
	this.wallet.on('moreGoultinesTap', function () {
		self._toggleGoultinesCategory();
	});

	// Sub-category row
	this.subCategoryRow = this.createChild('div', { className: 'subCategoryRow' });

	// Bottom row
	var row2 = this.createChild('div', { className: 'row2' });
	this.viewContainer = row2;

	this.bonusDisplay = new WuiDom('div', { className: 'bonusDisplay' });
	var bonusTitle = getText('tablet.shop.bonusTimeLeft') + getText('ui.common.colon');
	this.bonusDisplay.createChild('div', { className: 'title', text: bonusTitle.toUpperCase() });
	this.bonusDetails = this.bonusDisplay.createChild('div', { className: 'details' });

	// Hide sub-category row
	this.setSubCategoryRowVisible(false);

	this._views[HOMEPAGE_VIEW] = new HomepageView();
	this._views[ITEMS_LIST_VIEW] = new ItemsListView();
	this._views[ITEM_DETAILS_VIEW] = new ItemDetailsView();
};

ShopWindow.prototype.setView = function (viewName, viewData) {
	if (this._currentViewName === viewName) {
		return;
	}
	this.deactivateAllCategories();

	this._previousViewName = this._currentViewName;
	this._currentViewName = viewName;

	var viewContainer = this.viewContainer;
	var children = viewContainer.getChildren();
	for (var i = 0; i < children.length; i++) {
		viewContainer.removeChild(children[i]);
	}

	var view = this._views[viewName];
	if (view) {
		viewContainer.appendChild(view);
		view.update(viewData);
	}
};

ShopWindow.prototype.goToPreviousView = function () {
	if (this._previousViewName === ITEMS_LIST_VIEW || this._previousViewName === HOMEPAGE_VIEW) {
		return this.reactivateCategories();
	}
	this.setView(this._previousViewName);
};

ShopWindow.prototype._setupEvents = function () {
	var connectionManager = window.dofus.connectionManager;
	var gui = window.gui;
	var views = this._views;
	var itemsListView = views[ITEMS_LIST_VIEW];
	var itemDetailsView = views[ITEM_DETAILS_VIEW];
	var self = this;

	connectionManager.on('shopOpenError', function (msg) {
		self.onShopOpenError(msg);
	});

	connectionManager.on('shopOpenSuccess', function (msg) {
		self.onShopOpenSuccess(msg);
	});

	connectionManager.on('shopOpenCategoryError', function (msg) {
		self.onShopOpenCategoryError(msg);
	});

	connectionManager.on('shopOpenCategorySuccess', function (msg) {
		self.onShopOpenCategorySuccess(msg);
	});

	connectionManager.on('AccessoryPreviewErrorMessage', function (msg) {
		console.error(new Error('Accessory preview failed with: ' + msg.error));
		itemDetailsView.setLook(null);
	});

	connectionManager.on('AccessoryPreviewMessage', function (msg) {
		itemDetailsView.setLook(msg.look);
	});

	gui.on('resize', function () {
		if (!self.isOpen()) {
			self.needsResize = true;
			return;
		}
		self.resize();
	});

	function displayItemDetails(articleId) {
		var article = self.articlesMap[articleId];
		// If there is no shop category opened, we assume we are on the homepage
		var openedCategory = self.openedCategory || HOMEPAGE_CATEGORY_ID;
		var categoryName = self.categoriesName[openedCategory];
		self.setView(ITEM_DETAILS_VIEW, { article: article, categoryName: categoryName });
	}

	function purchaseIAP(articleId) {
		shopHelper.purchaseArticleOnStore(self.articlesMap[articleId]);
	}

	function purchaseOnAnkama(articleId, currencyCode) {
		shopHelper.purchaseArticleOnAnkama(self.articlesMap[articleId], currencyCode);
	}

	function showSubCategoryRow(content) {
		self.showSubCategoryRow(content);
	}

	function hideSubCategoryRow() {
		self.showSubCategoryRow(false);
	}

	for (var viewName in views) {
		var view = views[viewName];
		view.on('displayItemDetails', displayItemDetails);
		view.on('purchaseIAP', purchaseIAP);
		view.on('purchaseOnAnkama', purchaseOnAnkama);
		view.on('showSubCategoryRow', showSubCategoryRow);
		view.on('hideSubCategoryRow', hideSubCategoryRow);
	}

	itemsListView.on('loadAdditionalContent', function () {
		self._saveAndExecuteAction(function () {
			self.loadAdditionalContent();
		});
	});

	itemsListView.on('nbArticlesVisibleUpdated', function (nbArticlesVisible) {
		self.nbArticlesVisible = nbArticlesVisible;
	});

	itemDetailsView.on('goToPreviousView', function () {
		self.goToPreviousView();
	});

	itemDetailsView.on('requestPrevisualization', function (itemsId) {
		connectionManager.sendMessage('AccessoryPreviewRequestMessage', { genericId: itemsId });
	});

	moneyConverter.on('canNotComputeSoftPrices', function () {
		if (self.isOpen()) {
			self.updateArticlesPrices();
		}
	});

	moneyConverter.on('computedSoftPricesChange', function () {
		if (self.isOpen()) {
			self.updateArticlesPrices();
		}
	});
};

ShopWindow.prototype.isOpen = function () {
	return windowsManager.getWindow('market').openState;
};

ShopWindow.prototype.showSubCategoryRow = function (content) {
	var items = this.subCategoryRow.getChildren();
	for (var i = 0; i < items.length; i++) {
		this.subCategoryRow.removeChild(items[i]);
	}
	var isVisible = !!content;
	this.setSubCategoryRowVisible(isVisible);
	if (isVisible) {
		this.subCategoryRow.appendChild(content);
	}
};

ShopWindow.prototype._navigateToCategory = function (category) {
	if (category === 'goultines') {
		this._openGoultinesCategory();
	} else if (category === 'bonuspack') {
		this._openCategory(BONUSPACK_CATEGORY_ID);
	} /*else {
		this._openCategory(tabId);
	}*/
};

/**
 * @event ShopWindow#shopOpenError
 */
ShopWindow.prototype.onShopOpenError = function (/*msg*/) {
	this.isInitializing = false;
	this.viewContainer.delClassNames('spinner');

	if (!this.isOpen()) {
		return;
	}

	this._showErrorPopup(true);
};

/**
 * @event ShopWindow#shopOpenSuccess
 *
 * @param {object} msg            - shopOpenSuccess message
 * @param {array}  msg.categories - categories of the game shop
 */
ShopWindow.prototype.onShopOpenSuccess = function (msg) {
	// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
	this.isInitializing = false;
	this.viewContainer.delClassNames('spinner');

	if (!this.isOpen()) {
		return;
	}

	this.wallet.goultinesBtn.enable();

	var home = msg.home;
	this.setCategories(home.categories);
	var topTabs = this.topTabsList.getChildren();
	if (topTabs.length) {
		this._activateTopTab(topTabs[0]);
	}
	var highlightImageArticle;
	if (home._highlightImageArticle) {
		var highlightImageArticles = this.validateArticles([home._highlightImageArticle]);
		if (highlightImageArticles.length) {
			highlightImageArticle = highlightImageArticles[0];
		}
	}
	var gondolaHeadArticles;
	if (home.gondolahead_article) {
		gondolaHeadArticles = this.validateArticles(home.gondolahead_article);
	}
	var highlightCarouselArticle;
	if (home._highlightCarouselArticle) {
		var highlightCarouselArticles = this.validateArticles([home._highlightCarouselArticle]);
		if (highlightCarouselArticles.length) {
			highlightCarouselArticle = highlightCarouselArticles[0];
		}
	}

	var homepage = {
		gondolaHeadArticles: gondolaHeadArticles,
		highlightCarousel: home._selectedHighlightCarousel,
		highlightCarouselArticle: highlightCarouselArticle,
		highlightImageArticle: highlightImageArticle
	};
	this._views[HOMEPAGE_VIEW].update(homepage);

	if (this.categoryToOpenWhenReady) {
		this._navigateToCategory(this.categoryToOpenWhenReady);
	}

	if (window.wizPurchase) {
		shopHelper.checkPendingPurchases();
	}
	// jscs:enable requireCamelCaseOrUpperCaseIdentifiers
};

/**
 * @event ShopWindow#shopOpenCategoryError
 *
 * @param {object} msg            - shopOpenCategoryError message
 * @param {string} msg.categoryId - id of the category of the articles
 */
ShopWindow.prototype.onShopOpenCategoryError = function (msg) {
	if (!this._isSameCategory(msg.categoryId)) {
		return;
	}
	var view = this._views[ITEMS_LIST_VIEW];
	view.setSpinnerVisible(false);
	view.setLoadingAdditionalContent(false);
	this._showErrorPopup();
};

/**
 * @event ShopWindow#shopOpenCategorySuccess
 *
 * @param {object} msg               - shopOpenCategorySuccess message
 * @param {string} msg.categoryId    - id of the category of the articles
 * @param {array}  msg.articles      - articles in the category
 * @param {number} msg.page          - opened page of the category
 * @param {number} msg.totalArticles - total number of articles in the category
 */
ShopWindow.prototype.onShopOpenCategorySuccess = function (msg) {
	this._loadCategoryWithMessage(msg);
};

ShopWindow.prototype.resize = function () {
	var views = this._views;
	for (var viewName in views) {
		views[viewName].resize(this.viewContainer);
	}

	this.needsResize = false;
};

// Helper functions

ShopWindow.prototype._showErrorPopup = function (canClose) {
	var self = this;
	windowsManager.getWindow('confirm').update({
		title: getText('ui.common.error'),
		message: getText('ui.popup.accessDenied.serviceUnavailable') + ' ' + getText('tablet.common.askRetry'),
		cb: function (isRetry) {
			if (!isRetry) {
				if (canClose) {
					close();
				}
				return;
			}
			if (!self.lastAction) {
				self.reinitializeShop();
				return;
			}
			self.lastAction();
		}
	});
	windowsManager.openDialog(['confirm']);
};

ShopWindow.prototype._isSameCategory = function (categoryId) {
	if (categoryId === this.openedCategory) {
		return true;
	}
	return false;
};

ShopWindow.prototype._saveAndExecuteAction = function (action) {
	this.lastAction = action;
	action();
};

ShopWindow.prototype.updateArticlesPrices = function () {
	var articlesMap = this.articlesMap;
	for (var articleId in articlesMap) {
		shopHelper.enrichWithSoftPrice(articlesMap[articleId]);
	}
	var views = this._views;
	for (var viewName in views) {
		views[viewName].updateArticlesPrices(this.articlesMap);
	}
};

// Shop global

ShopWindow.prototype.reinitializeShop = function () {
	var self = this;

	function fail(error) {
		console.error(error);
		self.isInitializing = false;
		self.viewContainer.delClassNames('spinner');
		if (!self.isOpen()) {
			return;
		}
		self._showErrorPopup(true);
	}

	this._saveAndExecuteAction(function () {
		self.isInitializing = true;
		self.viewContainer.addClassNames('spinner');
		shopHelper.getStoreInfos(function (error) {
			if (error) {
				return fail(error);
			}
			window.dofus.send('shopOpenRequest');
		});
	});
};

ShopWindow.prototype.clearShop = function () {
	var activeTopTab = this.activeTopTab;
	if (activeTopTab) {
		this._deactivateTopTab(activeTopTab);
	}

	this.closeCategory(this.openedCategory);
	this.clearCategories();

	this.requestTimestamp = 0;
	this.requestTimeout = null;
	this.lastAction = null;

	this.isInitializing = false;

	this.wallet.goultinesBtn.disable();

	this.setView(HOMEPAGE_VIEW);
	this._currentViewName = null;
	this._previousViewName = null;
	var views = this._views;
	for (var viewName in views) {
		views[viewName].clear();
	}
	this.viewPreviousToGoultines = null;
};

// Top row: Currency


// Left column: categories

ShopWindow.prototype.setCategories = function (categories) {
	this.clearCategories();
	this._addTopCategories(categories);
};

ShopWindow.prototype._createCategoryLabel = function (category) {
	var label = new WuiDom('div', { className: 'textContainer' });
	label.createChild('div', { className: 'text', text: category.name.toUpperCase() });
	return label;
};

ShopWindow.prototype._addTopCategories = function (categories) {
	var self = this;
	function activate(item) {
		self._activateSubCategory(item);
	}
	function deactivate(item) {
		self._deactivateSubCategory(item);
	}
	function activateTopTab() {
		self._activateTopTab(this);
	}

	function setCategory(category) {
		self.categoriesName[category.id] = category.name;
		if (category.id === GOULTINES_CATEGORY_ID) {
			return;
		}
		var label = self._createCategoryLabel(category);
		var tab = self.topTabsList.createChild('div', { name: category.id, className: 'tab' });
		tab.appendChild(label);
		tapBehavior(tab);
		tab.on('tap', activateTopTab.bind(tab));
		if (category.child.length) {
			var sublist = tab.sublist = new List();
			sublist.on('activate', activate);
			sublist.on('deactivate', deactivate);
			self._addSubCategories(sublist, category.child);
		}
	}

	setCategory(homepageCategory);
	for (var i = 0; i < categories.length; i++) {
		setCategory(categories[i]);
	}
};

ShopWindow.prototype._addSubCategories = function (list, categories) {
	for (var i = 0; i < categories.length; i++) {
		var category = categories[i];
		this.categoriesName[category.id] = category.name;
		var label = this._createCategoryLabel(category);
		var tab = list.addItem(category.id, label);
		tab.addClassNames('tab');
	}
};

ShopWindow.prototype.clearCategories = function () {
	this.topTabsList.clearContent();

	this.activeTopTab = null;
	this.selectedTopTab = null;
	this.selectedSubTab = null;
	this.openedCategory = null;
	this.categoriesName = {};
	this.categoriesData = {};
	this.articlesMap = {};
};

// Adding content

ShopWindow.prototype._loadCategoryWithMessage = function (msg) {
	// Save data
	var categoryId = msg.categoryId;
	var categoryData = this.categoriesData[categoryId];
	if (!categoryData) {
		this.categoriesData[categoryId] = msg;
	} else if (categoryData.page === (msg.page - 1)) {
		categoryData.page = msg.page;
		categoryData.articles = categoryData.articles.concat(msg.articles);
	} else {
		return;
	}
	if (!this._isSameCategory(categoryId)) {
		return;
	}
	this._loadCategory(msg);
};

ShopWindow.prototype.validateArticles = function (articles) {
	var validArticles = shopHelper.validateArticles(articles);
	for (var i = 0; i < validArticles.length; i++) {
		var article = validArticles[i];
		this.articlesMap[article.id] = article;
	}
	return validArticles;
};

ShopWindow.prototype._loadCategory = function (categoryData) {
	var itemsListView = this._views[ITEMS_LIST_VIEW];
	if (categoryData.totalArticles === 0) {
		itemsListView.showNoResult(this.categoriesName[this.openedCategory]);
		return;
	}

	var validArticles = this.validateArticles(categoryData.articles);
	var lastPage = Math.ceil(categoryData.totalArticles / this.nbArticlesVisible);
	var isLastPage = categoryData.page === lastPage;
	itemsListView.addArticles(validArticles, isLastPage);
};

function getBonusPackEndDate() {
	return window.gui.playerData.identification.subscriptionEndDate;
}

ShopWindow.prototype.showBonusDetails = function () {
	var self = this;
	var endDate = getBonusPackEndDate();
	if (endDate) {
		if (this.bonusCountdown) {
			this.bonusCountdown.clear();
		}
		this.bonusCountdown = new Countdown(new Date(endDate), function (error, time, formattedTime) {
			if (error) {
				return console.error(error);
			}
			self.bonusDetails.setText(formattedTime.toUpperCase());
		}, function () {
			self.bonusDetails.setText(getText('tablet.shop.noActiveBonus').toUpperCase());
		});
	} else {
		this.bonusDetails.setText(getText('tablet.shop.noActiveBonus').toUpperCase());
	}
	this.showSubCategoryRow(this.bonusDisplay);
};

// Requesting content

ShopWindow.prototype._openCategory = function (categoryId) {
	if (this._currentViewName !== ITEMS_LIST_VIEW) {
		this.setView(ITEMS_LIST_VIEW);
	}

	var self = this;

	var itemsListView = this._views[ITEMS_LIST_VIEW];
	var constraints = VIEWS_CONSTRAINTS[categoryId];
	if (itemsListView.setConstraints(constraints)) {
		itemsListView.resize(this.viewContainer);
	}
	itemsListView.setClassNames(['itemsListView', '_' + categoryId]);

	if (this._isSameCategory(categoryId)) {
		return;
	}

	if (this.openedCategory || this.openedCategory === 0) {
		this.closeCategory(this.openedCategory);
	}

	if (CATEGORY_HAS_BONUS_DETAILS[categoryId]) {
		this.showBonusDetails();
	}

	if (categoryId === GOULTINES_CATEGORY_ID) {
		this.wallet.goultinesBtn.addClassNames('sunk');
	}

	this.openedCategory = categoryId;
	var categoryData = this.categoriesData[this.openedCategory];
	if (categoryData) {
		this._loadCategory(categoryData);
	} else {
		this._saveAndExecuteAction(function () {
			itemsListView.setSpinnerVisible(true);
			self._requestPageOfCategory(categoryId, 1);
		});
	}
};

ShopWindow.prototype.loadAdditionalContent = function () {
	if (!this.openedCategory) {
		return;
	}

	this._views[ITEMS_LIST_VIEW].setLoadingAdditionalContent(true);

	var categoryData = this.categoriesData[this.openedCategory];
	if (!categoryData) {
		return console.error(new Error('Trying to load additional content of a non-opened category.'));
	}

	this._requestPageOfCategory(this.openedCategory, categoryData.page + 1);
};

ShopWindow.prototype._requestPageOfCategory = function (categoryId, page) {
	var params = { categoryId: categoryId, page: page, size: this.nbArticlesVisible };
	var request = function () {
		window.dofus.send('shopOpenCategoryRequest', params);
	};
	window.clearTimeout(this.requestTimeout);

	var timestamp = Date.now();
	var timeSinceLastRequest = timestamp - this.requestTimestamp;
	if (timeSinceLastRequest > DELAY_BETWEEN_REQUESTS) {
		request();
	} else {
		this.requestTimeout = window.setTimeout(request, DELAY_BETWEEN_REQUESTS - timeSinceLastRequest);
	}
	this.requestTimestamp = timestamp;
};

// Removing content

ShopWindow.prototype.closeCategory = function (categoryId) {
	if (!this.openedCategory || !this._isSameCategory(categoryId)) {
		return;
	}

	if (CATEGORY_HAS_BONUS_DETAILS[categoryId]) {
		if (this.bonusCountdown) {
			this.bonusCountdown.clear();
			this.bonusCountdown = null;
		}
	}

	if (categoryId === GOULTINES_CATEGORY_ID) {
		this.wallet.goultinesBtn.delClassNames('sunk');
	}

	this._views[ITEMS_LIST_VIEW].clearItems();
	this.openedCategory = null;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/MarketWindow/ShopWindow/index.js
 ** module id = 964
 ** module chunks = 0
 **/