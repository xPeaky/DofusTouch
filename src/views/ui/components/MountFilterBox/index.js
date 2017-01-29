require('./styles.less');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var InputBox = require('InputBox');
var MountFilters = require('./mountFilters.js');
var Selector = require('Selector');
var SnapSlider = require('SnapSlider');
var Scroller = require('Scroller');
var Button = require('Button');
var tapBehavior = require('tapBehavior');
var WuiDom = require('wuidom');

// const
var SNAP_OFF = 1;
var SNAP_A = 0;
var SNAP_B = 2;


// class
function MountFilterBox() {
	WuiDom.call(this, 'div', { className: ['MountFilterBox', 'transition'] });

	// properties
	this.mountFilters = new MountFilters();
	this._activeFilters = {}; // id: filter
	this.defaultExpandedSections = { // ID must be defined in MountFilters.js/categories
		text: true,
		type: true,
		breeding: true
	}; // TODO?: use enums to set ids dynamically
	this.flagMap = []; // left, middle, right snaps (include, all, exclude)

	// ui
	this.filterSections = {}; // categoryId: wuidom
	this.filterBoxes = {}; // filterId: wuidom

	var self = this;

	// init
	this.isResetPending = false;
	this.flagMap[SNAP_A] = true;
	this.flagMap[SNAP_B] = false;
	this.flagMap[SNAP_OFF] = null;

	if (this.mountFilters.ready) {
		this._createDom();
	} else {
		this.mountFilters.once('ready', function () {
			self._createDom();
		});
	}
}

inherits(MountFilterBox, WuiDom);
module.exports = MountFilterBox;

// private
MountFilterBox.prototype._createDom = function () {
	var self = this;

	// sections
	this._setupFilterSections();

	// text filter
	this._setupSearchBar();

	// type selector
	this._setupTypeSelector();

	// filter boxes
	this._setupFilterBoxes();

	// reset button
	this.appendChild(new Button({
		text: getText('ui.common.reset'),
		className: ['button', 'resetButton']
	}, function () {
		self.resetFilters();
		self._emitUpdate();
	}));

	this.ready = true;
	self.resetFilters();
	this.emit('ready');
};

MountFilterBox.prototype._emitUpdate = function () {
	if (this.isResetPending) { return; }

	this._highlightHeaders();

	this.emit('activeFiltersUpdated', this._activeFilters);
};

MountFilterBox.prototype._setupFilterSections = function () {
	var self = this;

	function toggleSection() {
		this.isCollapsed = !this.isCollapsed;
		var section = self.filterSections[this.categoryId];
		this.toggleClassName('collapse', this.isCollapsed);
		section.toggleClassName('collapse', this.isCollapsed);
		// There is a transition on the collapse/deploy so we need to wait to refresh the scroller
		window.setTimeout(function () {
			self.sectionsContainer.refresh();
		}, 250); // TODO: use a tweener instead of CSS animation
	}

	var filterCategories = this.mountFilters.categories;
	this.sectionsContainer = this.appendChild(new Scroller({ className: 'sectionsContainer' }));
	for (var i = 0; i < filterCategories.length; i += 1) {
		var category = filterCategories[i];

		var sectionHeader = this.sectionsContainer.content.createChild('div', { className: 'sectionHeader' });
		sectionHeader.arrow = sectionHeader.createChild('div', { className: 'sectionArrow' });
		sectionHeader.title = sectionHeader.createChild('div', { className: 'sectionTitle', text: category.name });
		sectionHeader.categoryId = category.id;

		var section = this.filterSections[category.id] = this.sectionsContainer.content.createChild('div', {
			className: ['transition', 'filterSection', category.id]
		});

		// default expanded sections
		if (!this.defaultExpandedSections[category.id]) {
			toggleSection.call(sectionHeader);
		}

		tapBehavior(sectionHeader);
		section.sectionHeader = sectionHeader;
		sectionHeader.on('tap', toggleSection);
	}
};

MountFilterBox.prototype._setupSearchBar = function () {
	var self = this;

	var clearSearchButton;
	var searchActive;

	function searchInputChanged(query) {
		self.searchStr = (query || '').toLowerCase();
		if (self.searchStr) {
			self._activeFilters.text = self.mountFilters.filterMap.text;

			self._activeFilters.text.args = query;
			self._activeFilters.text.name = '\"' + query + '\"';
		} else {
			delete self._activeFilters.text;
		}
		searchActive.toggleDisplay(!!query);

		if (query) {
			clearSearchButton.enable();
		} else {
			clearSearchButton.disable();
		}
		clearSearchButton.toggleClassName('disabled', !query);

		self._emitUpdate();
	}

	var textCatId = this.mountFilters.categories[this.mountFilters.catEnum.TEXT].id;
	var textFilterSection = this.filterSections[textCatId];

	var searchInput = this.searchInput = textFilterSection.appendChild(new InputBox({ className: 'searchInput' }));
	var placeholder = getText('ui.common.search');

	searchInput.setPlaceholder(placeholder.charAt(0).toUpperCase() + placeholder.slice(1));
	searchInput.on('change', searchInputChanged);

	clearSearchButton = textFilterSection.createChild('div', { className: ['clearSearchButton', 'disabled'] });
	tapBehavior(clearSearchButton);
	clearSearchButton.disable();

	searchActive = textFilterSection.createChild('div', { className: 'searchActive', text: '*', hidden: true });

	clearSearchButton.on('tap', function () {
		self._clearSearchInput();
	});
};

MountFilterBox.prototype._setupFilterBoxes = function () {
	// auto select by tapping labels
	function labelTapped() {
		var slider = this.filterBox.getChild('slider');
		if (!this.anti) {
			slider.setGrip(SNAP_A);
		} else {
			slider.setGrip(SNAP_B);
		}
	}

	// based on each filter, create appropriate input type
	// NOTE: filters inclusive by default
	var modelCatId = this.mountFilters.categories[this.mountFilters.catEnum.TYPE].id;
	for (var i = 0; i < this.mountFilters.filters.length; i += 1) {
		var filter = this.mountFilters.filters[i];

		// exceptions
		if (filter.id === 'text' || filter.id.indexOf(modelCatId) > -1) {
			// text filter linked to searchbar, model types linked to type selector
			continue;
		}

		// create box that contains snap slider
		var filterBox = this.filterSections[filter.category].createChild('div', { className: 'filterBox' });
		this.filterBoxes[filter.id] = filterBox;

		// every filter box has a label
		var label = filterBox.label = filterBox.createChild('div', { className: 'filterLabel', text: filter.name });

		// antilabel, if available
		var antiLabel;
		if (!filter.interval) { // exclude range filters
			antiLabel = filterBox.createChild('div', {
				className: 'filterAntiLabel',
				text: filter.antiName || getText('tablet.mount.filter.not')
			});
		}

		if (!filter.interval) { // filter method length is args (flag, benchmarks, etc)
			// label actions for flag-based filter boxes
			label.filterBox = filterBox;
			tapBehavior(label);
			label.on('tap', labelTapped);

			if (antiLabel) {
				antiLabel.filterBox = filterBox;
				antiLabel.anti = true;
				tapBehavior(antiLabel);
				antiLabel.on('tap', labelTapped);
			}

			filterBox.appendChild(this._createFlagSlider(filter));
		} else { // interval interpreted as range
			filterBox.appendChild(this._createRangeSlider(filter));
		}
	}
};

MountFilterBox.prototype._setupTypeSelector = function () {
	var self = this;

	function typeSelected(filterId) {
		// If same value was selected *again*, ignore it
		if (self.selectedTypeFilterId === filterId) {
			return;
		}

		// remove last type filter from active list
		delete self._activeFilters[self.selectedTypeFilterId];

		// add this type filter
		if (filterId) {
			var filter = self.mountFilters.filterMap[filterId];
			self._activeFilters[filterId] = filter;

			self._activeFilters[filterId].args = filterId;
		} // otherwise shows all types

		self.selectedTypeFilterId = filterId;

		self._emitUpdate();
	}

	// for checking against one mount type at a time
	var modelCatId = this.mountFilters.categories[this.mountFilters.catEnum.TYPE].id;
	var typeFilterSection = this.filterSections[modelCatId];
	this.typeSelector = typeFilterSection.appendChild(new Selector({ className: 'typeSelector' }));
	this.typeSelector.addOption(getText('tablet.mount.filter.allTypes'));
	this.typeSelector.on('change', typeSelected);

	for (var i = 0; i < this.mountFilters.filters.length; i += 1) {
		var filter = this.mountFilters.filters[i];
		if (filter.id.indexOf(modelCatId) === -1 || filter.id === 'text') {
			continue;
		}
		this.typeSelector.addOption(filter.name, filter.id); // 'type name', 'model1'
	}
};

MountFilterBox.prototype._highlightHeaders = function () {
	var id;
	for (id in this.filterSections) {
		this.filterSections[id].sectionHeader.delClassNames('active');
	}
	for (id in this._activeFilters) {
		var activeFilter = this._activeFilters[id];
		var sectionHeader = this.filterSections[activeFilter.category].sectionHeader;
		sectionHeader.addClassNames('active');
	}
};

MountFilterBox.prototype._clearSearchInput = function () {
	this.searchInput.setValue('');
	this.searchInput.emit('change', '');
};

MountFilterBox.prototype._createFlagSlider = function (filter) {
	var self = this;

	// check input against A (include), B (all), or C (exclude)
	var slider = new SnapSlider({
		name: 'slider',
		numSnaps: 3
	});

	slider.filterId = filter.id;

	function snapped(snapId) {
		var filterBox = self.filterBoxes[this.filterId];
		if (snapId === filterBox.snapId) {
			return;
		}
		filterBox.snapId = snapId;

		// prepare filter
		var flag = self.flagMap[snapId];
		var args = [flag];

		// if filter function takes a second argument, it also uses a bench
		if (filter.do.length === 2) { // flag + bench
			args.push(filter.id); // e.g. 'behavior1'
		}

		// add / remove active filters to list based on flag
		if (flag !== null) {
			self._activeFilters[filter.id] = filter;
			self._activeFilters[filter.id].args = args;
		} else {
			delete self._activeFilters[filter.id];
		}

		// ui
		filterBox.setClassNames(['filterBox', 'flag' + snapId]);

		self._emitUpdate();
	}

	slider.labelSnap(SNAP_OFF, getText('tablet.mount.filter.slider.all'));
	slider.on('setGrip', snapped);

	return slider;
};

MountFilterBox.prototype._createRangeSlider = function (filter) {
	var self = this;

	var numSnaps = ((Math.abs(filter.min) + Math.abs(filter.max)) / filter.interval) + 1;

	var slider = new SnapSlider({
		name: 'slider',
		numSnaps: numSnaps,
		numGrips: 2,
		isRange: true
	});

	slider.filterId = filter.id;

	// setup labels
	for (var i = 0; i < numSnaps; i += 1) {
		var snapValue = filter.min + filter.interval * i;

		var snapLabel;
		if (filter.criticalValues) {
			snapLabel = filter.criticalValues.indexOf(snapValue) > -1 ? snapValue : '';
		} else {
			snapLabel = snapValue;
		}

		if (filter.formatValue && snapLabel) {
			snapLabel = filter.formatValue(snapValue);
		}

		slider.labelSnap(i, snapLabel);
	}

	function snapped() {
		slid.call(this);
		self._emitUpdate();
	}

	function slid() {
		// update args and ui while sliding
		var filterBox = self.filterBoxes[this.filterId];

		// prepare filter
		var args = [];
		for (var id in this.grips) {
			var grip = this.grips[id];
			var snapValue = grip.snapValue = filter.min + filter.interval * (grip.snapId);
			args[id] = snapValue; // grip1 -> benchLow, grip2 -> benchHigh
		}

		// filter is off if both min and max values selected (show everything)
		var benchLow = this.grips[0].snapValue;
		var benchHigh = this.grips[1].snapValue;
		if (benchLow !== filter.min || benchHigh !== filter.max) {
			self._activeFilters[filter.id] = filter;
			self._activeFilters[filter.id].args = args;

			filterBox.label.setText(filter.name +
				' (' + benchLow + ' ' + getText('tablet.mount.filter.to') + ' ' + benchHigh + ')');
			filterBox.addClassNames('on');
		} else {
			delete self._activeFilters[filter.id];

			filterBox.label.setText(filter.name);
			filterBox.delClassNames('on');
		}
	}

	slider.on('setGrip', snapped);
	slider.on('slideGrip', slid);

	return slider;
};

// NB: only resets the UI elements; does not emit any event.
MountFilterBox.prototype.resetFilters = function () {
	if (!this.ready) {
		return;
	}
	this.isResetPending = true;

	for (var id in this.filterBoxes) {
		var slider = this.filterBoxes[id].getChild('slider');
		if (!slider) {
			continue;
		}

		var numGrips = Object.keys(slider.grips).length;
		var numSnaps = Object.keys(slider.snaps).length;

		// TODO? streamline below crude logic to include any number of grips (do more math here)
		if (numGrips === 1) { // a/b
			slider.setGrip(1, undefined);
		} else if (numGrips === 2) { // range
			slider.setGrip(0, 0);
			slider.setGrip(numSnaps - 1, 1);
		}
	}

	this._clearSearchInput();

	this.typeSelector.selectFirst(); // this is where we "emit" the reset of everything

	this.isResetPending = false;
};

MountFilterBox.prototype.updateTypeSelector = function (typeIds) {
	if (!this.ready) {
		this.once('ready', function () {
			this.updateTypeSelector(typeIds);
		});
		return;
	}

	typeIds = typeIds || []; // mount types player has available
	var typeId;

	// enable options that are still searchable
	var allTypeIds = this.mountFilters.allTypeIds;
	for (var i = 0; i < allTypeIds.length; i += 1) {
		typeId = allTypeIds[i];

		var shouldHide = typeIds.indexOf(typeId) < 0;
		this.typeSelector.setOptionHidden(i + 1, shouldHide); // first selector row is All Types
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/MountFilterBox/index.js
 ** module id = 673
 ** module chunks = 0
 **/