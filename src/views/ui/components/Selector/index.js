require('./styles.less');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var Button = require('Button');

function Selector(options) {
	options = options || {};

	WuiDom.call(this, 'div', { className: 'Selector' });
	this.addClassNames(options.className);

	var self = this;
	this._map = [];
	this._valueIndexes = {};
	this._previousValue = null;
	this._lastSelectedIndex = 0;
	this._dropDownSelector = this.appendChild(new Button({ className: ['selectorContent'], scaleOnPress: false }));
	this._hasContent = false;
	this._enabled = true;

	this.buttonOpen = this.createChild('div', { className: 'buttonOpen' });

	function onChange(value, index) {
		self._lastSelectedIndex = index;

		self.emit('change', value, self._previousValue);
		self._dropDownSelector.setText(self._map[index].text);
		self._previousValue = value;
	}

	this._dropDownSelector.on('tap', function () {
		window.gui.dropDown.setupDropDown(this, self._map, self._lastSelectedIndex, onChange);
	});
}

inherits(Selector, WuiDom);
module.exports = Selector;


Selector.prototype.addOption = function (text, value) {
	if (!value && value !== 0) {
		value = '';
	}

	if (this._previousValue === null) {
		this._previousValue = value;
		this._lastSelectedIndex = 0;
		this._dropDownSelector.setText(text);
	}
	this._valueIndexes[value] = this._map.length;
	this._map.push({
		text: text,
		value: value
	});
	this._hasContent = true;
	this._setEnable();
};


Selector.prototype.setEnable = function (enable) {
	if (enable === 'undefined') {
		enable = true;
	}
	this._enabled = enable;
	this._setEnable();
};

Selector.prototype._setEnable = function () {
	var shouldEnable = this._enabled && this._hasContent;
	this._dropDownSelector.setEnable(shouldEnable);
	this.toggleClassName('disabled', !shouldEnable);
};

Selector.prototype.hasValue = function (value) {
	return this._valueIndexes[value] !== undefined;
};

Selector.prototype.select = function (value, silently) {
	if (!this.setValue(value)) { return; }
	if (!silently) {
		this.emit('change', value, this._previousValue);
	}
	this._previousValue = value;
};

Selector.prototype.selectFirst = function (silently) {
	if (!this._map.length) {
		return;
	}

	var value = this._map[0].value;
	this.select(value, silently);
	return value;
};

Selector.prototype.setValue = function (value) {
	var valueIndex = this._valueIndexes[value];
	if (valueIndex === undefined) { return console.error('Selecting invalid value:', value); }

	this._lastSelectedIndex = valueIndex;
	window.gui.dropDown.select(valueIndex);
	var row = this._map[valueIndex];
	this._dropDownSelector.setText(row.text);
	this._previousValue = value;
	return true;
};

Selector.prototype.clearContent = function () {
	this._map = [];
	this._previousValue = null;
	this._lastSelectedIndex = 0;
	this._valueIndexes = {};
	this._dropDownSelector.setText('');
	window.gui.dropDown.clearContent();
	this._hasContent = false;
	this._setEnable();
};

/**
 * Enable or disable selector option individually
 *
 * @param {int} index Index of the option
 * @param {boolean} state Default to enable, true to enable, false to disable
 */
Selector.prototype.toggleOption = function (index, state) {
	if (!index && index !== 0) {
		return;
	}

	var row = this._map[index];
	if (row) {
		state = state === undefined ? row.disabled : state;
		row.disabled = !state;
	}
};

Selector.prototype.setOptionHidden = function (index, shouldHide) {
	var row = this._map[index];
	if (!row) { return console.warn('Invalid selector option', index); }
	row.hidden = !!shouldHide;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/Selector/index.js
 ** module id = 392
 ** module chunks = 0
 **/