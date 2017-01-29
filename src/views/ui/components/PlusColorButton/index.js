require('./styles.less');
var colors = require('colorHelper');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var tapBehavior = require('tapBehavior');


function PlusColorButton(myWindow, id, action, options) {
	options = options || {};

	this.myWindow = myWindow;
	this.id = id;
	this.active = options.active;
	this.selected = false;
	this.currentColor = null;
	this.isCustom = false;

	WuiDom.call(this, 'div', { className: 'plusColorButton' });
	tapBehavior(this);

	if (this.active && action && typeof action === 'function') {
		this.on('tap', action);
	} else {
		this.addClassNames('inactive');
	}

	this.plainColor = this.createChild('div', { className: 'plainColor' });
}
inherits(PlusColorButton, WuiDom);
module.exports = PlusColorButton;


PlusColorButton.prototype.select = function () {
	this.addClassNames('selected');
	this.selected = true;
};

PlusColorButton.prototype.deselect = function () {
	this.delClassNames('selected');
	this.selected = false;
};

PlusColorButton.prototype.isCustomColor = function () {
	return this.isCustom;
};

PlusColorButton.prototype.setColor = function (col, isCustom) {
	this.isCustom = isCustom;
	this.currentColor = col;
	if (col) {
		this.plainColor.setStyle('display', 'block');
		this.plainColor.setStyle('background', col.hex);
		this.plainColor.setStyle('background',
			'-moz-linear-gradient(' +
				'top,  #ffffff 0%, ' + col.hex + ' 14%, ' + col.hex + ' 85%, ' + col.hex + ' 85%, #110f0d 100%' +
			')'
		);
		this.plainColor.setStyle('background',
			'-webkit-gradient(' +
				'linear, left top, left bottom, color-stop(0%,#ffffff), color-stop(14%,' + col.hex + '), ' +
				'color-stop(85%,' + col.hex + '), color-stop(85%,' + col.hex + '), color-stop(100%,#110f0d)' +
			')'
		);
		this.plainColor.setStyle('background',
			'-webkit-linear-gradient(' +
				'top,  #ffffff 0%,' + col.hex + ' 14%,' + col.hex + ' 85%,' + col.hex + ' 85%,#110f0d 100%' +
			')'
		);
		this.plainColor.setStyle('background',
			'-o-linear-gradient(top,  #ffffff 0%,' + col.hex + ' 14%,' + col.hex + ' 85%,' + col.hex + ' 85%,#110f0d 100%)');
		this.plainColor.setStyle('background',
			'-ms-linear-gradient(top,  #ffffff 0%,' + col.hex + ' 14%,' + col.hex + ' 85%,' + col.hex + ' 85%,#110f0d 100%)');
		this.plainColor.setStyle('background',
			'linear-gradient(to bottom,  #ffffff 0%,' + col.hex + ' 14%,' + col.hex + ' 85%,' + col.hex + ' 85%,#110f0d 100%)');
	} else {
		this.plainColor.setStyle('display', 'none');
	}
};

PlusColorButton.prototype.getColor = function () {
	return this.currentColor;
};

PlusColorButton.prototype.randomize = function () {
	var r = Math.floor(Math.random() * 255);
	var g = Math.floor(Math.random() * 255);
	var b = Math.floor(Math.random() * 255);
	var col = [r, g, b];
	col = {
		rgb: col,
		hex: colors.colorArrayToHexa(col)
	};
	this.setColor(col, /*isCustom=*/true);
};




/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/PlusColorButton/index.js
 ** module id = 907
 ** module chunks = 0
 **/