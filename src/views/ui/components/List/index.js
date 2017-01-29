require('./styles.less');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var helper = require('helper');
var tapBehavior = require('tapBehavior');
var playUiSound = require('audioManager').playUiSound;

function List(options) {
	WuiDom.call(this, 'ul', { className: 'List' });

	options = options || {};

	this.addClassNames(options.className);

	if (options.cannotActivate) {
		this._cannotActivate = options.cannotActivate;
	}

	this.activeItem = null;
	this.items = {};
}

inherits(List, WuiDom);
module.exports = List;


List.prototype.addItem = function (id, element, data) {
	var self = this;
	var li = this.createChild('li', { name: id, className: id });
	li.appendChild(element);
	li.element = element;

	if (data) {
		li.data = data;
	}

	tapBehavior(element);
	element.on('tap', function () {
		if (li === self.activeItem) {
			self.deactivate();
		} else {
			self.activate(li);
		}
	});

	this.items[id] = li;
	return li;
};


List.prototype.removeItem = function (id) {
	var li = this.items[id];
	if (!li) {
		return;
	}

	li.destroy();
	delete this.items[id];
};

/** Selects (and returns) an item by its ID */
List.prototype.selectItem = function (id) {
	var li = this.items[id];
	if (!li) { return; }
	this.activate(li);
	return li;
};

List.prototype.activate = function (li) {
	if (this._cannotActivate) {
		return;
	}
	this.deactivate(true);
	li.addClassNames('on');
	this.emit('activate', li);
	this.activeItem = li;
	playUiSound('GEN_BUTTON');
};


List.prototype.deactivate = function (silently) {
	if (!this.activeItem) {
		return;
	}
	this.activeItem.delClassNames('on');
	this.emit('deactivate', this.activeItem);
	this.activeItem = null;
	if (!silently) { playUiSound('GEN_BUTTON'); }
};


List.prototype.empty = function () {
	this.clearContent();
	this.activeItem = null;
	this.items = {};
};


List.prototype.sort = function (key, isDescending) {
	helper.sortObjectInArray(this.items, key, isDescending);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/List/index.js
 ** module id = 741
 ** module chunks = 0
 **/