var inherits = require('util').inherits;
var Graphic  = require('Graphic');
var constants = require('constants');

var FONT_SIZE = 20;
var canvasId = 0;
var padding = 2;

// Make sure to change AspectRatio for the font used
var font = 'Verdana';

function CanvasText(text) {
	var params = {                  // if you need this for something else, pass params in instead
		id: canvasId++,
		scene: window.isoEngine.mapScene,
		layer: constants.MAP_LAYER_FOREGROUND,
		position: 0
	};

	this.canvas = document.createElement('canvas');
	this.canvas.height = params.h = FONT_SIZE + padding + 2;
	// seems like there is some kind of built in padding or margin, so +2
	this.canvasContext = this.canvas.getContext('2d');
	this.canvasContext.font = FONT_SIZE + 'px ' + font;
	this.canvas.width = params.w = Math.ceil(this.canvasContext.measureText(text.toString()).width) +	padding;
	this.canvasContext.font = FONT_SIZE + 'px ' + font;
	this.canvasContext.shadowBlur = 2;                       // if you mess with shadow settings you will have to
	this.canvasContext.shadowColor = 'rgba(0, 0, 0, 1)';     // play with padding
	this.canvasContext.shadowOffsetX = 1;
	this.canvasContext.shadowOffsetY = 1;

	Graphic.call(this, params);

	// to debug the spacing
	// this.canvasContext.fillStyle = 'rgb(255, 0, 0)';
	// this.canvasContext.fillRect(0, 0, this.canvas.width, this.canvas.height);

	this.canvasContext.fillStyle = 'rgb(255, 255, 255)';
	this.canvasContext.textAlign = 'left';
	this.canvasContext.fillText(text, 1, FONT_SIZE - padding);

	if (this.texture) {
		this.texture.release();
	}
	this.texture = window.isoEngine.mapScene.createTexture(this.canvas);
	this.show();
}
inherits(CanvasText, Graphic);
module.exports = CanvasText;

CanvasText.prototype.clear = function () {
	if (this.texture) {
		this.texture.release();
		this.texture = null;
	} else {
		console.warn('[CanvasText.clear] Clearing CanvasText, but it was already clear');
	}
	this.hide();
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/CanvasText/index.js
 ** module id = 622
 ** module chunks = 0
 **/