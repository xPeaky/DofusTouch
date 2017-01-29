require('./styles.less');
var Button = require('Button');
var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var List = require('ListV2');
var WuiDom = require('wuidom');


function DrillDownList() {
	EventEmitter.call(this);
	this._init();
}
inherits(DrillDownList, EventEmitter);
module.exports = DrillDownList;


DrillDownList.prototype._init = function () {
	this.parentElt = null;
	this.elt = null;

	this.items = [];
	this.infos = [];
	this.breadcrumb = null;
	this.list = null;
	this.currentDeployedItem = null;
	this.currentSubitem = null;

	this.isFilterOn = false;
	this.itemFilterFunc = null;
	this.subitemFilterFunc = null;
	this.singleItem = null;
	this.singleSubitem = null;
};

DrillDownList.prototype.clearContent = function () {
	if (!this.elt) { return; }
	this.elt.clearContent();
	this._init();
};

DrillDownList.prototype.reset = function () {
	if (!this.elt) { return; }

	// Collapse current category if any (we don't allow more than 1 opened right now)
	var prevItem = this.currentDeployedItem;
	if (prevItem) { this.deployItem(prevItem, false); }
	// Scroll back to top
	this.refresh(/*isReset=*/true);

	this._selectSubitem(null);
	this.removeFilter();
};

DrillDownList.prototype.setBreadcrumbText = function (text) {
	this.breadcrumbText.setText(text);
};

DrillDownList.prototype.inBreadcrumbMode = function () {
	return this.breadcrumb.isVisible();
};

DrillDownList.prototype.toggleBreadcrumb = function (showBreadcrumb) {
	this.elt.toggleClassName('onlyBreadcrumb', showBreadcrumb);
	this.breadcrumb.toggleDisplay(showBreadcrumb);
	this.list.toggleDisplay(!showBreadcrumb);

	this.emit('resized'); // parent might react to this event and resize us

	if (!showBreadcrumb) {
		this.list.refresh();
		if (this.currentSubitem) { this.list.showElement(this.currentSubitem); }
	}
};

function itemTapHandler(item) {
	// "this" is the List object
	var self = this.myDrilldownList;
	item.isSelected = false; // avoids ListV2 default behavior

	var isDeployed = item === self.currentDeployedItem;
	self.deployItem(item, !isDeployed);
}

DrillDownList.prototype.setSubitemsGetter = function (getSubitemsFunc) {
	this.getSubitemsFunc = getSubitemsFunc;
};

function subitemTapHandler() {
	// "this" is the subitem element
	var self = this.myTopItem.myDrilldownList;

	if (this === self.currentSubitem) {
		return self.toggleBreadcrumb(true);
	}
	self._selectSubitem(this);
}

function breadcrumbTapHandler() {
	// "this" is the breadcrumb button
	var self = this.myDrilldownList;
	self.toggleBreadcrumb(false);
}

DrillDownList.prototype.colorItems = function () {
	var odd = true;
	for (var i = 0; i < this.items.length; i++) {
		var itemElt = this.list.getItem(i);
		if (itemElt.isVisible()) {
			itemElt.toggleClassName('odd', odd);
			odd = !odd;
		}
	}
};

DrillDownList.prototype.getDom = function (parentElt) {
	if (this.elt) { return this.elt; }
	if (!this.items.length) { return console.warn('Empty DrillDownList'); }
	this.parentElt = parentElt;

	var main = this.elt = parentElt.createChild('div', { className: 'drillDownList' });
	var btn = this.breadcrumb = main.appendChild(
		new Button({ className: 'breadcrumb', hidden: true, addIcon: 'before', text: '_' }, breadcrumbTapHandler));
	btn.myDrilldownList = this;
	this.breadcrumbText = btn.getChildren()[1];

	this.list = main.appendChild(new List({ className: 'tree' }));
	this.list.myDrilldownList = this;
	for (var i = 0; i < this.items.length; i++) {
		var itemContent = new WuiDom('div', { className: 'sublistHeader' });
		itemContent.createChild('div', { className: 'arrow' });
		itemContent.createChild('div', { className: 'text', text: this.items[i] });

		var itemElt = this.list.addItem({ id: i, element: itemContent }, { noRefresh: true });
		itemElt.info = this.infos[i];
		itemElt.myDrilldownList = this;
	}
	this.colorItems();
	this.list.setStyle('max-height', parentElt.rootElement.clientHeight + 'px');
	this.list.refresh();
	this.list.on('selected', itemTapHandler);

	this.elt = main;
	return main;
};

DrillDownList.prototype._createSubitemList = function (topItem) {
	var subitems = this.getSubitemsFunc(topItem);

	var subitemList = topItem.subitemList = topItem.appendChild(
		new WuiDom('div', { className: 'subitemList', hidden: true }));

	for (var i = 0; i < subitems.length; i++) {
		var subitem = subitems[i];
		var subitemElt = subitemList.appendChild(
			new Button({ text: subitem.text, className: 'subitem' }, subitemTapHandler));
		subitemElt.data = subitem;
		subitemElt.myTopItem = topItem;
	}
};

DrillDownList.prototype.addItem = function (content, info) {
	this.items.push(content);
	this.infos.push(info !== undefined ? info : this.infos.length);
};

DrillDownList.prototype.getItemCount = function () {
	return this.list.getItemCount();
};

DrillDownList.prototype.getItem = function (itemNdx) {
	return this.items[itemNdx];
};

DrillDownList.prototype.getItemElt = function (itemNdx) {
	return this.list.getItem(itemNdx);
};

DrillDownList.prototype.selectAndShowSubitem = function (subitemElt) {
	this._selectSubitem(subitemElt, /*isAuto=*/false, /*isSilent=*/true);

	if (this.list.isVisible()) {
		this.deployItem(subitemElt.myTopItem, true);
		this.list.showElement(subitemElt);
	}
};

DrillDownList.prototype._selectSubitem = function (subitemElt, isAuto, isSilent) {
	var prevSubitem = this.currentSubitem;
	if (prevSubitem) { prevSubitem.delClassNames('selected'); }

	this.currentSubitem = subitemElt;
	if (!subitemElt) { return this.toggleBreadcrumb(false); }

	this.setBreadcrumbText(this.items[subitemElt.myTopItem.id] + ' > ' + subitemElt.data.text);

	subitemElt.addClassNames('selected');

	if (!isSilent) { this.emit('subitemSelected', subitemElt, isAuto); }
};

DrillDownList.prototype.getSelectedSubitem = function () {
	return this.currentSubitem;
};

DrillDownList.prototype.setPlaceholder = function (text) {
	this.list.setPlaceholderText(text);
};

DrillDownList.prototype.refresh = function (isReset) {
	this.colorItems();
	this.list.refresh();
	if (isReset) { this.list.goToTop(); }
};

DrillDownList.prototype.setFilter = function (itemFilterFunc, subitemFilterFunc) {
	this.itemFilterFunc = itemFilterFunc;
	this.subitemFilterFunc = subitemFilterFunc;
};

function showItemDeployed(itemElt, isDeployed) {
	itemElt.toggleClassName('selected', isDeployed);
	itemElt.subitemList.toggleDisplay(isDeployed);
}

// Returns the count of subitems that are filtered-in
DrillDownList.prototype._filterOneItemSubitems = function (itemElt) {
	if (!this.isFilterOn) { return this._resetFilterOnSubitems(itemElt); }

	var count = 0, singleSubitem;
	var subitems = itemElt.subitemList.getChildren();

	for (var i = 0; i < subitems.length; i++) {
		var subitemElt = subitems[i];
		if (this.subitemFilterFunc(itemElt, i, subitemElt)) {
			count++;
			if (count === 1) { singleSubitem = subitemElt; }
			subitemElt.show();
		} else {
			subitemElt.hide();
		}
	}
	if (count === 1) { this.singleSubitem = singleSubitem; }
	return count;
};

DrillDownList.prototype.isItemDeployed = function (itemElt) {
	return itemElt.subitemList && itemElt.subitemList.isVisible();
};

/*
 * Deploys or "undeploys" an item.
 * @param {WuiDom} itemElt - the item to be deployed or undeployed
 * @param {boolean} mustDeploy - true to deploy, false to undeploy. NB: mandatory param; undefined same as false.
 * @return the count of *subitems* that were deployed (always 0 in case of undeploy action)
 */
DrillDownList.prototype.deployItem = function (itemElt, mustDeploy) {
	if (mustDeploy === this.isItemDeployed(itemElt)) { return 0; }

	// If we deploy for the 1st time, create the DOM for subitems
	if (mustDeploy && !itemElt.subitemList) { this._createSubitemList(itemElt); }

	// Collapse previous item if any
	var prevItem = this.currentDeployedItem;
	if (prevItem && itemElt !== prevItem) { showItemDeployed(prevItem, false); }

	// Deploy OR collapse new item
	showItemDeployed(itemElt, mustDeploy);
	this.currentDeployedItem = mustDeploy ? itemElt : null;

	var count = 0;
	// When deploying only, if a filter is used, apply it
	if (mustDeploy) {
		if (this.subitemFilterFunc) {
			count = this._filterOneItemSubitems(itemElt);
		} else {
			count = itemElt.subitemList.getChildCount(); // all subitems are visible
			if (count === 1) { this.singleSubitem = itemElt.subitemList.getChildren()[0]; }
		}
	}

	this.list.refresh();
	this.list.showElement(itemElt);
	return count;
};

DrillDownList.prototype.refreshFilter = function () {
	this.isFilterOn = true;

	var count = 0, singleItem;
	var items = this.list.getItems();
	for (var i = items.length - 1; i >= 0; i--) {
		var itemElt = items[i];

		if (this.itemFilterFunc(itemElt)) {
			count++;
			if (count === 1) { singleItem = itemElt; }
			if (this.isItemDeployed(itemElt) && this.subitemFilterFunc) {
				this._filterOneItemSubitems(itemElt);
			}
			itemElt.show();
		} else {
			itemElt.hide();
		}
	}

	var subcount = 0;
	if (count === 1) {
		this.singleItem = singleItem;
		subcount = this.deployItem(singleItem, true);
		if (subcount === 1) { this._selectSubitem(this.singleSubitem, /*isAuto=*/true); }
	}
	this.refresh();
	return { itemCount: count, subitemCount: subcount };
};

DrillDownList.prototype._resetFilterOnSubitems = function (itemElt) {
	if (!itemElt.subitemList) { return; }

	var subitems = itemElt.subitemList.getChildren();
	for (var i = 0; i < subitems.length; i++) {
		subitems[i].show();
	}
};

/** Interesting part is that resetting the filter leaves the current deployed item deployed */
DrillDownList.prototype.removeFilter = function () {
	if (!this.isFilterOn) { return; }
	this.isFilterOn = false;

	var items = this.list.getItems();
	for (var i = items.length - 1; i >= 0; i--) {
		var itemElt = items[i];
		itemElt.show();
		this._resetFilterOnSubitems(itemElt);
	}
	this.refresh();
	// If we had a current subitem, make sure it is visible and re-emit
	if (this.currentSubitem) {
		this.list.showElement(this.currentSubitem);
		this.emit('subitemSelected', this.currentSubitem, /*isAuto=*/true);
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/DrillDownList/index.js
 ** module id = 312
 ** module chunks = 0
 **/