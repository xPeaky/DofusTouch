var Sprite        = require('Sprite');
var inherits      = require('util').inherits;
var Tween         = require('TINAlight').Tween;
var easing        = require('TINAlight').easing;

var VERTICES_PER_TRIANGLE = 3;
var VERTEX_BUFFER_STRIDE = 5;
var _instanceCount = 0;

function FighterIndicator(initialX, initialY) {
/*
	 0+--------+1
	  |2+----+3|
	  | |    | |
	  |5+    +6|
	 4+  \  /  +7
	   \  \/  /
	    \  8 /
	     \  /
	      \/
	       9
*/
	this.vertices = [
		{ x: -40, y: 60, r: 1.0, g: 0.0, b: 0.0, a: 1.0 }, // 0 // outside
		{ x:  40, y: 60, r: 1.0, g: 0.0, b: 0.0, a: 1.0 }, // 1 // outside
		{ x: -30, y: 50, r: 1.0, g: 1.0, b: 0.0, a: 0.3 }, // 2
		{ x:  30, y: 50, r: 1.0, g: 1.0, b: 0.0, a: 0.3 }, // 3
		{ x: -40, y: 40, r: 1.0, g: 0.0, b: 0.0, a: 1.0 }, // 4 // outside
		{ x: -30, y: 45, r: 1.0, g: 1.0, b: 0.0, a: 0.3 }, // 5
		{ x:  30, y: 45, r: 1.0, g: 1.0, b: 0.0, a: 0.3 }, // 6
		{ x:  40, y: 40, r: 1.0, g: 0.0, b: 0.0, a: 1.0 }, // 7 // outside
		{ x:   0, y: 10, r: 1.0, g: 1.0, b: 0.0, a: 0.5 }, // 8
		{ x:   0, y:  0, r: 1.0, g: 0.0, b: 0.0, a: 1.0 }  // 9 // outside
	];

	// triangles are defined CCW
	this.triangles = [
		[1, 0, 2], // A
		[2, 0, 4], // B
		[4, 5, 2], // C
		[8, 5, 4], // D
		[4, 9, 8], // E
		[8, 9, 7], // F
		[7, 6, 8], // G
		[3, 6, 7], // H
		[7, 1, 3], // I
		[2, 3, 1], // J
		[3, 2, 5], // K
		[5, 6, 3], // L
		[5, 8, 6]  // M
	];

	var params = {
		scene: window.isoEngine.mapScene,
		position: 1,
		layer: 1,
		x: initialX,
		y: initialY,
		id: 'FighterIndicator' + _instanceCount++
	};
	Sprite.call(this, params);
	this._indicatorByteSize = this.renderer.getNbBytesPerVertex() * this.triangles.length * VERTICES_PER_TRIANGLE;
	this.updated = true;
	this.red = 1.0;
	this.green = 1.0;
	this.blue = 0.0;
	this.alpha = 1.0;
	this.sx = 0.4;
	this.sy = 0.4;
	this.rotation = Math.PI;
	this._buffer = new ArrayBuffer(this._indicatorByteSize);
	this._vertexBuffer = new Float32Array(this._buffer);
	this._colorBuffer = new Uint32Array(this._buffer);
	this.loadIndicator();
	this.renderer.releaseBuffer(params.id);
	this.forceRefresh();
	var self = this;
	var origSx = this.sx;
	var origSy = this.sy;
	var origGreen = this.green;
	var origAlpha = this.alpha;
	this.tween = new Tween(this, ['scaleX', 'scaleY', 'green', 'alpha'])
		.from({
			scaleX: origSx,
			scaleY: origSy,
			green: origGreen,
			alpha: origAlpha
		})
		.to({
			scaleX: 0.25,
			scaleY: 0.25,
			green: 0.8,
			alpha: 0.7
		},
			7,
			easing.sineIn
		).to({
			scaleX: origSx,
			scaleY: origSy,
			green: origGreen,
			alpha: origAlpha
		},
			7,
			easing.sineOut
		)
		.onUpdate(function () {
			self.loadIndicator();
		})
		.start(true);
}
inherits(FighterIndicator, Sprite);
module.exports = FighterIndicator;

FighterIndicator.prototype.loadIndicator = function () {
	var minX = Infinity;
	var maxX = -Infinity;

	var minY = Infinity;
	var maxY = -Infinity;

	for (var t = 0; t < this.triangles.length; t++) {
		for (var v = 0; v < VERTICES_PER_TRIANGLE; v++) {
			var bufferIndex = (t * VERTICES_PER_TRIANGLE + v) * VERTEX_BUFFER_STRIDE;

			var vertex = this.vertices[this.triangles[t][v]];
			var x = vertex.x;
			var y = vertex.y;

			var r = Math.max(-128, Math.min(127, vertex.r * 64));
			var g = Math.max(-128, Math.min(127, (this.green) * 64));
			var b = Math.max(-128, Math.min(127, vertex.b * 64));
			var a = Math.max(-128, Math.min(127, (this.alpha && vertex.a) * 64));
			var color = ((a << 24) & 0xff000000) + ((b << 16) & 0xff0000) + ((g << 8) & 0xff00) + (r & 0xff);

			this._vertexBuffer[bufferIndex]     = x;
			this._vertexBuffer[bufferIndex + 1] = y;

			this._colorBuffer[bufferIndex  + 3]  = color;

			if (minX > x) { minX = x; } else if (maxX < x) { maxX = x; }
			if (minY > y) { minY = y; } else if (maxY < y) { maxY = y; }
		}
	}
	this._bbox = [minX, maxX, minY, maxY];
	this.updated = true;
};

FighterIndicator.prototype.render = function () {
	this.renderer.save();

	// Applying transformations
	this.renderer.translate(this._x, this._y);
	if (this._rotation !== 0) {
		this.renderer.rotate(this._rotation);
	}
	this.renderer.scale(this._scaleX, this._scaleY);

	if (this.updated) {
		this.renderer.drawBoxBatch(this.id);
		this.renderer.releaseBuffer(this.id);
		this.updated = false;
		this.forceRefresh();
	}

	this.renderer.restore();
};

FighterIndicator.prototype.generateCurrentFrameData = function () {
	// Checking whether the vertex buffer is already loaded on the GPU
	var batchData = this.renderer.getBufferData(this.id);
	if (batchData === undefined) { // batchData should never be null
		// Loading the vertex buffer onto the GPU
		var batchId   = this.id;
		var prerender = false;
		this.renderer.loadSpriteBuffer(batchId, this._vertexBuffer, null, this._bbox, prerender);
		this.renderer.lockBuffer(this.id);
	}

	return this._bbox;
};

FighterIndicator.prototype.clear = function () {
	this.renderer.releaseBuffer(this.id);
};

FighterIndicator.prototype.remove = function () {
	if (this.tween) {
		this.tween.stop();
	}
	Sprite.prototype.remove.call(this);
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/FighterIndicator/index.js
 ** module id = 1031
 ** module chunks = 0
 **/