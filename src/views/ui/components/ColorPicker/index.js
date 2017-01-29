require('./styles.less');
var colors = require('colorHelper');
var slideBehavior = require('slideBehavior');
var tapBehavior = require('tapBehavior');
var inherit = require('util').inherits;
var WuiDom = require('wuidom');
var HexSelector = require('HexSelector');
var colorHelper = require('colorHelper');

var MAX_LUM_WIDTH = 40; // default luminance bar width unless specified - when updateDimensions is called
var MARGIN_BETWEEN = 10; // margin in px between tint & lum elements

var epsilon = 0.00001; // small enough number to avoid equality with max values
var HM = 255 / 2; // half-max; makes computations simpler

var topColors = [
	[255, 0, 0],
	[255, 255, 0],
	[0, 255, 0],
	[0, 255, 255],
	[0, 0, 255],
	[255, 0, 255],
	[255, 0, 0]
];


/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @class ColorPicker
 * @desc  color picker (with one tint and one luminosity panel)
 *
 * @param {Object}  params - `tintWidth`, `tintHeight`  pixel size of the tint panel
 *                         - `lumWidth` and `lumHeight` pixel size of luminosity panel
 *                         without interrupting color selection
 */

function ColorPicker(params) {
	var willUpdateDimensions = params === undefined;
	params = params || {};
	var self = this;

	WuiDom.call(this, 'div', { className: 'ColorPicker' });

	var hexSelector = this.appendChild(new HexSelector());
	hexSelector.on('confirm', function (hexValue) {
		var rgb = colorHelper.hexToRgb(hexValue);
		if (rgb) {
			self.setCurrentColor([rgb.r, rgb.g, rgb.b]);
			emitChangeEnd();
		}
	});

	this.params = {
		tintWidth:    params.tintWidth    || 162,
		tintHeight:   params.tintHeight   || 110,
		lumWidth:     params.lumWidth     || 16,
		lumHeight:    params.lumHeight    || 110
	};

	// default color - currentTint and currentColor might receive float colors later
	this.currentTint = [255, 0, 0];
	this.currentColor = [255, 0, 0];

	// div containing the tint canvas and it's cursor
	this.tintWrapper = this.createChild('div', { className: 'tintWrapper' });

	// tint canvas creation
	this.tintCanvas = this.tintWrapper.createChild('canvas', { className: 'tintCanvas' });
	this.tintCanvas.rootElement.width = this.params.tintWidth;
	this.tintCanvas.rootElement.height = this.params.tintHeight;
	// tint canvas events
	slideBehavior(this.tintCanvas);
	tapBehavior(this.tintCanvas);
	this.tintCanvas.panelType = 'tint';

	function beginMove(touch, boundingBox) {
		this.deltaX = touch.x - boundingBox.left - this.picker.x;
		this.deltaY = touch.y - boundingBox.top - this.picker.y;
		this.box = boundingBox;
	}

	function emitChangeEnd() {
		// NB: we always send a 'colorChanged' after 1 or more 'newColor' events.
		self.emit('colorChanged', self.getCurrentColor());
	}

	function selectColor(touch) {
		var x = touch.x - this.box.left;
		var y = touch.y - this.box.top;
		self._cursorMove({ x: x, y: y }, this.box, this.panelType);
		emitChangeEnd();
	}

	function moveCursor(touch) {
		var x = touch.x - this.box.left - this.deltaX;
		var y = touch.y - this.box.top - this.deltaY;
		self._cursorMove({ x: x, y: y }, this.box, this.panelType);
	}

	function openHexInput() {
		hexSelector.open({ x: 0, y: 0, defaultValue: '' });
	}

	this.tintCanvas.on('slideStart', beginMove);
	this.tintCanvas.on('slide', moveCursor);
	this.tintCanvas.on('slideEnd', emitChangeEnd);
	this.tintCanvas.on('tapstart', beginMove);
	this.tintCanvas.on('tap', selectColor);
	this.tintCanvas.on('doubletap', openHexInput);

	// tint cursor
	this.tintPicker = this.tintWrapper.createChild('div', { className: 'tintPicker' });
	this.tintCanvas.picker = this.tintPicker;

	// div containing the luminosity canvas and it's cursor
	this.lumWrapper  = this.createChild('div', { className: 'lumWrapper' });
	// luminosity canvas creation
	this.lumCanvas = this.lumWrapper.createChild('canvas', { className: 'lumCanvas' });
	this.lumCanvas.rootElement.width = 1;
	this.lumCanvas.rootElement.height = this.params.lumHeight;
	// luminosity canvas events
	slideBehavior(this.lumCanvas);
	tapBehavior(this.lumCanvas);
	this.lumCanvas.panelType = 'lum';
	this.lumCanvas.on('slideStart', beginMove);
	this.lumCanvas.on('slide', moveCursor);
	this.lumCanvas.on('slideEnd', emitChangeEnd);
	this.lumCanvas.on('tapstart', beginMove);
	this.lumCanvas.on('tap', selectColor);

	// luminosity cursor
	var lumPicker = this.lumPicker = this.lumWrapper.createChild('div', { className: 'lumPicker' });
	this.lumCanvas.picker = lumPicker;
	lumPicker.dark = lumPicker.createChild('div', { className: ['triangle', 'black'] });
	lumPicker.bright = lumPicker.createChild('div', { className: ['triangle', 'white'] });

	if (!willUpdateDimensions) {
		this.updateDimensions(
			this.params.tintWidth + this.params.lumWidth + MARGIN_BETWEEN,
			this.params.tintHeight,
			this.params.lumWidth
		);
	}
}

inherit(ColorPicker, WuiDom);
module.exports = ColorPicker;


ColorPicker.prototype.updateDimensions = function (width, height, lumWidth) {
	this.params.lumWidth = lumWidth || Math.min(width / 5, MAX_LUM_WIDTH);

	var tintWidth = width - this.params.lumWidth - MARGIN_BETWEEN;
	tintWidth = tintWidth > 0 ? tintWidth : this.params.tintWidth;
	this.params.tintWidth = tintWidth;
	this.params.tintHeight = height;

	this.tintCanvas.rootElement.width = tintWidth;
	this.tintCanvas.rootElement.height = height;
	this.tintCanvas.setStyles({
		width: tintWidth + 'px',
		height: height + 'px'
	});

	this.params.lumHeight = height;
	this.lumCanvas.rootElement.height = height;
	this.lumCanvas.setStyles({
		width: this.params.lumWidth + 'px',
		height: this.params.lumHeight + 'px'
	});

	this.fillTint();
	this.updateLuminosity();
	this._setPickerPosition(this.tintPicker, 0, 0);
	this._setPickerPosition(this.lumPicker, 0, height / 2);
};

/**
 * Converts a color from x,y,lum to RGB according to our palette.
 * Second step; should be called after _tintCoordinatesToColor.
 * this.currentTint should contain the current tint.
 * @param {number} lumY - position Y of luminance cursor (0 = white, lumHeight/2 = neutral, lumHeight = black)
 * @return {Array} - [r, g, b]; values are float
 */
ColorPicker.prototype._lumCoordinatesToColor = function (lumY) {
	var interval = lumY / (this.params.lumHeight / 2);
	var from = interval < 1 ? [255, 255, 255] : this.currentTint;
	var to = interval < 1 ? this.currentTint : [0, 0, 0];
	var percent = interval % 1;
	return [
		from[0] * (1 - percent) + to[0] * percent,
		from[1] * (1 - percent) + to[1] * percent,
		from[2] * (1 - percent) + to[2] * percent
	];
};

/**
 * Converts a color from x,y to RGB according to our palette (lum = neutral).
 * First step; should be called before _lumCoordinatesToColor.
 * @param {number} x - position X in our palette
 * @param {number} y - position Y in our palette
 * @return {Array} - [r, g, b], the color in our palette using neutral luminance; values are float
 */
ColorPicker.prototype._tintCoordinatesToColor = function (x, y) {
	var intervalWidth = this.params.tintWidth / (topColors.length - 1);

	var interval  = Math.floor(x / intervalWidth);
	var percent   = (x / intervalWidth) % 1;
	var redFrom   = topColors[interval][0];
	var redTo     = topColors[interval + 1][0];
	var greenFrom = topColors[interval][1];
	var greenTo   = topColors[interval + 1][1];
	var blueFrom  = topColors[interval][2];
	var blueTo    = topColors[interval + 1][2];
	var redTop    = redFrom * (1 - percent) + redTo * percent;
	var greenTop  = greenFrom * (1 - percent) + greenTo * percent;
	var blueTop   = blueFrom * (1 - percent) + blueTo * percent;

	var verticalPercent = y / this.params.tintHeight;
	var red   = redTop * (1 - verticalPercent) + HM * verticalPercent;
	var green = greenTop * (1 - verticalPercent) + HM * verticalPercent;
	var blue  = blueTop * (1 - verticalPercent) + HM * verticalPercent;

	return [red, green, blue];
};

/**
 * Converts a color from RGB to x,y,lum according to our palette
 * @param {Array} color - [r, g, b]
 * @return {Array} - [x, y, lum]; values are float
 */
ColorPicker.prototype._colorToTintAndLum = function (color) {
	var tintWidth = this.params.tintWidth, tintHeight = this.params.tintHeight;
	var lumOrig = tintHeight / 2; // the vertical luminosity bar is divided in 2

	var min = Math.min.apply(Math, color);
	var max = Math.max.apply(Math, color);

	var lowOne = color.indexOf(min);
	var highOne = color.indexOf(max);
	if (lowOne === highOne) {
		// Corner case of "pure grey" (R = G = B)
		var l = (1 - (min / 255)) * tintHeight  - epsilon;
		return [0, tintHeight - epsilon, l];
	}

	var midOne;
	if (lowOne !== 0 && highOne !== 0) {
		midOne = 0;
	} else if (lowOne !== 1 && highOne !== 1) {
		midOne = 1;
	} else {
		midOne = 2;
	}

	var highColor = color[highOne], midColor = color[midOne], lowColor = color[lowOne];

	// Compute the x position

	var intervalIndexFromLowerColors = [[null, 3, 2], [4, null, 5], [1, 0, null]];
	var intervalNdx = intervalIndexFromLowerColors[lowOne][midOne];

	var horizontalPercent = (midColor - lowColor) / (highColor - lowColor);
	var posInInterval = intervalNdx % 2 ? 1 - horizontalPercent : horizontalPercent;

	var intervalWidth = tintWidth / (topColors.length - 1);
	var x = (intervalWidth * (intervalNdx + posInInterval)) % tintWidth;

	// Compute the y (harder because luminosity and vertical percent multiply eachother)

	// cp is color percent 0: pure color (middle), 1: no color (toward white/top OR black/bottom)
	var cp = (lowColor + highColor) / 255;
	var vp; // tint's vertical percent 0: pure color (top), 1: pure grey (bottom)
	if (cp <= 1) {
		// Darker color
		vp = 255 * lowColor / HM / (highColor + lowColor); // true too: vp = (255 - highColor / cp) / HM
	} else {
		// Brighter color
		vp = (255 * highColor - 65025) / (HM * (highColor + lowColor) - 65025);
	}
	var y = vp * tintHeight;
	var lumY = lumOrig + (1 - cp) / 2 * tintHeight;

	return [x, y, lumY];
};

ColorPicker.prototype.setCurrentColor = function (color) {
	var tl = this._colorToTintAndLum(color);
	this.cursorMoveTo(tl[0], tl[1], 'tint', /*silently=*/true);
	this.cursorMoveTo(0, tl[2], 'lum', /*silently=*/true);
};

ColorPicker.prototype.updateLuminosity = function () {
	var cv = this.lumCanvas.rootElement;
	var ctx = cv.getContext('2d');
	var ctxData = ctx.getImageData(0, 0, cv.width, cv.height);

	for (var y = 0; y < this.params.lumHeight; y++) {
		var color = this._lumCoordinatesToColor(y);
		var pixelIndex = y * 4;
		ctxData.data[pixelIndex]     = Math.round(color[0]);
		ctxData.data[pixelIndex + 1] = Math.round(color[1]);
		ctxData.data[pixelIndex + 2] = Math.round(color[2]);
		ctxData.data[pixelIndex + 3] = 255;
	}

	ctx.putImageData(ctxData, 0, 0);
};

ColorPicker.prototype.cursorMoveTo = function (posX, posY, panelType, silently) {
	this._setPickerPosition(this[panelType + 'Picker'], posX, posY);
	if (panelType === 'tint') {
		this.currentTint = this._tintCoordinatesToColor(posX, posY);
		this.updateLuminosity();
	}
	this.currentColor = this._lumCoordinatesToColor(this.lumPicker.y);
	if (!silently) {
		this.emit('newColor', this.getCurrentColor());
	}
};

ColorPicker.prototype.randomize = function (panelType, silently) {
	var panel = this[panelType + 'Canvas'].rootElement;
	var x = Math.random() * panel.width;
	var y = Math.random() * panel.height;
	this.cursorMoveTo(x, y, panelType, silently);
};

ColorPicker.prototype.generateRandomColor = function (silently) {
	this.randomize('tint', silently);
	this.randomize('lum', silently);
};

ColorPicker.prototype._cursorMove = function (pos, box, panelType) {
	var panel = this[panelType + 'Canvas'].rootElement;

	var posX = pos.x;
	var posY = pos.y;

	// if the panel is stretched
	var ratioW = panel.width / box.width;
	var ratioH = panel.height / box.height;
	posX = Math.round(posX * ratioW);
	posY = Math.round(posY * ratioH);

	posX = Math.max(0, Math.min(posX, panel.width - 1));
	posY = Math.max(0, Math.min(posY, panel.height - 1));

	this.cursorMoveTo(posX, posY, panelType);
};

ColorPicker.prototype.fillTint = function () {
	var cv = this.tintCanvas.rootElement;
	var ctx = cv.getContext('2d');
	var ctxData = ctx.getImageData(0, 0, cv.width, cv.height);

	for (var x = 0; x < this.params.tintWidth; x++) {
		for (var y = 0; y < this.params.tintHeight; y++) {
			var color = this._tintCoordinatesToColor(x, y);

			var pixelIndex = ((y * this.params.tintWidth) + x) * 4;

			ctxData.data[pixelIndex]     = Math.round(color[0]);
			ctxData.data[pixelIndex + 1] = Math.round(color[1]);
			ctxData.data[pixelIndex + 2] = Math.round(color[2]);
			ctxData.data[pixelIndex + 3] = 255;
		}
	}

	ctx.putImageData(ctxData, 0, 0);
};

ColorPicker.prototype.getCurrentColor = function () {
	var floatRgb = this.currentColor;
	var rgb = [Math.round(floatRgb[0]), Math.round(floatRgb[1]), Math.round(floatRgb[2])];
	return {
		rgb: rgb,
		hex: colors.colorArrayToHexa(rgb)
	};
};

ColorPicker.prototype._setPickerPosition = function (picker, x, y) {
	picker.setStyle('webkitTransform', 'translate3d(' + x + 'px,' + y + 'px,0)');
	picker.x = x;
	picker.y = y;

	if (picker === this.lumPicker) {
		// Black or white picker to make it more visible against its colored background
		var bright = y / this.params.lumHeight > 0.5 ? 1 : 0;
		picker.bright.setStyle('opacity', bright);
		picker.dark.setStyle('opacity', 1 - bright);
	}
};

ColorPicker.prototype.reset = function () {
	this._setPickerPosition(this.tintPicker, 0, 0);
	this.currentTint = this._tintCoordinatesToColor(0, 0);
	this.updateLuminosity();
	this._setPickerPosition(this.lumPicker, 0, this.params.lumHeight / 2);
	this.currentColor = this._lumCoordinatesToColor(this.lumPicker.y);
};

ColorPicker.prototype.getCursorPosition = function (panelType) {
	var picker = this[panelType + 'Picker'];
	return {
		x: picker.x,
		y: picker.y
	};
};


//



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/ColorPicker/index.js
 ** module id = 513
 ** module chunks = 0
 **/