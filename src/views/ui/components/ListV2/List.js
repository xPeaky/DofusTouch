var inherits = require('util').inherits;
var Placeholder = require('Placeholder');
var playUiSound = require('audioManager').playUiSound;
var Scroller = require('Scroller');
var tapBehavior = require('tapBehavior');

/**
* List component
* @constructor
*
* By using this component, we can create a list of items that when we tap on it,
* will emit 'selected' event and 'deselected' event when we tap on it again.
* It can be useful for creating menus or any other use case that can
* make use of the selected and deselected events. By default, multiple items
* can be selected, just like a tree structure.
*
* @param {Object} domOptions - Object of dom options
* @param {Object} options - Object of List options
* @param {Boolean} [options.disableSelectionToggle] - disable deselect
**/
function List(domOptions, options) {
	Scroller.call(this, domOptions);
	this.addClassNames('ListV2');

	this.options = options || {};

	this.placeholder = null;
}

inherits(List, Scroller);
module.exports = List;

List.prototype._createItem = function (itemData) {
	itemData = itemData || {};

	var id = itemData.id;
	var element = itemData.element;

	if (!id && id !== 0) {
		return console.error('List: Invalid Id');
	}

	var item = this.content.createChild('div', { name: id, className: 'listItem' });
	item.myList = this;
	item.id = id;
	item.data = itemData.data;
	if (typeof element === 'object') {
		item.appendChild(element);
	} else {
		item.setText(element);
	}

	tapBehavior(item);
	item.on('tap', this._tapHandler);

	return item;
};

List.prototype.addItem = function (itemData, options) {
	options = options || {};

	var item = this._createItem(itemData);

	if (!options.noRefresh) {
		this.refresh();
	}

	return item;
};

List.prototype.addItems = function (itemDataList, options) {
	options = options || {};

	var itemData;
	for (var i = 0; i < itemDataList.length; i += 1) {
		itemData = itemDataList[i];
		this._createItem(itemData);
	}

	if (!options.noRefresh) {
		this.refresh();
	}

	return this.getItems();
};

List.prototype.removeItem = function (id) {
	var item = this.getItem(id);
	if (item) {
		item.destroy();
	}
};

List.prototype.selectItem = function (id, options) {
	options = options || {};

	var item = this.getItem(id);
	if (!item) { return; }

	item.isSelected = true;
	item.addClassNames('selected');

	if (!options.noEvent) {
		this.emit('selected', item);
	}
	if (!options.noSound) {
		playUiSound('GEN_BUTTON');
	}
	if (options.scrollToElement) {
		this.scrollToElement(item);
	}
};

List.prototype.deselectItem = function (id, options) {
	options = options || {};

	var item = this.getItem(id);
	if (!item) { return; }

	item.isSelected = false;
	item.delClassNames('selected');

	if (!options.noEvent) {
		this.emit('deselected', item);
	}
	if (!options.noSound) {
		playUiSound('GEN_BUTTON');
	}
};

List.prototype.deselectAll = function () {
	var items = this.getItems();
	for (var i = 0; i < items.length; i += 1) {
		var item = items[i];
		if (item.isSelected) {
			this.deselectItem(item.getWuiName(), { noSound: true });
		}
	}
};

List.prototype.getItemCount = function () {
	return this.content.getChildCount();
};

List.prototype.getItem = function (id) {
	return this.content.getChild(id);
};

List.prototype.getItems = function () {
	return this.content.getChildren();
};

List.prototype.getContentElement = function () {
	return this.content;
};

List.prototype.clearContent = function () {
	this.content.clearContent();
};

/** @param {string} [text] - placeholder's text or null/undefined/'' to hide previous placeholder */
List.prototype.setPlaceholderText = function (text) {
	if (!this.placeholder) { this.placeholder = new Placeholder(this); }

	this.placeholder.setText(text);
};

List.prototype._tapHandler = function () {
	// "this" contains the item tapped
	var myList = this.myList;
	var id = this.getWuiName();
	if (!this.isSelected) {
		return myList.selectItem(id);
	}
	if (!myList.options.disableSelectionToggle) {
		myList.deselectItem(id);
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/ListV2/List.js
 ** module id = 316
 ** module chunks = 0
 **/