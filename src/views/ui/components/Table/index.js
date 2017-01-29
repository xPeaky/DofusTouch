require('./styles.less');
var WuiDom = require('wuidom');
var tapBehavior = require('tapBehavior');
var inherits = require('util').inherits;


/**
 * Table component for Dofus UI.
 * @constructor
 *
 * @param {Object}  options - table creation parameters
 *
 * @param {String[]}  options.colIds             - Optional, id name for the cols
 * @param {Number}   [options.colCount]          - number of columns in the table, default to 1
 * @param {Boolean}   options.highlightable
 * @param {Boolean}   options.disableAutoSelect  - do not auto select the first element
 * @param {Number}    options.minRows            - Number of minimum row
 * @param {Array}    [options.headerContent]     - Optional, no header if not provided
 * @param {Array}    [options.footerContent]     - Optional, no header if not provided
 * @param {Array}    [options.defaultRowContent] - Optional, default text for each col when a new row is created
 * @param {Function} [options.onRowTap]          - Function called when row is tapped on
 */
function Table(options) {
	if (!options) {
		console.error('Undefined Table \'options\' parameter');
		return;
	}

	WuiDom.call(this, 'div', options);
	this.addClassNames(['Table', options.className]);

	this._rows = [];
	this._rowCount = 0;
	this._hiddenRowIds = [];
	this._clickable = false;

	this._colIds = options.colIds;
	this._minRows = options.minRows || 0;
	this._colCount = this._colIds ? this._colIds.length : options.colCount || 1;

	this._defaultRowContent = options.defaultRowContent || [];

	this._highlightable = options.highlightable;
	this._disableAutoSelect = options.disableAutoSelect;
	this._autoUpdateRowColor = !options.disableRowColor;

	if (options.headerContent) {
		this.header = this.createChild('div', { className: ['container', 'header'] });
		this._addHeader(options.headerContent);
	}

	this.content = this.createChild('div', { className: ['container', 'content'] });

	if (options.footerContent) {
		this.footer = this.createChild('div', { className: ['container', 'footer'] });
		this._addFooter(options.footerContent);
	}

	if (options.onRowTap) {
		this._clickable = true;
		this.on('selected', options.onRowTap);
	}

	if (options.minRows) {
		this._setupDefaultRows();
	}
}

inherits(Table, WuiDom);
module.exports = Table;


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Add a new row in table.
 *  If an empty row is available it will use it, else a new row will be created.
 *
 * @param  {Object|WuiDom[]} content - content of new row
 * @param  {Object} data - optional data to be attached to row
 * @return {WuiDom[]} new row added
 */
Table.prototype.addRow = function (content, data) {
	var row;

	if (this._rowCount < this._rows.length) {
		this._rows[this._rowCount]._isEmpty = false;
		row = this.updateRow(this._rowCount, content, data);
	} else {
		row = this._addRow(content, null, data);
	}

	this._rowCount++;

	this._updateRowColor();
	return row;
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Insert a row at a specified index.
 *
 * @param  {Number} index - the index to insert the row
 * @param  {Object|WuiDom[]} content - content of new row
 * @param  {Object} data - optional data to be attached to row
 * @return {WuiDom[]} new row added
 */
Table.prototype.insertRow = function (index, content, data) {
	if (index < 0 || index > this._rows.length) {
		console.warn('[Table.insertRow] the specified index (' + index + ') is out of range.');
		return null;
	}

	var row = this._rows[index];
	if (row && row._isEmpty) {
		row._isEmpty = false;
		row = this.updateRow(index, content, data);
	} else {
		row = this._createRow(content, 'content');
		for (var attr in data) {
			row[attr] = data[attr];
		}

		if (index === this._rows.length) {
			this.content.appendChild(row);
		} else {
			row.insertBefore(this._rows[index]);
		}

		this._rows.splice(index, 0, row);
	}

	this._rowCount++;
	this._updateRowColor();
	return row;
};


Table.prototype.sort = function (sortFn) {
	var rows = this._rows;
	rows.sort(sortFn);

	for (var i = 0, len = rows.length; i < len; i += 1) {
		this.content.appendChild(rows[i]);
	}

	this._updateRowColor();
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Delete the row at specified index.
 *
 * @param {Number} index - index of row to delete
 */
Table.prototype.delRow = function (index) {
	if (index > this._rowCount) {
		return console.error('[Table.delRow] Row index ' + index + ' does not exist.');
	}

	if (this._isRowEmpty(index)) {
		return;
	}

	var row = this._rows[index];
	if (this._lastSelected === row) {
		this._lastSelected = null;
	}

	row.destroy();
	this._rowCount--;
	this._rows.splice(index, 1);

	// fill table with empty row if needed
	if (this._rows.length < this._minRows) {
		this._addRow();
	}

	// highlight the first row by default
	if (this._highlightable && !this._disableAutoSelect) {
		this.highlight(0);
	}
	this._updateRowColor();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Update a row content
 *
 * @param {Object} row - the row
 * @param {Object} content - the new content of the row
 */
Table.prototype.updateRowContent = function (row, content, data) {
	if (row._isEmpty) {
		return;
	}

	for (var attr in data) {
		row[attr] = data[attr];
	}

	if (this._highlightable) {
		row.enable();
	}

	if (Array.isArray(content)) {
		var objs = {};
		var ids = this._colIds;

		for (var i = 0; i < ids.length; i++) {
			objs[ids[i]] = content[i];
		}

		content = objs;
	}

	for (var col in content) {
		var child = row.getChild(col);
		var value = content[col];

		child.clearContent();

		if (value instanceof WuiDom) {
			child.appendChild(value);
			continue;
		}

		if (value === undefined || value === null) {
			value = '';
		}

		child.setHtml(value.toString());
	}

	// highlight the first row by default
	if (this._highlightable && !this._lastSelected && !this._disableAutoSelect) {
		this.highlight(0);
	}

	return row;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Update the row at specified index.
 *
 * @param {Number} index - index of row to update
 * @param {Object} content -
 * @param  {Object} data - optional data to be attached to row
 */
Table.prototype.updateRow = function (index, content, data) {
	if (this._isRowEmpty(index)) {
		return;
	}

	var row = this._rows[index];
	return this.updateRowContent(row, content, data);
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get all row elements.
 *
 * @return {WuiDom[]}
 */
Table.prototype.getRows = function () {
	return this._rows;
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** clear table content.
 *  This function overwrite WuiDom.clearContent so that we keep the table with empty rows.
 */
Table.prototype.clearContent = function () {
	for (var i = 0; i < this._rows.length; i++) {
		this._rows[i].destroy();
	}

	this._rows = [];
	this._rowCount = 0;
	this._lastSelected = null;
	this._hiddenRowIds = [];
	this._setupDefaultRows();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Remove the hightlight from the selected row.
 */
Table.prototype.removeHightlight = function () {
	if (this._lastSelected) {
		this._lastSelected.delClassNames('highlight');
		this._lastSelected = null;
	}
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Highlight first visible row.
 */
Table.prototype.highlightFirstRow = function () {
	for (var i = 0; i < this._rows.length; i++) {
		var row = this._rows[i];

		if (row.isVisible()) {
			this.highlightRow(row);
			return;
		}
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Highlight the given row
 *
 * @param {Object} row - the row to highlight.
 */
Table.prototype.highlightRow = function (row) {
	if (!this._highlightable) {
		return;
	}

	if (!row || row._isEmpty) {
		console.warn('Invalid index, row does not exist or empty!');
		return;
	}

	if (row !== this._lastSelected) {
		if (this._lastSelected) {
			this._lastSelected.delClassNames('highlight');
		}

		this._lastSelected = row;
		this._lastSelected.addClassNames('highlight');
	}

	this.emit('selected', row);
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Highlight row at specified index.
 *
 * @param {Number} index - index of row to highlight.
 */
Table.prototype.highlight = function (index) {
	this.highlightRow(this._rows[index]);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** get number of rows currently set in table.
 *
 * @return {Number}
 */
Table.prototype.getRowCount = function () {
	return this._rowCount;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** get row.
 *
 * @param  {Number} index - row index.
 * @return {WuiDom}
 */
Table.prototype.getRow = function (index) {
	if (this._rows[index] && this._isRowEmpty(index)) {
		console.warn('[Table.getRow] Row index ' + index + ' is empty.');
		return;
	}

	return this._rows[index];
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** get a cell.
 *
 * @param {Number} rowIndex - row index.
 * @param {String} colId    - column id.
 */
Table.prototype.getCol = function (rowIndex, colId) {
	var row = this.getRow(rowIndex);

	if (!row) {
		return;
	}

	return row.getChild(colId);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** get a cell.
 *
 * @param {String} colId    - column id.
 */
Table.prototype.getHeaderCol = function (colId) {
	return this.header.getChildren()[0].getChild(colId);
};



//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Hide rows.
 *
 * @param {Number[]} ids - Indexes of rows to be hidden.
 */
Table.prototype.hideRows = function (ids) {
	if (!ids.length) {
		return;
	}

	var emptyRowCount = 0;

	for (var i = 0; i < ids.length; i++) {
		var id = ids[i];
		var row = this.getRow(id);
		if (!row) {
			continue;
		}

		row.hide();
		this._hiddenRowIds.push(id);
		emptyRowCount++;
	}

	var rowDiff = this.getRowCount() - emptyRowCount;

	// highlight the first row by default
	if (!this._disableAutoSelect) {
		this.highlightFirstRow();
	}

	if (rowDiff < this._minRows) {
		rowDiff = this._minRows - rowDiff;
		this._addEmptyRows(rowDiff);
		return;
	}

	this._updateRowColor();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Show all hidden rows of table */
Table.prototype.showRows = function () {
	var hiddenRowIds = this._hiddenRowIds;

	if (!hiddenRowIds.length) {
		return;
	}

	for (var i = 0; i < hiddenRowIds.length; i++) {
		var row = this.getRow(hiddenRowIds[i]);
		if (!row) {
			continue;
		}

		row.show();
	}

	// highlight the first row by default
	if (!this._disableAutoSelect) {
		this.highlightFirstRow();
	}

	this._hiddenRowIds = [];

	if (this._rows.length > this._minRows) {
		this._delEmptyRows(this._rows.length - this._minRows);
		return;
	}

	this._updateRowColor();
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** update row colors
 * @private
 */
Table.prototype._updateRowColor = function () {
	if (!this._autoUpdateRowColor) {
		return;
	}

	var odd = true;

	for (var i = 0; i < this._rows.length; i++) {
		var row = this._rows[i];

		if (!row.isVisible()) {
			continue;
		}

		if (odd) {
			row.addClassNames('odd');
			odd = false;
		} else {
			row.delClassNames('odd', 'even');
			odd = true;
		}
	}
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** test if row is empty.
 * @private
 *
 * @param {Number} index - row index
 */
Table.prototype._isRowEmpty = function (index) {
	return this._rows[index]._isEmpty;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** create a row element
 * @private
 *
 * @param {Object|Array} content -
 */
Table.prototype._createRow = function (content, containerName) {
	var colIds = this._colIds || [];

	var row = new WuiDom('div', { className: 'row' });
	if (!content) {
		row._isEmpty = true;
		content = this._defaultRowContent;
	}

	var contentIsArray =  Array.isArray(content);
	var cellContent;

	for (var i = 0; i < this._colCount; i++) {
		var colId = colIds[i];

		var cell = row.createChild('div', { className: 'col', name: colId || '' });
		if (contentIsArray) {
			cellContent = content[i];
		} else {
			cellContent = content[colId];
			row[colId] = cellContent;
		}

		if (!cellContent && cellContent !== 0) {
			continue; //the number 0 is displayed normally
		}

		if (cellContent instanceof WuiDom) {
			cell.appendChild(cellContent);
			continue;
		}

		cell.setHtml(cellContent.toString());
	}

	if (containerName !== 'content') {
		return row;
	}

	if (this._highlightable || this._clickable) {
		tapBehavior(row);

		row.on('disabled', function () {
			row.addClassNames('disabled');
		});
		row.on('enabled', function () {
			row.delClassNames('disabled');
		});

		if (row._isEmpty) {
			row.disable();
		}

		var self = this;
		row.on('tap', function () {
			self.highlightRow(this);
		});
	}

	return row;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** create a new row element and append it in table.
 * @private
 *
 * @param {Object|Array} content -
 * @param {String} containerName - 'content' (default) || 'header' || 'footer'
 * @param  {Object} data - optional data to be attached to row
 */
Table.prototype._addRow = function (content, containerName, data) {
	containerName = containerName || 'content';

	var row = this._createRow(content, containerName);
	this[containerName].appendChild(row);

	for (var attr in data) {
		row[attr] = data[attr];
	}

	if (containerName !== 'content') {
		return row;
	}

	this._rows.push(row);

	if (!content) {
		return;
	}

	// highlight the first row by default
	if (this._highlightable && !this._lastSelected && !this._disableAutoSelect) {
		this.highlight(0);
	}

	return row;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** add new empty row
 * @private
 */
Table.prototype._addEmptyRows = function (count) {
	for (var i = 0; i < count; i++) {
		this._addRow();
	}

	this._updateRowColor();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** add table header
 * @private
 */
Table.prototype._addHeader = function (content) {
	this._addRow(content, 'header');
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** add table footer
 * @private
 */
Table.prototype._addFooter = function (content) {
	this._addRow(content, 'footer');
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** fill the table with empty rows until number of displayed rows reach `_minRows`.
 * @private
 */
Table.prototype._setupDefaultRows = function () {
	while (this._rows.length < this._minRows) {
		this._addRow();
	}

	this._updateRowColor();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Remove extra empty rows.
 * @private
 * @param {Number} count -
 */
Table.prototype._delEmptyRows = function (count) {
	for (var i = this._rows.length - 1; i >= 0; i--) {
		if (count === 0 || this._rows.length <= this._minRows) {
			break;
		}

		if (this._isRowEmpty(i)) {
			this._rows[i].destroy();
			this._rows.splice(i, 1);
			count--;
		}
	}

	this._updateRowColor();
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/Table/index.js
 ** module id = 483
 ** module chunks = 0
 **/