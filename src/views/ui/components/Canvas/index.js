require('./styles.less');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');

function Canvas(options) {
	WuiDom.call(this, 'canvas', options);
	this.addClassNames('Canvas');

	// To give direct access to style
	this.style = this.rootElement.style;
}

inherits(Canvas, WuiDom);
module.exports = Canvas;


Canvas.prototype.getContext = function (type) {
	type = type || '2d';
	return this.rootElement.getContext(type);
};

Object.defineProperty(Canvas.prototype, 'width', {
	get: function () {
		return this.rootElement.width;
	},
	set: function (width) {
		this.rootElement.width = width;
	}
});

Object.defineProperty(Canvas.prototype, 'height', {
	get: function () {
		return this.rootElement.height;
	},
	set: function (height) {
		this.rootElement.height = height;
	}
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/Canvas/index.js
 ** module id = 239
 ** module chunks = 0
 **/