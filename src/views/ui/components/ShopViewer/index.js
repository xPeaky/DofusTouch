require('./styles.less');
var addTooltip = require('TooltipBox').addTooltip;
var helper = require('helper');
var inherits = require('util').inherits;
var ItemFilters = require('ItemFilters');
var ItemDescription = require('ItemDescription');
var itemManager = require('itemManager');
var Table = require('TableV2');
var WuiDom = require('wuidom');

function getTooltip() {
	if (!this.tooltipContent) {
		this.tooltipContent = new ItemDescription(this.rowContent);
	}
	return this.tooltipContent;
}


function ShopViewer(tableDescription, indexAttribute, options) {
	WuiDom.call(this, 'div', { className: 'ShopViewer' });

	options = options || {};

	this.itemTypes = {};

	this._createDom(tableDescription, indexAttribute, options);
}
inherits(ShopViewer, WuiDom);
module.exports = ShopViewer;


ShopViewer.prototype._createDom = function (tableDescription, indexAttribute, options) {
	var self = this;

	// Unless option "manualFiltering" is true, we use ItemFilters component
	if (!options.manualFiltering) {
		this.itemFilter = this.appendChild(new ItemFilters(options));
	}

	this.table = this.appendChild(new Table(tableDescription, indexAttribute, options.tableOption));

	this.table.on('rowSlidedLeft', function (row, item) {
		self.emit('rowSlidedLeft', row, item);
	});

	this.table.on('rowSlidedRight', function (row, item) {
		self.emit('rowSlidedRight', row, item);
	});

	this.table.on('rowAdded', function (id, item, row) {
		row.tooltipContent = null;
		addTooltip(row, getTooltip);
	});

	this.table.on('rowTap', function (row, item) {
		self.emit('itemSelected', item);
	});

	if (this.itemFilter) {
		this._setupFiltering();
	}
};

ShopViewer.prototype.setHeader = function (content) {
	this.table.setColumnHeader('name', content);
};

ShopViewer.prototype._setupFiltering = function () {
	var selectedFilter, isNotAllFilter, selectedSubfilter, isNotAllSubFilter, searchCriteria;
	var itemTypes = itemManager.getItemTypeMap();
	var self = this;

	this.itemFilter.on('filter', function (filter, subFilter, search) {
		selectedFilter = filter;
		isNotAllFilter = filter !== ItemFilters.filters.all;
		selectedSubfilter = subFilter;
		isNotAllSubFilter = subFilter !== ItemFilters.subFilters.all;
		searchCriteria = search ? helper.simplifyString(search) : null;

		self.table.filter();
	});

	this.table.addFilter(function (item) {
		var dbItem = item.getItem();
		var category = itemTypes[dbItem.typeId].category;

		if (isNotAllFilter && category !== selectedFilter) {
			return false;
		}
		if (isNotAllSubFilter && dbItem.typeId !== selectedSubfilter) {
			return false;
		}
		if (searchCriteria && dbItem.getNameForSearch().indexOf(searchCriteria) === -1) {
			return false;
		}
		return true;
	});
};

ShopViewer.prototype.filter = function (filterFn) {
	this.table.filter(filterFn);
};

ShopViewer.prototype._unregisterItemType = function (id) {
	var row = this.table.getRow(id);
	if (!row) { return; }
	var item = row.rowContent;

	var typeId = item.getItem().typeId;
	if (!this.itemTypes[typeId]) { return; }

	this.itemTypes[typeId]--;
	if (this.itemTypes[typeId] === 0) {
		delete this.itemTypes[typeId];
	}
};

ShopViewer.prototype._registerItemType = function (item) {
	var typeId = item.getItem().typeId;
	if (this.itemTypes[typeId]) {
		this.itemTypes[typeId]++;
		return false;
	} else {
		this.itemTypes[typeId] = 1;
		return true;
	}
};

ShopViewer.prototype._collectItemTypes = function (addedItems) {
	if (!this.itemFilter) { return; }

	var addedNewItemType = false;
	for (var i = 0; i < addedItems.length; i++) {
		var rowId = this.table.getIdFn(addedItems[i]);
		if (this.table.hasRow(rowId)) { continue; }

		addedNewItemType |= this._registerItemType(addedItems[i]);
	}

	if (addedNewItemType) {
		// Refresh the dropdown of available item types
		this.itemFilter.updateSubFilters(Object.keys(this.itemTypes));
	}
};

ShopViewer.prototype.removeItems = function (itemIdList) {
	for (var i = 0; i < itemIdList.length; i++) {
		this._unregisterItemType(itemIdList[i]);
	}
	this.table.delRows(itemIdList, true);
	// We leave the item type filter (dropdown/selector) unchanged
};

ShopViewer.prototype.getItemCount = function () {
	return this.table.getRowCount();
};

ShopViewer.prototype.selectItem = function (itemUID) {
	this.table.selectRow(itemUID);
};

// Returns the item instance or null
ShopViewer.prototype.getItem = function (itemUID) {
	var row = this.table.getRow(itemUID);
	return row ? row.rowContent : null;
};

// Used to find items by generic item ID
function filterByGID(item, itemGID) { return item.objectGID === itemGID; }

// Returns item UID (= rowId)
ShopViewer.prototype.findItemByGID = function (itemGID) {
	return this.table.findRow(filterByGID, itemGID);
};

ShopViewer.prototype.selectFilter = function (typeId) {
	this.itemFilter.selectSubfilter(typeId);
};

ShopViewer.prototype.clearContent = function () {
	this.itemTypes = {};
	this.table.clearContent();
};

// Replaces the current items displayed (all of them) by a new list.
// See also addItems method.
ShopViewer.prototype.setItemList = function (items) {
	this.clearContent();

	if (this.itemFilter) {
		this._collectItemTypes(items);
		if (!items.length) { this.itemFilter.updateSubFilters([]); }
		this.itemFilter.reset();
	}

	this.table.addList(items, /*animated=*/true);
};

// Add items to the current ones.
// See also setItemList method.
ShopViewer.prototype.addItems = function (items) {
	this._collectItemTypes(items);
	this.table.addList(items, /*animated=*/true, /*shouldReplace=*/true);
};

// Add items, filter on the new items' type, and select the first of them.
ShopViewer.prototype.addItemsAndHighlightThem = function (items) {
	this._collectItemTypes(items);

	this.selectFilter(items[0].getProperty('typeId'));

	this.table.addList(items, /*animated=*/true, /*shouldReplace=*/true);

	this.selectItem(items[0].objectUID);
};

ShopViewer.prototype.setPlaceholder = function (text) {
	this.table.setPlaceholderText(text);
};

// Call this when the size of the viewer changed
ShopViewer.prototype.refresh = function () {
	this.table.placeholder.refresh();
	this.table.scroller.refresh();
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/ShopViewer/index.js
 ** module id = 386
 ** module chunks = 0
 **/