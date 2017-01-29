require('./styles.less');
var Button = require('Button');
var dimensions = require('dimensionsHelper').dimensions;
var inherits = require('util').inherits;
var Scroller = require('Scroller');
var tapBehavior = require('tapBehavior');
var WuiDom = require('wuidom');

var DROPDOWN_BUTTON_WIDTH = 30; // in px
var MARGIN_FROM_SCREEN_BORDER = 15;


/** @class */
function DropDown() {
	WuiDom.call(this, 'div', { className: 'dropDown', hidden: true });
	var self = this;

	var dropDrownOverlay = this.createChild('div', { className: 'dropDrownOverlay' });
	tapBehavior(dropDrownOverlay);
	dropDrownOverlay.on('tap', function () {
		self.close();
	});

	this.entryContainer = this.createChild('div', { className: 'entryContainer' });
	this.scroller = this.entryContainer.appendChild(
		new Scroller({ className: 'entryList' }, { showHintArrows: true }));
	this.entryList = this.scroller.content;

	this._isOpen = false;
	this.clearContent(); // initialize to empty values

	window.gui.on('disconnect', function () {
		self.clearContent();
		self.close();
	});
}
inherits(DropDown, WuiDom);
module.exports = DropDown;


DropDown.prototype.setupDropDown = function (parentElt, rowList, selectedIndex, selectionFn) {
	// If we are called of the same parent element and it did not move, we simply open again
	var parentRect = parentElt.rootElement.getBoundingClientRect();
	if (parentElt === this._parentElt &&
		parentRect.left === this._parentRect.left && parentRect.top === this._parentRect.top) {
		return this.open(selectedIndex);
	}

	this._updateContent(rowList, selectionFn, parentElt, parentRect);

	this._firstOpen(selectedIndex);
};

DropDown.prototype.clearContent = function () {
	this.entryList.clearContent();

	this._parentElt = null;
	this._parentRect = null;
	this._selectionFn = null;
	this._entries = [];
	this._selectedIndex = -1;
};

DropDown.prototype._updateContent = function (rowList, selectionFn, parentElt, parentRect) {
	this.clearContent();

	for (var i = 0, len = rowList.length; i < len; i++) {
		var row = rowList[i];
		if (row.hidden) { continue; }
		var action = {
			index: i,
			value: row.value
		};
		if (row.disabled) { action.disabled = true; }

		this._addEntry(row.text, action);
	}
	this._entries = this.entryList.getChildren();

	this._parentElt = parentElt;
	this._parentRect = parentRect;
	this._selectionFn = selectionFn;
};

DropDown.prototype.select = function (index) {
	if (index >= this._entries.length) {
		return;
	}
	if (this._selectedIndex !== -1) {
		this._entries[this._selectedIndex].delClassNames('ticked');
	}
	this._selectedIndex = index;
	this._entries[index].addClassNames('ticked');
};

DropDown.prototype.close = function () {
	if (!this._isOpen) { return; }
	this.hide();
	this._isOpen = false;
};

DropDown.prototype._firstOpen = function (index) {
	// We need to be "displayed" but not visible in order to compute sizes below
	this.setStyle('opacity', 0);
	this.show();

	this._refreshPositionAndSize();
	this.open(index);
};

DropDown.prototype.open = function (index) {
	this.show();

	if (index !== undefined) {
		this.select(index);
		this._scrollToEntryIndex(index);
	}

	this._isOpen = true;
	this.setStyle('opacity', 1);
};

DropDown.prototype._scrollToEntryIndex = function (index) {
	if (index < 0 || index >= this._entries.length) { return console.warn('Invalid dropdown index', index); }
	this.scroller.scrollToElement(this._entries[index], /*time=*/0);
};

DropDown.prototype._refreshPositionAndSize = function () {
	// Compute width and x position
	var parent = this._parentRect;
	var x = parent.left;
	var width = parent.width - DROPDOWN_BUTTON_WIDTH;

	// Compute height and y position - we start by trying to open the list under the parent
	var y = parent.bottom + 1;
	var height = dimensions.screenHeight - MARGIN_FROM_SCREEN_BORDER - y;
	var menuRect = this.entryList.rootElement.getBoundingClientRect();

	if (height < menuRect.height && parent.top > dimensions.screenHeight * 0.6) {
		// Dropdown is closer to bottom of screen => we open the list on top of parent
		var bottom = parent.top - 5;
		height = Math.min(menuRect.height, bottom - MARGIN_FROM_SCREEN_BORDER);
		y = bottom - height;
	}
	this.entryContainer.setStyles({ left: x + 'px', top: y + 'px', width: width + 'px' });

	// Now refresh scroller to work properly
	this.scroller.setStyle('max-height', height + 'px');
	this.scroller.refresh();
};

function onEntryTap() {
	var dropDown = this.dropDown;
	var action = this.action;
	dropDown.close();
	dropDown._selectionFn(action.value, action.index);
}

DropDown.prototype._addEntry = function (label, action) {
	var entry = this.entryList.appendChild(new Button({ text: label, className: 'dropDownEntry' }));

	if (action.disabled) {
		entry.addClassNames('disabled');
		return;
	}
	// Set the tap handler (only if entry is enabled)
	entry.on('tap', onEntryTap);
	entry.dropDown = this;
	entry.action = action;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/DropDown/index.js
 ** module id = 587
 ** module chunks = 0
 **/