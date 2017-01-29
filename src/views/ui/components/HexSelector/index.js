require('./styles.less');
var getElementPositionAt = require('positionHelper').getElementPositionAt;
var inherits = require('util').inherits;
var Button = require('Button');
var InputBox = require('InputBox');
var tweener = require('tweener');
var WuiDom = require('wuidom');

var closedStyles = {
	opacity: 0,
	webkitTransform: 'scale(0.8)'
};
var openedStyles = {
	opacity: 1,
	webkitTransform: 'scale(1)'
};

function HexSelector() {
	var self = this;
	WuiDom.call(this, 'div', {
		className: 'HexSelector',
		hidden: true
	});

	function confirm() {
		self.closeHex();
		self.emit('confirm', self.currentValue);
	}

	this.close = this.appendChild(new Button({ className: ['simpleButton', 'closeBtn'] }));

	this.createChild('div', {
		className: 'hexLabel',
		text: '0x'
	});

	this.inputBox = this.appendChild(new InputBox({
		className: 'hexInputBox',
		attr: {
			maxlength: 6
		}
	}, confirm));

	this.confirm = this.appendChild(new Button({ className: ['simpleButton', 'confirmBtn'] }));

	this.currentValue = 0; // will be initialised each time we open (see "open" method below)

	this.confirm.on('tap', confirm);
	this.close.on('tap', function () {
		self.closeHex();
	});
	this.inputBox.on('change', function (value) {
		self.currentValue = value;
	});
}

inherits(HexSelector, WuiDom);
module.exports = HexSelector;

HexSelector.prototype.position = function (x, y) {
	var position = getElementPositionAt(this, x, y);
	this.setStyles({
		left: position.x + 'px',
		top: position.y + 'px'
	});
};

// NB: options.placeholder is supposed to be a text, e.g. "# items to drop"
//     options.defaultValue overwrites options.placeholder (if both are given)
HexSelector.prototype.open = function (options) {
	var self = this;
	options = options || {};

	// We use the placeholder (only if there is not also a default value)
	if (options.placeholder !== undefined && options.defaultValue === undefined) {
		this.inputBox.setPlaceholder(options.placeholder);
		this.currentValue = '';
	} else if (options.defaultValue !== undefined) {
		this.currentValue = options.defaultValue;
	}

	this.inputBox.setValue(this.currentValue);

	this.show();
	if (options.hasOwnProperty('x') && options.hasOwnProperty('y')) {
		this.position(options.x, options.y);
	}

	this.setStyles(closedStyles);

	function finishedOpen() {
		delete self.openTweener;
		self.inputBox.focus();
		self.emit('opened');
	}

	if (this.openTweener) {
		this.openTweener.cancel();
		return finishedOpen();
	}

	this.openTweener = tweener.tween(
		this,
		openedStyles,
		{
			time: 150,
			delay: 0,
			easing: 'ease-out'
		},
		finishedOpen
	);
};

HexSelector.prototype.closeHex = function () {
	var self = this;

	function finishedClose() {
		delete self.closeTweener;
		self.hide();
		self.emit('closed');
		self.inputBox.blur();
	}

	if (this.closeTweener) {
		this.closeTweener.cancel();
		return finishedClose();
	}

	this.closeTweener = tweener.tween(
		this,
		closedStyles,
		{
			time: 150,
			delay: 0,
			easing: 'ease-out'
		},
		finishedClose
	);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/HexSelector/index.js
 ** module id = 515
 ** module chunks = 0
 **/