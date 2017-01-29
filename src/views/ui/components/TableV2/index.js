require('./styles.less');
var Button = require('Button');
var Placeholder = require('Placeholder');
var WuiDom = require('wuidom');
var tapBehavior = require('tapBehavior');
var slideBehavior = require('slideBehavior');
var inherits = require('util').inherits;
var Scroller = require('Scroller');
var tweener = require('tweener');

var MAX_ANIMATED_ROWS = 26; // ideally MAX_ANIMATED_ROWS = 2 * <num-visible-rows-on-screen>
var TRANSITION_DELAY = 40;
var TRANSITION_TIME = 100;


function defaultCompare(a, b) {
	if (a > b) { return 1; }

	if (b > a) { return -1; }

	return 0;
}

function getPropertyInContent(content) {
	return content[this.id];
}

function getContent(content) {
	return content;
}

/**
 * Table component for Dofus UI.
 * @constructor
 *
 * @param {[]}  cols - columns parameters
 *
 * @param {string} cols.id - an id for the column.
 * @param {WuiDom|string} [cols.header] - what appears in the header
 * @param {function} [cols.format] - the method used to create the column content. It will be given the raw data for
 *   creation as first parameter. If the property is not defined, the id of the column is used as property with the raw
 *   to fill in the cell content. (ie: if id = 'subAreaName', then format(data) { return data['subAreaName'] } )
 * @param {function} [cols.sort] - sorting method for this column. if sorted is set to 'true', the sorting will be
 *   done with the column id, as a numeric value or a string.
 *   (ie: id id = 'subAreaName', then sort(a, b) { return a.subAreaName.localCompare(b.subAraName); })
 * @param {function} [cols.getContent] - returns the information to sort on (if there is no sort method specified)
 *   and/or to create the cell content with (if there is no format method specified).
 * @param {boolean} [cols.defaultCompare] - true is the column is the default one. If none specified. the first
 *   'sortable' column will be used as default.
 * @param {string} [cols.order] - the default order to sort the column with (ascending/descending).
 *   default is 'ascending'.
 *
 * @param {string|function} [indexBy] - If string, parameter to index the rows with.
 *   If indexBy is a function, indexBy(rowData) must return the id.
 *   If indexBy not given, rows will be given sequential IDs (0, 1, 2...)
 *
 * @param {Object} [options] - Optional options
 * @param {boolean} [options.clickable] - will the (entire) row be clickable. true by default.
 * @param {boolean} [options.noHeader] - true to not create a header. false by default.
 * @param {function} [options.onRowCreation]
 *
 * ie: ConquestTab/index.js.
 *  [{
		id: 'subAreaName',
		header: getText('ui.map.subarea'),
		format: function (prism) {
			var name = new WuiDom('div', { text: prism.subAreaName + ' (' + prism.areaName + ')' });
			addTooltip(name, getText('ui.zaap.prism'));
			return name;
		},
		sort: true,
		defaultCompare: true
	}],
    'subAreaId',
    { clickable: false }
 */
function Table(cols, indexBy, options) {
	WuiDom.call(this, 'div', { className: 'TableV2' });

	options = options || {};

	if (indexBy) {
		if (typeof indexBy === 'function') {
			this.getIdFn = indexBy;
		} else {
			this.getIdFn = function (content) { return content[indexBy]; };
		}
	} else {
		var index = 0;
		this.getIdFn = function () {
			return index++;
		};
	}

	this.cols = cols;
	this._selectedRow = null;
	this.colIndex = {};

	for (var i = 0, len = cols.length; i < len; i += 1) {
		var colInfo = cols[i];
		this.colIndex[colInfo.id] = i;
		// if there is no format method, we consider the column id as the property to display directly in the cell
		colInfo.format = colInfo.format || colInfo.getContent || getPropertyInContent;

		if (!colInfo.sort) { continue; }

		if (typeof colInfo.sort === 'function') {
			colInfo.getContent = colInfo.getContent || getContent;
		} else {
			colInfo.sort = defaultCompare;
			colInfo.getContent = colInfo.getContent || getPropertyInContent;
		}

		colInfo.order = colInfo.order || 'ascending';
		if (colInfo.defaultSorter) {
			this.defaultSorter = colInfo;
			this.defaultOrder = colInfo.order; // need to keep it since colInfo can change with user action
			this.sortBy = colInfo;
		}
	}

	this._clickable = options.clickable !== false;

	if (!options.noHeader) {
		this._addHeader();
	}

	if (options.sorter) {
		this.setSorter(options.sorter);
	}

	this._onRowCreation = options.onRowCreation;

	this.scroller = this.appendChild(new Scroller({ className: 'tableScroller' }));
	// this will contain all the rows and give us access to them through the WuiDom API:
	// - by Id: getChild(id)
	// - by index: getChildren()[index]
	this.rows = this.scroller.content;
	this.rows.addClassNames('tableContent');

	this._slidable = options.slidable;
	if (this._slidable) {
		this._createSlideBackElement();
	}

	this.filters = [];
	this.placeholder = null;
}

inherits(Table, WuiDom);
module.exports = Table;

Table.prototype._createSlideBackElement = function () {
	var slideBack = this._slideBack = new WuiDom('div', { className: 'slideBackElement' });
	slideBack.setStyle('opacity', 0);
	slideBack.appendChild(this._slidable);
	slideBack.rowId = null;
	slideBack.side = 'left';
	this.scroller.appendChild(slideBack);
};

function sortBtnHandler() {
	// "this" is the column button
	this.myTable._sortByColumn(this);
}

/**
 * Update of a column's header (accepts string or Wuidom)
 * @param {string} colId
 * @param {string|Wuidom} content
 */
Table.prototype.setColumnHeader = function (colId, content) {
	var colHeader = this.header.row.getChild(colId);
	if (!colHeader) { return console.error('setColumnHeader: invalid colId:', colId); }

	if (typeof content === 'string') {
		colHeader.content.setText(content);
	} else {
		colHeader.content.clearContent();
		colHeader.content.appendChild(content);
	}

	colHeader.sorter.toggleClassName('noText', !content);
};

/**
 * Hides/shows sorting hint (triangle)
 * @param {string} colId
 * @param {boolean} shouldHide
 */
Table.prototype.setSortingHintVisible = function (colId, shouldHide) {
	var colHeader = this.header.row.getChild(colId);
	if (!colHeader) { return console.error('setSortingHintVisible: invalid colId:', colId); }
	colHeader.sorter.toggleClassName('noTriangle', !!shouldHide);
};

Table.prototype._addHeader = function () {
	this.header = this.createChild('div', { className: 'tableHeader' });
	var row = this.header.row = this.header.createChild('div', { className: 'row' });

	for (var i = 0, len = this.cols.length; i < len; i += 1) {
		var colInfo = this.cols[i];

		var cell;
		if (colInfo.sort) {
			cell = row.appendChild(new Button({ className: ['col', colInfo.id], name: colInfo.id }, sortBtnHandler));
			cell.myTable = this;
		} else {
			cell = row.createChild('div', { className: ['col', colInfo.id] });
		}
		row[colInfo.id] = cell;

		if (!colInfo.header && !colInfo.sort) { continue; }

		cell.content = cell.createChild('div', { className: 'headerContent' });
		if (colInfo.header instanceof WuiDom) {
			cell.content.appendChild(colInfo.header);
		} else {
			cell.content.setText(colInfo.header || '');
		}

		if (!colInfo.sort) { continue; }

		cell.addClassNames(colInfo.order);
		cell.sorter = cell.createChild('div', { className: 'sortBtn' });
		this._toggleTriangle(cell, !!colInfo.defaultSorter);
		cell.sortBy = colInfo;
		if (!colInfo.header) { cell.sorter.addClassNames('noText'); }
	}
};

Table.prototype.setContentLoading = function (loading) {
	this.scroller.toggleClassName('spinner', loading);
};

/** @param {string} [text] - placeholder's text or null/undefined/'' to hide previous placeholder */
Table.prototype.setPlaceholderText = function (text) {
	if (!this.placeholder) {
		if (!text) { return; }
		this.placeholder = new Placeholder(this, { headerElement: this.header });
	}

	this.placeholder.setText(text);
};

Table.prototype._toggleTriangle = function (sortBtn, shouldShow) {
	sortBtn.toggleClassName('showingTriangle', shouldShow);
};

Table.prototype._hideCurrentTriangle = function () {
	var sortInfo = this.sortBy;
	if (sortInfo && sortInfo.id) {
		this._toggleTriangle(this.header.row[sortInfo.id], false);
	}
};

Table.prototype.setSorter = function (compareFn, order) {
	this._hideCurrentTriangle();
	this.sortBy = {
		order: order || 'ascending',
		sort: compareFn,
		getContent: getContent
	};
};

// If newOrder is not given, this toggles when same column is hit twice
Table.prototype._sortByColumn = function (sortBtn, newOrder) {
	// Same button hit twice?
	if (this.sortBy === sortBtn.sortBy && !newOrder) {
		// Toggle the sort order
		newOrder = sortBtn.sortBy.order === 'ascending' ? 'descending' : 'ascending';
	} else {
		// Sort on a different column OR sort reset
		this._hideCurrentTriangle();
		this.sortBy = sortBtn.sortBy;
		this._toggleTriangle(sortBtn, true);
	}
	if (newOrder) {
		sortBtn.sortBy.order = newOrder;
		sortBtn.toggleClassName('descending', newOrder === 'descending');
	}

	this.scroller.removeChild(this.rows);
	this.sort();
	this.scroller.appendChild(this.rows);
};

Table.prototype.resetSort = function () {
	if (!this.defaultSorter) { return; } // no default sorter defined so we cannot "reset"

	var sortBtn = this.header.row[this.defaultSorter.id];
	this._sortByColumn(sortBtn, this.defaultOrder);
};

Table.prototype.sort = function (compareFn, order) {
	if (compareFn) { // the user specified a sorting method, it becomes the current one.
		this.setSorter(compareFn, order);
	}

	if (this.sortBy) { // sort by the current sorting method
		var sortInfo = this.sortBy;
		var factor = sortInfo.order === 'ascending' ? 1 : -1;

		compareFn = function (rowA, rowB) {
			return sortInfo.sort(sortInfo.getContent(rowA.rowContent), sortInfo.getContent(rowB.rowContent)) * factor;
		};
	} // else: no sorting, we just need to append the rows and update the colors

	var rows = this.rows.getChildren();
	if (compareFn) { rows.sort(compareFn); }

	var odd = true;
	for (var i = 0, len = rows.length; i < len; i += 1) {
		var row = rows[i];

		if (compareFn) { this.rows.appendChild(row); }

		if (!row.isVisible()) {
			continue;
		}

		row.toggleClassName('odd', odd);
		odd = !odd;
	}
};


Table.prototype._insertRowInRightPosition = function (rowToInsert) {
	var sortInfo = this.sortBy;
	var compareFn, factor, rowContent;
	if (sortInfo) {
		compareFn = sortInfo.sort;
		factor = sortInfo.order === 'ascending' ? 1 : -1;
	}

	if (compareFn) {
		rowContent = sortInfo.getContent(rowToInsert.rowContent);
	}

	// if there is no sorting method, we append a new row at the end or update an existing one.
	var alreadyInserted = false;
	var inserted = false;
	var odd = true;
	var rows = this.rows.getChildren();
	for (var i = 0, len = rows.length; i < len; i += 1) {
		var row = rows[i];

		if (row === rowToInsert) {
			if (compareFn) {
				continue;
			} else {
				alreadyInserted = true;
			}
		}

		if (!inserted && compareFn && compareFn(rowContent, sortInfo.getContent(row.rowContent)) * factor < 0) {
			rowToInsert.insertBefore(row);
			inserted = true;

			if (rowToInsert.isVisible()) {
				rowToInsert.toggleClassName('odd', odd);
				odd = !odd;
			}
		}

		if (!row.isVisible()) { continue; }

		row.toggleClassName('odd', odd);
		odd = !odd;
	}

	if (!inserted && !alreadyInserted) {
		this.rows.appendChild(rowToInsert);
		rowToInsert.toggleClassName('odd', odd);
	}
};

/**
 * Look for a row that verifies a filter (filter returns true)
 * @param {function} filterFn - called as filterFn(rowContent, data); must return true if verified
 * @param {*} [data] - optional data of any type will be passed to the filtering function as is
 * @return {rowId|null} - null if not found; otherwise first row that verified the filter
 */
Table.prototype.findRow = function (filterFn, data) {
	var rows = this.rows.getChildren();
	for (var i = 0, len = rows.length; i < len; i += 1) {
		var row = rows[i];
		if (filterFn.call(this, row.rowContent, data)) { return row.rowId; }
	}
	return null;
};

Table.prototype.filter = function (filterFn) {
	var rows = this.rows.getChildren();
	var odd = true;

	filterFn = filterFn || this._shouldDisplayRow;

	for (var i = 0, len = rows.length; i < len; i += 1) {
		var row = rows[i];

		var display = filterFn.call(this, row.rowContent);
		row.toggleDisplay(display);

		if (!display) {
			continue;
		}

		if (tweener.cancelTween(row)) { // if filter is set during animation, better stop it
			row.setStyle('webkitTransform', null);
		}
		row.toggleClassName('odd', odd);
		odd = !odd;
	}
	this.scroller.refresh();
};

Table.prototype.addFilter = function (filterFn) {
	this.filters.push(filterFn);
};

Table.prototype.removeFilter = function (filterFn) {
	var index = this.filters.indexOf(filterFn);
	if (index !== -1) {
		this.filters.splice(index, 1);
	}
};

Table.prototype._shouldDisplayRow = function (rowContent) {
	for (var i = 0, len = this.filters.length; i < len; i += 1) {
		if (!this.filters[i](rowContent)) { return false; }
	}

	return true;
};

Table.prototype.hasRow = function (id) {
	return !!this.rows.getChild(id);
};

Table.prototype.unSelectRow = function () {
	if (this._selectedRow) {
		this._selectedRow.delClassNames('selected');
	}

	this._selectedRow = null;
};

Table.prototype.selectRow = function (id, silently) {
	var row = this.rows.getChild(id);
	if (this._selectedRow !== row) {
		this.unSelectRow();

		row.addClassNames('selected');
		this._selectedRow = row;
	}

	if (!silently) {
		this.emit('rowTap', row, row.rowContent);
	}

	return row;
};

Table.prototype.scrollToSelectedRow = function () {
	if (!this._selectedRow) { return; }
	this.scroller.scrollToElement(this._selectedRow);
};

Table.prototype.selectFirstRow = function (silently) {
	var firstRow = this.rows.getChildren()[0];
	if (!firstRow) { return; }

	this.selectRow(firstRow.rowId, silently);
};

function enableRow(enable) {
	this.toggleClassName('disabled', !enable);
}

Table.prototype.endSlide = function (rowId) {
	if (this._slideBack.rowId !== rowId) { return; }
	this._slideBack.setStyle('opacity', 0);
	this._slideBack.row.slideBack();
};

Table.prototype.setSlideEnable = function (enable) {
	this._slideLock = !enable;
};

Table.prototype._addSlideBehavior = function (row) {
	slideBehavior(row, 'x');
	var self = this;
	var slideBack = this._slideBack;

	var initX, deltaX, maxDistance;
	var rowElement = row.rootElement;
	row.on('slideStart', function (touch, box) {
		if (self._slideLock) { return; }
		if (slideBack.rowId !== null) {
			self.endSlide(slideBack.rowId);
		}
		slideBack.rowId = row.rowId;
		slideBack.row = row;
		slideBack.setStyles({
			height: box.height + 'px',
			webkitTransform: 'translate3d(0,' + (rowElement.offsetTop + self.scroller.iScroll.y) + 'px,0)'
		});
		initX = touch.x;
		maxDistance = box.width / 2;
	});

	row.on('slide', function (touch) {
		if (self._slideLock) { return; }
		deltaX = touch.x - initX;
		if (deltaX > maxDistance) {
			deltaX = maxDistance;
		} else if (deltaX < -maxDistance) {
			deltaX = -maxDistance;
		}
		slideBack.setStyle('opacity', Math.abs(deltaX) / maxDistance);
		this.setStyle('webkitTransform', 'translate3d(' + deltaX + 'px,0,0)');
	});

	row.slideBack = function (cb) {
		slideBack.rowId = null;
		tweener.tween(row, { webkitTransform: 'translate3d(0,0,0)' }, { time: 100, easing: 'ease-out' }, function () {
			slideBack.setStyle('opacity', 0);
			slideBack.delClassNames('spinner', slideBack.side);
			if (cb) { cb(); }
		});
	};

	row.on('slideEnd', function (touch, init, swipe) {
		if (self._slideLock) { return; }
		if (Math.abs(deltaX) >= maxDistance || swipe) {
			if (deltaX > 0) {
				slideBack.side = 'left';
				slideBack.addClassNames('spinner', 'left');
				self.emit('rowSlidedLeft', row, row.rowContent);
			} else {
				slideBack.side = 'right';
				slideBack.addClassNames('spinner', 'right');
				self.emit('rowSlidedRight', row, row.rowContent);
			}
		} else {
			row.slideBack();
		}
	});
};

Table.prototype._createRow = function (content, id, animated) {
	id = id !== undefined ? id : this.getIdFn(content);
	var self = this;

	var row = this.rows.appendChild(new WuiDom('div', { className: 'row', name: id }));
	if (this._slidable) {
		this._addSlideBehavior(row);
	}

	if (animated) {
		row.setStyle('webkitTransform', 'translate3d(100%,0,0)');
	}

	row.rowId = id;
	row.rowContent = content;

	for (var i = 0, len = this.cols.length; i < len; i += 1) {
		var colInfo = this.cols[i];
		var cell = row[colInfo.id] = row.createChild('div', { className: ['col', colInfo.id] });

		var colContent = colInfo.format(content, row);
		if (colContent instanceof WuiDom) {
			cell.content = colContent;
			cell.appendChild(colContent);
		} else {
			cell.content = cell;
			cell.setText(colContent);
		}
	}

	if (this._clickable) {
		tapBehavior(row);

		row.on('enable', enableRow);

		row.on('tap', function () {
			self.selectRow(id);
		});
	}

	if (this._onRowCreation) {
		this._onRowCreation(row, content);
	}

	row.toggleDisplay(this._shouldDisplayRow(content));

	this.emit('rowAdded', id, content, row);
	return row;
};

/** Add a row
 *
 * @param {Object} content - raw data to be fed to the format methods
 * @param {string|number|object} [id] - an id to index the row on.
 * @param {Boolean} [animated]
 */
Table.prototype.addRow = function (content, id, animated) {
	var row = this._createRow(content, id, animated);

	this._insertRowInRightPosition(row);
	this.scroller.refresh();

	this.scroller.scrollToElement(row);
	if (animated) {
		tweener.tween(row, { webkitTransform: 'translate3d(0,0,0)' }, { time: TRANSITION_TIME, easing: 'ease-out' });
	} else {
		row.setStyle('webkitTransform', null);
	}

	return row;
};

/**
 * Plays the animation for newly added rows.
 * Animation looks like a "curtain" of rows closing from right to left.
 * To limit the moving CSS, we make this curtain look like a triangle or ">" shape with:
 * - the top and bottom of the curtain closing first
 * - the middle of the curtain (="tip" of the triangle or ">" shape) closing last
 * - anything below the bottom of the curtain is not animated, i.e. visible fully right away.
 * This explanation is much easier to understand if you open the Market-SELL UI to see it first.
 */
Table.prototype._playAnimationForNewRows = function (createdRowsMap) {
	var rowList = this.rows.getChildren();
	var count = 0; // count of animated rows
	var slowestRow = MAX_ANIMATED_ROWS / 2; // index of "slowest" row = "tip" of the triangle
	var topRow;

	for (var i = 0; i < rowList.length; i++) {
		var row = rowList[i];
		if (!createdRowsMap[row.rowId]) { continue; } // row was not created now; no need to animate it

		// Do not animate rows outside our "curtain" NOR filtered-out rows
		if (count >= MAX_ANIMATED_ROWS || !row.isVisible()) {
			row.setStyle('webkitTransform', null); // No animation; simply remove the translate
			continue;
		}

		if (count === 0) { topRow = row; }
		// Compute delay so rows appear as described above (">" shape with tip = slowest row)
		var delay = (slowestRow - Math.abs(count - slowestRow)) * TRANSITION_DELAY;
		// Start one more animated row
		count++;
		tweener.tween(
			row,
			{ webkitTransform: 'translate3d(0,0,0)' },
			{ time: TRANSITION_TIME, easing: 'ease-out', delay: delay }
		);
	}
	if (topRow) {
		this.scroller.scrollToElement(topRow);
	}
};

/** Add an array of rows.
 *
 * @param {Array} rows - array of raw data to be fed to the format methods
 * @param {Boolean} [animated]
 * @param {Boolean} [shouldReplace] - if true, update rows that are already here (and adds the new ones)
 */
Table.prototype.addList = function (rows, animated, shouldReplace) {
	this.scroller.removeChild(this.rows);
	if (rows.length) { this.setPlaceholderText(''); }

	if (shouldReplace) {
		for (var j = 0; j < rows.length; j++) {
			var rowId = this.getIdFn(rows[j]);
			if (this.hasRow(rowId)) {
				this.delRow(rowId, false);
			}
		}
	}

	var row, i, len, createdRows = {};
	for (i = 0, len = rows.length; i < len; i += 1) {
		row = this._createRow(rows[i], undefined, animated);
		createdRows[row.rowId] = row;
	}

	this.sort();
	this.scroller.appendChild(this.rows);
	this.scroller.refresh();

	if (animated) {
		this._playAnimationForNewRows(createdRows);
	}
};

/** Add an map of rows.
 *
 * @param {Object} rows - map of raw data to be fed to the format methods
 * @param {Boolean} [animated]
 */
Table.prototype.addMap = function (rows, animated) {
	this.scroller.removeChild(this.rows);

	var createdRows = {};
	for (var id in rows) {
		var row = this._createRow(rows[id], id, animated);
		createdRows[row.rowId] = row;
	}

	this.sort();
	this.scroller.appendChild(this.rows);
	this.scroller.refresh();

	if (animated) {
		this._playAnimationForNewRows(createdRows);
	}
};

Table.prototype._updateRow = function (content, id) {
	id = id !== undefined ? id : this.getIdFn(content);

	var row = this.rows.getChild(id);
	if (!row) { return this.addRow(content, id); }

	row.rowContent = content;

	for (var i = 0, len = this.cols.length; i < len; i += 1) {
		var colInfo = this.cols[i];
		var cell = row[colInfo.id];
		cell.clearContent();

		var colContent = colInfo.format(content);
		if (colContent instanceof WuiDom) {
			cell.content = colContent;
			cell.appendChild(colContent);
		} else {
			cell.content = cell;
			cell.setText(colContent);
		}
	}

	row.toggleDisplay(this._shouldDisplayRow(content));

	return row;
};

Table.prototype.refreshRows = function () {
	var rows = this.rows.getChildren();
	for (var i = 0; i < rows.length; i++) {
		var row = rows[i];
		this._updateRow(row.rowContent, row.rowId);
	}
};

/** Update multiple rows. If the id doesn't exist, a new row will be added.
 *
 * @param {Array} rows - array of raw data to be fed to the format methods
 */
Table.prototype.updateRows = function (rows) {
	for (var i = 0, len = rows.length; i < len; i += 1) {
		this._updateRow(rows[i]);
	}

	this.sort();
};

/** Update a row. If the id doesn't exist, a new row will be added.
 *
 * @param {Array} content - raw data to be fed to the format methods
 * @param {string|number|object} [id] - the id of the row to be updated/added
 */
Table.prototype.updateRow = function (content, id) {
	var row = this._updateRow(content, id);

	this._insertRowInRightPosition(row);

	return row;
};

Table.prototype.getRow = function (id) {
	return this.rows.getChild(id);
};

/** Update a single cell.
 *
 * @param {string|number|object} id - the id of the row to be updated
 * @param {string} colId
 * @param {Object} content - raw data to be fed to the cell format method
 */
Table.prototype.updateCell = function (id, colId, content) {
	var row = this.rows.getChild(id);
	if (!row) { return console.error(new Error('Row id unknown: ' + id)); }

	var cell = row[colId];
	if (!cell) { return console.error(new Error('Column id unknown: ' + colId)); }
	var colInfo = this.cols[this.colIndex[colId]];

	row.rowContent = content;

	cell.clearContent();
	var colContent = colInfo.format(content);
	if (colContent instanceof WuiDom) {
		cell.appendChild(colContent);
	} else {
		cell.setText(colContent);
	}

	row.toggleDisplay(this._shouldDisplayRow(content));

	if (this.sortBy === colInfo) {
		this._insertRowInRightPosition(row);
	}

	return row;
};

Table.prototype.getCell = function (id, colId) {
	var row = this.rows.getChild(id);
	if (!row) { return console.error(new Error('Row id unknown ' + id)); }
	var cell = row[colId];
	if (!cell) { return console.error(new Error('Column id unknown ' + colId));  }

	return cell.content;
};

Table.prototype._delRow = function (id) {
	var row = this.rows.getChild(id);
	if (!row) { return; }

	if (this._selectedRow === row) {
		this._selectedRow = null;
	}

	this.emit('rowDeleted', id, row.rowContent, row);
	row.destroy();
};

/** Delete a row.
 *
 * @param {string} id
 * @param {Boolean} [animated]
 */
Table.prototype.delRow = function (id, animated) {
	var row = this.rows.getChild(id);
	if (!row) { return; }

	var self = this;
	function delRow() {
		self._delRow(id);
		self._updateRowColor();
		self.scroller.refresh();
	}

	if (!animated) { return delRow(); }
	tweener.tween(
		row,
		{ webkitTransform: 'translate3d(-100%,0,0)' },
		{ time: TRANSITION_TIME, easing: 'ease-out' },
		delRow
	);
};

/** Delete multiple rows.
 *
 * @param {Array} ids
 * @param {Boolean} [animated]
 * @param {function} [cb] - called when the animation is done and the
 */
Table.prototype.delRows = function (ids, animated, cb) {
	var self = this;
	function lastOperation() {
		for (var i = 0, len = ids.length; i < len; i += 1) {
			self._delRow(ids[i]);
		}

		self._updateRowColor();
		self.scroller.refresh();
		if (cb) { cb.call(self); }
	}

	if (!ids.length || !animated) { return lastOperation(); }

	for (var i = 0, len = ids.length; i < len; i += 1) {
		var row = this.rows.getChild(ids[i]);
		if (!row) { continue; }

		var tweenEnd = i === len - 1 ? lastOperation : null;
		tweener.tween(
			row,
			{ webkitTransform: 'translate3d(-100%,0,0)' },
			{ time: TRANSITION_TIME, easing: 'ease-out', delay: i * TRANSITION_DELAY },
			tweenEnd
		);
	}
};

/**
 * Delete all the existing rows.
 */
Table.prototype.clearContent = function () {
	this.rows.clearContent();
	this._selectedRow = null;
	this.scroller.refresh();
};

Table.prototype.getRowCount = function () {
	return this.rows.getChildCount();
};

Table.prototype._updateRowColor = function () {
	var odd = true;

	var rows = this.rows.getChildren();
	for (var i = 0, len = rows.length; i < len; i += 1) {
		var row = rows[i];

		if (!row.isVisible()) {
			continue;
		}

		row.toggleClassName('odd', odd);
		odd = !odd;
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/TableV2/index.js
 ** module id = 399
 ** module chunks = 0
 **/