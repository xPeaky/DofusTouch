require('./styles.less');
var BasicButton = require('Button');
var Button = require('Button').DofusButton;
var dimensions = require('dimensionsHelper').dimensions;
var getText = require('getText').getText;
var gripBehavior = require('gripBehavior');
var helper = require('helper');
var inherits = require('util').inherits;
var protocolConstants = require('protocolConstants');
var tapBehavior = require('tapBehavior');
var tooltip = require('TooltipBox');
var WuiDom = require('wuidom');

var MAX_NUMBER = protocolConstants.MAX_NUMBER;
var MAX_NUM_DIGITS = MAX_NUMBER.toString().length; // does not include spaces or formatting, just pure digits

var modes = {
	DISPLAY: 0,
	INSERT: 1,
	EDIT: 2
};

// These are also the logical names of keys (in this.keyMap)
var keyboardKeys = [
	'7',   '8',   '9',
	'4',   '5',   '6',
	'1',   '2',   '3',
	'BS',  '0',  '000',
	'CLR',      'ENTER'
];
// "@" means the key has an icon - with or without text
var keyLabels = {
	BS: '@',
	ENTER: '@ENTER',
	CLR: 'CLR'
};


var MARGIN_WITH_SCREEN = 10;
var yOffsetOfDisplay;


function NumberInputPad() {
	WuiDom.call(this, 'div', { className: 'numberInputPad', hidden: true });

	this.digits = [];

	this.overlay = window.gui.gameGuiContainer.createChild('div', { className: 'numberPadOverlay', hidden: true });
}
inherits(NumberInputPad, WuiDom);
module.exports = NumberInputPad;


NumberInputPad.prototype.open = function (inputBox, title, minValue, maxValue) {
	if (!this.keyboard) {
		this._createContent();
	}

	this.inputBox = inputBox;
	if (title) { this.title.setText(title); }
	this.minValue = minValue !== undefined ? minValue : 0;
	this.maxValue = maxValue !== undefined ? maxValue : MAX_NUMBER;
	this.setValue(inputBox.getValue());
	this._switchMode(modes.DISPLAY);

	this._show();
};

NumberInputPad.prototype._show = function () {
	this.overlay.show();
	this.setStyle('opacity', 0);
	this.show();

	// Position our display so number in the input box stays around the same place (more natural)

	if (!yOffsetOfDisplay) {
		// Compute Y offset of display's center inside NumberInputPad component
		var elt = this.digitBoxes[0].rootElement;
		yOffsetOfDisplay = elt.offsetTop + elt.offsetHeight / 2;
	}
	var target = this.inputBox.rootElement.getBoundingClientRect();
	var me = this.rootElement.getBoundingClientRect();

	var x = target.right - me.width;
	var y = target.top + target.height / 2 - yOffsetOfDisplay;

	// Make sure we stay within screen limits
	x = Math.min(Math.max(x, MARGIN_WITH_SCREEN), dimensions.screenWidth - MARGIN_WITH_SCREEN - me.width);
	y = Math.min(Math.max(y, MARGIN_WITH_SCREEN), dimensions.screenHeight - MARGIN_WITH_SCREEN - me.height);

	this.setStyles({ left: x + 'px', top: y + 'px' });
	this.setStyle('opacity', 1);
	this.rootElement.focus();
};

function tapOnKey() {
	this.numberInput._tapOnKey(this.id);
}

function tapOnDisplay() {
	this.numberInput._tapOnDisplay(this.id);
}

NumberInputPad.prototype._createContent = function () {
	var self = this;
	window.gui.on('disconnect', function () {
		self.hide();
	});

	// Overlay behavior

	this.on('hide', function () {
		self.overlay.hide();
	});

	// Title bar (includes grip & close button)

	var titleBar = this.createChild('div', { className: 'titleBar' });
	gripBehavior(this, { grip: titleBar, isFullScreen: true });
	this.title = titleBar.createChild('div', { className: 'title' });
	var closeButton = titleBar.appendChild(new BasicButton({ className: 'closeButton', scaleOnPress: true }));
	closeButton.on('tap', function () { self.hide(); });

	// Display

	this.digitBoxes = [];
	this.digitElements = [];
	this.separators = [];

	var display = this.createChild('div', { className: 'displayContainer' });
	var separatorChar = getText('ui.common.numberSeparator') || '.';

	for (var i = 0; i < MAX_NUM_DIGITS; i++) {
		var index = MAX_NUM_DIGITS - 1 - i;
		var isGroupStart = index % 3 === 2;
		if (isGroupStart) {
			this.separators[index + 1] = display.createChild('div', { className: 'separator', text: separatorChar });
		}
		var box = this.digitBoxes[index] = display.createChild('div', { className: 'digitBox' });
		if (isGroupStart) { box.addClassNames('groupStart'); }

		box.id = index;
		box.numberInput = this;
		tapBehavior(box);
		box.on('tap', tapOnDisplay);

		this.digitElements[index] = box.createChild('div', { className: 'digit' });
	}

	// Keyboard

	this.keyMap = {};

	var keyboardContainer = this.createChild('div', { className: 'keyboardContainer' });
	var keyboard = this.keyboard = keyboardContainer.createChild('div', { className: 'keyboard' });

	for (i = 0; i < keyboardKeys.length; i++) {
		var keyName = keyboardKeys[i];
		var label = keyLabels[keyName] || keyName;
		var key = this.keyMap[keyName] = new Button(label, { className: ['keyboardKey', 'key' + keyName] });
		if (label[0] === '@') {
			if (label.length > 1) { key.createChild('div', { text: label.substr(1) }); }
			key.createChild('div', { className: 'keyIcon' });
		}
		keyboard.appendChild(key);

		key.id = keyName;
		key.numberInput = this;
		key.on('tap', tapOnKey);
	}
};


var nonDigitRegexp = /[^0-9]/g;

NumberInputPad.prototype.setValue = function (value) {
	if (typeof value === 'string') {
		value = value.replace(nonDigitRegexp, '').toString();
		if (!value) { value = '0'; }
	} else {
		value = value.toFixed();
	}
	// If a too big number is provided, truncate it (how it got to us here is out of concern now)
	if (value.length >= MAX_NUM_DIGITS) {
		value = value.substr(0, MAX_NUM_DIGITS);
	}

	for (var cursor = MAX_NUM_DIGITS - 1; cursor >= value.length; cursor--) {
		this._setDigit(cursor, '');
	}
	for (var i = 0; i < value.length; i++) {
		this._setDigit(cursor, value[i]);
		cursor--;
	}

	if (value === '0') { this._switchMode(modes.DISPLAY); }
};

NumberInputPad.prototype._getValue = function () {
	var value = '';
	for (var cursor = MAX_NUM_DIGITS - 1; cursor >= 0; cursor--) {
		value += this.digits[cursor];
	}
	return parseInt(value, 10);
};

NumberInputPad.prototype._enableKey = function (keyName, enable) {
	if (enable) {
		this.keyMap[keyName].enable();
	} else {
		this.keyMap[keyName].disable();
	}
};

NumberInputPad.prototype._switchMode = function (mode) {
	if (mode === this.mode) { return; }

	// If we exit EDIT mode, hide cursor
	if (this.mode === modes.EDIT && mode !== modes.EDIT) {
		this._setCursor(-1);
	}

	this.mode = mode;

	this._enableKey('BS', this.mode === modes.INSERT);
	this._enableKey('0', this.mode !== modes.DISPLAY);
	this._enableKey('000', this.mode !== modes.DISPLAY);
};

NumberInputPad.prototype._setCursor = function (cursor) {
	// If cursor was displayed, hide it at previous position
	if (this.cursor >= 0) {
		this.digitBoxes[this.cursor].delClassNames('highlight');
	}
	// Move and display cursor at new position
	this.cursor = cursor;
	if (this.cursor >= 0) {
		this.digitBoxes[cursor].addClassNames('highlight');
	}
};

NumberInputPad.prototype._tapOnDisplay = function (cursor) {
	if (this.mode !== modes.EDIT) {
		this._switchMode(modes.EDIT);
	}
	this._setCursor(cursor);
};

NumberInputPad.prototype._tapOnKey = function (key) {
	switch (key) {
	case 'ENTER': return this._doEnter();
	case 'CLR': return this._doClear();
	case '000': return this._do000();
	case 'BS': return this._doBackspace();
	default: return this._doDigit(key);
	}
};

NumberInputPad.prototype._doEnter = function () {
	this._switchMode(modes.DISPLAY);
	var value = this._getValue();
	if (value > this.maxValue) {
		return tooltip.showNotification(getText('tablet.common.maxValue',
			helper.intToString(this.maxValue)), this.keyMap.ENTER);
	} else if (value < this.minValue) {
		return tooltip.showNotification(getText('tablet.common.minValue',
			helper.intToString(this.minValue)), this.keyMap.ENTER);
	}
	this.inputBox.setValue(value, /*shouldEmit=*/true);
	this.hide();
};

NumberInputPad.prototype._doClear = function () {
	this.setValue('0');
};

NumberInputPad.prototype._doBackspace = function () {
	if (this.mode !== modes.INSERT) { return; } // should not happen because key is disabled but better be safe

	var value = Math.floor(this._getValue() / 10);
	this.setValue(value);
};

NumberInputPad.prototype._do000 = function () {
	for (var i = 0; i < 3; i++) {
		this._doDigit('0');
	}
};

/** @param {string} digit - 0..9 or empty string are valid values */
NumberInputPad.prototype._doDigit = function (digit) {
	switch (this.mode) {
	case modes.DISPLAY:
		if (digit === '0' && this._getValue() === 0) { return; }
		// Switch to insert mode (we erase previously displayed value) and show 1st digit
		this.setValue(digit);
		return this._switchMode(modes.INSERT);

	case modes.INSERT:
		if (this.digits[MAX_NUM_DIGITS - 1] !== '') { return; } // display is already full
		return this.setValue(this._getValue() * 10 + ~~digit);

	case modes.EDIT:
		this._setDigit(this.cursor, digit);
		// Handle special case when editing the left digits
		this._fixZeroes(this.cursor, digit);

		// Did we reach the rightmost digit? If yes we go back to INSERT mode
		if (this.cursor === 0) {
			return this._switchMode(modes.INSERT);
		}
		// Simply move to next digit on the right
		return this._setCursor(this.cursor - 1);
	}
};

NumberInputPad.prototype._setDigit = function (cursor, digit) {
	this.digitElements[cursor].setText(digit);
	this.digits[cursor] = digit;
	if (this.separators[cursor]) { this.separators[cursor].toggleDisplay(digit !== ''); }
};

/**
 * Avoids number like "00012" and "5  12" - so they become "12" or "50012".
 * This is to make editing more natural when user changes a digit on the left.
 */
NumberInputPad.prototype._fixZeroes = function (cursor, newDigit) {
	// If cursor is 0 there is nothing to do (e.g. even "0" is a valid display)
	if (cursor === 0) { return; }

	// Remove leading zeroes if any (up to cursor)
	for (var pos = MAX_NUM_DIGITS - 1; pos >= cursor; pos--) {
		var digit = this.digits[pos];
		if (digit !== '0' && digit !== '') { break; } // reached the 1st non-empty and non-zero digit; we are done
		if (digit === '0') {
			this._setDigit(pos, '');
		}
	}

	if (newDigit !== '0') {
		// Fill with "0" the empty digits on the right of the 1st non-empty digit
		// e.g. "12" became "5__12" so we replace the 2 empty digits by "00"
		for (pos = cursor - 1; pos >= 0; pos--) {
			if (this.digits[pos] !== '') { break; }
			this._setDigit(pos, '0');
		}
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/NumberInputPad/index.js
 ** module id = 509
 ** module chunks = 0
 **/