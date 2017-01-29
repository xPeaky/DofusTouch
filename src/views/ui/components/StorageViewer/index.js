require('./styles.less');
var addTooltip = require('TooltipBox').addTooltip;
var dragManager = require('dragManager');
var EventEmitter = require('events.js').EventEmitter;
var getText = require('getText').getText;
var helper = require('helper');
var inherits = require('util').inherits;
var itemManager = require('itemManager');
var ItemSlot = require('ItemSlot');
var ItemFilters = require('ItemFilters');
var PaginationUI = require('PaginationUI');
var PresetsBox = require('StorageViewer/PresetsBox');
var ProgressBar = require('ProgressBar');
var tapEvents = require('tapHelper').events;
var tapBehavior = require('tapBehavior');
var WuiDom = require('wuidom');

var SLOT_SIZE = 40;

var notEquipped = itemManager.positions.notEquipped;
function defaultFilter(item, quantity, category, searchCriteria, isNotAllFilter, isNotAllSubFilter) {
	if (item.position !== notEquipped) {
		return false;
	}

	if (quantity === 0) {
		return false;
	}

	if (this.filteringOptions.usable && !item.item.usable) {
		return false;
	}

	if (!this.filterCategories[category]) {
		return false;
	}

	if (category !== this.filteringOptions.filterId && isNotAllFilter) {
		return false;
	}

	if (item.item.typeId !== this.filteringOptions.subFilterId && isNotAllSubFilter) {
		return false;
	}

	if (searchCriteria && item.item.getNameForSearch().indexOf(searchCriteria) === -1) {
		return false;
	}

	return true;
}

function StorageViewer(params) {
	EventEmitter.call(this);
	params = params || {};
	this.itemList = {};
	this.itemsQuantityList = {}; // used to fake
	this.slotList = {}; //
	this._filters = [defaultFilter];
	this.weight = 0;
	this.maxWeight = 1;

	this.enablePresets = params.enablePresets;
	var dataHandler = params.dataHandler;

	if (dataHandler) {
		this._setupEvents(dataHandler);
		if (this.enablePresets) {
			this.on('StorageViewerOpen', function () {
				this.setWeight(dataHandler.weight, dataHandler.maxWeight);
				this.setKamas(dataHandler.kamas);
			});
		}
	}

	this.currentOpenedWindow = null;
	this.selectedSlot = null;
	this.slotToShow = null; // when waiting for content to be ready to show a selected slot's page

	// categories allowed on the filter
	this.filterCategories = {};
	for (var categoryId in itemManager.categories) {
		this.filterCategories[itemManager.categories[categoryId]] = true;
	}
	this.filteringOptions = {};

	this.storageUI = new WuiDom('div', { className: 'StorageViewer' });

	this.domIsCreated = false;
	this.contentInitiated = false;
	this.listUpdateRequested = null;

	this.sortingCriterias = ['none'];

	// PAGE SYSTEM
	this.currentPage = -1;
	this.pageCount = -1;

	this.dragSourceData = {};
}

inherits(StorageViewer, EventEmitter);
module.exports = StorageViewer;

StorageViewer.prototype._updatePageSystem = function () {
	var view = this.currentOpenedWindow;
	if (!view) {
		return;
	}
	view._storageViewer = view._storageViewer || {};
	this.slotsMask.setStyles({
		width: view.availableSlotBoxWidth,
		height: view.availableSlotBoxHeight
	});

	this._updatePageCount(view);
	this.slotsBox.setStyle('height', view._storageViewer.slotsPerColumn * this.pageCount * SLOT_SIZE + 'px');
	this.slotsContainer.delClassNames('spinner');
	this.slotsBox.show();
};

StorageViewer.prototype._updatePageCount = function (view) {
	var storageViewer = view._storageViewer;
	if (!storageViewer.slotsPerPage) {
		return;
	}

	var pageCount = Math.ceil(this.displayedSlotCount / storageViewer.slotsPerPage) || 1;
	if (pageCount !== this.pageCount) {
		this.pageCount = pageCount;
		this._displayPage(0);
		this.pagination.setPageCount(pageCount);
	}
};

StorageViewer.prototype._getAvailableSpaceAndUpdatePageSystem = function () {
	var view = this.currentOpenedWindow;
	if (!view) { return false; }
	var storage = view._storageViewer;

	var height = this.slotsContainer.rootElement.clientHeight;
	if (height === 0) { return false; }
	var width = this.slotsContainer.rootElement.clientWidth;

	var slotsPerLine = Math.floor(width / SLOT_SIZE);

	storage.slotsPerColumn = Math.floor(height / SLOT_SIZE);
	storage.slotsPerPage = slotsPerLine * storage.slotsPerColumn;
	view.availableSlotBoxWidth = slotsPerLine * SLOT_SIZE + 'px';
	view.availableSlotBoxHeight = storage.slotsPerColumn * SLOT_SIZE + 'px';

	this._updatePageSystem();
	return true;
};

StorageViewer.prototype._initializeView = function () {
	if (!this._getAvailableSpaceAndUpdatePageSystem()) {
		return;
	}

	if (this.slotToShow) {
		this._displaySlotPage(this.slotToShow);
	}
};

StorageViewer.prototype.registerView = function (view, options) {
	var self = this;
	options = options || {};

	view.on('open', function () {
		self.currentOpenedWindow = this;
		self.dragSourceData.source = this.id;

		self.contextParams = options.contextParams || {};
		self.enableAveragePrice = options.hasOwnProperty('enableAveragePrice') ? options.enableAveragePrice : true;
		self.enableSlotContext = options.hasOwnProperty('enableSlotContext') ? options.enableSlotContext : true;

		if (!self.domIsCreated) {
			self._createDom();
			self.domIsCreated = true;
		}

		self.averagePrice.toggleDisplay(!!self.enableAveragePrice);

		if (self.listUpdateRequested) {
			self.setItemList(self.listUpdateRequested);
			self.listUpdateRequested = null;
		} else if (!options.manualReset) {
			self.resetDisplay();
		}

		if (!options.manualOpening) {
			view.windowBody.appendChild(self.storageUI);
		}

		if (view.availableSlotBoxWidth) {
			self._updatePageSystem();
		} else {
			self.slotsBox.hide();
			self.slotsContainer.addClassNames('spinner');
		}

		// if different view, update ui options
		if (self.currentOpenedWindow !== self.lastOpenedWindow) {
			self.leftArrow.toggleDisplay(!!options.leftArrow);
			self.rightArrow.toggleDisplay(!!options.rightArrow);

			var id;

			// context menus
			if (!self.listUpdateRequested) {
				for (id in self.slotList) {
					var slot = self.slotList[id];
					if (!slot.data) {
						continue;
					}
					self.contextParams.item = slot.data;
					slot.setContextMenu('item', self.contextParams);

					slot.enableContextMenu(!!self.enableSlotContext);
				}
			}

			// toggled filters
			var defaultFilterSet = {
				equipment: true,
				consumables: true,
				resources: true,
				quest: false,
				preset: false
			};
			for (id in itemManager.categories) {
				var canShowFilter = !!(options.filters && options.filters[id]) || defaultFilterSet[id];
				self.filter.toggleCategoryDisplay(itemManager.categories[id], canShowFilter);
				if (self.filter.selectedFilter === itemManager.categories[id] && !canShowFilter) {
					self.filter.selectCategory(-1);
				}
			}
		}

		self.contentInitiated = true;
		self.emit('StorageViewerOpen');
	});

	view.on('opened', function () {
		if (!self.domIsCreated) {
			self.once('domCreated', self._initializeView);
		} else {
			self._initializeView();
		}
	});

	view.on('close', function () {
		self.lastOpenedWindow = self.currentOpenedWindow;
		self.currentOpenedWindow = null;
	});
};

function tapStart() { this.addClassNames('pressed'); }
function tapEnd() { this.delClassNames('pressed'); }
function createArrow(direction) {
	var button = new WuiDom('div', { className: ['arrow', direction] });
	tapBehavior(button);
	button.on('tapstart', tapStart);
	button.on('tapend', tapEnd);
	return button;
}

StorageViewer.prototype._createDom = function () {
	var self = this;

	var storage = this.storageUI = new WuiDom('div', { className: 'StorageViewer' });

	var filterBox = storage.createChild('div', { className: 'filterBox' });
	var arrow = this.leftArrow = filterBox.appendChild(createArrow('left'));
	addTooltip(arrow, getText('ui.storage.advancedTransferts'));
	arrow.on('tap', function (params) {
		if (self.currentOpenedWindow) {
			self.currentOpenedWindow.emit('leftArrow-tap', params);
		}
	});
	this.filter = filterBox.appendChild(new ItemFilters());

	if (this.enablePresets) {
		// only show presets for player inventory
		this.presetsBox = storage.appendChild(new PresetsBox());
		this.presetsBox.on('setItemSlotTapped', function (itemSlot) {
			if (itemSlot.data && itemSlot.data.mountLocation === 'placeholder') {
				return;
			}
			self.currentOpenedWindow.emit('slot-tap', itemSlot);
		});
	}
	this.filter.toggleCategoryDisplay(itemManager.categories.preset, !!this.enablePresets);

	this.filter.on('filter', function (filter, subFilter, search) {
		var hasChange =
			(self.filteringOptions.filterId !== filter) ||
			(self.filteringOptions.subFilterId !== subFilter) ||
			(self.filteringOptions.search !== search);

		if (!hasChange) {
			return;
		}

		var isSameFilter = (self.filteringOptions.filterId === filter);

		self.filteringOptions.filterId = filter;
		self.filteringOptions.subFilterId = subFilter;
		self.filteringOptions.search = search;

		self.filterList();
		self._displayPage(0);

		if (self.presetsBox) {
			self._enablePresetsView(filter === itemManager.categories.preset);
		}

		if (!isSameFilter) {
			self._getAvailableSpaceAndUpdatePageSystem();
		}

		self.emit('filter', filter);
	});
	arrow = this.rightArrow = filterBox.appendChild(createArrow('right'));
	addTooltip(arrow, getText('ui.storage.advancedTransferts'));
	arrow.on('tap', function (params) {
		if (self.currentOpenedWindow) {
			self.currentOpenedWindow.emit('rightArrow-tap', params);
		}
	});

	this.slotsContainer = storage.createChild('div', { className: 'slotBox' });
	this.slotsMask = this.slotsContainer.createChild('div', { className: 'slotsMask' });
	this.slotsBox = this.slotsMask.createChild('div', { className: 'slots' });
	this.slotsBox.hide();
	this.slotsBox.rootElement.addEventListener(tapEvents.end, function (e) { e.preventDefault(); }, false);

	this.pagination = storage.appendChild(new PaginationUI());
	this.pagination.on('previous', function () {
		self._displayPage(self.currentPage - 1);
	});

	this.pagination.on('next', function () {
		self._displayPage(self.currentPage + 1);
	});

	this.pagination.on('page', function (page) {
		self._displayPage(page);
	});

	var podContainer = this.podContainer = storage.createChild('div', { className: 'podContainer' });
	var priceBox = podContainer.createChild('div', { className: 'priceBox' });
	this.averagePrice = priceBox.createChild('div', { className: 'averagePrice', text: 0 });
	addTooltip(this.averagePrice, function () {
		var value = helper.kamasToString(self.averagePriceValue);
		return new WuiDom('div', {
			text: getText('ui.storage.estimatedValue') + getText('ui.common.colon') + value
		});
	});

	this.kamas = priceBox.createChild('div', { className: 'kamas', text: 0 });
	addTooltip(this.kamas, function () {
		var value = helper.kamasToString(self.kamasValue);
		return new WuiDom('div', {
			text: getText('ui.storage.ownedKamas') + getText('ui.common.colon')  + value
		});
	});

	var progressBarContainer = podContainer.createChild('div', { className: 'progressBarContainer' });
	progressBarContainer.createChild('div', { text: 'Pods:', className: 'label' });
	this.progressBar = progressBarContainer.appendChild(new ProgressBar({ className: 'green' }));

	addTooltip(this.progressBar, function () {
		return new WuiDom('div', {
			text: helper.intToString(self.weight) + ' / ' + helper.intToString(self.maxWeight)
		});
	});

	this.emit('domCreated');
};

StorageViewer.prototype._enablePresetsView = function (toggle) {
	this.filter.subFiltersBox.toggleDisplay(!toggle);
	this.pagination.toggleDisplay(!toggle);
	this.podContainer.toggleDisplay(!toggle);
	this.kamas.toggleDisplay(!toggle);

	this.presetsBox.toggleDisplay(toggle);
};

StorageViewer.prototype._filter = function (item, quantity, category,
											searchCriteria, isNotAllFilter, isNotAllSubFilter) {
	for (var i = 0, len = this._filters.length; i < len; i += 1) {
		var filter = this._filters[i];
		if (!filter.call(this, item, quantity, category, searchCriteria, isNotAllFilter, isNotAllSubFilter)) {
			return false;
		}
	}
	return true;
};

StorageViewer.prototype._displayPage = function (page) {
	if (this.currentPage === page || !this.currentOpenedWindow) {
		return;
	}

	if (page < 0 || page > this.pageCount - 1) {
		return;
	}

	var storageInfo = this.currentOpenedWindow._storageViewer;
	this.currentPage = page;
	var transform = 'translateY(-' + page * storageInfo.slotsPerColumn * SLOT_SIZE + 'px)';
	this.slotsBox.setStyles({
		webkitTransform: transform,
		transform: transform
	});

	this.pagination.setCurrent(page);
};

StorageViewer.prototype.addFilters = function (filterFns) {
	for (var i = 0, len = filterFns.length; i < len; i += 1) {
		this._filters.push(filterFns[i]);
	}
};


StorageViewer.prototype.removeFilter = function (filterFn) {
	var filters = this._filters;
	if (filters.indexOf(filterFn) !== -1) {
		filters.splice(filters.indexOf(filterFn), 1);
	} else {
		console.error(new Error('StorageViewer: remove unknown filter'));
	}
};


StorageViewer.prototype._updateAveragePrice = function () {
	var displayedItemsAveragePrice = 0;

	for (var itemUID in this.slotList) {
		if (this.slotList[itemUID].isVisible()) {
			var item = this.itemList[itemUID];

			if (!item) {
				continue;
			}

			var averagePrice = (item.item.averagePrice === -1) ? 0 : item.item.averagePrice;
			displayedItemsAveragePrice += averagePrice * this.itemsQuantityList[itemUID];
		}
	}

	this.averagePriceValue = displayedItemsAveragePrice;
	this.averagePrice.setText(helper.intToString(displayedItemsAveragePrice));
};

StorageViewer.prototype._updateFilter = function () {
	var usedItemTypes = {};

	for (var itemUID in this.itemList) {
		var item = this.itemList[itemUID];
		if (item.position === notEquipped && this.itemsQuantityList[itemUID] > 0) {
			if (!item.item) {
				console.error(new Error('Missing the property "item" for item: ' + item.id + ' item is an ' +
					helper.getObjectInstanceName(item)));
				continue;
			}
			usedItemTypes[item.item.typeId] = true;
		}
	}

	this.filter.updateSubFilters(Object.keys(usedItemTypes));
};

StorageViewer.prototype._filterItem = function (item) {
	var searchCriteria = this.filteringOptions.search ? helper.simplifyString(this.filteringOptions.search) : null;
	var isNotAllFilter = this.filteringOptions.filterId !== ItemFilters.filters.all;
	var isNotAllSubFilter = this.filteringOptions.subFilterId !== ItemFilters.subFilters.all;
	var itemTypes = itemManager.getItemTypeMap();
	var category = itemTypes[item.item.typeId].category;

	var quantity = this.itemsQuantityList[item.objectUID];
	var display = quantity && this._filter(item,
		quantity,
		category,
		searchCriteria,
		isNotAllFilter,
		isNotAllSubFilter
	);
	var slot = this.slotList[item.objectUID];
	if (slot.isVisible()) {
		this.displayedSlotCount -= 1;
	}
	if (!display) {
		this.unSelectSlot(item.objectUID);
		slot.hide();
	} else {
		this.displayedSlotCount += 1;
		slot.show();
	}

	this._updatePageSystem();
	if (this.enableAveragePrice) {
		this._updateAveragePrice();
	}
};

StorageViewer.prototype.filterList = function () {
	var searchCriteria = this.filteringOptions.search ? helper.simplifyString(this.filteringOptions.search) : null;
	var isNotAllFilter = this.filteringOptions.filterId !== ItemFilters.filters.all;
	var isNotAllSubFilter = this.filteringOptions.subFilterId !== ItemFilters.subFilters.all;

	var itemTypes = itemManager.getItemTypeMap();

	this.displayedSlotCount = 0;

	for (var itemUID in this.itemList) {
		var item = this.itemList[itemUID];
		var category = itemTypes[item.item.typeId].category;
		var display = this._filter(
			item,
			this.itemsQuantityList[itemUID],
			category,
			searchCriteria,
			isNotAllFilter,
			isNotAllSubFilter
		);
		var slot = this.slotList[item.objectUID];
		if (!display) {
			this.unSelectSlot(item.objectUID);
			slot.hide();
		} else {
			this.displayedSlotCount += 1;
			slot.show();
		}
	}

	this._updatePageSystem();
	if (this.enableAveragePrice) {
		this._updateAveragePrice();
	}
};

StorageViewer.prototype.getDisplayedItemsUIDs = function () {
	var idList = [];
	var slotList = this.slotList;
	for (var uid in slotList) {
		if (slotList[uid].isVisible()) {
			idList.push(uid);
		}
	}
	return idList;
};

StorageViewer.prototype._createSlot = function (itemInstance) {
	var slot = new ItemSlot({ itemData: itemInstance, enableContextMenu: this.enableSlotContext });
	slot.setQuantity(itemInstance.quantity);
	slot.setContextMenu('item', this.contextParams);

	var self = this;
	slot.on('tap', function (params) {
		self._selectSlot(slot);
		self.currentOpenedWindow.emit('slot-tap', this, params.x, params.y);
	});

	slot.on('doubletap', function (params) {
		self.currentOpenedWindow.emit('slot-doubletap', this, params.x, params.y);
	});

	slot.on('dragStart', function () {
		dragManager.setElementSource(this, self.currentOpenedWindow.id);
		self.currentOpenedWindow.emit('slot-dragStart', slot);
	});

	// TODO: as in character view update drag icon ui
	dragManager.setDraggable(
		slot,
		{ backgroundImage: slot.getImage() },
		'storageViewer',
		self.dragSourceData
	);

	this.emit('slotCreated', slot);

	return slot;
};

function numericCompareFn(itemA, itemB, criterion) {
	return itemB[criterion] - itemA[criterion];
}

var compareFnList = {
	none: function (itemA, itemB) {
		return itemB.objectUID - itemA.objectUID;
	},
	name: function (itemA, itemB) {
		return itemB.item.nameId.localeCompare(itemA.item.nameId);
	},
	level: function (itemA, itemB) {
		return itemB.item.level - itemA.item.level;
	},
	totalWeight: function (itemA, itemB) {
		return itemB.quantity * itemB.weight - itemA.quantity * itemA.weight;
	},
	averagePrice: function (itemA, itemB) {
		var priceA = itemA.item.averagePrice;
		priceA = priceA === -1 ? 0 : priceA;

		var priceB = itemB.item.averagePrice;
		priceB = priceB === -1 ? 0 : priceB;
		return priceB - priceA;
	},
	totalAveragePrice: function (itemA, itemB) {
		var priceA = itemA.item.averagePrice;
		priceA = priceA === -1 ? 0 : priceA;

		var priceB = itemB.item.averagePrice;
		priceB = priceB === -1 ? 0 : priceB;

		return itemB.quantity * priceA - itemA.quantity * priceB;
	},
	category: function (itemA, itemB) {
		itemB.item.type.nameId.localeCompare(itemA.item.type.nameId);
	}
};

function compare(criteria, itemA, itemB) {
	for (var i = 0, len = criteria.length; i < len; i += 1) {
		var criterion = criteria[i];
		var compareFn = compareFnList[criterion] || numericCompareFn;

		var res = compareFn(itemA, itemB, criterion);

		if (res !== 0) {
			return res;
		}
	}

	return 0;
}


StorageViewer.prototype._positionItem = function (item) {
	var orderedSlots = this.slotsBox.getChildren();
	var slotToAdd = this.slotList[item.objectUID];

	var self = this;
	for (var i = 0, len = orderedSlots.length; i < len; i += 1) {
		if (compare(self.sortingCriterias, item, orderedSlots[i].itemInstance) < 0) {
			slotToAdd.insertBefore(orderedSlots[i]);
			return;
		}
	}

	this.slotsBox.appendChild(slotToAdd);
};

StorageViewer.prototype._displaySlotPage = function (slotToFind) {
	var storage = this.currentOpenedWindow && this.currentOpenedWindow._storageViewer;
	if (!storage || !storage.slotsPerPage) {
		this.slotToShow = slotToFind;
		return;
	}
	this.slotToShow = null;

	var orderedSlots = this.slotsBox.getChildren();
	var visibleSlotCount = 0;
	for (var i = 0; i < orderedSlots.length; i++) {
		var slot = orderedSlots[i];
		if (!slot.isVisible()) { continue; }

		if (slot === slotToFind) {
			this._displayPage(~~(visibleSlotCount / storage.slotsPerPage));
			return;
		}
		visibleSlotCount++;
	}
};

StorageViewer.prototype.sortBy = function (criteria) {
	if (!criteria) {
		return;
	}

	this.sortingCriterias = criteria;
	var itemList = this.itemList;

	var sortedItemList = Object.keys(itemList).sort(function sort(itemUIDA, itemUIDB) {
		return compare(criteria, itemList[itemUIDA], itemList[itemUIDB]);
	});

	// sorting the dom elements
	for (var i = 0, len = sortedItemList.length; i < len; i += 1) {
		var slot = this.slotList[sortedItemList[i]];
		this.slotsBox.appendChild(slot);
	}
};

StorageViewer.prototype.resetDisplay = function () {
	for (var itemUID in this.itemList) {
		var quantity = this.itemsQuantityList[itemUID] = this.itemList[itemUID].quantity;
		if (!this.slotList[itemUID]) {
			continue;
		}
		this.slotList[itemUID].setQuantity(quantity);
	}

	this.filter.reset();
	this.pageCount = -1;
	this.currentPage = -1;
	this._updatePageSystem();

	if (this.selectedSlot) {
		this.unSelectSlot(this.selectedSlot.itemInstance.objectUID);
	}
};

StorageViewer.prototype.unloadContent = function () {
	this.slotList = {};
	if (this.slotsBox) {
		this.slotsBox.clearContent();
	}
	this.itemsQuantityList = {};
	this.itemList = [];
	this.selectedSlot = null;
	this.contentInitiated = false;
};

StorageViewer.prototype.setItemList = function (itemList) {
	this.slotList = {};
	this.slotsBox.clearContent();
	this.itemsQuantityList = {};
	this.itemList = itemList;
	this.selectedSlot = null;

	for (var itemUID in this.itemList) {
		var item = this.itemList[itemUID];
		this.slotList[itemUID] = this._createSlot(item);
		this.itemsQuantityList[itemUID] = item.quantity;
	}

	this.filterList();
	this._updateFilter();
	this.filter.reset();
	this.sortBy(this.sortingCriterias);
};

StorageViewer.prototype.modifyItem = function (item) {
	if (!this.contentInitiated) {
		return;
	}

	var uid = item.objectUID;
	var slot = this.slotList[uid];
	if (slot) {
		this.unSelectSlot(uid);
		slot.destroy();
	}

	this.slotList[uid] = this._createSlot(item);
	this.itemList[uid] = item;
	this.itemsQuantityList[uid] = item.quantity;
	this._positionItem(item);
	this._filterItem(item);

	if (this.currentOpenedWindow) {
		this.currentOpenedWindow.emit('itemModified', item);
	}
};

StorageViewer.prototype.moveItem = function (item) {
	if (!this.contentInitiated) {
		return;
	}

	this._filterItem(item);
	this._updateFilter();

	if (this.currentOpenedWindow) {
		this.currentOpenedWindow.emit('itemMoved', item);
	}
};

StorageViewer.prototype.setItemQuantity = function (itemUID, quantity) {
	if (!this.contentInitiated) {
		return;
	}

	var slot = this.slotList[itemUID];
	if (!slot) {
		return console.warn('StorageViewer.setItemQuantity: no slot with item UID ' + itemUID);
	}
	slot.setQuantity(quantity);
	this.itemsQuantityList[itemUID] = quantity;
	this._filterItem(this.itemList[itemUID]);
	this._updateFilter();

	if (this.currentOpenedWindow) {
		this.currentOpenedWindow.emit('itemQuantity', this.itemList[itemUID], quantity);
	}
};

StorageViewer.prototype.setItemsQuantity = function (itemsQuantity) {
	if (!this.contentInitiated) {
		return;
	}

	for (var itemUID in itemsQuantity) {
		var slot = this.slotList[itemUID];
		var quantity = itemsQuantity[itemUID];
		slot.setQuantity(quantity);
		this.itemsQuantityList[itemUID] = quantity;
		this._filterItem(this.itemList[itemUID]);
	}

	this._updateFilter();

	if (this.currentOpenedWindow) {
		this.currentOpenedWindow.emit('itemsQuantity', itemsQuantity);
	}
};

StorageViewer.prototype.resetItemQuantity = function (itemUID) {
	var item = this.itemList[itemUID];
	// the item can be gone
	if (!item) {
		return;
	}
	this.setItemQuantity(itemUID, item.quantity);
};

StorageViewer.prototype.resetItemsQuantity = function () {
	for (var itemUID in this.itemList) {
		this.resetItemQuantity(itemUID);
	}
};

StorageViewer.prototype._addItem = function (item) {
	var uid = item.objectUID;
	var slot = this.slotList[uid];
	if (slot) {
		this.unSelectSlot(uid);
		slot.destroy();
	}

	slot = this.slotList[uid] = this._createSlot(item);
	slot.hide();
	this.itemList[uid] = item;
	this.itemsQuantityList[uid] = item.quantity;
};

StorageViewer.prototype.addItem = function (item) {
	if (!this.contentInitiated) {
		return;
	}

	this._addItem(item);
	this._filterItem(item);
	this._positionItem(item);
	this._updateFilter();

	if (this.currentOpenedWindow) {
		this.currentOpenedWindow.emit('itemAdded', item);
	}
};

StorageViewer.prototype.addItems = function (itemList) {
	if (!this.contentInitiated) {
		return;
	}

	for (var itemUID in itemList) {
		var item = itemList[itemUID];
		this._addItem(item);
		this._filterItem(item);
		this._positionItem(item);
	}

	this._updateFilter();

	if (this.currentOpenedWindow) {
		this.currentOpenedWindow.emit('itemsAdded', itemList);
	}
};

StorageViewer.prototype._removeItem = function (itemUID) {
	var slot = this.slotList[itemUID];
	this.unSelectSlot(slot.itemInstance.objectUID);
	slot.destroy();
	delete this.slotList[itemUID];
	delete this.itemList[itemUID];
	delete this.itemsQuantityList[itemUID];
};

StorageViewer.prototype.removeItems = function (itemUIDList) {
	if (!this.contentInitiated) {
		return;
	}

	for (var i = 0, len = itemUIDList.length; i < len; i += 1) {
		this._removeItem(itemUIDList[i]);
	}

	this._updateFilter();

	if (this.currentOpenedWindow) {
		this.currentOpenedWindow.emit('itemsRemoved', itemUIDList);
	}

	this._updateAveragePrice();
};

StorageViewer.prototype.removeItem = function (itemUID) {
	if (!this.contentInitiated) {
		return;
	}

	this._removeItem(itemUID);
	this._updateFilter();

	if (this.currentOpenedWindow) {
		this.currentOpenedWindow.emit('itemRemoved', itemUID);
	}

	this._updateAveragePrice();
};

StorageViewer.prototype.setPodProgressBarValue = function (value) {
	this.progressBar.setValue(value);
	this.progressBar.toggleClassName('green', value < 0.75);
	this.progressBar.toggleClassName('yellow', value >= 0.75 && value < 0.9);
	this.progressBar.toggleClassName('orange', value >= 0.9 && value < 1);
	this.progressBar.toggleClassName('red', value >= 1);
};

StorageViewer.prototype.setMaxWeight = function (maxWeight) {
	this.maxWeight = maxWeight || 1;

	if (!this.contentInitiated) {
		return;
	}

	this.setPodProgressBarValue(this.weight / this.maxWeight);

	if (this.currentOpenedWindow) {
		this.currentOpenedWindow.emit('weightUpdated', this.weight, this.maxWeight);
	}
};

StorageViewer.prototype.setWeight = function (weight, maxWeight) {
	this.weight = weight;
	this.maxWeight = maxWeight || this.maxWeight;

	if (!this.contentInitiated) {
		return;
	}

	this.setPodProgressBarValue(this.weight / this.maxWeight);

	if (this.currentOpenedWindow) {
		this.currentOpenedWindow.emit('weightUpdated', weight, this.maxWeight);
	}
};

StorageViewer.prototype.setKamas = function (kamas) {
	if (!this.contentInitiated) {
		return;
	}

	this.kamasValue = kamas;
	this.kamas.setText(helper.intToString(kamas));

	if (this.currentOpenedWindow) {
		this.currentOpenedWindow.emit('kamasUpdated', kamas);
	}
};

// Returns the itemInstance or null if no slot was found (no slot with this GID or they are filtered out)
StorageViewer.prototype.selectAndShowSlotByGID = function (itemGID) {
	for (var itemUID in this.slotList) {
		var item = this.itemList[itemUID];
		if (item.getProperty('id') !== itemGID) { continue; }

		if (this._selectSlotAndDisplayPage(this.slotList[itemUID])) {
			return item;
		}
	}
	return null;
};

// Returns the itemInstance or null
StorageViewer.prototype.selectAndShowSlotByUID = function (itemUID) {
	var slot = this.slotList[itemUID];
	if (!slot) { return null; }

	if (!this._selectSlotAndDisplayPage(slot)) { return null; }
	return slot.itemInstance;
};

// Returns false if slot cannot be selected (filtered out), in which case this function does nothing
StorageViewer.prototype._selectSlotAndDisplayPage = function (slot) {
	if (!slot.isVisible()) { return false; }
	this._selectSlot(slot);
	this._displaySlotPage(slot);
	return true;
};

StorageViewer.prototype._selectSlot = function (slot) {
	if (this.selectedSlot) {
		if (this.selectedSlot === slot) { return; }
		this.selectedSlot.select(false);
	}

	if (!slot) { return; }
	slot.select();
	this.selectedSlot = slot;
};

StorageViewer.prototype.unSelectSlot = function (itemUID) {
	if (itemUID === undefined) {
		if (this.selectedSlot) {
			this.selectedSlot.select(false);
			this.selectedSlot = null;
		}
		return;
	}

	var slot = this.slotList[itemUID];
	if (this.selectedSlot !== slot) {
		return;
	}

	slot.select(false);
	this.selectedSlot = null;
};

StorageViewer.prototype.toggleSlotSelection = function (itemUID) {
	var slot = this.slotList[itemUID];
	if (this.selectedSlot !== slot) {
		if (this.selectedSlot) {
			this.selectedSlot.select(false);
		}

		slot.select();
		this.selectedSlot = slot;
	} else {
		slot.select(false);
		this.selectedSlot = null;
	}
};

StorageViewer.prototype._setupEvents = function (dataHandler) {
	var self = this;

	dataHandler.on('listUpdate', function (itemList) {
		if (self.currentOpenedWindow) {
			self.setItemList(itemList);
		} else {
			self.listUpdateRequested = itemList;
		}
	});

	dataHandler.on('unloaded', function () {
		self.unloadContent();
	});

	dataHandler.on('itemAdded', function (item) {
		self.addItem(item);
	});

	dataHandler.on('itemsAdded', function (itemList) {
		self.addItems(itemList);
	});

	dataHandler.on('itemDeleted', function (itemUID) {
		self.removeItem(itemUID);
	});

	dataHandler.on('itemsDeleted', function (itemUIDList) {
		self.removeItems(itemUIDList);
	});

	dataHandler.on('itemModified', function (item) {
		self.modifyItem(item);
	});

	dataHandler.on('itemMoved', function (item) {
		self.moveItem(item);
	});

	dataHandler.on('itemQuantity', function (itemUID, quantity) {
		self.setItemQuantity(itemUID, quantity);
	});

	dataHandler.on('itemsQuantity', function (itemsQuantity) {
		self.setItemsQuantity(itemsQuantity);
	});

	dataHandler.on('kamasUpdated', function (kamas) {
		self.setKamas(kamas);
	});

	dataHandler.on('weightUpdated', function (weight, weightMax) {
		self.setWeight(weight, weightMax);
	});

	dataHandler.on('sort', function (criteria) {
		self.sortBy(criteria);
	});
};

/**
 * Get the fake remaining quantity
 * @param {number} uid - Item UID
 * @return {number}
 */
StorageViewer.prototype.getDisplayedQuantity = function (uid) {
	return this.itemsQuantityList[uid];
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/StorageViewer/index.js
 ** module id = 635
 ** module chunks = 0
 **/