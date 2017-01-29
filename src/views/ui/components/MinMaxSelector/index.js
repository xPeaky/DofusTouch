require('./styles.less');
var getElementPositionAt = require('positionHelper').getElementPositionAt;
var getText = require('getText').getText;
var inherits = require('util').inherits;
var Button = require('Button');
var DofusButton = Button.DofusButton;
var NumberInputBox = require('NumberInputBox');
var protocolConstants = require('protocolConstants');
var tweener = require('tweener');
var WuiDom = require('wuidom');

// const
var MAX_NUMBER = protocolConstants.MAX_NUMBER;
var REPEAT_TIMEOUT = 100;

var closedStyles = { opacity: 0, webkitTransform: 'scale(0.8)' };
var openedStyles = { opacity: 1, webkitTransform: 'scale(1)' };


function MinMaxSelector() {
	var self = this;
	WuiDom.call(this, 'div', { className: 'minMaxSelector', hidden: true });

	var topRow = this.createChild('div', { className: 'topRow' });
	var botRow = this.createChild('div', { className: 'botRow' });

	this.decrButton = topRow.appendChild(new Button({
		className: ['simpleButton', 'arrow', 'decrButton'],
		repeatDelay: REPEAT_TIMEOUT
	}));

	this.numberInput = topRow.appendChild(new NumberInputBox({ className: 'numberInput' }));

	this.incrButton = topRow.appendChild(new Button({
		className: ['simpleButton', 'arrow', 'incrButton'],
		repeatDelay: REPEAT_TIMEOUT
	}));

	this.minButton = botRow.appendChild(new DofusButton(getText('ui.common.minWord'), { className: 'minButton' }));
	this.maxButton = botRow.appendChild(new DofusButton(getText('ui.common.maxWord'), { className: 'maxButton' }));

	this.close = botRow.appendChild(new Button({ className: ['simpleButton', 'closeBtn'] }));
	this.confirm = botRow.appendChild(new Button({ className: ['simpleButton', 'confirmBtn'] }));

	this.currentValue = 0; // will be initialised each time we open (see "open" method below)

	// button events
	this.minButton.on('tap', function () {
		self.currentValue = self.min;
		self.numberInput.setValue(self.currentValue);
	});
	this.maxButton.on('tap', function () {
		self.currentValue = self.max;
		self.numberInput.setValue(self.currentValue);
	});
	this.decrButton.on('tap', function () {
		if (self.currentValue <= self.min) { return; }
		self.currentValue--;
		self.numberInput.setValue(self.currentValue);
	});
	this.incrButton.on('tap', function () {
		if (self.currentValue >= self.max) { return; }
		self.currentValue++;
		self.numberInput.setValue(self.currentValue);
	});
	this.confirm.on('tap', function () {
		self.closeMinMax();
		self.emit('confirm', self.currentValue);
	});
	this.close.on('tap', function () {
		self.closeMinMax();
	});
	this.numberInput.on('change', function (value) {
		self.currentValue = value;
	});
}
inherits(MinMaxSelector, WuiDom);
module.exports = MinMaxSelector;


MinMaxSelector.prototype.position = function (x, y) {
	var position = getElementPositionAt(this, x, y);
	this.setStyles({
		left: position.x + 'px',
		top: position.y + 'px'
	});
};

// NB: options.placeholder is supposed to be a text, e.g. "# items to drop"
//     options.defaultValue overwrites options.placeholder (if both are given)
MinMaxSelector.prototype.open = function (options) {
	var self = this;
	options = options || {};

	this.min = options.min || 0;
	this.max = options.max || MAX_NUMBER;

	// If we don't have a default value, we use the minimum value for init value
	var initValue;
	if (options.defaultValue !== undefined) {
		initValue = Math.max(this.min, Math.min(this.max, options.defaultValue));
	} else {
		initValue = this.min;
	}

	// We use the placeholder (only if there is not also a default value)
	if (options.placeholder !== undefined && options.defaultValue === undefined) {
		this.numberInput.setPlaceholder(options.placeholder);
		this.currentValue = '';
	} else {
		this.currentValue = initValue;
	}

	this.numberInput.setValue(this.currentValue);
	this.numberInput.minValue = this.min;
	this.numberInput.maxValue = this.max;

	this.show();
	if (options.hasOwnProperty('x') && options.hasOwnProperty('y')) {
		this.position(options.x, options.y);
	}

	this.setStyles(closedStyles);

	function finishedOpen() {
		delete self.openTweener;
		self.emit('opened');
	}

	if (this.openTweener) {
		this.openTweener.cancel();
		return finishedOpen();
	}

	this.openTweener = tweener.tween(
		this,
		openedStyles,
		{ time: 150, delay: 0, easing: 'ease-out' },
		finishedOpen
	);
};

MinMaxSelector.prototype.openAround = function (wuiDom, options) {
	var targetRect = wuiDom.rootElement.getBoundingClientRect();
	options.x = targetRect.left;
	options.y = targetRect.top;

	this.open(options);
};

MinMaxSelector.prototype.closeMinMax = function () {
	var self = this;

	function finishedClose() {
		delete self.closeTweener;
		self.hide();
		self.emit('closed');
		self.numberInput.rootElement.blur();
	}

	if (this.closeTweener) {
		this.closeTweener.cancel();
		return finishedClose();
	}

	this.closeTweener = tweener.tween(
		this,
		closedStyles,
		{ time: 150, delay: 0, easing: 'ease-out' },
		finishedClose
	);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/MinMaxSelector/index.js
 ** module id = 200
 ** module chunks = 0
 **/