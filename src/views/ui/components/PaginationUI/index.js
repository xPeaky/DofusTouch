require('./styles.less');
var inherits = require('util').inherits;
var NumberInputBox = require('NumberInputBox');
var WuiDom = require('wuidom');
var Button = require('Button');

// const
var REPEAT_TIMEOUT = 200;

function createArrow(action, container, sound) {
	var button = new Button({
		className: ['arrow', action],
		repeatDelay: REPEAT_TIMEOUT,
		sound: sound
	}, function () {
		container.emit(action);
	});
	return container.appendChild(button);
}

// NB: if options.isInputDisabled is true, the number input box will remain read-only ALWAYS
function PaginationUI(options) {
	WuiDom.call(this, 'div', { className: 'PaginationUI' });

	options = options || {};

	this._leftArrow = createArrow('previous', this, options.soundPrev);

	this._centeringContainer = this.createChild('div', { className: 'centeringContainer' });

	var numberInputBox = this._numberInputBox = this._centeringContainer.appendChild(new NumberInputBox());

	this.isInputDisabled = !!options.disableInput;
	numberInputBox.setReadonly(this.isInputDisabled);

	var self = this;

	numberInputBox.on('change', function (val) {
		self.emit('page', val - 1);
	});

	this._pageCountLabel = this._centeringContainer.createChild('div', { className: 'pageCount' });

	this._rightArrow = createArrow('next', this, options.soundNext);
}
inherits(PaginationUI, WuiDom);


PaginationUI.prototype.setDirection = function (direction) {
	this.toggleClassName('vertical', direction === 'vertical');
};

PaginationUI.prototype._checkPosition = function () {
	this._leftArrow.setEnable(this.current !== 0);

	this._rightArrow.setEnable(this.current < this._pageCount - 1);

	// Set page input box as read-only if we have 0 or 1 page
	// - but leaves it as read-only if this option was set from the start
	var isReadOnly = this._pageCount <= 1 || this.isInputDisabled;
	this._numberInputBox.setReadonly(isReadOnly);
	this._centeringContainer.toggleClassName('readOnly', isReadOnly);
};

PaginationUI.prototype.setCurrent = function (page) {
	this.current = page;
	this._numberInputBox.setValue(page + 1);
	this._checkPosition();
};

PaginationUI.prototype.setPageCount = function (pageCount) {
	this._numberInputBox.maxValue = pageCount;
	this._pageCount = pageCount;
	this._pageCountLabel.setText('/ ' + pageCount);
	this._checkPosition();
};

module.exports = PaginationUI;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/PaginationUI/index.js
 ** module id = 569
 ** module chunks = 0
 **/