require('./styles.less');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');

function HintArrow() {
	WuiDom.call(this, 'div', { className: 'HintArrow', hidden: true });
	this.arrow = this.createChild('div', { className: 'arrow' });
}

inherits(HintArrow, WuiDom);
module.exports = HintArrow;

HintArrow.prototype.showArrow = function (x, y, direction) {
	direction = direction || 'downRight';
	this.arrow.setClassNames(['arrow', direction]);
	this.setStyles({
		left: x + 'px',
		top: y + 'px'
	});
	this.show();
};

HintArrow.prototype.hideArrow = function () {
	this.hide();
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/HintArrow/index.js
 ** module id = 592
 ** module chunks = 0
 **/