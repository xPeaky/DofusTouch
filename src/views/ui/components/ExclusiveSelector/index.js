var util = require('util');
var EventEmitter = require('events');


function ExclusiveSelector() {
	EventEmitter.call(this);
	this._currentSelection = null;
	var self = this;
	this._onSelected = function (toggle) {
		self._changeSelection(this, toggle); // this is the selected.
	};
}
util.inherits(ExclusiveSelector, EventEmitter);
exports.ExclusiveSelector = ExclusiveSelector;

ExclusiveSelector.prototype._changeSelection = function (sender, toggle) {
	if (toggle) {
		if (this._currentSelection) {
			if (sender === this._currentSelection) {
				return;
			}
			this._currentSelection.select(false);
		}
		this._currentSelection = sender;
	} else {
		this._currentSelection = null;
	}
	this.emit('selectionChanged', this._currentSelection);
};

ExclusiveSelector.prototype.register = function (target) {
	if (typeof target.select !== 'function') {
		throw new Error(target, 'Does not define a select method.');
	}
	target.on('selected', this._onSelected);
};

ExclusiveSelector.prototype.unregister = function (target) {
	target.removeListener('selected', this._onSelected);
};

var groups = { default: new ExclusiveSelector() };

exports.getExclusiveSelectorByGroup = function (groupName) {
	if (!groupName) {
		return groups.default;
	}
	if (groupName in groups) {
		return groups[groupName];
	}
	var es = new ExclusiveSelector();
	groups[groupName] = es;
	return es;
};

exports.removeGroup = function (groupName) {
	delete groups[groupName];
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/ExclusiveSelector/index.js
 ** module id = 554
 ** module chunks = 0
 **/