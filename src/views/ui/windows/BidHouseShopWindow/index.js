require('./styles.less');
var Button = require('Button');
var connectionManager = require('dofusProxy/connectionManager.js');
var DrillDownList = require('DrillDownList');
var FilterTagButton = require('FilterTagButton');
var getText = require('getText').getText;
var helper = require('helper');
var inherits = require('util').inherits;
var itemManager = require('itemManager');
var ShopViewer = require('ShopViewer');
var Window = require('Window');
var windowsManager = require('windowsManager');
var WuiDom = require('wuidom');
var SearchBox = require('SearchBox');
var staticContent = require('staticContent');
var tooltip = require('TooltipBox');

var UNKNOWN_QUANTITY = -1;
var FREE_CONTENT_DELAY = 5000;

var SEARCH_MAXLEN = 30;
var SEARCH_MINLEN = 3; // if this changes, WATCH OUT: message ui.common.searchFilterTooltip has "3" hardcoded

var MIN_WIDTH = 300;

/**
 * In methods below, the isAuto parameters can be understood as "not directly triggered by the player".
 * For example:
 * - if the player taps on an item, isAuto == false.
 * - when using history "Back" button, the replayed action might select an item with isAuto == true.
 */

function BidHouseShopWindow() {
	Window.call(this, {
		className: 'BidHouseShopWindow',
		freeContentDelay: FREE_CONTENT_DELAY,
		positionInfo: { left: '0', bottom: '0', width: MIN_WIDTH, height: '100%' },
		title: getText('ui.bidhouse.bigStoreItemList')
	});

	this.openOnItem = null;

	this.backBtn = null;
	this.searchBox = null;
	this.isListening = false;
	this.sortedAllowedTypes = {};

	this.currentSearchText = null;
	this.currentSearchItemTypeMap = null;
	this.currentItemTypeElt = null;

	// Server sends us updates on 1 single category at a time; we call these the "live items"
	this.liveItemTypeId = null;
	this.liveItems = null;

	this._categoryToDisplay = null;
	this._categoryToDisplayItems = null;

	this._requestedCategories = [];

	this.availableItemCache = {};

	this.on('open', this._onOpen);
	this.on('close', this._onClose);
}
inherits(BidHouseShopWindow, Window);
module.exports = BidHouseShopWindow;


BidHouseShopWindow.minWidth = MIN_WIDTH;


/** @return {boolean} - true if window was already opened */
function navigateWhenOpen(windowName, itemOrId, mode) {
	var theWindow = windowsManager.getWindow(windowName);
	if (!theWindow.openState) {
		theWindow.openOnItem = itemOrId;
		return false;
	}
	if (mode && mode !== theWindow.mode) {
		theWindow.openOnItem = itemOrId;
		return false;
	}
	windowsManager.focusWindow(windowName);
	if (itemOrId) { theWindow.navigateToItem(itemOrId); }
	return true; // all done
}

/**
 * @param {boolean} isSellMode - true opens TradeStorageWindow; false opens BidHouseShopWindow
 * @param {number|null} npcId - can be null or 0 if not activated through an NPC
 * @param {number|ItemInstance} itemOrId - item ID or item instance
 */
BidHouseShopWindow.openBidHouse = function (isSellMode, npcId, itemOrId) {
	if (isSellMode) {
		if (navigateWhenOpen('tradeStorage', itemOrId, 'modify-bidHouse')) { return; }
	} else {
		if (navigateWhenOpen('bidHouseShop', itemOrId)) { return; }
	}

	window.dofus.sendMessage('NpcGenericActionRequestMessage', {
		npcId: npcId || 0,
		npcActionId: isSellMode ? 5 : 6, // NpcActions database 5:sell, 6:buy
		npcMapId: window.gui.playerData.position.mapId
	});
};

BidHouseShopWindow.switchBuySellMode = function (isSellMode, npcId, itemOrId) {
	// When switching while an item is displayed, pass this item to the other UI mode
	var tradeItemWindow = windowsManager.getWindow('tradeItem');
	if (!itemOrId) {
		var item = tradeItemWindow.getCurrentItem();
		if (item) { itemOrId = item.getItemInstance() ? item : item.getProperty('id'); }
	}
	windowsManager.close('tradeItem');

	window.dofus.sendMessage('LeaveDialogRequestMessage');

	window.gui.once('ExchangeLeaveMessage', function () {
		BidHouseShopWindow.openBidHouse(isSellMode, npcId, itemOrId);
	});
};

/**
 * @param {ExchangeStartedBidBuyerMessage} msg
 * NB: msg.buyerDescriptor.types contains all item types that can be sold in this HDV.
 * We don't use it since HDV in Dofus Touch sell ALL item types anyway.
 */
BidHouseShopWindow.prototype._onOpen = function (msg) {
	windowsManager.arrangeOpeningWindowVertically(this.id, { below: 'wallet', fullHeight: true });

	this.npcId = msg.buyerDescriptor.npcContextualId;

	if (!this.searchBox) {
		this._createContent();
		if (!this.isListening) { this._setupEventListeners(); }
	}
	this.switchToSellModeBtn.enable();

	if (this.openOnItem) { this.navigateToItem(this.openOnItem); }
};

BidHouseShopWindow.prototype._onClose = function () {
	windowsManager.close('tradeItem');

	this._reset();

	// Data below should only be cleared if we "close the dialog" with server
	this.liveItemTypeId = null;
	this.liveItems = null;

	// NB: _requestedCategories must stay unless we stop listening to messages
};

BidHouseShopWindow.prototype._createContent = function () {
	this.history = [];
	this._pushHistory('blank');

	this._createBackButton();
	this._createSearchBox();
	this._createSwitchToSellModeButton();
	this._createBidHouseCatList();
	this._createViewer();

	this._resetSearch();
};

BidHouseShopWindow.prototype.freeContent = function () {
	this.windowBody.clearContent();
	this.searchBox = this.bidHouseCatList = this.shopViewer = null;
	this.availableItemCache = {};
	this.sortedAllowedTypes = {};
	this.history = null;
	this.backBtn.hide();
};

// Makes it look again like when we opened the window the first time
BidHouseShopWindow.prototype._reset = function () {
	this.currentItemTypeElt = null;
	this._categoryToDisplayItems = null;

	this.bidHouseCatList.reset();
	this._resetSearch();
};

function backBtnHandler() {
	var self = this.myWindow;
	var stack = self.history;
	if (stack.length === 2) { self.backBtn.hide(); }
	stack.pop();
	self._navigateTo(stack[stack.length - 1]);
}

// Called for user action (tap) OR when a search results in a single itemType (auto select)
function itemTypeSelectedHandler(itemTypeElt, isAutoSelect) {
	// "this" is bidHouseCatList
	// "itemTypeElt" is the item type tapped (e.g. "Plume")
	var self = this.myWindow;

	self._selectItemType(itemTypeElt, isAutoSelect);
}

function itemTapHandler(item) {
	// "this" is the shop viewer
	// "item" is the item tapped (e.g. "Plume de Piou Vert")
	var itemMode = this.myWindow.currentSearchText ? 'search' : 'list';
	windowsManager.getWindow('tradeItem').displayItem(itemMode, item);
	windowsManager.focusWindow('tradeItem');
}

function ddListResizeHandler() {
	// "this" is bidHouseCatList
	var self = this.myWindow;
	self.shopViewer.refresh();
}

// Sort objects alphabetically - object.text must be defined for a & b
function sortAlphabetically(a, b) {
	return a.text.localeCompare(b.text);
}

BidHouseShopWindow.prototype._sortAllowedTypes = function (catId) {
	if (this.sortedAllowedTypes[catId]) { return this.sortedAllowedTypes[catId]; }

	var allowedItemTypes = window.gui.databases.BidHouseCategories[catId].allowedTypes;
	var allItemTypes = window.gui.databases.ItemTypes;
	var types = [];
	for (var n = 0; n < allowedItemTypes.length; n++) {
		var id = allowedItemTypes[n];
		types.push({ text: allItemTypes[id].nameId, id: id });
	}
	types.sort(sortAlphabetically);

	this.sortedAllowedTypes[catId] = types;
	return types;
};

BidHouseShopWindow.prototype._selectItemType = function (itemTypeElt, isAuto) {
	if (isAuto) {
		// If we are replaying (from history) we select the subitem "manually" (since there was no tap)
		this.bidHouseCatList.selectAndShowSubitem(itemTypeElt);
	} else {
		if (itemTypeElt !== this.currentItemTypeElt) { this._pushHistory('itemType', itemTypeElt); }
	}
	this.currentItemTypeElt = itemTypeElt;

	windowsManager.close('tradeItem');
	this._requestAndDisplayItemAvailability(itemTypeElt.data.id);
};

BidHouseShopWindow.prototype._createBackButton = function () {
	if (this.backBtn) { return; }
	var btn = this.backBtn = new Button({ className: 'backButton', hidden: true }, backBtnHandler);
	btn.insertBefore(this.windowTitle);
	btn.myWindow = this;
};

BidHouseShopWindow.prototype._createSwitchToSellModeButton = function () {
	var self = this;
	this.switchToSellModeBtn = this.headerRow.appendChild(new Button({
		addIcon: true,
		className: ['sellModeBtn', 'greenButton'],
		tooltip: getText('ui.bidhouse.bigStoreModeSell') },
		function () {
			BidHouseShopWindow.switchBuySellMode(/*isSellMode=*/true, self.npcId);
			this.disable();
		}));
};

BidHouseShopWindow.prototype._createSearchBox = function () {
	this.headerRow = this.windowBody.createChild('div', { className: 'headerRow' });
	var searchBox = this.searchBox = this.headerRow.appendChild(
		new SearchBox({ maxLength: SEARCH_MAXLEN }));
	searchBox.on('search', this._search.bind(this));
	searchBox.on('cancel', this._cancelSearch.bind(this));
};

function getSubitems(catItem) {
	// "this" is bidHouseCatList
	var self = this.myWindow;
	return self._sortAllowedTypes(catItem.info);
}

function subitemFilter(catItem, subItemNdx /*,subitemElt*/) {
	var self = catItem.myDrilldownList.myWindow;
	var allowedItemTypes = self._sortAllowedTypes(catItem.info);
	return !!self.currentSearchItemTypeMap[allowedItemTypes[subItemNdx].id];
}

function itemFilter(catItem) {
	var self = catItem.myDrilldownList.myWindow;
	var allowedItemTypes = self._sortAllowedTypes(catItem.info);

	for (var subItemNdx = 0; subItemNdx < allowedItemTypes.length; subItemNdx++) {
		if (self.currentSearchItemTypeMap[allowedItemTypes[subItemNdx].id]) { return true; }
	}
	return false;
}

// This creates the main "root" drilldown list, on the bid house category list
BidHouseShopWindow.prototype._createBidHouseCatList = function () {
	var bidHouseCatList = this.bidHouseCatList = new DrillDownList();
	bidHouseCatList.myWindow = this;
	bidHouseCatList.setSubitemsGetter(getSubitems);
	bidHouseCatList.setFilter(itemFilter, subitemFilter);

	// Read all categories from DB, sort them alphabetically, and insert them in drilldown list
	var bidHouseCategories = window.gui.databases.BidHouseCategories;
	var cats = [];
	for (var catId in bidHouseCategories) {
		cats.push({ text: bidHouseCategories[~~catId].description, id: ~~catId });
	}

	cats.sort(sortAlphabetically);

	for (var i = 0; i < cats.length; i++) {
		bidHouseCatList.addItem(cats[i].text, cats[i].id);
	}

	bidHouseCatList.getDom(this.windowBody).addClassNames('bidHouseCategories');
	bidHouseCatList.on('subitemSelected', itemTypeSelectedHandler);
	bidHouseCatList.on('resized', ddListResizeHandler);
};

// Search through categories ("top" search)
BidHouseShopWindow.prototype._searchAgainFromTop = function () {
	this.currentItemTypeElt = null;
	this._categoryToDisplayItems = null;

	this.bidHouseCatList.reset();
	this._refreshDisplayedItems();
};

BidHouseShopWindow.prototype._refreshFilter = function () {
	// Filter currently displayed items since this seems intuitive behavior for player
	if (this._categoryToDisplayItems) {
		this._refreshDisplayedItems();
	}

	var selected = this.bidHouseCatList.refreshFilter();

	if (selected.itemCount === 0) {
		this.bidHouseCatList.toggleBreadcrumb(false); // if breadcrumb was on, turn it off
		this.bidHouseCatList.setPlaceholder(getText('tablet.bidHouse.noCatHasMatchingItem', this.currentSearchText));
		this.shopViewer.setPlaceholder(getText('tablet.bidHouse.noMatchingItem', this.currentSearchText));
	} else {
		this.bidHouseCatList.setPlaceholder(null);
	}
};

// NB: first level of stack is never "popped" once it is pushed
BidHouseShopWindow.prototype._pushHistory = function (type, value) {
	var link = { type: type, value: value };
	if (type === 'itemType') { link.search = this.currentSearchText; }

	this.history.push(link);
	if (this.history.length === 2) { this.backBtn.show(); }
};

BidHouseShopWindow.prototype._navigateTo = function (link) {
	if (link.search !== undefined) { this._search(link.search, /*isAuto=*/true); }

	switch (link.type) {
	case 'item': return this.navigateToItem(link.value, /*isAuto=*/true);
	case 'itemType': return this._selectItemType(link.value, /*isAuto=*/true);
	case 'search': return this._search(link.value, /*isAuto=*/true);
	case 'blank': return this._reset();
	default: return console.error('Invalid history', link);
	}
};

BidHouseShopWindow.prototype.navigateToItem = function (itemOrId, isAuto) {
	this.openOnItem = null;

	var item, itemId;
	if (typeof itemOrId === 'number') {
		itemId = itemOrId;
		item = itemManager.items[itemOrId];
	} else {
		itemId = itemOrId.getProperty('id');
		item = itemOrId.getItem();
	}

	var typeIdMap = {};
	typeIdMap[item.typeId] = true;
	this.currentSearchItemTypeMap = typeIdMap;

	this.currentSearchText = item.getNameForSearch();
	this.searchBox.setValue(item.nameId);

	this._refreshFilter();
	if (!isAuto) { this._pushHistory('item', itemId); }
};

BidHouseShopWindow.prototype._search = function (searchInput, isAuto) {
	if (searchInput === null || searchInput === '') { return this._cancelSearch(isAuto); }
	if (searchInput.length < SEARCH_MINLEN) {
		return tooltip.showNotification(getText('ui.common.searchFilterTooltip'), this.searchBox);
	}
	var search = helper.simplifyString(searchInput);
	if (search === this.currentSearchText) { return; }

	this.searchBox.searchInput.blur();
	this.currentSearchText = search;
	if (!this.bidHouseCatList.inBreadcrumbMode()) {
		this._searchAgainFromTop();
	}

	if (isAuto) {
		this.searchBox.setValue(searchInput);
	} else {
		this._pushHistory('search', searchInput);
	}

	this._searchItemsByName();
};

BidHouseShopWindow.prototype._cancelSearch = function (isAuto) {
	this.searchBox.searchInput.blur();
	if (!this.currentSearchText) { return; }
	this.currentSearchText = null;

	this.bidHouseCatList.removeFilter();
	this.bidHouseCatList.toggleBreadcrumb(false);
	if (this.currentItemTypeElt) {
		this.bidHouseCatList.selectAndShowSubitem(this.currentItemTypeElt);
	}

	if (this._categoryToDisplayItems) {
		this._refreshDisplayedItems();
	}

	if (isAuto) {
		this.searchBox.clear();
	} else {
		if (this.currentItemTypeElt) { this._pushHistory('itemType', this.currentItemTypeElt); }
	}
};

BidHouseShopWindow.prototype._resetSearch = function () {
	this.searchBox.clear();
	this.currentSearchText = null;
	this._refreshDisplayedItems();
};

function clearFilterBtnTap() {
	this.searchBox.setValue('');
	this._cancelSearch();
}

BidHouseShopWindow.prototype._createViewer = function () {
	function sortRow(item1, item2) {
		var diff = item1.level - item2.level;
		if (diff !== 0) {
			return diff;
		}
		return item1.nameId.localeCompare(item2.nameId);
	}

	var tableDescription = [
		{ id: 'icon', format: function (item) {
				var slot = new WuiDom('div', { className: 'slot' });
				var icon = slot.createChild('div', { className: 'icon' });
				icon.setStyle('backgroundImage', item.image);
				return slot;
			}, sort: sortRow, defaultSorter: true
		},
		{ id: 'name', header: '', format: function (item) {
				var name = new WuiDom('div', { className: 'name', text: item.nameId });

				if (item.etheral) {
					name.addClassNames('etheral');
				} else if (item.itemSetId) {
					name.addClassNames('itemSet');
				}

				return name;
			}, getContent: function (item) { return item.nameId; }, sort: true
		}
	];

	this.shopViewer = this.windowBody.appendChild(
		new ShopViewer(tableDescription, 'id', { manualFiltering: true, noAllCategory: true }));
	this.shopViewer.on('itemSelected', itemTapHandler);
	this.shopViewer.myWindow = this;

	// Create special column header (will be updated dynamically when items are received)
	var header = new WuiDom('div', { className: 'filterHeader' });
	this.shopViewerHeaderLabel = header.createChild('div', { className: 'label',
		text: getText('tablet.bidHouse.nowOnSale') });
	this.shopViewerHeaderButton = header.appendChild(new FilterTagButton('', clearFilterBtnTap.bind(this)));
	this.shopViewerHeaderButton.hide();
	this.shopViewer.setHeader(header);
};

BidHouseShopWindow.prototype._setupEventListeners = function () {
	this.isListening = true;
	var self = this;

	/**
	 * @event module:protocol/inventoryExchanges.client_ExchangeTypesExchangerDescriptionForUserMessage
	 * This is how the server tells us which items are actually available on sale.
	 * @param {object} msg - msg
	 * @param {Array} msg.typeDescription - list of item GID you can buy
	 */
	connectionManager.on('ExchangeTypesExchangerDescriptionForUserMessage', function (msg) {
		self._requestedCategories.shift();
		self._storeItemAvailability(msg.typeDescription, /*isReset=*/true);
	});

	/*
	 * @event module:protocol/inventoryExchanges.client_ExchangeBidHouseGenericItemAddedMessage
	 * @desc a new type of item (GID) being sold in the currently opened bid house.
	 *
	 * @param {number} msg.objGenericId
	 */
	connectionManager.on('ExchangeBidHouseGenericItemAddedMessage', function (msg) {
		self._storeItemAvailability(msg.objGenericId);
	});

	/*
	 * @event module:protocol/inventoryExchanges.client_ExchangeBidHouseGenericItemRemovedMessage
	 * @desc a type of item is no longer being sold from the currently opened bid house.
	 *
	 * @param {object} msg - msg
	 * @param {number} msg.objGenericId
	 */
	connectionManager.on('ExchangeBidHouseGenericItemRemovedMessage', function (msg) {
		self._storeNonAvailableItem(msg.objGenericId);
	});
};

BidHouseShopWindow.prototype._shouldItemBeDisplayed = function (item) {
	if (item.typeId !== this._categoryToDisplay) { return false; }
	if (!this.currentSearchText) { return true; }
	return item.getNameForSearch().indexOf(this.currentSearchText) >= 0;
};

BidHouseShopWindow.prototype._refreshDisplayedItems = function () {
	// Filter received items using text search if any
	var items = this._categoryToDisplayItems || [];
	var categoryHasItems = !!items.length;

	if (items.length && this.currentSearchText) {
		var list = [];
		for (var i = 0; i < items.length; i++) {
			var item = items[i];
			if (!this._shouldItemBeDisplayed(item)) { continue; }
			list.push(item);
		}
		items = list;
	}

	if (items.length > 0) {
		this.bidHouseCatList.toggleBreadcrumb(true);
	}

	// Column header - with or without "clear filter" button
	if (categoryHasItems && this.currentSearchText) {
		var label = getText('tablet.common.filterHeader', this._categoryToDisplayItems.length - items.length);
		this.shopViewerHeaderLabel.setText(label);
		this.shopViewerHeaderButton.setLabel(this.currentSearchText);
		this.shopViewerHeaderButton.show();
		this.shopViewer.table.setSortingHintVisible('name', /*shouldHide=*/true);
	} else {
		this.shopViewerHeaderLabel.setText(getText('tablet.bidHouse.nowOnSale'));
		this.shopViewerHeaderButton.hide();
		this.shopViewer.table.setSortingHintVisible('name', /*shouldHide=*/false);
	}

	if (!items.length) {
		this.shopViewer.clearContent();
		var msg;
		if (!this._categoryToDisplayItems) {
			msg = getText('tablet.bidHouse.searchOrSelect');
		} else {
			var itemTypeName = window.gui.databases.ItemTypes[this._categoryToDisplay].nameId;
			if (categoryHasItems) {
				msg = getText('tablet.bidHouse.noMatchInCat', this.currentSearchText, itemTypeName);
			} else {
				msg = getText('tablet.bidHouse.nothingInCat', itemTypeName);
			}
		}
		this.shopViewer.setPlaceholder(msg);
	}
	this.shopViewer.setItemList(items);
};

BidHouseShopWindow.prototype._requestAndDisplayItemAvailability = function (itemType) {
	if (itemType === this.liveItemTypeId) {
		this._categoryToDisplayItems = this.liveItems;
		return this._refreshDisplayedItems();
	}

	this._categoryToDisplay = itemType;
	// If request is already pending for this itemType, ignore new request
	if (this._requestedCategories.indexOf(itemType) !== -1) { return; }

	this._requestedCategories.push(itemType);
	this.liveItemTypeId = itemType;
	this.liveItems = null;
	this.shopViewer.setPlaceholder(' '); // empty placeholder while waiting for server
	this.shopViewer.table.placeholder.frame.addClassNames('spinner');
	window.dofus.sendMessage('ExchangeBidHouseTypeMessage', { type: itemType });
	// see ExchangeTypesExchangerDescriptionForUserMessage for server's reply
};

BidHouseShopWindow.prototype._searchItemsByName = function () {
	this.searchBox.showAsSearching(true);
	var self = this;
	// TODO: see if storing a local DB of items names is doable to avoid hitting the proxy here
	staticContent.searchDataMap('Items', { match: this.currentSearchText }, function (error, items) {
		if (error) {
			console.error(error);
			return self.shopViewer.setPlaceholder(getText('tablet.bidHouse.searchError'));
		}
		var itemTypes = {};
		for (var id in items) {
			var item = items[~~id];
			itemTypes[item.typeId] = true;
		}
		self.currentSearchItemTypeMap = itemTypes;
		self._refreshFilter();
		self.searchBox.showAsSearching(false);
	});
};

BidHouseShopWindow.prototype._storeItemAvailability = function (itemIdOrIds, isReset) {
	var isCategory = itemIdOrIds instanceof Array;
	var itemIds = isCategory ? itemIdOrIds : [itemIdOrIds];

	var self = this;
	itemManager.getItems(itemIds, function (error, items) {
		if (error) { return console.error(error); }

		for (var i = 0; i < items.length; i++) {
			var item = items[i];
			self.availableItemCache[item.id] = [UNKNOWN_QUANTITY, Date.now()];
		}

		if (!self.openState || (!isReset && !self.liveItems)) { return; }

		self.shopViewer.table.placeholder.frame.delClassNames('spinner');

		var isShowingLiveItems = self._categoryToDisplayItems === self.liveItems;
		self.liveItems = isReset ? items : self.liveItems.concat(items);
		if (isShowingLiveItems || isReset) {
			self._categoryToDisplayItems = self.liveItems;
			self._refreshDisplayedItems();
		}
	});
};

BidHouseShopWindow.prototype._storeNonAvailableItem = function (itemId) {
	if (!this.openState || !this.liveItems) { return; }

	this.availableItemCache[itemId] = [0, Date.now()];

	for (var i = this.liveItems.length - 1; i >= 0; i--) {
		if (this.liveItems[i].id === itemId) {
			this.liveItems.splice(i, 1);
			break;
		}
	}

	var isShowingLiveItems = this._categoryToDisplayItems === this.liveItems;
	if (isShowingLiveItems) {
		this.shopViewer.removeItems([itemId]);
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/BidHouseShopWindow/index.js
 ** module id = 310
 ** module chunks = 0
 **/