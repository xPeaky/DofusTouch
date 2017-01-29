var Foreground  = require('./main.js');

Foreground.prototype._setupBorderArrow = function () {
	this._borderArrow = this.createChild('div', { className: 'BorderArrow' });
};

Foreground.prototype.showBorderArrow = function (direction, x, y) {
	switch (direction) {
	case 'top':
	case 'bottom':
		this._borderArrow.setStyles({ left: x + 'px', top: '' });
		break;
	case 'left':
	case 'right':
		this._borderArrow.setStyles({ top: y + 'px', left: '' });
		break;
	}
	this._borderArrow.setClassNames(['BorderArrow', direction]);
	this._borderArrow.show();
};

Foreground.prototype.hideBorderArrow = function () {
	this._borderArrow.hide();
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/Foreground/borderArrow.js
 ** module id = 292
 ** module chunks = 0
 **/