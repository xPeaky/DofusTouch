var inherits = require('util').inherits;
var List = require('./List.js');

/**
* SingleSelectionList component
* @constructor
*
* SingleSelectionList extends from the List component. The main difference
* is SingleSelectionList only allow one item to be selected at a time. When one
* item is selected, previous selected item will be deselected.
*
* @param {Object} domOptions - Object of dom options
**/
function SingleSelectionList(domOptions, options) {
	List.call(this, domOptions, options);
	this.addClassNames('SingleSelectionList');

	this.currentSelected = null;
}

inherits(SingleSelectionList, List);
module.exports = SingleSelectionList;

SingleSelectionList.prototype.removeItem = function (id) {
	var item = this.getItem(id);
	if (item) {
		this.currentSelected = null;
	}

	List.prototype.removeItem.call(this, id);
};

SingleSelectionList.prototype.selectItem = function (id, options) {
	if (this.currentSelected) {
		this.deselectItem(this.currentSelected.getWuiName(), { noSound: true });
	}

	List.prototype.selectItem.call(this, id, options);

	var item = this.getItem(id);
	if (item) {
		this.currentSelected = item;
	}
};

SingleSelectionList.prototype.deselectItem = function (id, options) {
	var item = this.getItem(id);
	if (!item || !item.isSelected) { return; }
	List.prototype.deselectItem.call(this, id, options);
	this.currentSelected = null;
};

SingleSelectionList.prototype.deselectAll = function () {
	if (this.currentSelected) {
		this.deselectItem(this.currentSelected.getWuiName(), { noSound: true });
	}
};

SingleSelectionList.prototype._tapHandler = function () {
	// "this" contains the item tapped
	var myList = this.myList;
	if (myList.currentSelected && myList.currentSelected !== this) {
		myList.deselectItem(myList.currentSelected.getWuiName(), { noSound: true });
	}
	List.prototype._tapHandler.call(this);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/ListV2/SingleSelectionList.js
 ** module id = 319
 ** module chunks = 0
 **/