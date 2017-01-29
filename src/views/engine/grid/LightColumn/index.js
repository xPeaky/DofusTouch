var Sprite    = require('Sprite');
var inherits  = require('util').inherits;
var constants = require('constants');
var Tween     = require('TINAlight').Tween;
var easing    = require('TINAlight').easing;

function LightColumn(cellId, x, y) {
	var params = {
		scene: window.isoEngine.mapScene,
		position: 1,
		layer: constants.MAP_LAYER_TARGET_INDICATOR,
		id: 'lightColumn' + cellId,
		x: x,
		alpha: 0
	};
	Sprite.call(this, params);

	this.red   = 0;
	this.green = 0;
	this.blue  = 0;

	this.stopped = false;
	this._defineShape(y);

	var self = this;
	this._tween = new Tween(this, ['scaleX', 'scaleY', 'red', 'green', 'blue', 'alpha']);
	this._tween.onUpdate(function () {
		// Using the tint to update the indicator's color
		var tint = self.tint;
		tint[0] = self.red;
		tint[1] = self.green;
		tint[2] = self.blue;
	});
}
inherits(LightColumn, Sprite);
module.exports = LightColumn;

LightColumn.prototype.draw = function () {
	this.renderer.drawBoxBatch(this.id);
};

LightColumn.prototype._defineShape = function (height) {
	this._x0 = 16;
	this._y0 = height;

	this._x1 = 23;
	this._y1 = -constants.VERTICAL_OFFSET;

	this._x2 = -23;
	this._y2 = -constants.VERTICAL_OFFSET;

	this._x3 = -16;
	this._y3 = height;

	this._x4 = 20;
	this._y4 = -constants.VERTICAL_OFFSET;

	this._x5 = -20;
	this._y5 = -constants.VERTICAL_OFFSET;

	this._bbox = [this._x2, this._x1, this._y1, this._y0];

	var vertexSize = this.renderer.getNbBytesPerVertex();
	var vertexBuffer = new ArrayBuffer(vertexSize * 12);

	this._vertexBuffer = new Float32Array(vertexBuffer);
	this._colorBuffer  = new Uint32Array(vertexBuffer);

	var colorTop    = 0x40404040;
	var colorBottom = 0x00404040;

	// Triangle (0, 1, 4)
	this._vertexBuffer[0] = this._x0;
	this._vertexBuffer[1] = this._y0;
	this._colorBuffer[3] = colorBottom;

	this._vertexBuffer[5] = this._x1;
	this._vertexBuffer[6] = this._y1;
	this._colorBuffer[8] = colorBottom;

	this._vertexBuffer[10] = this._x4;
	this._vertexBuffer[11] = this._y4;
	this._colorBuffer[13] = colorTop;

	// Triangle (0, 4, 5)
	this._vertexBuffer[15] = this._x0;
	this._vertexBuffer[16] = this._y0;
	this._colorBuffer[18] = colorBottom;

	this._vertexBuffer[20] = this._x4;
	this._vertexBuffer[21] = this._y4;
	this._colorBuffer[23] = colorTop;

	this._vertexBuffer[25] = this._x5;
	this._vertexBuffer[26] = this._y5;
	this._colorBuffer[28] = colorTop;

	// Triangle (0, 5, 3)
	this._vertexBuffer[30] = this._x0;
	this._vertexBuffer[31] = this._y0;
	this._colorBuffer[33] = colorBottom;

	this._vertexBuffer[35] = this._x5;
	this._vertexBuffer[36] = this._y5;
	this._colorBuffer[38] = colorTop;

	this._vertexBuffer[40] = this._x3;
	this._vertexBuffer[41] = this._y3;
	this._colorBuffer[43] = colorBottom;

	// Triangle (2, 3, 5)
	this._vertexBuffer[45] = this._x2;
	this._vertexBuffer[46] = this._y2;
	this._colorBuffer[48] = colorBottom;

	this._vertexBuffer[50] = this._x3;
	this._vertexBuffer[51] = this._y3;
	this._colorBuffer[53] = colorBottom;

	this._vertexBuffer[55] = this._x5;
	this._vertexBuffer[56] = this._y5;
	this._colorBuffer[58] = colorTop;
};

LightColumn.prototype.animate = function (animationLookStart, animationLookEnd) {
	var startObject = {
		scaleX: animationLookStart.sx,
		scaleY: animationLookStart.sy,
		red:    animationLookStart.r,
		green:  animationLookStart.g,
		blue:   animationLookStart.b,
		alpha:  animationLookStart.a
	};

	var endObject = {
		scaleX: animationLookEnd.sx,
		scaleY: animationLookEnd.sy,
		red:    animationLookEnd.r,
		green:  animationLookEnd.g,
		blue:   animationLookEnd.b,
		alpha:  animationLookEnd.a
	};

	// Fade in tween
	var self = this;
	this._tween
		.reset()
		.from({
			scaleX: animationLookStart.sx / 2,
			scaleY: animationLookStart.sy,
			red:    animationLookStart.r,
			green:  animationLookStart.g,
			blue:   animationLookStart.b,
			alpha:  0
		}, easing.polyOut, 4)
		.to(startObject, 6)
		.onFinish(function () {
			if (!this.stopped) {
				// Looping animation
				self._tween
					.reset()
					.from(startObject)
					.to(endObject, 20, easing.trigo, 1)
					.start(true);
			}
		})
		.start();
};

LightColumn.prototype.stop = function () {
	this._tween.stop();
	this.stopped = true;
};

LightColumn.prototype.generateCurrentFrameData = function () {
	var batchData = this.renderer.getBufferData(this.id);
	if (batchData === undefined) {
		var batchId = this.id;
		var prerender = false;
		this.renderer.loadSpriteBuffer(batchId, this._vertexBuffer, null, this._bbox, prerender);
		this.renderer.lockBuffer(this.id);
	}
	return this._bbox;
};

LightColumn.prototype.clear = function () {
	this.renderer.releaseBuffer(this.id);
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/grid/LightColumn/index.js
 ** module id = 1027
 ** module chunks = 0
 **/