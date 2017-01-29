require('./styles.less');
var helper = require('helper');
var inherits = require('util').inherits;
var protocolConstants = require('protocolConstants');
var tapBehavior = require('tapBehavior');
var WuiDom = require('wuidom');

var DEFAULT_MAX = protocolConstants.MAX_NUMBER;
var DEFAULT_MIN = 1;

var MAX_NUMBER_LEN = protocolConstants.MAX_NUMBER_LEN;


/**
 * Should be used instead of InputBox when the value is a number or currency amount (e.g. kamas)
 * @param {Object} options - usual WuiDom options
 * @param {string} [options.title] - if provided, will be displayed as title of the number input pad
 * @param {number} [options.minValue] - default is 1
 * @param {number} [options.maxValue] - default is usual maximum value authorized by protocol (2,000,000,000)
 * @constructor
 */
function NumberInputBox(options) {
	options = options || {};
	this.title = options.title;
	this.minValue = options.minValue !== undefined ? options.minValue : DEFAULT_MIN; // can be 0
	this.maxValue = options.maxValue || DEFAULT_MAX; // cannot be 0 so || syntax can be used

	// Initialise default attributes - they can be overriden voluntarily by caller using "options.attr"
	var attributes = {
		type: 'text',
		maxlength: MAX_NUMBER_LEN + 1, // +1 so we can go over the max number by typing in, even if 1st digit is "1"
		placeholder: 0
	};
	if (options.attr) {
		for (var attr in options.attr) {
			attributes[attr] = options.attr[attr];
		}
	}
	options.attr = attributes;

	// Initialise base class
	WuiDom.call(this, 'input', options);
	this.addClassNames('NumberInputBox');

	tapBehavior(this);
	this.on('tap', this._tapOnNumberInputBox);
}
inherits(NumberInputBox, WuiDom);
module.exports = NumberInputBox;


NumberInputBox.prototype._parseNumber = function (numberString) {
	var value = helper.stringToInt(numberString);
	return Math.min(Math.max(value, this.minValue), this.maxValue);
};

NumberInputBox.prototype._tapOnNumberInputBox = function () {
	this.emit('focus');
	// NB: min and max value could have been modified since the last time we opened the input pad
	if (this.minValue === undefined) { this.minValue = DEFAULT_MIN; }
	if (this.maxValue === undefined) { this.maxValue = DEFAULT_MAX; }

	window.gui.numberInputPad.open(this, this.title, this.minValue, this.maxValue);
};

/**
 * Opens the number input pad to get a value from user.
 * @param {function} [cb] - called as cb(true) if a value was validated, cb(false) otherwise
 */
NumberInputBox.prototype.promptForValue = function (cb) {
	this._tapOnNumberInputBox();
	if (!cb) { return; }

	var self = this;
	var isValidated = false;
	function validate() {
		isValidated = true;
	}
	this.on('change', validate);

	window.gui.numberInputPad.once('hide', function () {
		self.removeListener('change', validate);
		return cb(isValidated);
	});
};

/**
 * @return {number} - the current value as a number (not a string!)
 */
NumberInputBox.prototype.getValue = function () {
	return helper.stringToInt(this.rootElement.value);
};

/**
 * @return {string} - the current value as a formatted string, e.g.  "1 200 000"
 */
NumberInputBox.prototype.getFormattedValue = function () {
	return helper.intToString(helper.stringToInt(this.rootElement.value));
};

/**
 * @param {number|string} value - value to set; if a number, we reformat it. If a string, we keep it as is.
 */
NumberInputBox.prototype.setValue = function (value, shouldEmit) {
	var strValue, numValue;
	if (typeof value === 'number') {
		numValue = value;
		strValue = helper.intToString(numValue);
	} else {
		strValue = value;
		numValue = this._parseNumber(strValue);
	}
	this.rootElement.value = strValue;
	if (shouldEmit) { this.emit('change', numValue); } // we send the number value, not the formatted string!
};

NumberInputBox.prototype.setReadonly = function (readonly) {
	if (readonly === false) {
		this.rootElement.removeAttribute('readonly');
	} else {
		this.rootElement.setAttribute('readonly', 'readonly');
	}
	this.setEnable(!readonly);
};

NumberInputBox.prototype.setPlaceholder = function (value) {
	this.rootElement.placeholder = value;
};

NumberInputBox.prototype.blur = function () {
};

NumberInputBox.prototype.focus = function () {
};

NumberInputBox.prototype.disable = function () {
	this.setEnable(false);
	this.rootElement.disabled = true;
};

NumberInputBox.prototype.enable = function () {
	this.setEnable(true);
	this.rootElement.disabled = false;
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/NumberInputBox/index.js
 ** module id = 207
 ** module chunks = 0
 **/