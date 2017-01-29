require('./styles.less');
var addTooltip = require('TooltipBox').addTooltip;
var getText = require('getText').getText;
var inherits = require('util').inherits;
var InputBox = require('InputBox');
var itemManager = require('itemManager');
var Button = require('Button');
var WuiDom = require('wuidom');
var Selector = require('Selector');

var filters = { all: -1 };
for (var category in itemManager.categories) {
	filters[category] = itemManager.categories[category];
}

var subFilters = { all: -1 };
var filterList = [
	filters.all,
	filters.equipment,
	filters.consumables,
	filters.resources,
	filters.quest,
	filters.preset
];

var tooltips;

/**
 @class ItemFilters
 @desc Filter buttons used to filter merchant stocks or inventory by type of object
 */
function ItemFilters(options) {
	WuiDom.call(this, 'div', { className: 'ItemFilters' });

	if (!tooltips) {
		tooltips = [
			getText('ui.common.all'),
			getText('ui.common.equipement'),
			getText('ui.common.usableItems'),
			getText('ui.common.ressources'),
			getText('ui.common.quest.objects'),
			getText('ui.common.presets')
		];
	}

	options = options || {};

	var self = this;
	var filterButtonList = {};
	var selectList = {};
	var subFiltersSelect = [];

	// FILTERS : all, equipment, consumables, resources, quest, preset
	var filtersBox = this.createChild('div', { className: 'filters' });
	var filterBtnMap = this.filterBtnMap = {}; // category => WuiDom button

	// SUB FILTERS : leather, miscellaneous, axes...
	var subFiltersBox = this.subFiltersBox = this.createChild('div', { className: 'subFiltersBox' });

	// SEARCH
	var searchBox = this.createChild('div', { className: 'searchBox' });
	addTooltip(searchBox, getText('ui.common.searchFilterTooltip'));
	var searchInput;
	searchBox.hide();

	function updateFilterDisplay(filter, subFilter) {
		if (self.selectedFilter !== filter) {
			if (filterButtonList[self.selectedFilter]) {
				filterButtonList[self.selectedFilter].delClassNames('selected');
				selectList[self.selectedFilter].wdSelect.hide();
			}

			self.selectedFilter = filter;
			filterButtonList[filter].addClassNames('selected');

			// top filter changed, so we reset the subfilter (combobox) to the 'all' value
			selectList[filter].wdSelect.show();
			self.selectedSubFilter = selectList[filter].wdSelect.selectFirst(true);
		} else {
			self.selectedSubFilter = subFilter;
		}

		self.emit('filter', self.selectedFilter, self.selectedSubFilter);
	}

	function handleSearchInput(value) {
		self.emit('filter', self.selectedFilter, self.selectedSubFilter, value);
	}

	this.closeSearchBox = function () {
		subFiltersBox.toggleDisplay(self.selectedFilter !== filters.preset);
		searchInput.setValue('');
		searchBox.hide();
	};

	// when clicking on the top icons
	function onFilterSelection() {
		subFiltersBox.toggleDisplay(this.filter !== filters.preset);
		searchBox.hide();
		searchInput.setValue('');
		updateFilterDisplay(this.filter, self.selectedSubFilter);
	}

	this.selectCategory = function (category) {
		updateFilterDisplay(category, self.selectedSubFilter);
	};

	this.selectSubfilter = function (subFilter) {
		var filter = self.selectedFilter;
		var selector = selectList[filter].wdSelect; // the UI Selector component
		if (!selector.hasValue(subFilter)) { return false; }

		selector.select(subFilter, /*silently=*/true);
		updateFilterDisplay(filter, subFilter);
		return true;
	};

	// when clicking on the combo box
	function onSubFilterSelection(value) {
		updateFilterDisplay(self.selectedFilter, parseInt(value, 10));
	}

	this.reset = function () {
		for (var i = 0, len = subFiltersSelect.length; i < len; i += 1) {
			var selector = subFiltersSelect[i];
			selector.selectFirst(true);
		}
		var filter = filters.all;
		var firstSubFilter = selectList[filter].wdSelect.selectFirst(true);
		updateFilterDisplay(filter, firstSubFilter);
	};

	this.updateSubFilters = function (itemTypeIdList) {
		var itemTypes = itemManager.getItemTypeMap();

		var subFilterOptions = itemTypeIdList.sort(function (id1, id2) {
			return itemTypes[id1].nameId.localeCompare(itemTypes[id2].nameId);
		});

		for (var filter in selectList) {
			selectList[filter].wdSelect.clearContent();

			if (!options.noAllCategory) {
				selectList[filter].wdSelect.addOption(getText('ui.common.allTypesForObject'), subFilters.all);
			}
		}

		var allSelect = selectList[filters.all];

		for (var i = 0, len = subFilterOptions.length; i < len; i += 1) {
			var itemType = itemTypes[subFilterOptions[i]];
			var select = selectList[itemType.category];

			select.wdSelect.addOption(itemType.nameId, itemType.id);
			allSelect.wdSelect.addOption(itemType.nameId, itemType.id);
		}
	};

	this.toggleCategoryDisplay = function (category, toggle) {
		filterBtnMap[category].toggleDisplay(toggle);
	};

	// Create each top button and their respective sub categories
	var filterContent = filtersBox.createChild('div', { className: 'content' });
	for (var i = 0, len = filterList.length; i < len; i++) {
		var filter = filterList[i];

		var filterClassNames = ['filter', (itemManager.getCategoryName(filter) || 'all')];
		var filterBtn = filterContent.appendChild(new Button({ className: filterClassNames }, onFilterSelection));
		filterBtnMap[filter] = filterBtn;
		addTooltip(filterBtn, tooltips[i]);

		filterBtn.filter = filter;
		filterBtn.on('tap', onFilterSelection);
		filterButtonList[filter] = filterBtn;

		filterBtn.createChild('div', { className: 'icon' });

		var subFilterSelect = subFiltersBox.appendChild(new Selector({ className: 'subFilterSelect' }));
		subFiltersSelect.push(subFilterSelect);
		subFilterSelect.on('change', onSubFilterSelection);
		subFilterSelect.hide();
		selectList[filter] = { wdSelect: subFilterSelect };
	}

	// Search
	function toggleSearchDisplay() {
		var display = !searchBox.isVisible();
		subFiltersBox.toggleDisplay(!display);
		searchBox.toggleDisplay(display);
		searchInput.setValue('');
	}

	var searchBtn = subFiltersBox.appendChild(new Button({ className: 'searchBtn' }, toggleSearchDisplay));
	addTooltip(searchBtn, getText('ui.common.sortOrSearch'));
	this.searchInput = searchInput = searchBox.appendChild(new InputBox());
	searchInput.on('change', handleSearchInput);
	var closeBtn = searchBox.appendChild(new Button({ className: 'closeBtn' }, toggleSearchDisplay));
	addTooltip(closeBtn, getText('ui.common.sortOrSearch'));

	searchBox.on('show', function () {
		self.emit('searchOpen');
	});

	searchBox.on('hide', function () {
		self.emit('searchClose');
	});

	this.isSearchOpen = searchBox.isVisible;

	// Current filter's value - will be set & reset in this.reset()
	this.selectedFilter = null;
	this.selectedSubFilter = null;
}

inherits(ItemFilters, WuiDom);

ItemFilters.filters = filters;
ItemFilters.subFilters = subFilters;

module.exports = ItemFilters;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/ItemFilters/index.js
 ** module id = 388
 ** module chunks = 0
 **/