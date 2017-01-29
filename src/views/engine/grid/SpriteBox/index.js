var Tween = require('TINAlight').Tween;
var eases = require('TINAlight').easing;

var transformStates = require('transformStates');

function SpriteBox(cellId, box, vertexBuffer, colorBuffer, gridOverlay) {
	this._cellId = cellId;

	var emptyState = transformStates.empty;

	// Color
	this.r = emptyState.r;
	this.g = emptyState.g;
	this.b = emptyState.b;
	this.a = emptyState.a;

	// Scale
	this.sx = emptyState.sx;
	this.sy = emptyState.sy;

	// Rotation (obviously)
	this.rotation = 0.0;

	this.gridOverlay = gridOverlay;

	// The transformation point of the box is at its center, i.e point (x0, y1)
	this._translateX = box.x0;
	this._translateY = box.y1;

	this._box = box;
	this._vertexBuffer = vertexBuffer;
	this._colorBuffer = colorBuffer;
	this._restore();
	this._translate();
	this._fillVertexBuffer();

	this.tween = new Tween(this, ['sx', 'sy', 'r', 'g', 'b', 'a']);

	var self = this;
	this.tween.onUpdate(function () {
		self.setBuffer();
	});

	// Current transform state
	this._transformState = transformStates.empty;
}
module.exports = SpriteBox;

//TODO: remove getter
Object.defineProperty(SpriteBox.prototype, 'cellId', {
	get: function () { return this._cellId; }
});

SpriteBox.prototype.animate = function (transformState, delay) {
	this._transformState = transformState;

	var duration = 11;
	this.tween.reset().wait(delay).to(transformState, duration, eases.backOut, 2.3).start();

	// Returning total animation duration
	return delay + duration;
};

SpriteBox.prototype._restore = function () {
	this._x0 = 0.0;
	this._y0 = -21.5;

	this._x1 = -43;
	this._y1 = 0.0;

	this._x2 = 0.0;
	this._y2 = 21.5;

	this._x3 = 43;
	this._y3 = 0.0;
};

SpriteBox.prototype._translate = function () {
	this._x0 += this._translateX;
	this._x1 += this._translateX;
	this._x2 += this._translateX;
	this._x3 += this._translateX;

	this._y0 += this._translateY;
	this._y1 += this._translateY;
	this._y2 += this._translateY;
	this._y3 += this._translateY;
};

SpriteBox.prototype._rotate = function () {
	if (this.rotation !== 0) {
		var cos = Math.cos(this.rotation);
		var sin = Math.sin(this.rotation);

		var x0 = this._x0;
		var x1 = this._x1;
		var x2 = this._x2;
		var x3 = this._x3;

		this._x0 = cos * x0 - sin * this._y0;
		this._y0 = sin * x0 + cos * this._y0;

		this._x1 = cos * x1 - sin * this._y1;
		this._y1 = sin * x1 + cos * this._y1;

		this._x2 = cos * x2 - sin * this._y2;
		this._y2 = sin * x2 + cos * this._y2;

		this._x3 = cos * x3 - sin * this._y3;
		this._y3 = sin * x3 + cos * this._y3;
	}
};


SpriteBox.prototype._scale = function () {
	this._x0 *= this.sx;
	this._x1 *= this.sx;
	this._x2 *= this.sx;
	this._x3 *= this.sx;

	this._y0 *= this.sy;
	this._y1 *= this.sy;
	this._y2 *= this.sy;
	this._y3 *= this.sy;
};

SpriteBox.prototype.setBuffer = function () {
	this._restore();
	this._scale();
	this._rotate();
	this._translate();
	this._fillVertexBuffer();

	this.gridOverlay._updated = true;
	this.gridOverlay.forceRefresh();
};

SpriteBox.prototype._fillVertexBuffer = function () {
	var r = Math.max(-128, Math.min(127, this.r * 64));
	var g = Math.max(-128, Math.min(127, this.g * 64));
	var b = Math.max(-128, Math.min(127, this.b * 64));
	var a = Math.max(-128, Math.min(127, this.a * 64));
	var color = ((a << 24) & 0xff000000) + ((b << 16) & 0xff0000) + ((g << 8) & 0xff00) + (r & 0xff);

	// vertex 0
	this._vertexBuffer[0] = this._x0;
	this._vertexBuffer[1] = this._y0;
	this._colorBuffer[3] = color;

	//vertex 1
	this._vertexBuffer[5] = this._x1;
	this._vertexBuffer[6] = this._y1;
	this._colorBuffer[8] = color;

	//vertex 2
	this._vertexBuffer[10] = this._x2;
	this._vertexBuffer[11] = this._y2;
	this._colorBuffer[13] = color;

	//Triangle 2

	//vertex 0
	this._vertexBuffer[15] = this._x2;
	this._vertexBuffer[16] = this._y2;
	this._colorBuffer[18] = color;

	//vertex 1
	this._vertexBuffer[20] = this._x3;
	this._vertexBuffer[21] = this._y3;
	this._colorBuffer[23] = color;

	//vertex 2
	this._vertexBuffer[25] = this._x0;
	this._vertexBuffer[26] = this._y0;
	this._colorBuffer[28] = color;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/grid/SpriteBox/index.js
 ** module id = 1025
 ** module chunks = 0
 **/